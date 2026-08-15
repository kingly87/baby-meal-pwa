import test from 'node:test';
import assert from 'node:assert/strict';
import { latestGrowthSummary } from '../src/features/growth/latest-summary.js';

test('selects each latest measurement field independently without mutating input',()=>{
  const measurements=[
    {id:'new-height',date:'2026-08-12',height:83.6},
    {id:'new-weight',date:'2026-08-14',weight:12.55},
    {id:'older-both',date:'2026-08-10',weight:12.1,height:83}
  ],before=structuredClone(measurements);
  assert.deepEqual(latestGrowthSummary({measurements,teeth:[]}),{
    weight:{value:12.55,date:'2026-08-14'},
    height:{value:83.6,date:'2026-08-12'},
    tooth:null
  });
  assert.deepEqual(measurements,before);
});

test('breaks same-date ties by updatedAt, createdAt, then id',()=>{
  const summary=latestGrowthSummary({measurements:[
    {id:'z',date:'2026-08-14',weight:10,updatedAt:'2026-08-14T01:00:00Z'},
    {id:'a',date:'2026-08-14',weight:11,updatedAt:'2026-08-14T02:00:00Z'},
    {id:'b',date:'2026-08-14',height:80,createdAt:'2026-08-14T01:00:00Z'},
    {id:'c',date:'2026-08-14',height:81,createdAt:'2026-08-14T01:00:00Z'}
  ],teeth:[
    {id:'t1',date:'2026-08-14',number:7,createdAt:'2026-08-14T01:00:00Z'},
    {id:'t2',date:'2026-08-14',number:8,createdAt:'2026-08-14T02:00:00Z'}
  ]});
  assert.deepEqual(summary,{weight:{value:11,date:'2026-08-14'},height:{value:81,date:'2026-08-14'},tooth:{value:8,date:'2026-08-14'}});
});

test('preserves sub-millisecond timestamp precision before falling back to id',()=>{
  const summary=latestGrowthSummary({measurements:[
    {id:'z',date:'2026-08-14',weight:10,updatedAt:'2026-08-14T01:00:00.0001Z'},
    {id:'a',date:'2026-08-14',weight:11,updatedAt:'2026-08-14T01:00:00.0002Z'}
  ]});
  assert.deepEqual(summary.weight,{value:11,date:'2026-08-14'});
});

test('skips malformed dates and invalid values while accepting finite zero measurements',()=>{
  const summary=latestGrowthSummary({measurements:[
    {id:'bad-date',date:'2026-02-30',weight:99,height:99},
    {id:'nan',date:'2026-08-15',weight:NaN,height:Infinity},
    {id:'negative',date:'2026-08-14',weight:-1,height:-2},
    {id:'zero',date:'2026-08-13',weight:0,height:0}
  ],teeth:[
    {id:'fraction',date:'2026-08-15',number:8.5},
    {id:'zero',date:'2026-08-14',number:0},
    {id:'valid',date:'2026-08-13',number:8}
  ]});
  assert.deepEqual(summary,{weight:{value:0,date:'2026-08-13'},height:{value:0,date:'2026-08-13'},tooth:{value:8,date:'2026-08-13'}});
});
