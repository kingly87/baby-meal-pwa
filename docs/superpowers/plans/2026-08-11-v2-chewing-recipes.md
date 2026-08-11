# V2 Chewing Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand stage4 from 120 to exactly 300 genuinely varied chewing recipes with actionable preparation, safety and substitution details.

**Architecture:** Keep the static catalog and stable existing IDs. Add a focused stage4 extension dataset plus validation helpers, merge it into the exported catalog, and enhance planner rotation and meal UI using additive metadata with safe legacy fallbacks.

**Tech Stack:** Vanilla ES modules, static recipe data, pure planner functions, Node tests, HTML/CSS UI.

---

### Task 1: Define and validate enriched recipe metadata

**Files:**
- Create: `src/features/meals/recipe-details.js`
- Create: `tests/recipe-details.test.js`

- [ ] **Step 1: Write failing validator tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChewingRecipe, recipeShape } from '../src/features/meals/recipe-details.js';

const recipe={id:7001,name:'南瓜牛肉软饭团',stage:'stage4',stageName:'咀嚼练习期',group:'饭团',staple:'米饭',texture:'软饭团',ingredients:['熟米饭 45g','南瓜 20g','牛肉 15g'],steps:['食材蒸熟','压拌成团'],chewingLevel:'beginner-chewing',sizeGuide:'约成人拇指第一节大小',softnessTest:'拇指和食指可轻松压碎',fingerFood:true,allergens:[],substitutions:['牛肉可换鸡肉'],mealSlots:['午餐'],freezable:true};

test('accepts a complete chewing recipe',()=>assert.equal(validateChewingRecipe(recipe),true));
test('rejects missing safety guidance',()=>assert.throws(()=>validateChewingRecipe({...recipe,softnessTest:''}),/softnessTest/));
test('normalizes legacy recipe details',()=>assert.equal(recipeShape({name:'旧食谱'}).chewingLevel,null));
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/recipe-details.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement strict additive validation**

Create `REQUIRED_CHEWING_FIELDS`, `validateChewingRecipe(recipe)` and `recipeShape(recipe)`; require non-empty arrays for ingredients, steps, substitutions and mealSlots, allow allergens to be empty, and restrict `chewingLevel` to `beginner-chewing|advanced-chewing`.

- [ ] **Step 4: Run tests and commit**

Run: `node --test tests/recipe-details.test.js`

```powershell
git add src/features/meals/recipe-details.js tests/recipe-details.test.js
git commit -m "feat: define enriched chewing recipe details"
```

### Task 2: Add 180 varied stage4 recipes

**Files:**
- Create: `data/stage4-recipes-v2.js`
- Modify: `data/recipes.js`
- Modify: `tests/recipes.test.js`

- [ ] **Step 1: Replace count-only assertions with failing V2 quality assertions**

```js
test('stage4 contains 300 complete varied recipes', () => {
  const stage4=recipes.filter(item=>item.stage==='stage4');
  assert.equal(stage4.length,300);
  assert.equal(new Set(stage4.map(item=>item.id)).size,300);
  for(const recipe of stage4) assert.equal(validateChewingRecipe(recipe),true);
  assert.ok(stage4.filter(item=>item.chewingLevel==='beginner-chewing').length>=120);
  assert.ok(stage4.filter(item=>item.chewingLevel==='advanced-chewing').length>=120);
  assert.ok(stage4.filter(item=>item.fingerFood).length>=100);
  assert.ok(new Set(stage4.map(item=>`${item.group}|${item.texture}|${item.steps.join('>')}`)).size>=240);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/recipes.test.js`

Expected: FAIL with stage4 count 120 and missing enriched fields.

- [ ] **Step 3: Enrich existing 120 recipes without changing IDs**

Map existing stage4 recipes through a deterministic metadata table keyed by their group/texture, adding all required detail fields. Do not rename IDs or change stage1–3/stage5 counts.

- [ ] **Step 4: Add 180 explicit extension records**

Create IDs outside the current range and author explicit records across hand-held vegetables, steamed cakes, soft pancakes, rice balls, pasta, dumplings, wontons, meatballs, fish cakes, tofu, breakfast and mixed meals. Each record must contain distinct ingredients and preparation steps; do not generate display names by cartesian-product loops.

- [ ] **Step 5: Merge and verify catalog quality**

Export `recipes=[...baseRecipes.map(enrichLegacyStage4),...stage4RecipesV2]`. Run:

`node --test tests/recipes.test.js tests/meals.test.js tests/meal-presentation.test.js`

Expected: stage4=300, total catalog=780, all IDs unique, all meal safety tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add data/recipes.js data/stage4-recipes-v2.js tests/recipes.test.js
git commit -m "feat: expand chewing stage to 300 recipes"
```

### Task 3: Rotate meal shapes, not only ingredients

**Files:**
- Modify: `src/features/meals/planner.js`
- Modify: `tests/meals.test.js`

- [ ] **Step 1: Add a failing deterministic rotation test**

```js
test('weekly menu avoids repeating the previous two meal shapes when alternatives exist',()=>{
  const catalog=[
    {id:1,stage:'stage4',name:'饭团1',group:'饭团',texture:'软饭团',staple:'米饭',ingredients:[]},
    {id:2,stage:'stage4',name:'饭团2',group:'饭团',texture:'软饭团',staple:'小米',ingredients:[]},
    {id:3,stage:'stage4',name:'肉丸',group:'肉丸',texture:'软肉丸',staple:'肉',ingredients:[]}
  ];
  let id=0;
  const week=generateWeek(catalog,{babyId:'b1',stage:'stage4',mealCount:1,startDate:'2026-08-11',random:()=>0,createId:()=>`m${++id}`});
  const shapes=week.days.map(day=>day.meals[0].group);
  assert.notEqual(shapes[0],shapes[1]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/meals.test.js`

Expected: FAIL because only staple and same-day group are considered.

- [ ] **Step 3: Add recent shape tracking**

Track `recentShapes` beside `recent` staples; prefer candidates whose `group` and `texture` are absent from the previous two meals, then relax shape rotation before relaxing exclusion or stage constraints.

- [ ] **Step 4: Run planner and full tests, then commit**

Run: `node --test tests/meals.test.js && npm.cmd test`

```powershell
git add src/features/meals/planner.js tests/meals.test.js
git commit -m "feat: rotate chewing meal shapes"
```

### Task 4: Add chewing filters and detailed recipe cards

**Files:**
- Modify: `src/ui/meals.js`
- Modify: `src/app.js`
- Modify: `assets/styles/app.css`
- Modify: `tests/ui-contract.test.js`
- Modify: `service-worker.js`
- Modify: `tests/pwa.test.js`

- [ ] **Step 1: Add failing UI contracts**

Assert that stage4 renders controls `recipe-chewing-level` and `recipe-finger-food`, and a complete recipe card contains size, softness, allergen, substitution, meal slot and freezing text while a legacy card still renders.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/ui-contract.test.js`

Expected: FAIL because filters and details are absent.

- [ ] **Step 3: Render additive details and bind filters**

Use `recipeShape()` before rendering. Add `data-chewing-level` and `data-finger-food` to cards, render enriched details in a semantic `<details>` element, and extend `filterRecipes()` to combine stage, text, chewing level and finger-food filters.

- [ ] **Step 4: Add responsive styles and update offline cache**

Keep filter controls wrapping at 320px. Add `recipe-details.js` and `stage4-recipes-v2.js` to the service worker shell, then bump cache revision and update PWA tests.

- [ ] **Step 5: Verify and commit**

Run: `node --test tests/recipes.test.js tests/meals.test.js tests/ui-contract.test.js tests/pwa.test.js && npm.cmd test && npm.cmd run check`

```powershell
git add src/ui/meals.js src/app.js assets/styles/app.css src/features/meals/recipe-details.js data/recipes.js data/stage4-recipes-v2.js service-worker.js tests/ui-contract.test.js tests/pwa.test.js PROJECT_STATE.md
git commit -m "feat: browse detailed chewing recipes"
```
