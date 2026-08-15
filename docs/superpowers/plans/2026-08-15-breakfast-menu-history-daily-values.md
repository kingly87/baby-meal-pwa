# Breakfast Menu, History, and Daily Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate safe breakfast/lunch/dinner menus, expose confirm-to-edit menu history, and print every day's exact lifestyle value above its chart bar.

**Architecture:** Add a focused week-menu compatibility module that owns calendar-week identity, legacy meal-type interpretation, and same-week replacement. Extend the existing planner with meal-type-aware candidate pools, keep menu browsing state separate from persisted data, and enhance the existing SVG trend widget without changing its aggregation model.

**Tech Stack:** Browser ES modules, IndexedDB repository abstraction, HTML/CSS/SVG, Node.js built-in test runner, GitHub Pages PWA.

---

## File Structure

- Create `src/features/meals/week-menu.js`: calendar week identity, legacy menu normalization, current-week lookup, and same-week upsert.
- Create `tests/week-menu.test.js`: unit tests for compatibility and same-week replacement.
- Modify `src/features/meals/planner.js`: meal-type-aware candidate selection and persisted `mealType`.
- Modify `tests/meals.test.js`: three-meal generation and safety/diversity contracts.
- Modify `src/store.js`: select the actual current calendar week instead of the newest arbitrary record.
- Modify `src/ui/meals.js`: current/history switcher, meal labels, read-only history, edit entry point.
- Modify `src/app.js`: menu browser state, target-menu writes, confirmation gates, and current-week replacement.
- Modify `tests/app.test.js` and `tests/ui-contract.test.js`: state reset, correct target writes, history confirmation, and mobile UI contracts.
- Modify `src/ui/daily-trends.js`: exact value labels for every point.
- Modify `assets/styles/app.css`: readable labels and 7/14/30-day responsive chart widths.
- Modify `tests/daily-trends-ui.test.js`: exact-value, missing-value, zero-value, density, and unit coverage.
- Modify `src/features/backup/validate.js` and `tests/backup.test.js`: optional valid `mealType` compatibility.
- Modify `service-worker.js`, `tests/pwa.test.js`, and `tests/meal-presentation.test.js`: publish a fresh PWA cache revision.
- Modify `PROJECT_STATE.md`: record only verified behavior and test evidence.

### Task 1: Calendar-week identity and legacy menu compatibility

**Files:**
- Create: `src/features/meals/week-menu.js`
- Create: `tests/week-menu.test.js`

- [ ] **Step 1: Write failing tests for Monday week boundaries and legacy meals**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, weekRange, normalizeMenu, findMenuForWeek } from '../src/features/meals/week-menu.js';

test('normalizes a local date to Monday and exposes a seven-day range',()=>{
  assert.equal(weekStart('2026-08-15'),'2026-08-10');
  assert.deepEqual(weekRange('2026-08-15'),{startDate:'2026-08-10',endDate:'2026-08-16'});
});

test('interprets legacy two-meal days as lunch and dinner without mutation',()=>{
  const source={id:'old',startDate:'2026-08-10',days:[{date:'2026-08-10',meals:[{id:'a'},{id:'b'}]}]};
  const normalized=normalizeMenu(source);
  assert.deepEqual(normalized.days[0].meals.map(meal=>meal.mealType),['lunch','dinner']);
  assert.equal(source.days[0].meals[0].mealType,undefined);
});

test('finds only the selected baby and calendar week',()=>{
  const menus=[{id:'a',babyId:'b1',startDate:'2026-08-10'},{id:'b',babyId:'b2',startDate:'2026-08-10'}];
  assert.equal(findMenuForWeek(menus,{babyId:'b1',date:'2026-08-15'}).id,'a');
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test tests/week-menu.test.js`

Expected: FAIL because `src/features/meals/week-menu.js` does not exist.

- [ ] **Step 3: Implement the compatibility module**

```js
const TYPES=['breakfast','lunch','dinner'];
const dateKey=date=>date.toISOString().slice(0,10);
export function weekStart(value){
  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))throw new Error('菜单日期无效');
  const offset=(date.getDay()+6)%7;
  date.setDate(date.getDate()-offset);
  return dateKey(date);
}
export function weekRange(value){
  const startDate=weekStart(value),end=new Date(`${startDate}T12:00:00`);
  end.setDate(end.getDate()+6);
  return{startDate,endDate:dateKey(end)};
}
export function normalizeMenu(menu){
  return{...menu,days:(menu.days||[]).map(day=>({...day,meals:(day.meals||[]).map((meal,index,all)=>({...meal,mealType:meal.mealType||(all.length>=3?TYPES[index]:['lunch','dinner'][index])}))}))};
}
export function findMenuForWeek(menus,{babyId,date}){
  const startDate=weekStart(date);
  return menus.find(menu=>menu.babyId===babyId&&weekStart(menu.startDate)===startDate)||null;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/week-menu.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the compatibility boundary**

```powershell
git add src/features/meals/week-menu.js tests/week-menu.test.js
git commit -m "feat: add week menu compatibility model"
```

### Task 2: Generate safe breakfast, lunch, and dinner

**Files:**
- Modify: `src/features/meals/planner.js`
- Modify: `tests/meals.test.js`

- [ ] **Step 1: Write failing three-meal and breakfast safety tests**

```js
test('weekly generation creates breakfast lunch and dinner for seven days',()=>{
  let sequence=0;
  const catalog=[
    rotationRecipe('breakfast','蛋','蒸蛋','蒸',{mealSlots:['早餐']}),
    rotationRecipe('lunch','鸡肉','软饭','焖',{mealSlots:['午餐','晚餐']}),
    rotationRecipe('dinner','鱼','面条','煮',{mealSlots:['午餐','晚餐']})
  ];
  const week=generateWeek(catalog,{babyId:'b1',stage:'stage4',startDate:'2026-08-10',random:()=>0,createId:()=>`m${++sequence}`});
  assert.equal(week.days.flatMap(day=>day.meals).length,21);
  assert.ok(week.days.every(day=>day.meals.map(meal=>meal.mealType).join(',')==='breakfast,lunch,dinner'));
  assert.ok(week.days.every(day=>day.meals[0].recipeId==='breakfast'));
});

test('breakfast hard-fails instead of using a lunch-only recipe',()=>{
  const catalog=[rotationRecipe('lunch','鸡肉','软饭','焖',{mealSlots:['午餐','晚餐']})];
  assert.throws(()=>generateWeek(catalog,{babyId:'b1',stage:'stage4',startDate:'2026-08-10'}),/早餐/);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/meals.test.js`

Expected: FAIL because the planner still creates two untyped meals and does not enforce breakfast slots.

- [ ] **Step 3: Add meal-type candidate pools while preserving hard safety rules**

```js
const MEAL_TYPES=['breakfast','lunch','dinner'];
const SLOT_LABELS={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};
function candidatesForMeal(candidates,mealType){
  const label=SLOT_LABELS[mealType];
  const pool=candidates.filter(recipe=>mealType==='breakfast'
    ? recipe.mealSlots?.includes('早餐')
    : !recipe.mealSlots?.length||recipe.mealSlots.includes(label));
  if(!pool.length)throw new Error(`当前条件下没有安全的${label}食谱`);
  return pool;
}
```

Update `generateWeek` to iterate `mealTypes = options.mealTypes || MEAL_TYPES`, select from `candidatesForMeal`, preserve the existing group/staple/texture/cooking-method novelty rules, and persist both `mealType` and `slot` on each meal.

- [ ] **Step 4: Update older tests that intentionally request one or two meals**

Change helper-only tests to pass explicit types, for example:

```js
mealTypes:['lunch']
```

Keep the public default test at 21 meals so the application contract is three meals.

- [ ] **Step 5: Run planner tests and verify GREEN**

Run: `node --test tests/meals.test.js tests/recipes.test.js`

Expected: all planner and catalog tests pass.

- [ ] **Step 6: Commit three-meal planning**

```powershell
git add src/features/meals/planner.js tests/meals.test.js
git commit -m "feat: generate breakfast lunch and dinner"
```

### Task 3: Store and replace one current menu per calendar week

**Files:**
- Modify: `src/features/meals/week-menu.js`
- Modify: `src/store.js`
- Modify: `tests/week-menu.test.js`
- Modify: `tests/store.test.js`

- [ ] **Step 1: Write failing same-week replacement and store-selection tests**

```js
test('saves a new week once and replaces the same week by stable id',async()=>{
  const writes=[],repo={async put(store,value){writes.push([store,value]);return value}};
  const old={id:'existing',babyId:'b1',startDate:'2026-08-10',days:[],createdAt:'old'};
  const generated={id:'new',babyId:'b1',startDate:'2026-08-10',days:[],createdAt:'new'};
  const saved=await saveCurrentWeek(repo,[old],generated,'2026-08-15T12:00:00.000Z');
  assert.equal(saved.id,'existing');
  assert.equal(saved.createdAt,'old');
  assert.equal(writes.length,1);
});
```

Add a store test with a future menu and current menu, asserting `store.week` is the menu containing `store.now()` rather than the lexicographically newest future menu.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/week-menu.test.js tests/store.test.js`

Expected: FAIL because `saveCurrentWeek` and current-week selection do not exist.

- [ ] **Step 3: Implement atomic same-week identity and current-week selection**

```js
export async function saveCurrentWeek(repository,menus,generated,now=new Date().toISOString()){
  const existing=findMenuForWeek(menus,{babyId:generated.babyId,date:generated.startDate});
  const value=existing?{...generated,id:existing.id,createdAt:existing.createdAt,updatedAt:now}:{...generated,updatedAt:now};
  await repository.put('weeklyMenus',value);
  return value;
}
```

In `AppStore.load()`, keep all menus sorted but select with `findMenuForWeek(this.weeks,{babyId:this.activeBabyId,date:today})`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/week-menu.test.js tests/store.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit weekly persistence**

```powershell
git add src/features/meals/week-menu.js src/store.js tests/week-menu.test.js tests/store.test.js
git commit -m "fix: keep one menu per calendar week"
```

### Task 4: Render current and historical menus with guarded editing

**Files:**
- Modify: `src/ui/meals.js`
- Modify: `src/app.js`
- Modify: `assets/styles/app.css`
- Modify: `tests/ui-contract.test.js`
- Modify: `tests/app.test.js`

- [ ] **Step 1: Write failing UI contracts**

```js
test('menu screen labels all meal types and exposes current and history modes',()=>{
  const week={id:'w1',startDate:'2026-08-10',days:[{date:'2026-08-10',meals:[
    {id:'b',mealType:'breakfast',name:'燕麦杯',status:'planned'},
    {id:'l',mealType:'lunch',name:'软饭',status:'planned'},
    {id:'d',mealType:'dinner',name:'面条',status:'planned'}
  ]}]};
  const html=mealsView({week,weeks:[week],menuBrowser:{mode:'current'},recipes:[]});
  for(const label of['早餐','午餐','晚餐'])assert.match(html,new RegExp(label));
  assert.match(html,/data-menu-mode="current"/);
  assert.match(html,/data-menu-mode="history"/);
});

test('historical menu is readonly until editing is confirmed',()=>{
  const html=mealsView({week:historical,weeks:[historical],menuBrowser:{mode:'history',selectedId:'old',editingHistory:false},recipes:[]});
  assert.match(html,/data-action="edit-history-menu"/);
  assert.doesNotMatch(html,/data-action="replace-meal"/);
});
```

- [ ] **Step 2: Run UI tests and verify RED**

Run: `node --test tests/ui-contract.test.js tests/app.test.js`

Expected: FAIL because menu modes, labels, and target-menu state are absent.

- [ ] **Step 3: Add isolated menu browser state**

Add an exported state helper in `src/app.js`:

```js
export function createMenuBrowserState(){
  let value={mode:'current',selectedId:null,editingHistory:false};
  return{value:()=>({...value}),showCurrent(){value={mode:'current',selectedId:null,editingHistory:false}},showHistory(id=null){value={mode:'history',selectedId:id,editingHistory:false}},select(id){value={...value,selectedId:id,editingHistory:false}},allowHistoryEdit(){value={...value,editingHistory:true}},reset(){value={mode:'current',selectedId:null,editingHistory:false}}};
}
```

Reset it when the active baby changes, a backup is imported, or a baby is deleted.

- [ ] **Step 4: Render menu modes and meal labels**

Pass `weeks` and `menuBrowser` into `mealsView`. Normalize legacy menus before display. Use a label map:

```js
const MEAL_LABELS={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};
```

Render history week buttons using `weekRange`, show the selected historical menu read-only, and only render mutation actions when `mode==='current'||editingHistory`.

- [ ] **Step 5: Bind guarded history editing and target-specific writes**

Use the selected menu ID for all history operations:

```js
const targetMenu=()=>menuBrowser.value().mode==='history'
  ? store.weeks.find(menu=>menu.id===menuBrowser.value().selectedId)
  : store.week;
```

The edit button must call:

```js
if(confirm('正在修改过去的饮食记录，是否继续？')){
  menuBrowser.allowHistoryEdit();
  await render(router.current);
}
```

Generate-menu must normalize the start date to Monday, confirm replacement when a current menu exists, call `saveCurrentWeek`, and never delete other weeks.

- [ ] **Step 6: Add phone-safe menu history styles**

Add `.menu-mode-tabs`, `.menu-history-list`, `.meal-type`, and a 320px media rule so tabs wrap, meal labels remain visible, and action buttons do not overflow.

- [ ] **Step 7: Run UI and app tests and verify GREEN**

Run: `node --test tests/ui-contract.test.js tests/app.test.js tests/meals.test.js tests/week-menu.test.js`

Expected: all tests pass.

- [ ] **Step 8: Commit menu history UX**

```powershell
git add src/ui/meals.js src/app.js assets/styles/app.css tests/ui-contract.test.js tests/app.test.js
git commit -m "feat: add editable menu history"
```

### Task 5: Show exact daily values above every trend bar

**Files:**
- Modify: `src/ui/daily-trends.js`
- Modify: `assets/styles/app.css`
- Modify: `tests/daily-trends-ui.test.js`

- [ ] **Step 1: Write failing exact-value tests**

```js
test('prints every daily value and distinguishes missing from recorded zero',()=>{
  const html=dailyTrendChart({...model,points:[
    {date:'2026-08-13',value:11.3,hasData:true},
    {date:'2026-08-14',value:0,hasData:false},
    {date:'2026-08-15',value:0,hasData:true}
  ]});
  assert.match(html,/class="trend-value"[^>]*>11\.3</);
  assert.match(html,/class="trend-value trend-value-missing"[^>]*>—</);
  assert.match(html,/class="trend-value"[^>]*>0</);
  assert.equal((html.match(/class="trend-date"/g)||[]).length,3);
});

test('keeps 7 days on one screen and scrolls 14 or 30 day values',()=>{
  assert.match(dailyTrendChart({...model,days:7}),/data-range="7"/);
  assert.match(dailyTrendChart({...model,days:30,points:thirtyPoints}),/data-range="30"/);
});
```

- [ ] **Step 2: Run the widget test and verify RED**

Run: `node --test tests/daily-trends-ui.test.js`

Expected: FAIL because no visible `.trend-value` is rendered and dense dates are suppressed.

- [ ] **Step 3: Render a visible value and date for every point**

In `barChart`, render both labels for all bars:

```js
const visibleValue=point.hasData?number(point.value):'—';
return `<g ...>
  <text class="trend-value${point.hasData?'':' trend-value-missing'}" x="${x+22}" y="14">${esc(visibleValue)}</text>
  ...bar rectangles...
  <text class="trend-date" x="${x+22}" y="190">${esc(shortDate)}</text>
</g>`;
```

Increase SVG height enough to prevent the value labels from colliding with the tallest bar. Add `data-range` to `.trend-scroll`.

- [ ] **Step 4: Make chart density responsive**

Use width `100%` for 7 points with per-point cells no narrower than 38px, and content width of at least `points.length * 44px` for 14/30 points. Add CSS for centered `.trend-value`, smaller 30-day labels, momentum scrolling, and scroll containment.

- [ ] **Step 5: Run focused trend tests and verify GREEN**

Run: `node --test tests/daily-trends-ui.test.js tests/daily-trends.test.js tests/ui-contract.test.js`

Expected: all tests pass; aggregation behavior remains unchanged.

- [ ] **Step 6: Commit daily values UI**

```powershell
git add src/ui/daily-trends.js assets/styles/app.css tests/daily-trends-ui.test.js
git commit -m "feat: label every daily trend value"
```

### Task 6: Backup compatibility, PWA release, and end-to-end verification

**Files:**
- Modify: `src/features/backup/validate.js`
- Modify: `tests/backup.test.js`
- Modify: `service-worker.js`
- Modify: `tests/pwa.test.js`
- Modify: `tests/meal-presentation.test.js`
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1: Write failing backup validation tests**

```js
test('accepts legacy meals without mealType and validates new meal types',()=>{
  assert.doesNotThrow(()=>previewBackup(JSON.stringify(legacyBackup)));
  assert.doesNotThrow(()=>previewBackup(JSON.stringify(backupWithMealType('breakfast'))));
  assert.throws(()=>previewBackup(JSON.stringify(backupWithMealType('snack'))),/weeklyMenus/);
});
```

- [ ] **Step 2: Run backup tests and verify RED**

Run: `node --test tests/backup.test.js`

Expected: FAIL because invalid new meal types are not rejected.

- [ ] **Step 3: Validate optional mealType without rejecting legacy backups**

Extend the weekly meal predicate with:

```js
(meal.mealType===undefined||['breakfast','lunch','dinner'].includes(meal.mealType))
```

- [ ] **Step 4: Bump the service worker cache using test-first expectations**

Change PWA tests to expect `baby-growth-v1-20260720-r27`, run them to see the expected RED failure, then change `service-worker.js` from r26 to r27.

Run: `node --test tests/pwa.test.js tests/meal-presentation.test.js`

Expected after implementation: all PWA tests pass.

- [ ] **Step 5: Run full automated verification**

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

Expected: zero failed tests, syntax check exit code 0, and no whitespace errors.

- [ ] **Step 6: Perform browser verification at phone width**

Verify in the local app:

1. Generate a Monday-Sunday menu with breakfast, lunch, and dinner on all seven days.
2. Replace a current meal and confirm only the current week's record changes.
3. Open an older week, confirm it is read-only, approve editing, then modify the target historical week.
4. Confirm legacy two-meal history displays as lunch/dinner.
5. Check sleep and milk at 7 days: all dates and exact values fit without horizontal scrolling.
6. Check 14 and 30 days: horizontal scrolling exposes every exact value and date.
7. Confirm missing days show `—` and recorded zero shows `0`.

- [ ] **Step 7: Update verified project state**

Add a dated section to `PROJECT_STATE.md` with the implemented behavior, final test count, syntax result, browser checks, and cache revision. Do not record unverified claims.

- [ ] **Step 8: Commit the release changes**

```powershell
git add src/features/backup/validate.js tests/backup.test.js service-worker.js tests/pwa.test.js tests/meal-presentation.test.js PROJECT_STATE.md
git commit -m "release: publish three-meal menu history update"
```

- [ ] **Step 9: Push and verify GitHub Pages**

```powershell
git push origin main
```

Then request `https://kingly87.github.io/baby-meal-pwa/service-worker.js` with cache bypass and verify it contains `baby-growth-v1-20260720-r27` before reporting deployment complete.

## Rollback During Execution

- Each task is a separate commit; if a stage fails review, revert only that task commit.
- Do not reset or discard the user's modified `README.md` or untracked `AGENTS.md`.
- No bulk IndexedDB migration is permitted. Legacy compatibility is computed on read.
- Same-week writes update one complete menu object. A failed write leaves the previously committed object intact.
