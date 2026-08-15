import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { loadApplicationModel, bindOnboardingActions, bindRecipeSearchInput, ensureDailySchedule, recalculateScheduleForSleep, loadDailyTrend, createTrendState, loadRenderData, runRefreshCycle, createRefreshCoordinator, createAsyncEpoch, runNotificationSchedule, runDataReplacement, changeNotificationScheduling, lockApplicationAfterCommittedReplacement, syncNotifiedTasks, generateCurrentMenu, confirmHistoryEdit, runMenuGeneration, runMenuGenerationClick } from '../src/app.js';

test('recipe search waits for Chinese IME composition to finish', () => {
  const listeners={},timers=[],input={isConnected:true,addEventListener(type,handler){listeners[type]=handler}};
  let applied=0;
  bindRecipeSearchInput(input,{apply:()=>{applied++},setTimer:callback=>{timers.push(callback);return timers.length},clearTimer:()=>{}});
  listeners.compositionstart();
  listeners.input({isComposing:true});
  assert.equal(timers.length,0);
  listeners.compositionend();
  assert.equal(timers.length,1);
  timers[0]();
  assert.equal(applied,1);
});

test('recipe search ignores a delayed refresh after leaving the recipe page', () => {
  const listeners={},timers=[],input={isConnected:true,addEventListener(type,handler){listeners[type]=handler}};
  let applied=0;
  bindRecipeSearchInput(input,{apply:()=>{applied++},setTimer:callback=>{timers.push(callback);return timers.length},clearTimer:()=>{}});
  listeners.input({isComposing:false});
  input.isConnected=false;
  timers[0]();
  assert.equal(applied,0);
});
import { createDefaultTemplate } from '../src/features/schedule/template.js';
import { createBackup } from '../src/features/backup/backup.js';
import { AppStore } from '../src/store.js';
import { createMenuBrowser, updateMenuAtomically } from '../src/features/meals/menu-browser.js';
import { mealsView } from '../src/ui/meals.js';
import { recipes } from '../data/recipes.js';

test('targeted history mutation writes only the requested weekly menu',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[{id:'current',babyId:'b1',startDate:'2026-08-10',value:1},{id:'old',babyId:'b1',startDate:'2026-08-03',value:2}]});
  await updateMenuAtomically({repository:repo,menuId:'old',babyId:'b1',mutate:menu=>({...menu,value:3})});
  assert.equal((await repo.get('weeklyMenus','old')).value,3);
  assert.equal((await repo.get('weeklyMenus','current')).value,1);
  await assert.rejects(updateMenuAtomically({repository:repo,menuId:'missing',babyId:'b1',mutate:value=>value}),/菜单不存在/);
});

test('current menu generation uses the requested local date, creates 21 meals, confirms same-date overwrite and is single flight',async()=>{
  let calls=0,release;
  const pending=new Promise(resolve=>{release=resolve});
  const generated={id:'new',babyId:'b1',startDate:'2026-08-15',days:Array.from({length:7},(_,index)=>({date:`2026-08-${15+index}`,meals:[{},{},{}]}))};
  const options={repository:{},weeks:[{id:'current'}],current:{id:'current',startDate:'2026-08-15'},baby:{id:'b1',stage:'stage4'},recipes:[],date:'2026-08-15',confirm:()=>true,generate:(catalog,input)=>{calls++;assert.equal(input.startDate,'2026-08-15');assert.equal(Object.hasOwn(input,'mealCount'),false);return generated},save:async()=>{await pending}};
  const first=generateCurrentMenu(options),second=generateCurrentMenu(options);
  assert.strictEqual(first,second);
  assert.equal(calls,1);
  release();
  assert.strictEqual(await first,generated);
  assert.equal(generated.days.flatMap(day=>day.meals).length,21);
  assert.deepEqual(generated.days.map(day=>day.date),['2026-08-15','2026-08-16','2026-08-17','2026-08-18','2026-08-19','2026-08-20','2026-08-21']);
});

test('menu generation treats an earlier menu as history and does not confirm overwrite',async()=>{
  let confirmations=0;
  const generated={id:'new',babyId:'b1',startDate:'2026-08-15',days:[]};
  const result=await generateCurrentMenu({repository:{},weeks:[],current:{id:'old',startDate:'2026-08-10'},baby:{id:'b1',stage:'stage4'},recipes:[],date:'2026-08-15',confirm:()=>{confirmations++;return false},generate:()=>generated,save:async()=>{}});
  assert.strictEqual(result,generated);
  assert.equal(confirmations,0);
});

test('menu generation with the real stage4 catalog produces three meals for seven exact local dates',async()=>{
  let sequence=0;
  const generated=await generateCurrentMenu({repository:{},weeks:[],current:null,baby:{id:'real-catalog-baby',stage:'stage4'},recipes,date:'2026-08-15',createId:()=>`generated-${++sequence}`,save:async()=>{}});
  assert.equal(generated.startDate,'2026-08-15');
  assert.deepEqual(generated.days.map(day=>day.date),['2026-08-15','2026-08-16','2026-08-17','2026-08-18','2026-08-19','2026-08-20','2026-08-21']);
  assert.equal(generated.days.flatMap(day=>day.meals).length,21);
});

test('current menu overwrite cancellation preserves storage',async()=>{
  let generated=false,saved=false;
  const result=await generateCurrentMenu({repository:{},weeks:[],current:{id:'current',startDate:'2026-08-15'},baby:{id:'b1',stage:'stage4'},recipes:[],date:'2026-08-15',confirm:message=>{assert.match(message,/覆盖/);return false},generate:()=>{generated=true},save:async()=>{saved=true}});
  assert.equal(result,null);assert.equal(generated,false);assert.equal(saved,false);
});

test('rejected history confirmation keeps the selected menu read only',()=>{
  const browser=createMenuBrowser(),old={id:'old',babyId:'b1',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'m',name:'午饭'},{id:'d',name:'晚饭'}]}]};
  browser.showHistory('old');
  assert.equal(confirmHistoryEdit(browser,()=>false),false);
  assert.equal(browser.value().editingHistory,false);
  assert.doesNotMatch(mealsView({week:null,weeks:[old],menuBrowser:browser.value()}),/data-action="replace-meal"|data-action="meal-status"/);
});

test('failed menu save preserves old repository and store references, toasts, and unlocks retry',async()=>{
  const current={id:'current',babyId:'b1',startDate:'2026-08-10'},weeks=[current],repo=new MemoryRepository({weeklyMenus:[current]}),messages=[],button={disabled:false};
  const options={button,notify:message=>messages.push(message),refresh:async()=>{throw new Error('should not refresh')},showCurrent:()=>{throw new Error('should not switch')},generation:{repository:repo,weeks,current,baby:{id:'b1',stage:'stage4'},recipes:[],date:'2026-08-15',confirm:()=>true,generate:()=>({id:'new',babyId:'b1',startDate:'2026-08-10',days:[]}),save:async()=>{throw new Error('保存失败')}}};
  assert.equal(await runMenuGeneration(options),null);
  assert.strictEqual(weeks[0],current);
  assert.deepEqual(await repo.get('weeklyMenus','current'),current);
  assert.deepEqual(messages,['保存失败']);
  assert.equal(button.disabled,false);
  options.generation.save=async()=>{};
  options.showCurrent=()=>{};options.refresh=async()=>{};
  assert.notEqual(await runMenuGeneration(options),null);
});

test('menu generation click captures its button before asynchronous preference loading',async()=>{
  const button={disabled:false};
  const event={currentTarget:button};
  let release;
  const pending=new Promise(resolve=>{release=resolve});
  const result=runMenuGenerationClick({event,loadPreferences:async()=>{await pending;return{}},buildOptions:()=>({notify:()=>{},refresh:async()=>{},showCurrent:()=>{},generation:{repository:{},weeks:[],current:null,baby:{id:'b1',stage:'stage4'},recipes:[],generate:()=>({id:'menu'}),save:async()=>{}}})});
  event.currentTarget=null;
  release();
  assert.deepEqual(await result,{id:'menu'});
  assert.equal(button.disabled,false);
});

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
  const input={files:[],value:'selected',disabled:false,onchange:null};
  const form={onsubmit:null};
  const controls=[input,{disabled:false},{disabled:false}];
  const status={hidden:true,textContent:''};
  const label={attributes:{},setAttribute(name,value){this.attributes[name]=value},getAttribute(name){return this.attributes[name]}};
  const modal={removed:false,remove(){this.removed=true},querySelectorAll:selector=>selector==='input,select,button'?controls:[],querySelector:selector=>selector==='label[for="onboarding-backup"]'?label:null};
  return{input,form,modal,controls,status,label,document:{getElementById:id=>id==='onboarding-backup'?input:id==='onboarding-form'?form:id==='onboarding-recovery-status'?status:null,querySelector:selector=>selector==='.modal-backdrop'?modal:null}};
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

test('onboarding keeps recovery visible and distinguishes startup failure after data was restored', async () => {
  const source=new MemoryRepository({babies:[{id:'b1',name:'多米'}],dailyRecords:[{id:'r1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00.000Z'}]});
  const text=JSON.stringify(await createBackup(source));
  const repo=new MemoryRepository(),fake=onboardingDocument(),messages=[];
  fake.input.files=[{text:async()=>text}];
  let saveCalls=0;
  bindOnboardingActions(fake.document,{
    repository:repo,
    readForm:()=>({name:'不应创建'}),
    saveOnboarding:async()=>{saveCalls++},
    onRestored:async()=>{throw new Error('首页启动失败')},
    notify:message=>messages.push(message)
  });

  await fake.input.onchange({target:fake.input});

  assert.equal((await repo.get('babies','b1')).name,'多米');
  assert.equal((await repo.get('dailyRecords','r1')).value,120);
  assert.equal(fake.modal.removed,false);
  assert.equal(fake.input.disabled,true);
  assert.equal(fake.input.value,'');
  assert.equal(messages.at(-1),'数据已恢复，请重新打开应用');
  assert.doesNotMatch(messages.at(-1),/恢复失败/);
  assert.equal(fake.status.hidden,false);
  assert.equal(fake.status.textContent,'数据已恢复，请重新打开应用');
  assert.ok(fake.controls.every(control=>control.disabled));
  assert.equal(fake.label.getAttribute('aria-disabled'),'true');

  let prevented=false;
  await fake.form.onsubmit({preventDefault(){prevented=true},currentTarget:fake.form});
  assert.equal(prevented,true);
  assert.equal(saveCalls,0);
  assert.equal((await repo.list('babies')).length,1);
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

test('daily trend loader defaults to seven-day sleep and isolates the active baby',async()=>{
  const repo=new MemoryRepository({
    dailyRecords:[
      {id:'m1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-11T08:00:00+08:00'},
      {id:'m2',babyId:'b2',type:'milk',value:999,occurredAt:'2026-08-11T08:00:00+08:00'}
    ],
    sleepSessions:[
      {id:'s1',babyId:'b1',type:'night',startAt:'2026-08-11T00:00:00+08:00',endAt:'2026-08-11T08:00:00+08:00'},
      {id:'s2',babyId:'b2',type:'night',startAt:'2026-08-10T16:00:00+08:00',endAt:'2026-08-11T08:00:00+08:00'}
    ]
  });
  const model=await loadDailyTrend(repo,{babyId:'b1',endDate:'2026-08-11',now:new Date('2026-08-11T12:00:00+08:00')});
  assert.equal(model.metric,'sleep');
  assert.equal(model.days,7);
  assert.equal(model.points.at(-1).value,8);

  const milk=await loadDailyTrend(repo,{babyId:'b1',metric:'milk',days:14,endDate:'2026-08-11',now:new Date('2026-08-11T12:00:00+08:00')});
  assert.equal(milk.days,14);
  assert.equal(milk.points.at(-1).value,120);
});

test('daily trend loader handles no baby without repository access',async()=>{
  const repo={list(){throw new Error('should not read')}};
  assert.equal(await loadDailyTrend(repo,{babyId:null}),null);
});

test('daily trend loader reuses already loaded records without duplicate repository reads',async()=>{
  const repo={list(){throw new Error('duplicate read')}};
  const model=await loadDailyTrend(repo,{babyId:'b1',metric:'milk',days:7,endDate:'2026-08-11',now:new Date('2026-08-11T12:00:00+08:00'),records:[{id:'m1',babyId:'b1',type:'milk',value:90,occurredAt:'2026-08-11T08:00:00+08:00'}],sleeps:[]});
  assert.equal(model.points.at(-1).value,90);
});

test('trend state switches metric and range and can reset for another baby',()=>{
  const state=createTrendState();
  assert.deepEqual(state.value(),{metric:'sleep',days:7});
  state.setMetric('milk'); state.setDays(14);
  assert.deepEqual(state.value(),{metric:'milk',days:14});
  state.reset();
  assert.deepEqual(state.value(),{metric:'sleep',days:7});
  assert.throws(()=>state.setMetric('weight'),/指标/);
  assert.throws(()=>state.setDays(10),/范围/);
});

test('daily trend reload reflects quick records and completed sleep immediately',async()=>{
  const repo=new MemoryRepository();
  await repo.put('dailyRecords',{id:'milk-now',babyId:'b1',type:'milk',value:160,occurredAt:'2026-08-11T10:00:00+08:00'});
  let model=await loadDailyTrend(repo,{babyId:'b1',metric:'milk',days:7,endDate:'2026-08-11',now:new Date('2026-08-11T12:00:00+08:00')});
  assert.equal(model.points.at(-1).value,160);
  await repo.put('sleepSessions',{id:'nap-now',babyId:'b1',type:'nap',startAt:'2026-08-11T10:00:00+08:00',endAt:'2026-08-11T11:30:00+08:00'});
  model=await loadDailyTrend(repo,{babyId:'b1',metric:'sleep',days:7,endDate:'2026-08-11',now:new Date('2026-08-11T12:00:00+08:00')});
  assert.equal(model.points.at(-1).value,1.5);
});

test('daily trend loader surfaces repository failures for the view boundary',async()=>{
  const repo={list:async store=>{if(store==='sleepSessions')throw new Error('IndexedDB unavailable');return[]}};
  await assert.rejects(()=>loadDailyTrend(repo,{babyId:'b1'}),/IndexedDB unavailable/);
});

test('render data isolates failed record stores while loading every other page store once',async()=>{
  const calls=new Map();
  const repo={list:async store=>{
    calls.set(store,(calls.get(store)||0)+1);
    if(['dailyRecords','sleepSessions'].includes(store))throw new Error(`${store} unavailable`);
    if(store==='babies')return[{id:'b1',name:'多米'}];
    return[];
  }};
  const result=await loadRenderData(repo);
  assert.deepEqual(result.data.babies,[{id:'b1',name:'多米'}]);
  assert.deepEqual(result.data.dailyRecords,[]);
  assert.deepEqual(result.data.sleepSessions,[]);
  assert.match(result.errors.dailyRecords.message,/dailyRecords unavailable/);
  assert.match(result.errors.sleepSessions.message,/sleepSessions unavailable/);
  assert.ok([...calls.values()].every(count=>count===1));
});

test('render data rejects critical preference failures instead of treating exclusions as empty',async()=>{
  const repo={list:async store=>{if(store==='foodPreferences')throw new Error('preferences unavailable');return[]}};
  await assert.rejects(()=>loadRenderData(repo),/preferences unavailable/);
});

test('refresh snapshot reuses AppStore babies tasks and menus without duplicate reads',async()=>{
  const counts=new Map(),base=new MemoryRepository({babies:[{id:'b1',name:'多米'}],appSettings:[{id:'global',activeBabyId:'b1'}],taskInstances:[{id:'t1',babyId:'b1',date:'2026-08-11',plannedAt:'2026-08-11T08:00:00+08:00'}],weeklyMenus:[{id:'w1',babyId:'b1',startDate:'2026-08-10'}]});
  const repo={list:async(...args)=>{counts.set(args[0],(counts.get(args[0])||0)+1);return base.list(...args)},get:(...args)=>base.get(...args)};
  const store=new AppStore(repo,{now:()=>new Date('2026-08-11T12:00:00+08:00')});
  await store.load();
  const result=await loadRenderData(repo,{seed:{babies:store.babies,taskInstances:store.allTasks,weeklyMenus:store.weeks}});
  assert.equal(result.data.taskInstances.length,1);
  for(const name of['babies','taskInstances','weeklyMenus'])assert.equal(counts.get(name),1,name);
});

test('real refresh cycle shares settings and reminders with enabled notification scheduling',async()=>{
  const counts=new Map(),base=new MemoryRepository({
    babies:[{id:'b1',name:'多米'}],
    appSettings:[{id:'global',activeBabyId:'b1',notificationsEnabled:true}],
    reminders:[{id:'r1',babyId:'b1',title:'体检',dueDate:'2026-08-12',completedAt:null}],
    taskInstances:[],weeklyMenus:[]
  });
  const count=(method,store)=>counts.set(store,(counts.get(store)||0)+1);
  const repo={list:async(...args)=>{count('list',args[0]);return base.list(...args)},get:async(...args)=>{count('get',args[0]);return base.get(...args)}};
  const store=new AppStore(repo,{now:()=>new Date('2026-08-12T08:00:00+08:00')});
  let rendered=false,scheduled=false;
  await runRefreshCycle({store,repository:repo,render:async snapshot=>{rendered=snapshot.data.babies.length===1},schedule:async snapshot=>{scheduled=snapshot.data.appSettings[0].notificationsEnabled&&snapshot.data.reminders.length===1}});
  assert.equal(rendered,true); assert.equal(scheduled,true);
  for(const[name,count]of counts)assert.ok(count<=1,`${name} read ${count} times`);
  assert.equal(counts.get('appSettings'),1);
  assert.equal(counts.get('reminders'),1);
});

test('overlapping refresh cycles discard the older baby snapshot before render and scheduling',async()=>{
  let settingsCall=0,releaseOld;const oldTasks=new Promise(resolve=>{releaseOld=resolve});
  const repo={
    list:async(store,{babyId}={})=>{
      if(store==='babies')return[{id:'b1',name:'旧宝宝'},{id:'b2',name:'新宝宝'}];
      if(store==='taskInstances'&&babyId==='b1')return oldTasks;
      if(store==='taskInstances')return[];
      return[];
    },
    get:async store=>store==='appSettings'?{id:'global',activeBabyId:++settingsCall===1?'b1':'b2'}:undefined
  };
  const shared=new AppStore(repo,{now:()=>new Date('2026-08-12T08:00:00+08:00')}),coordinator=createRefreshCoordinator(),renders=[],schedules=[];
  const options={store:shared,repository:repo,coordinator,render:async snapshot=>renders.push(snapshot.babyId),schedule:async snapshot=>schedules.push(snapshot.babyId)};
  const older=runRefreshCycle(options),newer=runRefreshCycle(options);
  await newer; releaseOld([]); await older;
  assert.deepEqual(renders,['b2']); assert.deepEqual(schedules,['b2']);
  assert.equal(shared.activeBabyId,'b2');
});

test('notification id sync clears stale backup ids and loads restored ids in place',()=>{
  const ids=new Set(['old-a','old-b']),same=ids;
  syncNotifiedTasks(ids,{notifiedTaskIds:['new-a','new-b']});
  assert.equal(ids,same); assert.deepEqual([...ids],['new-a','new-b']);
  syncNotifiedTasks(ids,{notifiedTaskIds:[]});
  assert.deepEqual([...ids],[]);
});

test('data replacement invalidates an older notification scheduler before it can send or write',async()=>{
  let releaseSettings;const settingsReady=new Promise(resolve=>{releaseSettings=resolve}),sent=[],writes=[];
  const repository={get:async()=>settingsReady,list:async()=>[],put:async(...args)=>writes.push(args)};
  const epoch=createAsyncEpoch(),notifiedTasks=new Set(['old-id']),isCurrent=epoch.capture();
  const older=runNotificationSchedule({repository,babyId:'b1',tasks:[{id:'milk',title:'喝奶',plannedAt:'2026-08-11T08:00:00Z',status:'upcoming'}],notifiedTasks,registration:{showNotification:async title=>sent.push(title)},isCurrent,now:'2026-08-11T09:00:00Z'});

  epoch.invalidate();
  releaseSettings({id:'global',activeBabyId:'b1',notificationsEnabled:true,notifiedTaskIds:['restored-id']});
  await older;

  assert.deepEqual(sent,[]);
  assert.deepEqual(writes,[]);
  assert.deepEqual([...notifiedTasks],['old-id']);
});

test('onboarding restore invalidates async work before storage replacement starts',async()=>{
  const repo=new MemoryRepository(),fake=onboardingDocument(),order=[];
  fake.input.files=[{text:async()=>'{"backup":true}'}];
  bindOnboardingActions(fake.document,{repository:repo,saveOnboarding:async()=>{},beforeRestore:()=>order.push('invalidate'),restore:async()=>{order.push('restore');return{babyCount:0,recordCount:0}},loadModel:async()=>({store:{}}),onRestored:async()=>order.push('start'),notify:()=>{}});
  await fake.input.onchange({target:fake.input});
  assert.deepEqual(order,['invalidate','restore','start']);
});

test('successful replacement stays suspended through refresh then schedules only the new baby',async()=>{
  const epoch=createAsyncEpoch(),events=[];let babyId='old',releaseRefresh;
  const refreshReady=new Promise(resolve=>{releaseRefresh=()=>{babyId='new';resolve()}});
  const replacing=runDataReplacement({epoch,invalidateRefresh:()=>events.push('invalidate'),clearTimer:()=>events.push('clear'),replace:async()=>events.push('replace'),sync:async()=>events.push('sync'),refresh:async()=>{events.push('refresh');await refreshReady},schedule:async()=>events.push(`schedule:${babyId}`)});
  await Promise.resolve();await Promise.resolve();
  if(epoch.capture()())events.push(`focus:${babyId}`);
  releaseRefresh();await replacing;
  assert.deepEqual(events,['invalidate','clear','replace','sync','refresh','schedule:new']);
});

test('failed replacement resumes and explicitly rearms notification scheduling',async()=>{
  const epoch=createAsyncEpoch(),events=[];
  await assert.rejects(runDataReplacement({epoch,invalidateRefresh:()=>events.push('invalidate'),clearTimer:()=>events.push('clear'),replace:async()=>{throw new Error('导入失败')},sync:async()=>events.push('sync'),refresh:async()=>events.push('refresh'),schedule:async()=>events.push('schedule')}),/导入失败/);
  assert.equal(epoch.capture()(),true);
  assert.deepEqual(events,['invalidate','clear','schedule']);
});

test('disabling notifications invalidates an in-flight scheduler before its late write or rearm',async()=>{
  let releaseSettings;const settingsReady=new Promise(resolve=>{releaseSettings=resolve}),writes=[],rearms=[];
  const epoch=createAsyncEpoch(),guard=epoch.capture(),notifiedTasks=new Set();
  const old=runNotificationSchedule({repository:{get:async()=>settingsReady,list:async()=>[],put:async(...args)=>writes.push(args)},babyId:'old',tasks:[],notifiedTasks,registration:{},isCurrent:guard});
  await changeNotificationScheduling({enabled:false,epoch,clearTimer:()=>{},persist:async enabled=>writes.push(['disabled',enabled]),schedule:async()=>rearms.push('schedule')});
  releaseSettings({id:'global',notificationsEnabled:true});await old;
  assert.deepEqual(writes,[['disabled',false]]);
  assert.deepEqual(rearms,[]);
  assert.equal(epoch.capture()(),false);
});

test('reenabling notifications resumes and explicitly schedules once',async()=>{
  const epoch=createAsyncEpoch(),events=[];epoch.invalidate();
  await changeNotificationScheduling({enabled:true,epoch,clearTimer:()=>events.push('clear'),persist:async enabled=>events.push(`persist:${enabled}`),schedule:async()=>events.push('schedule')});
  assert.equal(epoch.capture()(),true);
  assert.deepEqual(events,['clear','persist:true','schedule']);
});

for(const failedStep of ['sync','refresh'])test(`replacement committed ${failedStep} failure stays suspended and reports committed state`,async()=>{
  const epoch=createAsyncEpoch(),events=[];
  const operation=runDataReplacement({epoch,replace:async()=>events.push('replace'),sync:async()=>{events.push('sync');if(failedStep==='sync')throw new Error('sync failed')},refresh:async()=>{events.push('refresh');if(failedStep==='refresh')throw new Error('refresh failed')},schedule:async()=>events.push('schedule')});
  await assert.rejects(operation,error=>error.committed===true&&error.cause?.message===`${failedStep} failed`);
  assert.equal(epoch.capture()(),false);
  assert.equal(events.includes('schedule'),false);
});

test('committed replacement failure removes old actions and exposes one accessible reload path',()=>{
  let reloaded=false;
  const oldAction={clicked:false,click(){this.clicked=true}},body={innerHTML:'<button id="old-action">旧操作</button>'},reloadButton={onclick:null};
  const document={body,getElementById:id=>id==='replacement-reload'?reloadButton:null};
  lockApplicationAfterCommittedReplacement(document,()=>{reloaded=true});
  assert.match(body.innerHTML,/role="alert"/);
  assert.match(body.innerHTML,/数据已导入，请重新打开应用/);
  assert.match(body.innerHTML,/id="replacement-reload"/);
  assert.doesNotMatch(body.innerHTML,/old-action/);
  assert.equal(oldAction.clicked,false);
  reloadButton.onclick();assert.equal(reloaded,true);
});
