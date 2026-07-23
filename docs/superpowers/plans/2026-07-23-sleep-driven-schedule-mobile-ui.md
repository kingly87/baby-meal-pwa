# Sleep-driven Schedule and Mobile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让夜间睡眠和午间小睡的结束时间自动驱动当天后续作息，并把今日事项、睡眠计时和菜单卡片调整成清晰统一的手机端界面。

**Architecture:** 在 `src/features/schedule/sleep-anchor.js` 中实现无 DOM、可测试的睡眠锚点计算，应用层只负责读取同一宝宝当天任务并保存结果。UI 层通过小型展示辅助函数清理食谱名称、生成餐次摘要；现有 IndexedDB 结构与 recipe/meal ID 保持兼容。

**Tech Stack:** 原生 ES Modules、IndexedDB、HTML/CSS、Node.js `node:test`、静态 PWA。

---

### Task 1: Implement sleep-driven schedule rules

**Files:**
- Create: `src/features/schedule/sleep-anchor.js`
- Create: `tests/sleep-anchor.test.js`
- Modify: `service-worker.js`

- [ ] **Step 1: Write failing tests for night sleep and nap anchors**

Create `tests/sleep-anchor.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { applySleepAnchor } from '../src/features/schedule/sleep-anchor.js';

const tasks = [
  { id:'wake', type:'wake', date:'2026-07-23', status:'completed', plannedAt:'2026-07-23T00:00:00.000Z', actualAt:'2026-07-23T00:00:00.000Z', afterMinutes:0 },
  { id:'milk', type:'milk', date:'2026-07-23', status:'upcoming', plannedAt:'2026-07-23T00:20:00.000Z', afterMinutes:20 },
  { id:'meal1', type:'meal', date:'2026-07-23', status:'upcoming', plannedAt:'2026-07-23T02:20:00.000Z', afterMinutes:120 },
  { id:'nap', type:'sleep', date:'2026-07-23', status:'completed', plannedAt:'2026-07-23T04:00:00.000Z', actualAt:'2026-07-23T04:00:00.000Z', afterMinutes:100 },
  { id:'meal2', type:'meal', date:'2026-07-23', status:'upcoming', plannedAt:'2026-07-23T08:00:00.000Z', afterMinutes:120 }
];

test('night sleep end becomes wake time and cascades unfinished tasks', () => {
  const result=applySleepAnchor(tasks,{type:'night',endAt:'2026-07-22T23:00:00.000Z'});
  assert.equal(result.find(item=>item.id==='wake').actualAt,'2026-07-22T23:00:00.000Z');
  assert.equal(result.find(item=>item.id==='milk').plannedAt,'2026-07-22T23:20:00.000Z');
});

test('nap end moves the next meal two hours later', () => {
  const result=applySleepAnchor(tasks,{type:'nap',startAt:'2026-07-23T04:00:00.000Z',endAt:'2026-07-23T06:00:00.000Z'});
  assert.equal(result.find(item=>item.id==='meal2').plannedAt,'2026-07-23T08:00:00.000Z');
});

test('sleep anchor preserves completed skipped and manually adjusted tasks', () => {
  const input=tasks.map(item=>item.id==='meal2'?{...item,status:'adjusted'}:item);
  assert.deepEqual(applySleepAnchor(input,{type:'nap',endAt:'2026-07-23T07:00:00.000Z'}),input);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
node --test tests/sleep-anchor.test.js
```

Expected: FAIL because `sleep-anchor.js` or `applySleepAnchor` does not exist.

- [ ] **Step 3: Implement the pure schedule transformation**

Create `src/features/schedule/sleep-anchor.js`:

```js
import { addMinutes } from '../../core/dates.js';

const locked = task => ['completed','skipped','adjusted'].includes(task.status);

function cascadeFrom(tasks,index,anchorAt) {
  const result=tasks.map(task=>({...task}));
  let base=anchorAt;
  for(let cursor=index;cursor<result.length;cursor+=1) {
    if(locked(result[cursor])) {
      base=result[cursor].actualAt||result[cursor].plannedAt;
      continue;
    }
    result[cursor]={...result[cursor],plannedAt:addMinutes(base,result[cursor].afterMinutes),status:'upcoming',updatedAt:anchorAt};
    base=result[cursor].plannedAt;
  }
  return result;
}

export function applySleepAnchor(tasks,sleep,{napToMealMinutes=120}={}) {
  if(!sleep?.endAt||!['night','nap'].includes(sleep.type)) return tasks.map(task=>({...task}));
  if(sleep.type==='night') {
    const wakeIndex=tasks.findIndex(task=>task.type==='wake');
    if(wakeIndex<0) return tasks.map(task=>({...task}));
    const result=tasks.map(task=>({...task}));
    result[wakeIndex]={...result[wakeIndex],status:'completed',actualAt:sleep.endAt,updatedAt:sleep.endAt};
    return cascadeFrom(result,wakeIndex+1,sleep.endAt);
  }
  const sleepStart=new Date(sleep.startAt||sleep.endAt);
  const mealIndex=tasks.findIndex(task=>task.type==='meal'&&!locked(task)&&new Date(task.plannedAt)>=sleepStart);
  if(mealIndex<0||tasks[mealIndex].status==='adjusted') return tasks.map(task=>({...task}));
  const anchor=addMinutes(sleep.endAt,napToMealMinutes);
  const seeded=tasks.map((task,index)=>index===mealIndex?{...task,plannedAt:anchor,status:'upcoming',updatedAt:sleep.endAt}:{...task});
  return cascadeFrom(seeded,mealIndex+1,anchor);
}
```

- [ ] **Step 4: Add the module to the PWA shell and verify GREEN**

Add this entry to `APP_SHELL` in `service-worker.js`:

```js
"./src/features/schedule/sleep-anchor.js"
```

Run:

```powershell
node --test tests/sleep-anchor.test.js tests/pwa.test.js
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/schedule/sleep-anchor.js tests/sleep-anchor.test.js service-worker.js
git -c user.name=Codex -c user.email=codex@local commit -m "feat: drive daily schedule from sleep end"
```

### Task 2: Connect sleep completion, backfill, and editing

**Files:**
- Modify: `src/app.js`
- Modify: `src/ui/records.js`
- Modify: `tests/ui-contract.test.js`

- [ ] **Step 1: Write failing UI contract tests**

Add to `tests/ui-contract.test.js`:

```js
test('sleep entry asks for type and exact start and end times', () => {
  const html=recordsView({sleeps:[]});
  assert.match(html,/data-action="sleep-start"/);
  assert.match(html,/补记睡眠/);
  assert.match(html,/夜间睡眠|午间小睡/);
});
```

Run:

```powershell
node --test tests/ui-contract.test.js
```

Expected: FAIL because the sleep type choices are not yet present.

- [ ] **Step 2: Add a shared application helper**

In `src/app.js`, import the rule:

```js
import { applySleepAnchor } from './features/schedule/sleep-anchor.js';
```

Inside `browserApp`, add:

```js
async function saveSleepAndRecalculate(session) {
  await repo.put('sleepSessions',session);
  if(session.endAt&&['night','nap'].includes(session.type)) {
    const template=(await repo.list('scheduleTemplates',{babyId:store.activeBabyId}))[0];
    const tasks=applySleepAnchor(store.tasks,session,{napToMealMinutes:template?.napToMealMinutes||120});
    for(const task of tasks) await repo.put('taskInstances',task);
  }
  await refresh();
}
```

Use `saveSleepAndRecalculate` from:

- real-time sleep end;
- backfilled sleep save;
- sleep edit save.

Extend the existing schedule-template dialog with:

```html
<label>午睡结束后多久吃辅食（分钟）</label>
<input name="napToMealMinutes" type="number" min="0" value="120">
```

Persist it as `template.napToMealMinutes`. Existing templates without the field use `120`.

- [ ] **Step 3: Collect explicit sleep type and timestamps**

Update the start-sleep action so it opens a dialog containing:

```html
<label>睡眠类型</label>
<select name="type">
  <option value="nap">午间小睡</option>
  <option value="night">夜间睡眠</option>
</select>
```

Update the backfill dialog to contain `datetime-local` fields named `startAt` and `endAt`, plus the same `type` select. Convert the submitted local values with `new Date(value).toISOString()` and save through `saveSleepAndRecalculate`.

- [ ] **Step 4: Verify integration**

Run:

```powershell
node --test tests/sleep-anchor.test.js tests/records.test.js tests/ui-contract.test.js
node --check src/app.js
```

Expected: PASS and no syntax errors.

- [ ] **Step 5: Commit**

```powershell
git add src/app.js src/ui/records.js tests/ui-contract.test.js
git -c user.name=Codex -c user.email=codex@local commit -m "feat: connect sleep records to daily schedule"
```

### Task 3: Simplify today-card and sleep controls

**Files:**
- Modify: `src/ui/today.js`
- Modify: `src/ui/records.js`
- Modify: `assets/styles/app.css`
- Modify: `src/app.js`
- Modify: `tests/ui-contract.test.js`

- [ ] **Step 1: Write failing top-level action tests**

Replace the current today task action assertion with:

```js
test('today task exposes one primary action and one overflow action', () => {
  const html=todayView({primary:{id:'t1',title:'喝奶',type:'milk',status:'upcoming',plannedAt:'2026-07-23T08:20:00Z'}});
  assert.match(html,/data-action="complete-task"/);
  assert.match(html,/data-action="task-more"/);
  assert.doesNotMatch(html,/data-action="complete-task-keep"/);
  assert.doesNotMatch(html,/data-action="adjust-task"/);
});
```

Run:

```powershell
node --test tests/ui-contract.test.js
```

Expected: FAIL because four top-level task buttons still render.

- [ ] **Step 2: Render a two-level today action hierarchy**

In `src/ui/today.js`, render:

```html
<div class="hero-actions">
  <button class="button primary-inverse hero-primary" data-action="complete-task" data-id="...">完成</button>
  <button class="button ghost-inverse hero-more" data-action="task-more" data-id="...">更多操作</button>
</div>
```

In `src/app.js`, make `task-more` open a dialog with three uniform buttons carrying:

```html
data-dialog-action="keep"
data-dialog-action="adjust"
data-dialog-action="skip"
```

Route the selected action to the existing completion, adjustment, and skip persistence logic.

- [ ] **Step 3: Render only the active sleep control**

In `src/ui/records.js`:

```js
const sleepAction=active
  ? `<button class="button primary sleep-main-action" data-action="sleep-end" data-id="${esc(active.id)}">结束睡眠</button>`
  : `<button class="button primary sleep-main-action" data-action="sleep-start">开始睡眠</button>`;
```

Render `补记睡眠` below it as a `text-button`. Remove disabled start/end buttons.

- [ ] **Step 4: Add mobile layout rules**

Append to `assets/styles/app.css`:

```css
.hero-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:stretch}
.hero-actions .button{min-height:48px}
.hero-primary{width:100%}
.hero-more{min-width:104px}
.sleep-main-action{display:block;width:100%;min-height:50px}
.sleep-secondary{display:flex;justify-content:center;margin-top:8px}
@media(max-width:380px){.hero-actions{grid-template-columns:1fr}.hero-more{width:100%}}
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
node --test tests/ui-contract.test.js
node --check src/app.js
```

Expected: PASS.

Commit:

```powershell
git add src/ui/today.js src/ui/records.js src/app.js assets/styles/app.css tests/ui-contract.test.js
git -c user.name=Codex -c user.email=codex@local commit -m "feat: simplify mobile task and sleep controls"
```

### Task 4: Replace internal meal labels with useful summaries

**Files:**
- Create: `src/features/meals/presentation.js`
- Create: `tests/meal-presentation.test.js`
- Modify: `src/ui/meals.js`
- Modify: `service-worker.js`
- Modify: `assets/styles/app.css`

- [ ] **Step 1: Write failing presentation tests**

Create `tests/meal-presentation.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRecipeName, mealSummary } from '../src/features/meals/presentation.js';

test('recipe display names remove internal pairing suffixes', () => {
  assert.equal(cleanRecipeName('嫩豆腐土豆宝宝面·搭配8'),'嫩豆腐土豆宝宝面');
  assert.equal(cleanRecipeName('南瓜牛肉软饭'),'南瓜牛肉软饭');
});

test('meal summary exposes amounts staple texture and stage', () => {
  const recipe={ingredients:['嫩豆腐 15～30g','土豆 20～35g','宝宝面 适量'],staple:'宝宝面',texture:'面条',stageName:'家庭餐过渡期'};
  assert.deepEqual(mealSummary(recipe),{
    amounts:'嫩豆腐 15～30g · 土豆 20～35g',
    meta:'宝宝面 · 面条 · 家庭餐过渡期'
  });
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test tests/meal-presentation.test.js
```

Expected: FAIL because the presentation module does not exist.

- [ ] **Step 3: Implement display-only helpers**

Create `src/features/meals/presentation.js`:

```js
export const cleanRecipeName = name => String(name||'').replace(/·搭配\d+$/,'').trim();

export function mealSummary(recipe={}) {
  const measured=(recipe.ingredients||[]).filter(item=>!item.includes('适量')&&!item.includes('可作为')).slice(0,2);
  return {
    amounts: measured.join(' · '),
    meta: [recipe.staple,recipe.texture,recipe.stageName].filter(Boolean).join(' · ')
  };
}
```

- [ ] **Step 4: Render recipe details and independent status chips**

In `src/ui/meals.js`:

- import `cleanRecipeName` and `mealSummary`;
- resolve `const recipe=recipes.find(item=>item.id===meal.recipeId)`;
- show the cleaned name;
- show `summary.amounts`;
- show `summary.meta`;
- render status in `<span class="meal-status status-planned">计划中</span>` or the eaten/skipped equivalents;
- remove `${meal.group} · 状态` from the subtitle.

Use `cleanRecipeName` in the recipe library cards as well, so internal suffixes never appear anywhere in the menu screen.

Add `presentation.js` to `APP_SHELL` in `service-worker.js`.

- [ ] **Step 5: Style and verify**

Append to `assets/styles/app.css`:

```css
.meal-copy{display:grid;gap:4px;min-width:0}
.meal-amounts,.meal-meta{display:block;color:var(--muted);line-height:1.45}
.meal-status{display:inline-flex;width:max-content;padding:3px 8px;border-radius:999px;font-size:.75rem;font-weight:700}
.status-planned{background:#fff0df;color:#9a5a28}
.status-eaten{background:#e4f4e8;color:#327046}
.status-skipped{background:#eee;color:#666}
```

Run:

```powershell
node --test tests/meal-presentation.test.js tests/ui-contract.test.js tests/pwa.test.js
```

Expected: PASS.

Commit:

```powershell
git add src/features/meals/presentation.js src/ui/meals.js service-worker.js assets/styles/app.css tests/meal-presentation.test.js tests/ui-contract.test.js
git -c user.name=Codex -c user.email=codex@local commit -m "feat: show useful meal details"
```

### Task 5: Full verification, browser acceptance, and release

**Files:**
- Modify: `PROJECT_STATE.md`
- Modify: `README.md` only if its existing user changes do not overlap; otherwise leave it untouched.

- [ ] **Step 1: Run complete automated verification**

```powershell
npm.cmd test
$bad=0
Get-ChildItem src,data,tests -Recurse -Filter *.js | ForEach-Object {
  node --check $_.FullName
  if($LASTEXITCODE -ne 0){$bad=1}
}
git diff --check
if($bad){exit 1}
```

Expected: zero failures and zero syntax errors.

- [ ] **Step 2: Run mobile browser acceptance**

Serve the project over localhost and verify at a narrow mobile viewport:

1. Today card shows only `完成` and `更多操作`.
2. `更多操作` contains keep, adjust, and skip.
3. Sleep area shows exactly one active primary action.
4. Backfill night sleep ending `07:00`; confirm milk becomes `07:20`.
5. End a nap at `14:00`; confirm next meal becomes `16:00`.
6. Generate a menu; confirm no visible text matches `搭配\d+`.
7. Confirm the meal card shows amounts, staple/texture/stage, and a separate status chip.
8. Confirm browser console has no warning or error from project code.

- [ ] **Step 3: Update verified project state**

In `PROJECT_STATE.md`, record only facts proven by the tests and browser acceptance, including the new test count and deployment status.

- [ ] **Step 4: Commit documentation and request final code review**

```powershell
git add PROJECT_STATE.md
git -c user.name=Codex -c user.email=codex@local commit -m "docs: record sleep-driven mobile UI release"
```

Run the required independent read-only review against the implementation range. Fix any Critical or Important issue and repeat complete verification.

- [ ] **Step 5: Push and verify GitHub Pages**

```powershell
git push origin main
```

Expected: `main -> main`.

Check:

```powershell
Invoke-WebRequest -UseBasicParsing https://kingly87.github.io/baby-meal-pwa/
```

Expected: HTTP 200. Confirm the new Service Worker version prompts for update or loads after refresh.
