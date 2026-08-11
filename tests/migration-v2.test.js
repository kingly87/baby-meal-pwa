import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { auditAndMarkV2 } from '../src/features/migration/v2.js';

test('marks valid V1 data as V2 without rewriting babies or historical records', async () => {
  const baby={id:'b1',name:'多米'};
  const record={id:'r1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00.000Z'};
  const repo=new MemoryRepository({babies:[baby],dailyRecords:[record]});

  const result=await auditAndMarkV2(repo,()=> '2026-08-11T00:00:00.000Z');

  assert.deepEqual(result,{babyCount:1,recordCount:2,dataVersion:2});
  assert.deepEqual(await repo.get('babies','b1'),baby);
  assert.deepEqual(await repo.get('dailyRecords','r1'),record);
  assert.deepEqual(await repo.get('appSettings','global'),{
    id:'global',
    dataVersion:2,
    updatedAt:'2026-08-11T00:00:00.000Z'
  });
});

test('rejects orphaned records without writing application settings', async () => {
  const settings={id:'global',theme:'warm',dataVersion:1};
  const repo=new MemoryRepository({
    dailyRecords:[{id:'r1',babyId:'missing',type:'milk',value:120}],
    appSettings:[settings]
  });

  await assert.rejects(auditAndMarkV2(repo),/dailyRecords 引用了不存在的宝宝/);
  assert.deepEqual(await repo.get('appSettings','global'),settings);
});

test('preserves existing global application setting fields when marking V2', async () => {
  const repo=new MemoryRepository({
    babies:[{id:'b1',name:'多米'}],
    appSettings:[{id:'global',activeBabyId:'b1',notificationsEnabled:false,theme:'warm',updatedAt:'old'}]
  });

  const result=await auditAndMarkV2(repo,()=> '2026-08-11T00:00:00.000Z');

  assert.deepEqual(result,{babyCount:1,recordCount:2,dataVersion:2});
  assert.deepEqual(await repo.get('appSettings','global'),{
    id:'global',
    activeBabyId:'b1',
    notificationsEnabled:false,
    theme:'warm',
    dataVersion:2,
    updatedAt:'2026-08-11T00:00:00.000Z'
  });
});

test('audits an empty database and marks it as V2', async () => {
  const repo=new MemoryRepository();

  const result=await auditAndMarkV2(repo,()=> '2026-08-11T00:00:00.000Z');

  assert.deepEqual(result,{babyCount:0,recordCount:0,dataVersion:2});
  assert.equal((await repo.get('appSettings','global')).dataVersion,2);
});
