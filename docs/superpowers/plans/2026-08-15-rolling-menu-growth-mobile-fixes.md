# Rolling Menus, Growth Summaries, and Mobile Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make menus run from the generation date for seven days, retain six menus per baby, show latest growth values, remove nap-to-meal rescheduling, and repair iPhone Settings/timeline interaction.

**Architecture:** Replace natural-week identity with exact local start-date identity while keeping legacy menu normalization and date validation. Derive growth summaries from the render snapshot, keep schedule and mobile layout changes isolated, and protect every behavior with focused tests before release.

**Tech Stack:** Vanilla JavaScript ES modules, IndexedDB repository abstraction, HTML/CSS PWA, Node.js built-in test runner.

---

## File Map

- Modify `src/features/meals/week-menu.js`: exact-date menu lookup/save and six-menu retention.
- Modify `src/features/meals/menu-browser.js`: history excludes only today's exact-start menu and remains sorted.
- Modify `src/store.js`: select today's exact-start menu after import/load.
- Modify `src/app.js`: generate from today, pass growth data, remove nap scheduling configuration and behavior.
- Modify `src/ui/growth.js`: latest value cards and bounded timeline markup.
- Modify `assets/styles/app.css`: responsive Settings controls and internal timeline scrolling.
- Modify focused tests under `tests/`: prove each behavioral contract.
- Modify `service-worker.js` and `PROJECT_STATE.md`: release cache revision and verified state.

### Task 1: Exact-Date Seven-Day Menus and Six-Menu Retention

**Files:**
- Modify: `src/features/meals/week-menu.js`
- Modify: `src/features/meals/menu-browser.js`
- Modify: `src/store.js`
- Test: `tests/week-menu.test.js`
- Test: `tests/menu-browser.test.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: Write failing exact-date lookup and retention tests**

Add tests equivalent to:

```js
test('today menu identity uses exact start date instead of natural week',()=>{
  const menus=[
    {id:'imported',babyId:'b1',startDate:'2026-08-10'},
    {id:'today',babyId:'b1',startDate:'2026-08-15'}
  ];
  assert.equal(findMenuForDate(menus,{babyId:'b1',date:'2026-08-15'}).id,'today');
});

test('saving a seventh menu keeps only the newest six for that baby',async()=>{
  const existing=['2026-07-04','2026-07-11','2026-07-18','2026-07-25','2026-08-01','2026-08-08']
    .map((startDate,index)=>({id:`m${index}`,babyId:'b1',startDate,days:[]}));
  const repo=new MemoryRepository({weeklyMenus:existing});
  await saveCurrentMenu(repo,[],{id:'today',babyId:'b1',startDate:'2026-08-15',days:[]},'2026-08-15T08:00:00.000Z');
  const saved=await repo.list('weeklyMenus',{babyId:'b1'});
  assert.equal(saved.length,6);
  assert.equal(saved.some(menu=>menu.startDate==='2026-07-04'),false);
  assert.equal(saved.some(menu=>menu.startDate==='2026-08-15'),true);
});
```

Also cover same-date overwrite identity, other-baby isolation, invalid dates, tie-breaking, and imported `2026-08-10` remaining history on `2026-08-15`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/week-menu.test.js tests/menu-browser.test.js tests/store.test.js
```

Expected: FAIL because lookup/save still collapse dates to their Monday natural week and do not prune to six.

- [ ] **Step 3: Implement exact-date identity and transactional retention**

Replace natural-week matching with validated exact local dates:

```js
export function menuRange(value){
  const startDate=localDateKey(parseLocalDate(value));
  return{startDate,endDate:addLocalDays(startDate,6)};
}

export function findMenuForDate(menus,{babyId,date}={}){
  const target=localDateKey(parseLocalDate(date));
  const menu=Array.isArray(menus)
    ? menus.find(item=>item?.babyId===babyId&&item.startDate===target)
    : null;
  return menu?normalizeMenu(menu):null;
}
```

Inside the existing `weeklyMenus` read/write transaction, select the keeper by exact `startDate`, write once, sort all same-baby menus newest-first by `startDate`, `updatedAt`, then `id`, and delete entries after index 5. Preserve `weekStart` as a compatibility export only if existing tests or old display helpers still need it; current-menu identity must not call it.

Rename the persistence export from `saveCurrentWeek` to `saveCurrentMenu` and update its imports/callers in `src/app.js` and tests so the API name matches exact-date behavior. Do not retain two production implementations.

- [ ] **Step 4: Update store and history consumers**

Use:

```js
this.week=findMenuForDate(this.weeks,{babyId:this.activeBabyId,date:today});
```

Update `historyMenus` to exclude only the exact current start date and limit the UI source to the retained repository records without inventing dates.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/features/meals/week-menu.js src/features/meals/menu-browser.js src/store.js tests/week-menu.test.js tests/menu-browser.test.js tests/store.test.js
git commit -m "feat: use rolling seven-day menus"
```

### Task 2: Generate Today Through the Next Six Days

**Files:**
- Modify: `src/app.js`
- Modify: `src/ui/meals.js`
- Test: `tests/app.test.js`
- Test: `tests/ui-contract.test.js`

- [ ] **Step 1: Write failing generation and display tests**

```js
test('generation starts on today instead of Monday',async()=>{
  let received;
  await generateCurrentMenu({
    repository:{},weeks:[],current:null,baby:{id:'b1',stage:'stage4'},recipes:[],
    date:'2026-08-15',generate:(_catalog,options)=>(received=options,{id:'m',babyId:'b1',startDate:options.startDate,days:[]}),
    save:async()=>{}
  });
  assert.equal(received.startDate,'2026-08-15');
});
```

Add UI assertions that the range reads `2026-08-15 至 2026-08-21`, and that an imported `2026-08-10` menu is available under history rather than current.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
node --test tests/app.test.js tests/ui-contract.test.js
```

Expected: FAIL with generated start date `2026-08-10` or natural-week range.

- [ ] **Step 3: Implement the minimal generation/display change**

Pass the validated local date directly:

```js
const generated=generate(catalog,{
  babyId:baby.id,
  stage:baby.stage,
  startDate:date,
  createId:idFactory
});
```

Use the rolling `menuRange` helper in menu range labels. Keep same-date overwrite confirmation and generation single-flight behavior unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/app.js src/ui/meals.js tests/app.test.js tests/ui-contract.test.js
git commit -m "fix: start menus on generation day"
```

### Task 3: Latest Growth Summary Values

**Files:**
- Modify: `src/ui/growth.js`
- Modify: `src/app.js`
- Test: `tests/ui-contract.test.js`
- Test: `tests/app.test.js`

- [ ] **Step 1: Write failing latest-record tests**

```js
test('growth cards show latest valid weight height and tooth values',()=>{
  const html=growthView({
    measurements:[
      {id:'old',date:'2026-08-01',weight:12,height:82},
      {id:'new',date:'2026-08-15',weight:12.55,height:83.6}
    ],
    teeth:[{id:'t8',date:'2026-08-14',number:8}],
    timeline:[]
  });
  assert.match(html,/12\.55 kg/);
  assert.match(html,/83\.6 cm/);
  assert.match(html,/第 8 颗/);
  assert.match(html,/2026-08-15/);
});
```

Add cases for empty data (`添加记录`), invalid values, and stable same-date selection.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
node --test tests/ui-contract.test.js tests/app.test.js
```

Expected: FAIL because `growthView` always renders add-record labels.

- [ ] **Step 3: Add a pure latest-summary helper and render it**

Implement a non-mutating helper in `src/ui/growth.js`:

```js
export function latestGrowthSummaries(measurements=[],teeth=[]){
  const newest=(items,valid)=>items.filter(valid).slice().sort((a,b)=>
    String(b.date).localeCompare(String(a.date))||
    String(b.updatedAt||b.createdAt||b.id||'').localeCompare(String(a.updatedAt||a.createdAt||a.id||''))
  )[0]||null;
  return{
    weight:newest(measurements,item=>Number.isFinite(Number(item.weight))&&Number(item.weight)>=0&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)),
    height:newest(measurements,item=>Number.isFinite(Number(item.height))&&Number(item.height)>=0&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)),
    tooth:newest(teeth,item=>Number.isInteger(Number(item.number))&&Number(item.number)>0&&/^\d{4}-\d{2}-\d{2}$/.test(item.date))
  };
}
```

Render each value plus date in the existing clickable summary card. Pass `allData.growthMeasurements` and `allData.toothRecords`, filtered by active baby, from `render()`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run Step 2. Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/growth.js src/app.js tests/ui-contract.test.js tests/app.test.js
git commit -m "feat: show latest growth summaries"
```

### Task 4: Remove Nap-to-Meal Configuration and Rescheduling

**Files:**
- Modify: `src/app.js`
- Modify: `src/features/schedule/template.js`
- Modify: `src/features/schedule/sleep-anchor.js`
- Test: `tests/sleep-anchor.test.js`
- Test: `tests/sleep-workflow.test.js`
- Test: `tests/ui-contract.test.js`

- [ ] **Step 1: Write failing behavior/UI tests**

```js
test('nap completion no longer moves the next meal',()=>{
  const tasks=[
    {id:'nap',babyId:'b1',date:'2026-08-15',type:'sleep',plannedAt:'2026-08-15T13:00:00.000Z',status:'upcoming'},
    {id:'meal',babyId:'b1',date:'2026-08-15',type:'meal',plannedAt:'2026-08-15T15:30:00.000Z',status:'upcoming'}
  ];
  assert.deepEqual(
    applySleepAnchor(tasks,{type:'nap',babyId:'b1',date:'2026-08-15',endAt:'2026-08-15T14:00:00.000Z'}),
    tasks
  );
});
```

Keep a separate passing expectation that night sleep still anchors wake and cascades later tasks. Assert `openSchedule` source/UI no longer contains the Chinese nap setting label or `name="napToMealMinutes"`.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
node --test tests/sleep-anchor.test.js tests/sleep-workflow.test.js tests/ui-contract.test.js
```

Expected: nap test fails because the next meal is moved; UI test finds the old field.

- [ ] **Step 3: Remove nap behavior while preserving night behavior**

In `applySleepAnchor`, return the cloned input unchanged for `sleep.type==='nap'`. Remove `napToMealMinutes` from `createDefaultTemplate`, the schedule dialog body, and the schedule save assignment. In replay/recalculation functions, stop reading/passing the field. Do not reject or delete an old imported field.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run Step 2. Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/app.js src/features/schedule/template.js src/features/schedule/sleep-anchor.js tests/sleep-anchor.test.js tests/sleep-workflow.test.js tests/ui-contract.test.js
git commit -m "fix: stop naps from moving meals"
```

### Task 5: Mobile Settings and Bounded Timeline Interaction

**Files:**
- Modify: `src/ui/growth.js`
- Modify: `src/ui/settings.js`
- Modify: `assets/styles/app.css`
- Test: `tests/ui-contract.test.js`

- [ ] **Step 1: Write failing responsive contracts**

Require dedicated markup classes and CSS:

```js
assert.match(growthHtml,/class="timeline timeline-scroll"/);
assert.match(css,/\.timeline-scroll\{[^}]*max-height:[^;}]+;[^}]*overflow-y:auto/);
assert.match(css,/\.settings-list[^}]*min-width:0/);
assert.match(css,/\.settings-page[^}]*overflow-wrap:anywhere/);
assert.match(css,/#timeline-filter[^}]*min-height:44px/);
```

Also assert that the filter remains a native select with all existing options.

- [ ] **Step 2: Run UI tests and verify RED**

```powershell
node --test tests/ui-contract.test.js
```

Expected: FAIL because bounded timeline and Settings containment rules do not exist.

- [ ] **Step 3: Implement bounded, tappable markup and CSS**

Add a Settings page class and timeline class. Apply rules equivalent to:

```css
.settings-page,.settings-page>*{min-width:0;max-width:100%}
.settings-page button,.settings-page select,.settings-page .file-button{max-width:100%;overflow-wrap:anywhere}
#timeline-filter{position:relative;z-index:1;min-height:44px;touch-action:manipulation}
.timeline-scroll{max-height:18rem;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-right:6px}
@media(max-width:480px){.settings-page .button-row>*{width:100%}}
```

Use a height that manual browser testing confirms shows roughly three days for ordinary entries; do not use viewport meta restrictions to force zoom behavior.

- [ ] **Step 4: Run UI tests and verify GREEN**

Run Step 2. Expected: all UI tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/growth.js src/ui/settings.js assets/styles/app.css tests/ui-contract.test.js
git commit -m "fix: contain mobile settings and timeline"
```

### Task 6: Release Compatibility, Browser Acceptance, and Deployment

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/pwa.test.js`
- Modify: any other test that pins the cache revision
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1: Write the failing cache-revision assertion**

Update release tests to require `baby-growth-v1-20260720-r29`, including scoped activation cleanup and current-cache reads.

- [ ] **Step 2: Run PWA tests and verify RED**

```powershell
node --test tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: FAIL because the Service Worker is still r28.

- [ ] **Step 3: Bump the Service Worker to r29**

Change only the cache revision string; keep the complete app shell, app-prefix cleanup, navigation network-first behavior, and current-cache-only asset reads.

- [ ] **Step 4: Run complete automated verification**

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

Expected: all tests pass, syntax check exits 0, and diff check has no errors. Existing user-owned `README.md` and untracked `AGENTS.md` remain unstaged.

- [ ] **Step 5: Perform manual browser acceptance**

At 320px and 375px:

1. Import/seed an older `2026-08-10` menu and verify it appears under history on `2026-08-15`.
2. Generate a menu and verify dates `08-15` through `08-21`, with 21 meals.
3. Generate seven distinct dated menus and verify only the newest six remain for that baby.
4. Add weight `12.55`, height `83.6`, and tooth `8`; verify value and date summaries.
5. Open Settings, interact with selects/file controls, pinch/resize, and verify document `scrollWidth===clientWidth` after release.
6. Tap the timeline filter, change type, and verify the timeline region scrolls internally while the page width remains contained.
7. Complete a nap and verify no meal time changes; complete night sleep and verify wake anchoring remains.

- [ ] **Step 6: Record only verified facts**

Update `PROJECT_STATE.md` with the final test count, r29, and exact browser checks completed.

- [ ] **Step 7: Commit release preparation**

```powershell
git add service-worker.js tests/pwa.test.js tests/meal-presentation.test.js PROJECT_STATE.md
git commit -m "release: prepare rolling menu mobile update"
```

- [ ] **Step 8: Push only after merged verification**

```powershell
git push origin main
```

Verify `https://kingly87.github.io/baby-meal-pwa/service-worker.js` contains r29 before reporting deployment complete.
