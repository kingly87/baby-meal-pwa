import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../data/recipes.js';
import { safeCandidates, generateWeek, replaceMeal } from '../src/features/meals/planner.js';
import { buildShoppingList } from '../src/features/meals/shopping.js';

test('excluded foods and stage are hard constraints', () => {
  const stage4 = safeCandidates(recipes, { stage: 'stage4', excluded: ['牛肉'] });
  assert.ok(stage4.length > 0);
  assert.ok(stage4.every(r => r.stage === 'stage4' && r.group !== '牛肉' && r.ingredients.every(x => !x.includes('牛肉'))));
  assert.throws(() => safeCandidates(recipes, { stage: 'stage4', excluded: ['牛肉','鸡肉','猪肉','鱼','虾','豆腐','蛋','鸡蛋'] }), /没有安全可用的食谱/);
});

test('weekly generation creates stable meals without bypassing exclusions', () => {
  let sequence = 0;
  const week = generateWeek(recipes, { babyId: 'b1', stage: 'stage3', startDate: '2026-07-20', mealCount: 2, excluded: ['虾'], random: () => .1, createId: () => `m${++sequence}` });
  assert.equal(week.days.length, 7);
  assert.equal(week.days.flatMap(d => d.meals).length, 14);
  assert.equal(new Set(week.days.flatMap(d => d.meals).map(m => m.id)).size, 14);
  assert.ok(week.days.flatMap(d => d.meals).every(m => m.group !== '虾'));
  assert.ok(Array.isArray(week.relaxedRules));
});

test('replacement stays safe and shopping list aggregates ingredients', () => {
  let sequence = 0;
  const week = generateWeek(recipes, { babyId: 'b1', stage: 'stage2', startDate: '2026-07-20', mealCount: 1, excluded: ['蛋'], random: () => .2, createId: () => `m${++sequence}` });
  const changed = replaceMeal(week, week.days[0].meals[0].id, recipes, { stage: 'stage2', excluded: ['蛋'], random: () => .8 });
  assert.equal(changed.days[0].meals[0].id, week.days[0].meals[0].id);
  assert.notEqual(changed.days[0].meals[0].recipeId, undefined);
  const shopping = buildShoppingList(changed, recipes, () => `s${++sequence}`);
  assert.ok(shopping.length > 0);
  assert.ok(shopping.every(item => item.babyId === 'b1' && item.quantity > 0));
});

function generatedRecipeIds(catalog, overrides = {}) {
  let sequence = 0;
  return generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealCount: 1,
    random: () => 0, createId: () => `m${++sequence}`, ...overrides
  }).days.flatMap(day => day.meals).map(meal => meal.recipeId);
}

const rotationRecipe = (id, group, texture, cookingMethod, extra = {}) => ({
  id, stage: 'stage4', name: `recipe-${id}`, group, texture, cookingMethod,
  staple: `${id}-staple`, protein: '', ingredients: [], ...extra
});

test('weekly menu avoids a recently used group when an alternative exists', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(2, '饭团', '颗粒饭', '焖'),
    rotationRecipe(3, '肉丸', '软丸', '煮')
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 3), [1, 3, 2]);
});

test('weekly menu further avoids recent texture and cooking method', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(2, '面条', '软团', '煮'),
    rotationRecipe(3, '馄饨', '颗粒馅', '蒸'),
    rotationRecipe(4, '肉丸', '软丸', '焖')
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 4]);
});

test('shape rotation safely relaxes when candidates are scarce', () => {
  const catalog = [rotationRecipe(1, '饭团', '软团', '蒸')];
  const ids = generatedRecipeIds(catalog);
  assert.equal(ids.length, 7);
  assert.ok(ids.every(id => id === 1));
});

test('shape rotation is deterministic for the same inputs', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(2, '肉丸', '软丸', '煮'),
    rotationRecipe(3, '面条', '碎面', '焖')
  ];
  assert.deepEqual(generatedRecipeIds(catalog), generatedRecipeIds(catalog));
});

test('shape diversity never overrides stage or exclusion constraints', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸', { ingredients: ['牛肉'] }),
    rotationRecipe(2, '肉丸', '软丸', '煮', { stage: 'stage3' }),
    rotationRecipe(3, '饭团', '软团', '蒸', { ingredients: ['鸡肉'] })
  ];
  const ids = generatedRecipeIds(catalog, { excluded: ['牛肉'] });
  assert.ok(ids.every(id => id === 3));
});

test('legacy recipes without texture or cooking method still rotate by known fields', () => {
  const catalog = [
    { id: 1, stage: 'stage4', name: 'legacy rice', group: '饭团', staple: '米饭', ingredients: [] },
    { id: 2, stage: 'stage4', name: 'legacy noodles', group: '面条', staple: '面', ingredients: [] }
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 2]);
});

test('meal replacement recommends a different recent shape when available', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(2, '饭团', '颗粒饭', '焖'),
    rotationRecipe(3, '肉丸', '软丸', '煮')
  ];
  const week = {
    babyId: 'b1',
    days: [{ date: '2026-08-11', meals: [
      { id: 'previous', recipeId: 1, group: '饭团', texture: '软团', cookingMethod: '蒸' },
      { id: 'target', recipeId: 1, group: '饭团', texture: '软团', cookingMethod: '蒸' }
    ] }]
  };
  const changed = replaceMeal(week, 'target', catalog, { stage: 'stage4', random: () => 0 });
  assert.equal(changed.days[0].meals[1].recipeId, 3);
});
