import test from 'node:test';
import assert from 'node:assert/strict';
import { createNumericRecord, createCountRecord, persistCountRecord, updateDailyRecord, updateById, removeById } from '../src/features/records/records.js';
import { MemoryRepository } from '../src/db.js';
import { sleepDurationMinutes, minutesOverlappingLocalDay } from '../src/features/records/sleep.js';
import { createObservation, observationEndDate } from '../src/features/records/new-food.js';

test('numeric records validate values and stable ID edits survive sorting', () => {
  assert.throws(() => createNumericRecord({ type:'milk', value:-1, babyId:'b1', occurredAt:'2026-07-20T08:00:00Z' }, ()=>'x'), /不能为负数/);
  const a = createNumericRecord({ type:'milk', value:120, babyId:'b1', occurredAt:'2026-07-20T08:00:00Z' }, ()=>'a');
  const b = createNumericRecord({ type:'milk', value:180, babyId:'b1', occurredAt:'2026-07-19T08:00:00Z' }, ()=>'b');
  const sorted = [a,b].sort((x,y) => y.occurredAt.localeCompare(x.occurredAt));
  assert.equal(updateById(sorted, 'b', { value: 200 }).find(x=>x.id==='b').value, 200);
  assert.deepEqual(removeById(sorted, 'a').map(x=>x.id), ['b']);
});

test('count records only accept stool and urine with a positive default count', () => {
  const stool=createCountRecord({babyId:'b1',type:'stool',occurredAt:'2026-08-11T08:00:00+08:00'},()=> 's1');
  const urine=createCountRecord({babyId:'b1',type:'urine',occurredAt:'2026-08-11T09:00:00.000Z',count:2},()=> 'u1');
  assert.deepEqual({id:stool.id,type:stool.type,value:stool.value,unit:stool.unit,occurredAt:stool.occurredAt},{id:'s1',type:'stool',value:1,unit:'次',occurredAt:'2026-08-11T00:00:00.000Z'});
  assert.equal(urine.value,2);
  assert.throws(()=>createCountRecord({babyId:'b1',type:'toilet',occurredAt:'2026-08-11T08:00:00Z'}),/类型/);
  assert.throws(()=>createCountRecord({babyId:'b1',type:'milk',occurredAt:'2026-08-11T08:00:00Z'}),/类型/);
  assert.throws(()=>createCountRecord({babyId:'',type:'stool',occurredAt:'2026-08-11T08:00:00Z'}),/宝宝/);
  assert.throws(()=>createCountRecord({babyId:'b1',type:'stool',occurredAt:'not-a-date'}),/时间/);
  for(const count of [0,-1,1.5,'',NaN])assert.throws(()=>createCountRecord({babyId:'b1',type:'stool',count,occurredAt:'2026-08-11T08:00:00Z'}),/次数/);
});

test('one-tap count persistence binds the selected baby and keeps both types separate', async () => {
  const repo=new MemoryRepository();
  const stool=await persistCountRecord(repo,{babyId:'b1',type:'stool'},()=> 's1',()=>new Date('2026-08-11T08:00:00.000Z'));
  const urine=await persistCountRecord(repo,{babyId:'b2',type:'urine'},()=> 'u1',()=>new Date('2026-08-11T09:00:00.000Z'));
  assert.equal(stool.occurredAt,'2026-08-11T08:00:00.000Z');
  assert.deepEqual((await repo.list('dailyRecords',{babyId:'b1'})).map(item=>item.type),['stool']);
  assert.deepEqual((await repo.list('dailyRecords',{babyId:'b2'})).map(item=>item.type),['urine']);
});

test('one-tap count persistence exposes repository failures without returning success', async () => {
  const repo={put:async()=>{throw new Error('storage unavailable')}};
  await assert.rejects(persistCountRecord(repo,{babyId:'b1',type:'urine'},()=> 'u1',()=>new Date('2026-08-11T09:00:00.000Z')),/storage unavailable/);
});

test('count record edits persist an integer count, local time and trimmed note', async () => {
  const repo=new MemoryRepository({dailyRecords:[{id:'s1',babyId:'b1',type:'stool',value:1,unit:'次',occurredAt:'2026-08-11T08:00:00.000Z',note:'',createdAt:'2026-08-11T08:00:00.000Z',updatedAt:'2026-08-11T08:00:00.000Z'}]});
  const updated=await updateDailyRecord(repo,{id:'s1',value:'2',occurredAt:'2026-08-11T18:30',note:'  正常  '},()=>new Date('2026-08-11T11:00:00.000Z'));
  assert.equal(updated.value,2);
  assert.equal(updated.occurredAt,new Date('2026-08-11T18:30').toISOString());
  assert.equal(updated.note,'正常');
  assert.equal(updated.updatedAt,'2026-08-11T11:00:00.000Z');
  assert.deepEqual(await repo.get('dailyRecords','s1'),updated);
});

test('count edits reject invalid counts and times without changing storage', async () => {
  const original={id:'u1',babyId:'b1',type:'urine',value:1,unit:'次',occurredAt:'2026-08-11T08:00:00.000Z',note:''};
  const repo=new MemoryRepository({dailyRecords:[original]});
  for(const patch of [{value:0,occurredAt:'2026-08-11T18:30'},{value:1.5,occurredAt:'2026-08-11T18:30'},{value:1,occurredAt:'bad'}]){
    await assert.rejects(updateDailyRecord(repo,{id:'u1',...patch}),/次数|时间/);
    assert.deepEqual(await repo.get('dailyRecords','u1'),original);
  }
});

test('milk and water edits retain non-negative numeric semantics', async () => {
  const repo=new MemoryRepository({dailyRecords:[{id:'m1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-11T08:00:00.000Z',note:''}]});
  assert.equal((await updateDailyRecord(repo,{id:'m1',value:'0',note:' skipped '})).value,0);
  await assert.rejects(updateDailyRecord(repo,{id:'m1',value:-1}),/负数/);
});

test('sleep supports crossing midnight', () => {
  assert.equal(sleepDurationMinutes('2026-07-20T23:30:00Z','2026-07-21T01:00:00Z'),90);
  assert.throws(() => sleepDurationMinutes('2026-07-21T01:00:00Z','2026-07-20T23:30:00Z'),/结束时间/);
});

test('daily sleep summary counts only the overlap with the selected local day', () => {
  const session={startAt:new Date('2026-07-19T23:30:00').toISOString(),endAt:new Date('2026-07-20T01:00:00').toISOString()};
  assert.equal(minutesOverlappingLocalDay(session,'2026-07-20'),60);
});

test('new food observation lasts three calendar days', () => {
  const item=createObservation({babyId:'b1',name:'西兰花',date:'2026-07-20'},()=> 'n1');
  assert.equal(item.id,'n1');
  assert.equal(observationEndDate(item.date),'2026-07-22');
});
