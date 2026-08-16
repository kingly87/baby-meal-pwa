import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuBrowser, historyMenus, updateMenuAtomically, runMenuMutation, runReplaceMenuMutation, runActualMealMutation, runActualMealRemoval, resetMenuBrowserForBoundary } from '../src/features/meals/menu-browser.js';
import { MemoryRepository } from '../src/db.js';

test('menu browser isolates history editing and resets it when selection changes',()=>{
  const browser=createMenuBrowser();
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
  browser.showHistory('old-1');
  browser.editHistory();
  assert.deepEqual(browser.value(),{mode:'history',selectedId:'old-1',editingHistory:true});
  browser.selectHistory('old-2');
  assert.deepEqual(browser.value(),{mode:'history',selectedId:'old-2',editingHistory:false});
  browser.reset();
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
});

test('menu browser falls back to current when selected history no longer exists',()=>{
  const browser=createMenuBrowser();
  browser.showHistory('missing');
  browser.reconcile([{id:'other'}]);
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
});

test('history excludes only the exact current date and keeps earlier same-week menus',()=>{
  const menus=[
    {id:'current',babyId:'b1',startDate:'2026-08-10'},
    {id:'duplicate',babyId:'b1',startDate:'2026-08-12'},
    {id:'old',babyId:'b1',startDate:'2026-08-03'},
    {id:'invalid',babyId:'b1',startDate:'2026-02-30'},
    {id:'other-baby',babyId:'b2',startDate:'2026-08-12'}
  ];
  assert.deepEqual(historyMenus(menus,{babyId:'b1',date:'2026-08-15'}).map(menu=>menu.id),['duplicate','current','old']);
});

const menu=()=>({id:'w1',babyId:'b1',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'m1',status:'planned'},{id:'m2',status:'planned'}]}]});

test('actual meal workflow adds, edits, marks eaten and removes through atomic menu writes',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]});
  const common={repository:repo,babyId:'b1',menuId:'w1',mealId:'m1',now:'2026-08-16T02:00:00.000Z',controls:[],refresh:async()=>{},notify:()=>{}};
  await runActualMealMutation({...common,input:{name:' 苹果 ',occurredAt:'2026-08-16T01:00:00.000Z',amount:'半碗',note:'喜欢',markEaten:false}});
  let meal=(await repo.get('weeklyMenus','w1')).days[0].meals[0];
  assert.equal(meal.status,'planned');assert.equal(meal.actualMeal.name,'苹果');
  await runActualMealMutation({...common,now:'2026-08-16T03:00:00.000Z',input:{name:'香蕉',occurredAt:'2026-08-16T01:30:00.000Z',markEaten:true}});
  meal=(await repo.get('weeklyMenus','w1')).days[0].meals[0];
  assert.equal(meal.status,'eaten');assert.equal(meal.actualMeal.name,'香蕉');assert.equal(meal.actualMeal.createdAt,'2026-08-16T02:00:00.000Z');
  await runActualMealRemoval({...common,now:'2026-08-16T04:00:00.000Z'});
  meal=(await repo.get('weeklyMenus','w1')).days[0].meals[0];
  assert.equal(Object.hasOwn(meal,'actualMeal'),false);assert.equal(meal.status,'eaten');
});

test('actual meal mutation restores controls and notifies on write failure',async()=>{
  const base=new MemoryRepository({weeklyMenus:[menu()]}),controls=[{disabled:false}],messages=[];
  const repository={transaction:async(...args)=>base.transaction(...args),get:(...args)=>base.get(...args)};
  repository.transaction=async()=>{throw new Error('保存失败')};
  const result=await runActualMealMutation({repository,babyId:'b1',menuId:'w1',mealId:'m1',input:{name:'苹果',occurredAt:'2026-08-16T01:00:00.000Z'},now:'2026-08-16T02:00:00.000Z',controls,refresh:async()=>{},notify:value=>messages.push(value)});
  assert.equal(result,null);assert.equal(controls[0].disabled,false);assert.deepEqual(messages,['保存失败']);
});

test('actual meal queued writes preserve concurrent changes and reject deleted or cross-baby targets',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]});
  await Promise.all([
    runActualMealMutation({repository:repo,babyId:'b1',menuId:'w1',mealId:'m1',input:{name:'苹果',occurredAt:'2026-08-16T01:00:00.000Z'},now:'2026-08-16T02:00:00.000Z',refresh:async()=>{},notify:()=>{}}),
    updateMenuAtomically({repository:repo,babyId:'b1',menuId:'w1',mutate:value=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map(meal=>meal.id==='m2'?{...meal,status:'skipped'}:meal)}))})})
  ]);
  assert.equal((await repo.get('weeklyMenus','w1')).days[0].meals[1].status,'skipped');
  await repo.delete('weeklyMenus','w1');
  assert.equal(await runActualMealRemoval({repository:repo,babyId:'b1',menuId:'w1',mealId:'m1',now:'2026-08-16T03:00:00.000Z',refresh:async()=>{},notify:()=>{}}),null);
  assert.equal(await repo.get('weeklyMenus','w1'),undefined);
  const other=new MemoryRepository({weeklyMenus:[menu()]});
  assert.equal(await runActualMealMutation({repository:other,babyId:'b2',menuId:'w1',mealId:'m1',input:{name:'苹果',occurredAt:'2026-08-16T01:00:00.000Z'},now:'2026-08-16T02:00:00.000Z',refresh:async()=>{},notify:()=>{}}),null);
  assert.equal(Object.hasOwn((await other.get('weeklyMenus','w1')).days[0].meals[0],'actualMeal'),false);
});

test('atomic menu updates serialize concurrent mutations and preserve both meals',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]});
  await Promise.all([
    updateMenuAtomically({repository:repo,menuId:'w1',babyId:'b1',mutate:value=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map(meal=>meal.id==='m1'?{...meal,status:'eaten'}:meal)}))})}),
    updateMenuAtomically({repository:repo,menuId:'w1',babyId:'b1',mutate:value=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map(meal=>meal.id==='m2'?{...meal,status:'skipped'}:meal)}))})})
  ]);
  assert.deepEqual((await repo.get('weeklyMenus','w1')).days[0].meals.map(item=>item.status),['eaten','skipped']);
});

test('atomic menu update never recreates a deleted target or crosses babies',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]});
  await repo.delete('weeklyMenus','w1');
  await assert.rejects(updateMenuAtomically({repository:repo,menuId:'w1',babyId:'b1',mutate:value=>value}),/菜单不存在/);
  assert.equal(await repo.get('weeklyMenus','w1'),undefined);
  const other=new MemoryRepository({weeklyMenus:[menu()]});
  await assert.rejects(updateMenuAtomically({repository:other,menuId:'w1',babyId:'b2',mutate:value=>value}),/菜单不属于当前宝宝/);
});

test('default menu mutation reports post-commit refresh failure but returns null to suppress success paths',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]}),buttons=[{disabled:false},{disabled:false}],messages=[];
  const first=await runMenuMutation({repository:repo,menuId:'w1',babyId:'b1',controls:buttons,mutate:value=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map(meal=>meal.id==='m1'?{...meal,status:'eaten'}:meal)}))}),refresh:async()=>{throw new Error('刷新失败')},notify:value=>messages.push(value)});
  assert.equal(first,null);assert.equal((await repo.get('weeklyMenus','w1')).days[0].meals[0].status,'eaten');assert.deepEqual(buttons.map(item=>item.disabled),[false,false]);assert.deepEqual(messages,['记录已保存，但页面刷新失败，请重新打开页面']);
  await runMenuMutation({repository:repo,menuId:'w1',babyId:'b1',controls:buttons,mutate:value=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map(meal=>meal.id==='m2'?{...meal,status:'skipped'}:meal)}))}),refresh:async()=>{},notify:value=>messages.push(value)});
  assert.deepEqual((await repo.get('weeklyMenus','w1')).days[0].meals.map(item=>item.status),['eaten','skipped']);
});

test('actual meal mutation returns its committed update and signals refresh failure structurally',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]}),messages=[];let refreshFailure=null;
  const updated=await runActualMealMutation({repository:repo,babyId:'b1',menuId:'w1',mealId:'m1',input:{name:'粥',occurredAt:'2026-08-16T01:00:00.000Z'},now:'2026-08-16T02:00:00.000Z',refresh:async()=>{throw new Error('刷新失败')},notify:value=>messages.push(value),onRefreshError:error=>{refreshFailure=error}});
  assert.equal(updated.days[0].meals[0].actualMeal.name,'粥');assert.equal(refreshFailure.message,'刷新失败');assert.deepEqual(messages,['记录已保存，但页面刷新失败，请重新打开页面']);
});

test('replacement keeps default null result when its committed refresh fails',async()=>{
  const source={id:'w1',babyId:'b1',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'m1',recipeId:'old',mealType:'lunch',status:'planned'}]}]},repo=new MemoryRepository({weeklyMenus:[source],foodPreferences:[{id:'b1',babyId:'b1',excluded:[],favorites:[],disliked:[]}]}),store={activeBabyId:'b1',activeBaby:{stage:'stage4'}},catalog=[{id:'old',stage:'stage4',mealSlots:['午餐'],name:'旧餐'},{id:'next',stage:'stage4',mealSlots:['午餐'],name:'新餐'}],messages=[];
  const result=await runReplaceMenuMutation({repository:repo,store,menuId:'w1',mealId:'m1',catalog,refresh:async()=>{throw new Error('刷新失败')},notify:value=>messages.push(value)});
  assert.equal(result,null);assert.equal((await repo.get('weeklyMenus','w1')).days[0].meals[0].recipeId,'next');assert.deepEqual(messages,['记录已保存，但页面刷新失败，请重新打开页面']);
});

test('menu mutation locks controls before asynchronous preparation',async()=>{
  const repo=new MemoryRepository({weeklyMenus:[menu()]}),controls=[{disabled:false}],seen=[];
  await runMenuMutation({repository:repo,menuId:'w1',babyId:'b1',controls,prepare:async()=>{seen.push(controls[0].disabled);return'eaten'},mutate:(value,status)=>({...value,days:value.days.map(day=>({...day,meals:day.meals.map((meal,index)=>index?meal:{...meal,status})}))}),refresh:async()=>{},notify:()=>{}});
  assert.deepEqual(seen,[true]);assert.equal(controls[0].disabled,false);
});

test('queued replacement keeps the clicked baby and stage after active baby switches',async()=>{
  const oldMenu={id:'old-menu',babyId:'old-baby',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'m1',recipeId:'old-recipe',mealType:'lunch',status:'planned'}]}]},newMenu={id:'new-menu',babyId:'new-baby',startDate:'2026-08-03',days:[]};
  const repo=new MemoryRepository({weeklyMenus:[oldMenu,newMenu],foodPreferences:[{id:'old-baby',babyId:'old-baby',excluded:[],favorites:[],disliked:[]}]});
  const catalog=[{id:'old-recipe',stage:'old-stage',mealSlots:['午餐'],name:'旧餐'},{id:'old-choice',stage:'old-stage',mealSlots:['午餐'],name:'旧宝宝候选'},{id:'new-choice',stage:'new-stage',mealSlots:['午餐'],name:'新宝宝候选'}];
  const store={activeBabyId:'old-baby',activeBaby:{id:'old-baby',stage:'old-stage'}};
  let release;const gate=new Promise(resolve=>{release=resolve});
  const blocker=updateMenuAtomically({repository:repo,menuId:'old-menu',babyId:'old-baby',mutate:async value=>{await gate;return value}});
  const replacement=runReplaceMenuMutation({repository:repo,store,menuId:'old-menu',mealId:'m1',catalog,controls:[],refresh:async()=>{},notify:()=>{}});
  store.activeBabyId='new-baby';store.activeBaby={id:'new-baby',stage:'new-stage'};
  release();await blocker;await replacement;
  assert.equal((await repo.get('weeklyMenus','old-menu')).days[0].meals[0].recipeId,'old-choice');
  assert.deepEqual(await repo.get('weeklyMenus','new-menu'),newMenu);
});

for(const boundary of ['baby-switch','backup-import','baby-delete'])test(`${boundary} resets real menu browser state`,()=>{
  const browser=createMenuBrowser();browser.showHistory('old');browser.editHistory();
  resetMenuBrowserForBoundary(browser);
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
});
