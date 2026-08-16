# Actual Meal Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a parent preserve the planned recipe while recording, editing, or deleting what the baby actually ate for each menu meal.

**Architecture:** Add a focused pure `actual-meal` domain module that updates one nested meal immutably. Route persistence through the existing `runMenuMutation`/`updateMenuAtomically` boundary so menu ownership, concurrent writes, UI locking, and refresh behavior remain consistent. Render the optional nested record in `mealsView`, bind dialogs in `app.js`, extend V1 backup validation, then bump the Service Worker revision.

**Tech Stack:** Native ES modules, IndexedDB repository abstraction, HTML dialog helpers, Node built-in test runner, CSS, Service Worker.

---

## File Map

- Create `src/features/meals/actual-meal.js`: validate input and immutably set/remove one meal's `actualMeal`.
- Create `tests/actual-meal.test.js`: pure domain behavior and validation.
- Modify `src/ui/meals.js`: render actual-meal summary and editable controls.
- Modify `src/app.js`: open add/edit dialog, confirm deletion, and call the atomic mutation workflow.
- Modify `src/features/backup/validate.js`: validate optional nested `actualMeal` in V1 menus.
- Modify `src/features/meals/menu-browser.js`: export focused actual-meal workflow wrappers that preserve the click-time baby/menu/meal context through queued writes.
- Modify `assets/styles/app.css`: visually separate plan and actual result, retain 320px containment and 44px targets.
- Modify `service-worker.js`: cache the new module and increment the cache revision.
- Modify `tests/app.test.js`, `tests/menu-browser.test.js`, `tests/ui-contract.test.js`, `tests/backup.test.js`, and `tests/pwa.test.js`: integration, UI, compatibility, and offline coverage.
- Modify `PROJECT_STATE.md`: record only final verified facts and manual-browser status.

### Task 1: Pure actual-meal domain model

**Files:**
- Create: `src/features/meals/actual-meal.js`
- Create: `tests/actual-meal.test.js`

- [ ] **Step 1: Write failing domain tests**

Add tests that construct a two-meal menu and assert:

```js
const updated = saveActualMeal(menu, 'meal-1', {
  name: '番茄鸡蛋碎面',
  occurredAt: '2026-08-16T12:10:00.000Z',
  amount: '半碗',
  note: '面条剪碎',
  markEaten: false
}, '2026-08-16T12:20:00.000Z');

assert.equal(updated.days[0].meals[0].recipeId, 'planned-recipe');
assert.equal(updated.days[0].meals[0].status, 'planned');
assert.deepEqual(updated.days[0].meals[0].actualMeal, {
  name: '番茄鸡蛋碎面',
  occurredAt: '2026-08-16T12:10:00.000Z',
  amount: '半碗',
  note: '面条剪碎',
  createdAt: '2026-08-16T12:20:00.000Z',
  updatedAt: '2026-08-16T12:20:00.000Z'
});
assert.equal(menu.days[0].meals[0].actualMeal, undefined);
```

Also test `markEaten: true`, edit preserving `createdAt`, removal preserving status and planned recipe, missing meal, blank name, invalid time, and non-object inputs.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/actual-meal.test.js`

Expected: FAIL because `src/features/meals/actual-meal.js` does not exist.

- [ ] **Step 3: Implement the minimal pure module**

Implement these exports:

```js
export function saveActualMeal(menu, mealId, input, now = new Date().toISOString()) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const occurredAt = typeof input?.occurredAt === 'string' ? input.occurredAt : '';
  if (!name) throw new Error('请填写实际菜名');
  if (!occurredAt || !Number.isFinite(Date.parse(occurredAt))) throw new Error('请选择有效的实际进食时间');
  let found = false;
  const days = menu.days.map(day => ({...day, meals: day.meals.map(meal => {
    if (meal.id !== mealId) return {...meal};
    found = true;
    const actualMeal = {
      name,
      occurredAt: new Date(occurredAt).toISOString(),
      amount: typeof input.amount === 'string' ? input.amount.trim() : '',
      note: typeof input.note === 'string' ? input.note.trim() : '',
      createdAt: meal.actualMeal?.createdAt || now,
      updatedAt: now
    };
    return {...meal, actualMeal, status: input.markEaten ? 'eaten' : meal.status, updatedAt: now};
  })}));
  if (!found) throw new Error('找不到要记录的餐次');
  return {...menu, days, updatedAt: now};
}

export function removeActualMeal(menu, mealId, now = new Date().toISOString()) {
  let found = false;
  const days = menu.days.map(day => ({...day, meals: day.meals.map(meal => {
    if (meal.id !== mealId) return {...meal};
    found = true;
    const {actualMeal, ...rest} = meal;
    return {...rest, updatedAt: now};
  })}));
  if (!found) throw new Error('找不到要记录的餐次');
  return {...menu, days, updatedAt: now};
}
```

Do not mutate `menu`, `day`, `meal`, or `input`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/actual-meal.test.js`

Expected: all actual-meal tests PASS.

- [ ] **Step 5: Commit the domain unit**

```powershell
git add src/features/meals/actual-meal.js tests/actual-meal.test.js
git commit -m "feat: model actual meal records"
```

### Task 2: Render actual meals and enforce history read-only behavior

**Files:**
- Modify: `src/ui/meals.js`
- Modify: `tests/ui-contract.test.js`
- Modify: `assets/styles/app.css`

- [ ] **Step 1: Write failing UI behavior and contract tests**

Add tests for a meal with an `actualMeal` containing hostile text and assert escaped output plus these semantics:

```js
assert.match(html, /实际吃了/);
assert.match(html, /番茄鸡蛋碎面/);
assert.match(html, /半碗/);
assert.match(html, /data-action="edit-actual-meal"/);
assert.match(html, /data-action="delete-actual-meal"/);
assert.doesNotMatch(readOnlyHistoryHtml, /data-action="(?:add|edit|delete)-actual-meal"/);
```

For an editable meal without a record, assert one `data-action="add-actual-meal"` button. Assert actual controls carry `data-menu-id` and `data-id` so the existing menu lock catches them. Add CSS contract assertions for `.actual-meal-summary`, 44px action targets, wrapping, and no fixed width wider than 320px.

- [ ] **Step 2: Run focused UI tests and confirm RED**

Run: `node --test tests/ui-contract.test.js`

Expected: FAIL because actual summaries and controls are absent.

- [ ] **Step 3: Implement the meal presentation**

In `weeklyMeal`, render the planned heading exactly as before and append a semantic block when `meal.actualMeal` exists:

```js
const actual = meal.actualMeal;
const actualHtml = actual ? `<section class="actual-meal-summary" aria-label="实际进食记录">
  <strong>实际吃了：${esc(actual.name)}</strong>
  <small>${esc(formatActualMealTime(actual.occurredAt))}${actual.amount ? ` · ${esc(actual.amount)}` : ''}</small>
  ${actual.note ? `<p>${esc(actual.note)}</p>` : ''}
</section>` : '';
```

Use a local formatter that returns a safe fallback for invalid legacy values. When `editable` is true, render add or edit/delete actions; when false, render no actual-meal action. Keep all controls inside the existing responsive action layout.

- [ ] **Step 4: Add scoped mobile styles**

Add one focused style group that gives the summary a distinct background/border, allows long names and notes to wrap, gives buttons `min-height:44px`, and ensures flex/grid children use `min-width:0`. Do not alter unrelated pages.

- [ ] **Step 5: Run UI tests and confirm GREEN**

Run: `node --test tests/ui-contract.test.js`

Expected: all UI contract tests PASS.

- [ ] **Step 6: Commit the UI unit**

```powershell
git add src/ui/meals.js assets/styles/app.css tests/ui-contract.test.js
git commit -m "feat: show actual meals in menu history"
```

### Task 3: Add/edit/delete workflow through atomic menu writes

**Files:**
- Modify: `src/app.js`
- Modify: `src/features/meals/menu-browser.js`
- Modify: `tests/app.test.js`
- Modify: `tests/menu-browser.test.js`

- [ ] **Step 1: Write failing workflow tests**

Test the exported workflow with a real `MemoryRepository` and assert:

```js
const updated = await runActualMealMutation({
  repository,
  babyId: 'baby-1',
  menuId: 'menu-1',
  mealId: 'meal-1',
  input: {name:'番茄鸡蛋碎面', occurredAt:'2026-08-16T12:10', amount:'半碗', note:'', markEaten:true},
  controls: [button],
  refresh,
  notify
});
assert.equal(updated.days[0].meals[0].status, 'eaten');
assert.equal(button.disabled, false);
```

Add cases for no status linkage, edit, delete, write failure, removed meal, cross-baby rejection, queued concurrent mutation retaining another meal's change, and synchronous baby-ID snapshot before an async dialog/queue completes.

- [ ] **Step 2: Run workflow tests and confirm RED**

Run: `node --test tests/app.test.js tests/menu-browser.test.js`

Expected: FAIL because the actual-meal workflows and UI bindings are not exported.

- [ ] **Step 3: Add a focused atomic workflow wrapper**

In `menu-browser.js`, import the Task 1 functions and implement wrappers over `runMenuMutation`:

```js
export function runActualMealMutation(options) {
  const {mealId, input, now} = options;
  return runMenuMutation({...options, mutate: menu => saveActualMeal(menu, mealId, input, now)});
}

export function runActualMealRemoval(options) {
  const {mealId, now} = options;
  return runMenuMutation({...options, mutate: menu => removeActualMeal(menu, mealId, now)});
}
```

Do not read `store.activeBabyId` after awaiting. Pass the click-time `babyId` explicitly.

- [ ] **Step 4: Bind add/edit dialogs and deletion**

In `app.js`, bind all three action types. Locate the current menu/meal from the click-time snapshot only to prefill the dialog. Use labels and escaped values:

```html
<label>实际菜名</label><input name="name" required>
<label>实际进食时间</label><input name="occurredAt" type="datetime-local" required>
<label>吃了多少</label><input name="amount" placeholder="例如：半碗或80克">
<label>备注</label><textarea name="note"></textarea>
<label><input name="markEaten" type="checkbox"> 同时把原计划标记为已吃</label>
```

For today, default to the current local date/time. For another menu day, use that day plus the current local clock time, then let the parent edit it. Convert the submitted `datetime-local` value into a valid ISO timestamp before calling the domain function. Use `confirm('确认删除这条实际进食记录？')`; cancellation must return before any repository call.

- [ ] **Step 5: Run focused workflow tests and confirm GREEN**

Run: `node --test tests/app.test.js tests/menu-browser.test.js tests/actual-meal.test.js`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the workflow unit**

```powershell
git add src/app.js src/features/meals/menu-browser.js tests/app.test.js tests/menu-browser.test.js
git commit -m "feat: edit actual meals atomically"
```

### Task 4: Extend V1 backup compatibility safely

**Files:**
- Modify: `src/features/backup/validate.js`
- Modify: `tests/backup.test.js`

- [ ] **Step 1: Write failing real `previewBackup` tests**

Use the production `previewBackup` entry point. Assert that an old meal without `actualMeal` still passes and a valid record passes. Assert each of these fails with the normalized `weeklyMenus` error: `actualMeal:null`, array, blank name, invalid `occurredAt`, missing/non-string timestamps, and non-string amount/note.

- [ ] **Step 2: Run backup tests and confirm RED**

Run: `node --test tests/backup.test.js`

Expected: at least one malformed `actualMeal` payload is currently accepted.

- [ ] **Step 3: Add nested optional validation**

At the existing meal validation boundary, keep the field optional and validate it only when the property exists:

```js
if (Object.hasOwn(meal, 'actualMeal')) {
  const actual = meal.actualMeal;
  if (!isPlainObject(actual)
    || !nonBlank(actual.name)
    || !validDateTime(actual.occurredAt)
    || typeof actual.amount !== 'string'
    || typeof actual.note !== 'string'
    || !validDateTime(actual.createdAt)
    || !validDateTime(actual.updatedAt)) invalid('weeklyMenus');
}
```

Use the validator's existing helpers/naming rather than duplicate date parsing. Do not require the field on legacy meals and do not change `schemaVersion`.

- [ ] **Step 4: Run backup and domain tests and confirm GREEN**

Run: `node --test tests/backup.test.js tests/actual-meal.test.js`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit compatibility changes**

```powershell
git add src/features/backup/validate.js tests/backup.test.js
git commit -m "fix: validate actual meals in V1 backups"
```

### Task 5: PWA release preparation and end-to-end verification

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/pwa.test.js`
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1: Write the failing PWA revision assertion**

Update the PWA test to require the next cache revision `baby-growth-v1-20260720-r30` and confirm dynamic source enumeration reports `src/features/meals/actual-meal.js` in `APP_SHELL`.

- [ ] **Step 2: Run the PWA test and confirm RED**

Run: `node --test tests/pwa.test.js`

Expected: FAIL because the Service Worker is still `r29` and does not cache the new module.

- [ ] **Step 3: Update the Service Worker**

Set:

```js
const CACHE_NAME='baby-growth-v1-20260720-r30';
```

Add `./src/features/meals/actual-meal.js` beside the other meal modules. Preserve app-prefix-only cleanup, navigation network-first, asset cache-first, and current-cache-only reads.

- [ ] **Step 4: Run the entire automated verification suite**

Run:

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

Expected: every test passes, syntax check exits 0, and `git diff --check` has no errors.

- [ ] **Step 5: Perform browser acceptance**

At 320px and 375px widths, verify:

1. Current menu can add an actual dish with free-text amount and note.
2. Unchecked linkage preserves planned status; checked linkage changes it to “已吃”.
3. Editing preserves the planned recipe and updates the actual summary.
4. Delete cancellation preserves data; confirmed deletion removes only the actual summary.
5. Historical menu is read-only until “修改记录” is selected.
6. Controls remain at least 44px and the document has no horizontal overflow.
7. Exported V1 backup reimports the actual record into an empty test origin.

- [ ] **Step 6: Update verified project state**

Add a dated top entry to `PROJECT_STATE.md` containing the final test count, `r30`, and only browser behaviors actually observed. Do not edit `README.md` or `AGENTS.md`.

- [ ] **Step 7: Commit release preparation**

```powershell
git add service-worker.js tests/pwa.test.js PROJECT_STATE.md
git commit -m "release: prepare actual meal records"
```

- [ ] **Step 8: Final review and release handoff**

Run the complete suite once more from the final commit, inspect `git status --short`, and request independent specification and quality review. Only after both reviews have no blocking findings should the branch be merged or pushed.

## Rollback Procedure

If a task fails, revert only that task's commit with `git revert <commit>`; never reset the user's working tree. If the released UI must be rolled back, revert the feature commits, increment the Service Worker revision again, run the full suite, and publish. Existing `actualMeal` fields remain harmless unknown nested data to the older UI and do not require destructive migration.
