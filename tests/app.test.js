import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { loadApplicationModel, bindOnboardingActions, ensureDailySchedule, recalculateScheduleForSleep } from '../src/app.js';
import { createDefaultTemplate } from '../src/features/schedule/template.js';
import { createBackup } from '../src/features/backup/backup.js';

test('startup requests onboarding when there is no baby', async () => {
  const repo=new MemoryRepository();
  const model=await loadApplicationModel(repo);
  assert.equal(model.needsOnboarding,true);
  assert.equal(await repo.get('appSettings','global'),undefined);
});

test('startup audits V1 baby data, keeps the active baby and bypasses onboarding', async () => {
  const repo=new MemoryRepository({
    babies:[{id:'b1',name:'多米'},{id:'b2',name:'柚柚'}],
    appSettings:[{id:'global',activeBabyId:'b2',theme:'warm'}]
  });

  const model=await loadApplicationModel(repo);

  assert.equal(model.needsOnboarding,false);
  assert.equal(model.store.activeBabyId,'b2');
  assert.equal(model.store.activeBaby.name,'柚柚');
  assert.equal((await repo.get('appSettings','global')).dataVersion,2);
});

function onboardingDocument(){
  const input={files:[],value:'selected',onchange:null};
  const form={onsubmit:null};
  const modal={removed:false,remove(){this.removed=true}};
  return{input,form,modal,document:{getElementById:id=>id==='onboarding-backup'?input:id==='onboarding-form'?form:null,querySelector:selector=>selector==='.modal-backdrop'?modal:null}};
}

test('onboarding backup binding restores data, reloads the model and reports counts', async () => {
  const source=new MemoryRepository({babies:[{id:'b1',name:'多米'}],dailyRecords:[{id:'r1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00.000Z'}]});
  const text=JSON.stringify(await createBackup(source));
  const repo=new MemoryRepository(),fake=onboardingDocument(),messages=[];
  fake.input.files=[{text:async()=>text}];
  let restoredModel=null;
  bindOnboardingActions(fake.document,{repository:repo,saveOnboarding:async()=>{},onRestored:async model=>{restoredModel=model},notify:message=>messages.push(message)});

  await fake.input.onchange({target:fake.input});

  assert.equal(restoredModel.store.activeBaby.name,'多米');
  assert.equal(restoredModel.needsOnboarding,false);
  assert.equal(fake.modal.removed,true);
  assert.equal(messages.at(-1),'已恢复 1 个宝宝、2 条记录');
  assert.equal(fake.input.value,'');
});

test('onboarding backup binding reports invalid files, resets input and leaves storage empty', async () => {
  const repo=new MemoryRepository(),fake=onboardingDocument(),messages=[];
  fake.input.files=[{text:async()=>'{bad json'}];
  let enteredApp=false;
  bindOnboardingActions(fake.document,{repository:repo,saveOnboarding:async()=>{},onRestored:async()=>{enteredApp=true},notify:message=>messages.push(message)});

  await fake.input.onchange({target:fake.input});

  assert.equal(enteredApp,false);
  assert.equal(fake.modal.removed,false);
  assert.equal(fake.input.value,'');
  assert.ok(messages.length>0);
  assert.deepEqual((await repo.exportAll()).babies,[]);
  assert.equal(await repo.get('appSettings','global'),undefined);
});

test('onboarding binding keeps the new baby form submit path available', async () => {
  const repo=new MemoryRepository(),fake=onboardingDocument();
  let submitted=null,prevented=false;
  bindOnboardingActions(fake.document,{
    repository:repo,
    readForm:()=>({name:'新宝宝',wake:'08:00'}),
    saveOnboarding:async values=>{submitted=values},
    onRestored:async()=>{}
  });

  await fake.form.onsubmit({preventDefault(){prevented=true},currentTarget:fake.form});

  assert.equal(prevented,true);
  assert.deepEqual(submitted,{name:'新宝宝',wake:'08:00'});
});

test('daily startup creates one schedule per baby and date without duplicates', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'柚柚'}],scheduleTemplates:[createDefaultTemplate('b1')]});
  await ensureDailySchedule(repo,{id:'b1'},new Date('2026-07-20T08:00:00Z'),()=>`id-${Math.random()}`);
  const first=await repo.list('taskInstances',{babyId:'b1'}); assert.ok(first.length>0);
  await ensureDailySchedule(repo,{id:'b1'},new Date('2026-07-20T09:00:00Z'),()=>`id-${Math.random()}`);
  assert.equal((await repo.list('taskInstances',{babyId:'b1'})).length,first.length);
});

test('startup loads active baby and only today scoped tasks', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'柚柚'}],appSettings:[{id:'global',activeBabyId:'b1'}],taskInstances:[{id:'old',babyId:'b1',title:'旧事项',date:'2026-07-19',status:'overdue',plannedAt:'2026-07-19T10:00:00Z'},{id:'t2',babyId:'b1',title:'午餐',date:'2026-07-20',status:'upcoming',plannedAt:'2026-07-20T12:00:00Z'},{id:'t1',babyId:'b1',title:'早餐',date:'2026-07-20',status:'upcoming',plannedAt:'2026-07-20T10:00:00Z'}]});
  const model=await loadApplicationModel(repo,{now:()=>new Date(2026,6,20,12)});
  assert.equal(model.store.activeBaby.name,'柚柚'); assert.deepEqual(model.store.tasks.map(task=>task.id),['t1','t2']);
});

test('completed historical sleep recalculates its target day while isolating dates and babies', async () => {
  const base={actualAt:null,status:'upcoming',updatedAt:'2026-07-20T00:00:00.000Z'};
  const repo=new MemoryRepository({
    scheduleTemplates:[
      {...createDefaultTemplate('b1'),id:'template-b1',napToMealMinutes:90},
      {...createDefaultTemplate('b2'),id:'template-b2'}
    ],
    taskInstances:[
      {...base,id:'wake-target',babyId:'b1',date:'2026-07-20',type:'wake',plannedAt:'2026-07-20T08:00:00.000Z',afterMinutes:0},
      {...base,id:'milk-target',babyId:'b1',date:'2026-07-20',type:'milk',plannedAt:'2026-07-20T08:20:00.000Z',afterMinutes:20},
      {...base,id:'milk-other-date',babyId:'b1',date:'2026-07-21',type:'milk',plannedAt:'2026-07-21T08:20:00.000Z',afterMinutes:20},
      {...base,id:'milk-other-baby',babyId:'b2',date:'2026-07-20',type:'milk',plannedAt:'2026-07-20T08:20:00.000Z',afterMinutes:20}
    ]
  });

  await recalculateScheduleForSleep(repo,{
    id:'sleep-history',
    babyId:'b1',
    type:'night',
    startAt:'2026-07-19T23:00:00.000Z',
    endAt:'2026-07-20T07:00:00.000Z'
  });

  assert.equal((await repo.get('taskInstances','milk-target')).plannedAt,'2026-07-20T07:20:00.000Z');
  assert.equal((await repo.get('taskInstances','milk-other-date')).plannedAt,'2026-07-21T08:20:00.000Z');
  assert.equal((await repo.get('taskInstances','milk-other-baby')).plannedAt,'2026-07-20T08:20:00.000Z');
});
