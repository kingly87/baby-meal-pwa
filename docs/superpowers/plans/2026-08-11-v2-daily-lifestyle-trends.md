# V2 Daily Lifestyle Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily sleep, milk, stool and urine comparisons for 7, 14 and 30 days using the approved single-chart mobile layout.

**Architecture:** Add a pure daily aggregator that returns continuous local-date buckets with `hasData`, average and previous-period delta. Render the selected metric as an accessible bar chart; keep selection state in the current UI and derive every chart from repository records.

**Tech Stack:** Vanilla ES modules, existing dailyRecords/sleepSessions stores, inline SVG, Node tests, PWA cache.

---

### Task 1: Aggregate continuous daily lifestyle metrics

**Files:**
- Create: `src/features/growth/daily-trends.js`
- Create: `tests/daily-trends.test.js`

- [ ] **Step 1: Write failing aggregation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyTrendModel } from '../src/features/growth/daily-trends.js';

test('aggregates milk stool urine and splits sleep across local days',()=>{
  const source={
    records:[
      {type:'milk',value:120,occurredAt:'2026-08-01T08:00:00+08:00'},
      {type:'milk',value:150,occurredAt:'2026-08-01T12:00:00+08:00'},
      {type:'stool',value:2,occurredAt:'2026-08-01T13:00:00+08:00'},
      {type:'urine',value:1,occurredAt:'2026-08-02T09:00:00+08:00'}
    ],
    sleeps:[{startAt:'2026-08-01T23:00:00+08:00',endAt:'2026-08-02T02:00:00+08:00'}]
  };
  const model=dailyTrendModel({...source,metric:'sleep',days:2,endDate:'2026-08-02'});
  assert.deepEqual(model.points.map(item=>item.value),[60,120]);
  assert.equal(dailyTrendModel({...source,metric:'milk',days:2,endDate:'2026-08-02'}).points[0].value,270);
});

test('distinguishes missing data from recorded zero',()=>{
  const model=dailyTrendModel({records:[{type:'milk',value:0,occurredAt:'2026-08-02T08:00:00+08:00'}],sleeps:[],metric:'milk',days:2,endDate:'2026-08-02'});
  assert.deepEqual(model.points.map(item=>({value:item.value,hasData:item.hasData})),[{value:0,hasData:false},{value:0,hasData:true}]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/daily-trends.test.js`

Expected: FAIL because `daily-trends.js` does not exist.

- [ ] **Step 3: Implement local-day buckets**

Build `dateRange(endDate,days)`, group records by `localDateKey(new Date(occurredAt))`, and calculate sleep overlap using `minutesOverlappingLocalDay`. For stool, sum legacy `value`; urine records default to 1. Return `{metric,days,unit,points,average,previousAverage,delta}` where each point is `{date,value,hasData}`.

- [ ] **Step 4: Add period comparison tests**

Add a test with 14 current and 14 previous milk days, asserting average and delta. Add range tests for 7, 14 and 30 days and reject other values.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/daily-trends.test.js tests/records.test.js`

```powershell
git add src/features/growth/daily-trends.js tests/daily-trends.test.js
git commit -m "feat: aggregate daily lifestyle trends"
```

### Task 2: Add one-tap stool and urine records

**Files:**
- Modify: `src/features/records/records.js`
- Modify: `src/ui/records.js`
- Modify: `src/ui/today.js`
- Modify: `src/app.js`
- Modify: `tests/records.test.js`
- Modify: `tests/ui-contract.test.js`

- [ ] **Step 1: Add failing quick-record tests**

```js
test('creates one-tap toilet records with value one',()=>{
  const stool=createCountRecord({babyId:'b1',type:'stool',occurredAt:'2026-08-11T08:00:00.000Z'},()=> 's1');
  const urine=createCountRecord({babyId:'b1',type:'urine',occurredAt:'2026-08-11T09:00:00.000Z'},()=> 'u1');
  assert.equal(stool.value,1);
  assert.equal(urine.value,1);
  assert.throws(()=>createCountRecord({babyId:'b1',type:'milk'}),/类型/);
});
```

Add UI assertions for `data-quick="urine"`, `data-record="urine"`, and separate labels “大便”“小便”.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/records.test.js tests/ui-contract.test.js`

Expected: FAIL because urine and `createCountRecord` are absent.

- [ ] **Step 3: Implement count records and bindings**

Add `createCountRecord()` restricted to stool/urine. In `openRecord`, save these types immediately with value 1 and current time; keep milk numeric dialog unchanged. Update record labels and both quick-action surfaces.

- [ ] **Step 4: Verify and commit**

Run: `node --test tests/records.test.js tests/ui-contract.test.js && npm.cmd test && npm.cmd run check`

```powershell
git add src/features/records/records.js src/ui/records.js src/ui/today.js src/app.js tests/records.test.js tests/ui-contract.test.js
git commit -m "feat: record stool and urine separately"
```

### Task 3: Render the approved single-metric bar chart

**Files:**
- Create: `src/ui/daily-trends.js`
- Create: `tests/daily-trends-ui.test.js`
- Modify: `src/ui/growth.js`
- Modify: `assets/styles/app.css`

- [ ] **Step 1: Write failing accessible chart tests**

```js
import { dailyTrendChart } from '../src/ui/daily-trends.js';

test('renders selected metric bars with missing-data distinction',()=>{
  const html=dailyTrendChart({metric:'sleep',days:7,unit:'小时',average:11.5,delta:.4,points:[{date:'2026-08-01',value:11,hasData:true},{date:'2026-08-02',value:0,hasData:false}]});
  assert.match(html,/role="img"/);
  assert.match(html,/8月1日.*11小时/);
  assert.match(html,/data-missing="true"/);
  assert.match(html,/比前7天增加 0.4 小时/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/daily-trends-ui.test.js`

Expected: FAIL because the UI module does not exist.

- [ ] **Step 3: Implement SVG bars and controls**

Render metric buttons for sleep/milk/stool/urine and range buttons for 7/14/30. Use SVG `<rect>` bars with `<title>` per point and keyboard-focusable surrounding buttons. For 14/30-day views, label only evenly spaced dates while retaining all bars and titles. Render average and signed delta below the chart.

- [ ] **Step 4: Add responsive CSS**

Use a wrapping control row, `min-width:0`, and an SVG viewBox. At `max-width:380px`, keep metric controls in a two-column grid. Missing bars use a neutral patterned/outlined mark paired with text, not color alone.

- [ ] **Step 5: Run UI tests and commit**

Run: `node --test tests/daily-trends-ui.test.js tests/ui-contract.test.js`

```powershell
git add src/ui/daily-trends.js src/ui/growth.js assets/styles/app.css tests/daily-trends-ui.test.js tests/ui-contract.test.js
git commit -m "feat: show daily lifestyle comparison chart"
```

### Task 4: Wire repository data and interactive switching

**Files:**
- Modify: `src/app.js`
- Modify: `tests/app.test.js`
- Modify: `tests/ui-contract.test.js`

- [ ] **Step 1: Add failing model/wiring tests**

Export `loadDailyTrend(repository,{babyId,metric,days,endDate})` and assert it reads only the selected baby. Add source-contract assertions that `trend-metric` and `trend-days` actions reload the chart without changing route.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/app.test.js tests/ui-contract.test.js`

Expected: FAIL because the loader and action bindings do not exist.

- [ ] **Step 3: Implement loader and local selection state**

Initialize `{metric:'sleep',days:7}` in `browserApp`. During growth render, load dailyRecords and sleepSessions for `activeBabyId`, call `dailyTrendModel`, and pass it to `growthView`. On metric/range clicks, update this in-memory state and rerender growth.

- [ ] **Step 4: Verify interactions and commit**

Run: `node --test tests/app.test.js tests/daily-trends.test.js tests/daily-trends-ui.test.js tests/ui-contract.test.js && npm.cmd test && npm.cmd run check`

```powershell
git add src/app.js tests/app.test.js tests/ui-contract.test.js
git commit -m "feat: connect lifestyle trends to baby records"
```

### Task 5: PWA, mobile acceptance and release verification

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/pwa.test.js`
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1: Add failing cache assertions**

Assert `APP_SHELL` includes `src/features/growth/daily-trends.js` and `src/ui/daily-trends.js`, and assert the cache revision differs from the previous plan's revision.

- [ ] **Step 2: Update cache and run full verification**

Run: `npm.cmd test && npm.cmd run check && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 3: Perform mobile browser acceptance**

At widths 320, 375, 390 and 430 verify: metric buttons wrap without clipping; 7/14/30-day bars remain visible; date labels do not overlap; selecting sleep/milk/stool/urine updates units and values; a missing date is visually distinct from recorded zero; console contains no errors.

- [ ] **Step 4: Verify V1 backup recovery end-to-end**

In a clean browser profile, select a V1 backup, verify baby/record counts, then confirm the restored baby's milk, stool and sleep appear in the trend chart. Export again and validate the new backup.

- [ ] **Step 5: Update state and commit**

Record only verified counts and behaviors in `PROJECT_STATE.md`.

```powershell
git add service-worker.js tests/pwa.test.js PROJECT_STATE.md
git commit -m "chore: finalize V2 offline release"
```
