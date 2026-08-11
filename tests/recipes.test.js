import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../data/recipes.js';
import { validateChewingRecipe } from '../src/features/meals/recipe-details.js';

test('recipe catalog contains 780 unique complete recipes', () => {
  assert.equal(recipes.length, 780);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 780);
  for (const recipe of recipes) {
    for (const key of ['id', 'name', 'stage', 'group', 'ingredients', 'steps', 'staple']) {
      assert.ok(recipe[key] !== undefined, `recipe ${recipe.id} missing ${key}`);
    }
    assert.ok(Array.isArray(recipe.ingredients));
    assert.ok(Array.isArray(recipe.steps));
  }
});

test('chewing stage expands to 300 while every other stage stays at 120', () => {
  for (const stage of ['stage1', 'stage2', 'stage3', 'stage5']) assert.equal(recipes.filter(recipe => recipe.stage === stage).length, 120, stage);
  assert.equal(recipes.filter(recipe => recipe.stage === 'stage4').length, 300);
});

test('all chewing recipes satisfy the strict enriched recipe contract', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  for (const recipe of stage4) assert.equal(validateChewingRecipe(recipe), true, recipe.name);
});

test('chewing catalog has useful level, finger-food and category coverage', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  assert.ok(stage4.filter(recipe => recipe.chewingLevel === 'beginner-chewing').length >= 120);
  assert.ok(stage4.filter(recipe => recipe.chewingLevel === 'advanced-chewing').length >= 120);
  assert.ok(stage4.filter(recipe => recipe.fingerFood).length >= 100);
  for (const category of ['手指蔬菜','蒸糕','软饼','饭团','面','意面','饺子','馄饨','肉丸','鱼饼','蒸肉饼','豆腐','早餐','混合餐']) {
    assert.ok(stage4.some(recipe => `${recipe.name}|${recipe.group}|${recipe.staple}|${recipe.texture}|${recipe.mealSlots.join('|')}`.includes(category)), category);
  }
});

test('chewing recipes are explicitly varied, uniquely named and new names have no generated pairing numbers', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  assert.equal(new Set(stage4.map(recipe => recipe.name)).size, 300);
  assert.ok(stage4.filter(recipe => typeof recipe.id === 'string').every(recipe => !/搭配\d+/.test(recipe.name)), 'new stage4 names must not contain generated pairing numbers');
  const combinations=new Set(stage4.map(recipe => `${recipe.protein}|${recipe.vegetable}|${recipe.staple}|${recipe.texture}|${recipe.cookingMethod}`));
  assert.ok(combinations.size >= 240, `only ${combinations.size} normalized recipe combinations`);
});

test('chewing recipes encode safe shapes, textures and allergen-aware preparation', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  const forbidden=/(蜂蜜|整粒坚果|整颗(?:葡萄|番茄|圣女果)|硬(?:生)?胡萝卜|硬(?:生)?苹果)/;
  for (const recipe of stage4) {
    const text=[recipe.name,...recipe.ingredients,...recipe.steps,recipe.sizeGuide,recipe.softnessTest].join('|');
    assert.doesNotMatch(text,forbidden,recipe.name);
    assert.match(recipe.softnessTest,/拇指|手指|压碎/,recipe.name);
    if (/鱼|鳕|鲈|三文鱼/.test(`${recipe.group}|${recipe.protein}`)) assert.match(recipe.steps.join('|'),/去刺/,recipe.name);
    if (/肉|鸡|牛|猪/.test(`${recipe.group}|${recipe.protein}`)) assert.match(recipe.steps.join('|'),/无骨|切碎|剁/,recipe.name);
    if (/花生|坚果/.test(recipe.ingredients.join('|'))) assert.ok(recipe.allergens.some(item => /花生|坚果/.test(item)),recipe.name);
    if (/蛋|蒸蛋/.test(`${recipe.protein}|${recipe.staple}`)) assert.ok(recipe.allergens.includes('蛋'),recipe.name);
    if (recipe.allergens.includes('蛋')) assert.match(recipe.ingredients.join('|'),/蛋/,recipe.name);
    if (recipe.allergens.includes('小麦')) assert.match(recipe.ingredients.join('|'),/小麦|面粉|面条|意面|饺子皮|馄饨皮/,recipe.name);
    if (recipe.allergens.includes('蛋')) assert.ok(recipe.ingredients.some(item => /蛋.*\d+.*g/.test(item)),`${recipe.name}: missing measured egg source`);
    if (recipe.allergens.includes('小麦')) assert.ok(recipe.ingredients.some(item => /(?:小麦|面粉|面条|意面|饺子皮|馄饨皮).*\d+.*g/.test(item)),`${recipe.name}: missing measured wheat source`);
    assert.doesNotMatch(recipe.steps.join('|'),/第\d+种处理|方法\d+/,recipe.name);
  }
});
