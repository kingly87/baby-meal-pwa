import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { createBackup, previewBackup, importBackup, restoreBackupIntoEmpty, resetApplication } from '../src/features/backup/backup.js';

const restorePayload = {
  app:'baby-growth-assistant',
  schemaVersion:1,
  exportedAt:'2026-07-20T12:00:00.000Z',
  data:{
    babies:[{id:'b1',name:'柚柚'}],
    dailyRecords:[{id:'r1',babyId:'b1',occurredAt:'2026-07-20T08:00:00.000Z',value:180,type:'feeding'}]
  }
};

test('backup exports version, timestamp, all stores and counts', async () => {
  const repo=new MemoryRepository(); await repo.put('babies',{id:'b1',name:'柚柚'});
  const backup=await createBackup(repo,()=> '2026-07-20T12:00:00.000Z');
  assert.equal(backup.schemaVersion,1); assert.equal(backup.exportedAt,'2026-07-20T12:00:00.000Z'); assert.equal(backup.counts.babies,1);
  assert.equal(previewBackup(JSON.stringify(backup)).babyCount,1);
});

test('invalid and old backups are rejected before replacement', async () => {
  assert.throws(()=>previewBackup('{bad'),/无法解析/);
  assert.throws(()=>previewBackup(JSON.stringify({app:'baby-growth-assistant',schemaVersion:0,data:{}})),/不支持/);
  const repo=new MemoryRepository({babies:[{id:'original'}]});
  await assert.rejects(importBackup(repo,JSON.stringify({app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{name:'missing id'}]}})),/缺少 id/);
  assert.deepEqual((await repo.list('babies')).map(x=>x.id),['original']);
});

test('valid import replaces atomically and reset clears all stores', async () => {
  const repo=new MemoryRepository({babies:[{id:'old'}]});
  const payload={app:'baby-growth-assistant',schemaVersion:1,exportedAt:'2026-07-20T12:00:00.000Z',data:{babies:[{id:'new',name:'新宝宝'}]}};
  await importBackup(repo,JSON.stringify(payload)); assert.deepEqual((await repo.list('babies')).map(x=>x.id),['new']);
  await resetApplication(repo,{removeItem(){this.called=true}}); assert.equal((await repo.list('babies')).length,0);
});

test('backup rejects duplicate ids and orphan baby records', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚'}]}};
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,babies:[{id:'b1',name:'柚柚'},{id:'b1',name:'重复'}]}})),/重复 id/);
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,dailyRecords:[{id:'r1',babyId:'missing'}]}})),/不存在的宝宝/);
});

test('backup rejects malformed nested menus and task dates', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚',stage:'stage4'}]}};
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus:[{id:'w1',babyId:'b1',days:[{date:5,meals:[]}]}]}})),/weeklyMenus/);
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,taskInstances:[{id:'t1',babyId:'b1',date:'bad',plannedAt:'bad'}]}})),/taskInstances/);
});

test('backup reports malformed menu entries as weeklyMenus validation errors', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby',stage:'stage4'}]}};
  for(const days of [[null],[{date:'2026-08-15',meals:[null]}]]) {
    const weeklyMenus=[{id:'w1',babyId:'b1',days}];
    assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus}})),/weeklyMenus/);
  }
});

test('backup rejects impossible menu dates, invalid startDate and blank meal identity', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby',stage:'stage4'}]}};
  const invalidMenus=[
    {id:'w1',babyId:'b1',startDate:'2026-02-30',days:[]},
    {id:'w1',babyId:'b1',startDate:'2026-02-23',days:[{date:'2026-02-30',meals:[]}]},
    {id:'w1',babyId:'b1',startDate:'2026-02-23',days:[{date:'2026-02-23',meals:[{id:' ',name:'Meal',status:'planned'}]}]},
    {id:'w1',babyId:'b1',startDate:'2026-02-23',days:[{date:'2026-02-23',meals:[{id:'m1',name:' ',status:'planned'}]}]}
  ];
  for(const weeklyMenu of invalidMenus) {
    assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus:[weeklyMenu]}})),/weeklyMenus/);
  }
});

test('backup accepts legacy meals without mealType and all supported meal types', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby',stage:'stage4'}]}};
  const meals=[
    {id:'m1',name:'Legacy meal',status:'planned'},
    {id:'m2',name:'Breakfast',status:'planned',mealType:'breakfast'},
    {id:'m3',name:'Lunch',status:'eaten',mealType:'lunch'},
    {id:'m4',name:'Dinner',status:'skipped',mealType:'dinner'}
  ];
  const result=previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus:[{id:'w1',babyId:'b1',startDate:'2026-08-10',days:[{date:'2026-08-15',meals}]}]}}));
  assert.equal(result.babyCount,1);
  assert.equal(result.recordCount,2);
});

test('backup accepts and imports a complete actual meal without stripping it', async () => {
  const actualMeal={
    name:'  Pumpkin porridge  ',
    occurredAt:'2026-08-15T12:30:00.000Z',
    amount:'120g',
    note:'Ate well',
    createdAt:'2026-08-15T12:31:00.000Z',
    updatedAt:'2026-08-15T12:32:00.000Z'
  };
  const weeklyMenu={id:'w1',babyId:'b1',startDate:'2026-08-10',days:[{
    date:'2026-08-15',meals:[{id:'m1',name:'Lunch',status:'eaten',actualMeal}]
  }]};
  const payload={app:'baby-growth-assistant',schemaVersion:1,data:{
    babies:[{id:'b1',name:'Baby',stage:'stage4'}],weeklyMenus:[weeklyMenu]
  }};

  assert.equal(previewBackup(JSON.stringify(payload)).recordCount,2);
  const repo=new MemoryRepository();
  await importBackup(repo,JSON.stringify(payload));
  assert.deepEqual((await repo.list('weeklyMenus'))[0].days[0].meals[0].actualMeal,actualMeal);
});

test('backup rejects malformed actual meals as weeklyMenus validation errors', () => {
  const valid={
    name:'Lunch',occurredAt:'2026-08-15T12:30:00.000Z',amount:'',note:'',
    createdAt:'2026-08-15T12:31:00.000Z',updatedAt:'2026-08-15T12:32:00.000Z'
  };
  const invalid=[
    null,[],5,'meal',{},
    {...valid,name:'   '},
    {...valid,occurredAt:undefined},
    {...valid,occurredAt:5},
    {...valid,occurredAt:'invalid'},
    {...valid,occurredAt:'2026-02-30T12:30:00.000Z'},
    {...valid,amount:120},
    {...valid,note:null},
    {...valid,createdAt:undefined},
    {...valid,createdAt:5},
    {...valid,createdAt:'invalid'},
    {...valid,updatedAt:undefined},
    {...valid,updatedAt:5},
    {...valid,updatedAt:'2026-02-30T12:32:00.000Z'}
  ];
  for(const actualMeal of invalid) {
    const weeklyMenus=[{id:'w1',babyId:'b1',startDate:'2026-08-10',days:[{
      date:'2026-08-15',meals:[{id:'m1',name:'Lunch',status:'eaten',actualMeal}]
    }]}];
    assert.throws(
      ()=>previewBackup(JSON.stringify({app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby'}],weeklyMenus}})),
      /weeklyMenus.*(?:invalid|无效)/
    );
  }
});

test('backup rejects actual meal instances and custom prototypes through the public object API', () => {
  const fields={
    name:'Lunch',occurredAt:'2026-08-15T12:30:00.000Z',amount:'',note:'',
    createdAt:'2026-08-15T12:31:00.000Z',updatedAt:'2026-08-15T12:32:00.000Z'
  };
  class ActualMeal { constructor() { Object.assign(this,fields); } }
  const customPrototype=Object.assign(Object.create({kind:'actual-meal'}),fields);
  const payload=actualMeal=>({app:'baby-growth-assistant',schemaVersion:1,data:{
    babies:[{id:'b1',name:'Baby'}],
    weeklyMenus:[{id:'w1',babyId:'b1',startDate:'2026-08-10',days:[{
      date:'2026-08-15',meals:[{id:'m1',name:'Lunch',status:'eaten',actualMeal}]
    }]}]
  }});

  for(const actualMeal of [new ActualMeal(),customPrototype]) {
    assert.throws(()=>previewBackup(payload(actualMeal)),/weeklyMenus.*(?:invalid|无效)/);
  }
  assert.equal(previewBackup(payload(Object.assign(Object.create(null),fields))).recordCount,2);
});

test('backup accepts legacy natural-week menus, exact-date menus and nap interval templates', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby',stage:'stage4'}]}};
  const weeklyMenus=[
    {id:'legacy-week',babyId:'b1',startDate:'2026-08-10',days:[{date:'2026-08-10',meals:[]}]},
    {id:'exact-date',babyId:'b1',startDate:'2026-08-15',days:[{date:'2026-08-15',meals:[]}]}
  ];
  const scheduleTemplates=[{
    id:'legacy-template',babyId:'b1',napToMealMinutes:90,
    rules:[{type:'wake',title:'Wake',afterMinutes:0}]
  }];
  const result=previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus,scheduleTemplates}}));
  assert.equal(result.babyCount,1);
  assert.equal(result.recordCount,4);
});

test('backup rejects an unsupported explicit mealType', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'Baby',stage:'stage4'}]}};
  for(const mealType of ['snack',null]) {
    const weeklyMenus=[{id:'w1',babyId:'b1',startDate:'2026-08-10',days:[{date:'2026-08-15',meals:[{id:'m1',name:'Unsupported',status:'planned',mealType}]}]}];
    assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus}})),/weeklyMenus/);
  }
});

test('backup validates templates preferences reminders and application settings', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚',stage:'stage4'}]}};
  const invalid=[
    {scheduleTemplates:[{id:'s1',babyId:'b1',rules:'bad'}]},
    {foodPreferences:[{id:'p1',babyId:'b1',excluded:'南瓜'}]},
    {reminders:[{id:'m1',babyId:'b1',title:'体检',dueDate:'bad'}]},
    {newFoodObservations:[{id:'n1',babyId:'b1',name:'南瓜',date:'2026-07-20',reactions:'bad'}]},
    {appSettings:[{id:'global',activeBabyId:'b1',notifiedTaskIds:'bad'}]}
  ];
  for(const data of invalid) assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,...data}})),/无效字段/);
});

test('restores a valid V1 backup into an empty repository and returns its preview', async () => {
  const repo=new MemoryRepository();
  const result=await restoreBackupIntoEmpty(repo,JSON.stringify(restorePayload));
  assert.equal(result.babyCount,1);
  assert.equal(result.recordCount,2);
  assert.deepEqual(await repo.list('babies'),restorePayload.data.babies);
  assert.deepEqual(await repo.list('dailyRecords'),restorePayload.data.dailyRecords);
});

test('rejects restore when any repository store already contains data without modifying it', async () => {
  for(const seed of [
    {appSettings:[{id:'global',notificationsEnabled:true}]},
    {dailyRecords:[{id:'existing',babyId:'missing'}]}
  ]) {
    const repo=new MemoryRepository(seed);
    const before=await repo.exportAll();
    await assert.rejects(restoreBackupIntoEmpty(repo,JSON.stringify(restorePayload)),/当前已有数据，不能直接覆盖/);
    assert.deepEqual(await repo.exportAll(),before);
  }
});

test('checks emptiness inside the restore transaction before replacing data', async () => {
  class ConcurrentRepository extends MemoryRepository {
    async transaction(stores,callback) {
      await this.put('appSettings',{id:'concurrent',notificationsEnabled:true});
      return super.transaction(stores,callback);
    }
  }
  const repo=new ConcurrentRepository();
  await assert.rejects(restoreBackupIntoEmpty(repo,JSON.stringify(restorePayload)),/当前已有数据，不能直接覆盖/);
  assert.deepEqual(await repo.list('appSettings'),[{id:'concurrent',notificationsEnabled:true}]);
  assert.equal((await repo.list('babies')).length,0);
});

test('invalid backup leaves an empty repository empty', async () => {
  const repo=new MemoryRepository();
  await assert.rejects(restoreBackupIntoEmpty(repo,'{bad'),/无法解析/);
  const invalid={...restorePayload,data:{babies:[{id:'b1',name:''}]}};
  await assert.rejects(restoreBackupIntoEmpty(repo,JSON.stringify(invalid)),/缺少姓名/);
  assert.ok(Object.values(await repo.exportAll()).every(records=>records.length===0));
});

test('failed replacement rolls back all restored records', async () => {
  class FailingRepository extends MemoryRepository {
    async put(store,value) {
      if(store==='dailyRecords') throw new Error('simulated replacement failure');
      return super.put(store,value);
    }
  }
  const repo=new FailingRepository();
  await assert.rejects(restoreBackupIntoEmpty(repo,JSON.stringify(restorePayload)),/simulated replacement failure/);
  assert.ok(Object.values(await repo.exportAll()).every(records=>records.length===0));
});
