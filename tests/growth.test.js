import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline } from '../src/features/growth/timeline.js';
import { chartModel } from '../src/features/growth/chart.js';

test('timeline aggregates, sorts and filters baby events', () => {
  const data={growthMeasurements:[{id:'g1',babyId:'b1',date:'2026-07-20',weight:8}],toothRecords:[{id:'t1',babyId:'b1',date:'2026-07-19',number:4}],dailyRecords:[{id:'d1',babyId:'b2',date:'2026-07-21',type:'milk',value:100}]};
  const line=buildTimeline(data,{babyId:'b1'});
  assert.deepEqual(line.map(x=>x.sourceId),['g1','t1']);
  assert.equal(buildTimeline(data,{babyId:'b1',type:'tooth'}).length,1);
});

test('timeline includes completed schedule tasks and sleep sessions', () => {
  const data={taskInstances:[{id:'t1',babyId:'b1',title:'上午辅食',status:'completed',actualAt:'2026-07-20T10:00:00Z'}],sleepSessions:[{id:'s1',babyId:'b1',startAt:'2026-07-20T05:00:00Z',endAt:'2026-07-20T06:00:00Z',durationMinutes:60}]};
  const line=buildTimeline(data,{babyId:'b1'});
  assert.deepEqual(line.map(item=>item.type),['task','sleep']);
  assert.match(line[1].title,/60/);
});

test('chart model requires two valid points', () => {
  assert.deepEqual(chartModel([{date:'2026-07-20',weight:8}], 'weight'), { points:[], ready:false });
  const chart=chartModel([{date:'2026-07-20',weight:8},{date:'2026-07-21',weight:8.2}], 'weight');
  assert.equal(chart.ready,true); assert.equal(chart.points.length,2);
});
