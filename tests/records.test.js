import test from 'node:test';
import assert from 'node:assert/strict';
import { createNumericRecord, updateById, removeById } from '../src/features/records/records.js';
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
