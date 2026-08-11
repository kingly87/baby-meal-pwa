import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyTrendModel } from '../src/features/growth/daily-trends.js';

const now='2026-08-02T12:00:00+08:00';

test('aggregates records and splits sleep across local calendar days',()=>{
  const source={records:[
    {id:'m1',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00+08:00'},
    {id:'m2',type:'milk',value:150,occurredAt:'2026-08-01T12:00:00+08:00'},
    {id:'s1',type:'stool',value:2,occurredAt:'2026-08-01T13:00:00+08:00'},
    {id:'u1',type:'urine',occurredAt:'2026-08-02T09:00:00+08:00'}
  ],sleeps:[{id:'sleep1',startAt:'2026-08-01T23:00:00+08:00',endAt:'2026-08-02T02:00:00+08:00'}]};
  assert.deepEqual(dailyTrendModel({...source,metric:'sleep',days:7,endDate:'2026-08-02',now}).points.slice(-2).map(x=>x.value),[60,120]);
  assert.equal(dailyTrendModel({...source,metric:'milk',days:7,endDate:'2026-08-02',now}).points.at(-2).value,270);
  assert.equal(dailyTrendModel({...source,metric:'stool',days:7,endDate:'2026-08-02',now}).points.at(-2).value,2);
  assert.equal(dailyTrendModel({...source,metric:'urine',days:7,endDate:'2026-08-02',now}).points.at(-1).value,1);
});

test('distinguishes a recorded zero from a missing day',()=>{
  const model=dailyTrendModel({records:[{id:'m',type:'milk',value:0,occurredAt:'2026-08-02T08:00:00+08:00'}],sleeps:[],metric:'milk',days:7,endDate:'2026-08-02',now});
  assert.deepEqual(model.points.slice(-2).map(({value,hasData})=>({value,hasData})),[{value:0,hasData:false},{value:0,hasData:true}]);
});

test('uses only supported ranges and returns comparison statistics over days with data',()=>{
  const records=[];
  for(let day=20;day<=26;day++)records.push({id:`p${day}`,type:'milk',value:100,occurredAt:`2026-07-${day}T08:00:00+08:00`});
  for(let day=27;day<=31;day++)records.push({id:`c${day}`,type:'milk',value:120,occurredAt:`2026-07-${day}T08:00:00+08:00`});
  for(let day=1;day<=2;day++)records.push({id:`c8${day}`,type:'milk',value:120,occurredAt:`2026-08-0${day}T08:00:00+08:00`});
  const model=dailyTrendModel({records,sleeps:[],metric:'milk',days:7,endDate:'2026-08-02',now});
  assert.deepEqual({unit:model.unit,average:model.average,previousAverage:model.previousAverage,delta:model.delta},{unit:'ml',average:120,previousAverage:100,delta:20});
  for(const days of [7,14,30])assert.equal(dailyTrendModel({records:[],sleeps:[],metric:'milk',days,endDate:'2026-08-02',now}).points.length,days);
  assert.throws(()=>dailyTrendModel({records:[],sleeps:[],metric:'milk',days:8,endDate:'2026-08-02',now}),/7、14 或 30/);
  assert.throws(()=>dailyTrendModel({records:[],sleeps:[],metric:'water',days:7,endDate:'2026-08-02',now}),/指标/);
});

test('clips an active sleep at now and ignores future, invalid and duplicate source rows',()=>{
  const records=[
    {id:'m1',type:'milk',value:80,occurredAt:'2026-08-02T08:00:00+08:00'},
    {id:'m1',type:'milk',value:80,occurredAt:'2026-08-02T08:00:00+08:00'},
    {id:'future',type:'milk',value:999,occurredAt:'2026-08-02T13:00:00+08:00'},
    {id:'bad',type:'milk',value:'nope',occurredAt:'2026-08-02T09:00:00+08:00'},
    {id:'negative',type:'stool',value:-2,occurredAt:'2026-08-02T09:00:00+08:00'}
  ];
  const sleeps=[
    {id:'active',startAt:'2026-08-02T10:30:00+08:00',endAt:null},
    {id:'backwards',startAt:'2026-08-02T11:00:00+08:00',endAt:'2026-08-02T10:00:00+08:00'},
    {id:'future',startAt:'2026-08-02T13:00:00+08:00',endAt:null},
    {id:'invalid',startAt:'not-a-date',endAt:null}
  ];
  assert.equal(dailyTrendModel({records,sleeps,metric:'milk',days:7,endDate:'2026-08-02',now}).points.at(-1).value,80);
  assert.equal(dailyTrendModel({records,sleeps,metric:'sleep',days:7,endDate:'2026-08-02',now}).points.at(-1).value,90);
  assert.equal(dailyTrendModel({records,sleeps,metric:'stool',days:7,endDate:'2026-08-02',now}).points.at(-1).hasData,false);
});

test('calendar buckets remain continuous across a daylight-saving transition',()=>{
  const previousTZ=process.env.TZ;
  process.env.TZ='America/New_York';
  try{
    const model=dailyTrendModel({records:[],sleeps:[{id:'dst',startAt:'2026-03-08T00:00:00-05:00',endAt:'2026-03-09T00:00:00-04:00'}],metric:'sleep',days:7,endDate:'2026-03-09',now:'2026-03-09T12:00:00-04:00'});
    assert.deepEqual(model.points.slice(-3).map(x=>x.date),['2026-03-07','2026-03-08','2026-03-09']);
    assert.equal(model.points.at(-2).value,23*60);
  }finally{
    if(previousTZ===undefined)delete process.env.TZ;
    else process.env.TZ=previousTZ;
  }
});

test('does not mutate records or sleeps',()=>{
  const records=Object.freeze([Object.freeze({id:'m',type:'milk',value:100,occurredAt:'2026-08-02T08:00:00+08:00'})]);
  const sleeps=Object.freeze([Object.freeze({id:'s',startAt:'2026-08-01T23:00:00+08:00',endAt:'2026-08-02T01:00:00+08:00'})]);
  assert.doesNotThrow(()=>dailyTrendModel({records,sleeps,metric:'milk',days:7,endDate:'2026-08-02',now}));
});
