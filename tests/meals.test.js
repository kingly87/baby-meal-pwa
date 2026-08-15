import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleRecipeFavorite, toggleRecipeDislike, persistRecipePreference } from '../src/features/meals/preferences.js';
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
  const week = generateWeek(recipes, { babyId: 'b1', stage: 'stage3', startDate: '2026-07-20', mealTypes: ['lunch', 'dinner'], excluded: ['虾'], random: () => .1, createId: () => `m${++sequence}` });
  assert.equal(week.days.length, 7);
  assert.equal(week.days.flatMap(d => d.meals).length, 14);
  assert.equal(new Set(week.days.flatMap(d => d.meals).map(m => m.id)).size, 14);
  assert.ok(week.days.flatMap(d => d.meals).every(m => m.group !== '虾'));
  assert.ok(Array.isArray(week.relaxedRules));
});

test('replacement stays safe and shopping list aggregates ingredients', () => {
  let sequence = 0;
  const week = generateWeek(recipes, { babyId: 'b1', stage: 'stage2', startDate: '2026-07-20', mealTypes: ['lunch'], excluded: ['蛋'], random: () => .2, createId: () => `m${++sequence}` });
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
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['lunch'],
    random: () => 0, createId: () => `m${++sequence}`, ...overrides
  }).days.flatMap(day => day.meals).map(meal => meal.recipeId);
}

const mealSlotRecipe = (id, mealSlots, extra = {}) => rotationRecipe(
  id,
  extra.group || `group-${id}`,
  extra.texture || `texture-${id}`,
  extra.cookingMethod || `method-${id}`,
  { mealSlots, ...extra }
);

test('default weekly menu creates breakfast lunch and dinner in stable order', () => {
  let sequence = 0;
  const catalog = [
    mealSlotRecipe('breakfast', ['早餐']),
    mealSlotRecipe('lunch', ['午餐']),
    mealSlotRecipe('dinner', ['晚餐'])
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11',
    random: () => 0, createId: () => `id-${++sequence}`
  });
  const meals = week.days.flatMap(day => day.meals);
  assert.equal(meals.length, 21);
  assert.deepEqual(week.days[0].meals.map(meal => meal.mealType), ['breakfast', 'lunch', 'dinner']);
  assert.deepEqual(week.days[0].meals.map(meal => meal.slot), [0, 1, 2]);
  assert.equal(new Set(meals.map(meal => meal.id)).size, 21);
});

test('breakfast requires an explicit breakfast meal slot', () => {
  const catalog = [
    mealSlotRecipe('breakfast', ['早餐']),
    mealSlotRecipe('legacy', undefined),
    mealSlotRecipe('lunch', ['午餐'])
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['breakfast'],
    random: () => .99, createId: () => crypto.randomUUID()
  });
  assert.ok(week.days.flatMap(day => day.meals).every(meal => meal.recipeId === 'breakfast'));
});

test('weekly generation fails clearly when no safe breakfast exists', () => {
  const catalog = [mealSlotRecipe('lunch', ['午餐', '晚餐'])];
  assert.throws(() => generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', createId: () => 'unused'
  }), /早餐/);
});

test('lunch and dinner accept legacy recipes but reject breakfast-only recipes', () => {
  const catalog = [
    mealSlotRecipe('breakfast-only', ['早餐']),
    mealSlotRecipe('legacy', undefined)
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['lunch', 'dinner'],
    random: () => 0, createId: (() => { let id = 0; return () => `id-${++id}`; })()
  });
  assert.ok(week.days.flatMap(day => day.meals).every(meal => meal.recipeId === 'legacy'));
  const emptySlotsWeek = generateWeek([mealSlotRecipe('empty-slots', [])], {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['dinner'],
    random: () => 0, createId: () => crypto.randomUUID()
  });
  assert.ok(emptySlotsWeek.days.flatMap(day => day.meals).every(meal => meal.recipeId === 'empty-slots'));
});

test('meal slot filtering never bypasses stage or exclusions', () => {
  const catalog = [
    mealSlotRecipe('excluded-breakfast', ['早餐'], { ingredients: ['牛肉'] }),
    mealSlotRecipe('wrong-stage-breakfast', ['早餐'], { stage: 'stage3' }),
    mealSlotRecipe('safe-breakfast', ['早餐'], { ingredients: ['鸡肉'] })
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['breakfast'],
    excluded: ['牛肉'], random: () => 0, createId: () => crypto.randomUUID()
  });
  assert.ok(week.days.flatMap(day => day.meals).every(meal => meal.recipeId === 'safe-breakfast'));
});

test('same-day meals prefer different groups when safe candidates exist', () => {
  const catalog = [
    mealSlotRecipe('breakfast', ['早餐'], { group: 'grain' }),
    mealSlotRecipe('lunch-grain', ['午餐'], { group: 'grain' }),
    mealSlotRecipe('lunch-protein', ['午餐'], { group: 'protein' }),
    mealSlotRecipe('dinner-grain', ['晚餐'], { group: 'grain' }),
    mealSlotRecipe('dinner-veg', ['晚餐'], { group: 'vegetable' })
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', random: () => 0,
    createId: (() => { let id = 0; return () => `id-${++id}`; })()
  });
  assert.equal(new Set(week.days[0].meals.map(meal => meal.group)).size, 3);
});

test('replacement preserves the target meal type and its safety rules', () => {
  const catalog = [
    mealSlotRecipe('breakfast-1', ['早餐']),
    mealSlotRecipe('breakfast-2', ['早餐']),
    mealSlotRecipe('lunch', ['午餐'])
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealTypes: ['breakfast'],
    random: () => 0, createId: (() => { let id = 0; return () => `id-${++id}`; })()
  });
  const target = week.days[0].meals[0];
  const changed = replaceMeal(week, target.id, catalog, { stage: 'stage4', random: () => .99 });
  assert.equal(changed.days[0].meals[0].mealType, 'breakfast');
  assert.equal(changed.days[0].meals[0].recipeId, 'breakfast-2');
});

test('explicit legacy mealCount maps to the first default meal types', () => {
  const catalog = [
    mealSlotRecipe('breakfast', ['早餐']),
    mealSlotRecipe('lunch', ['午餐']),
    mealSlotRecipe('dinner', ['晚餐'])
  ];
  const week = generateWeek(catalog, {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11', mealCount: 2,
    random: () => 0, createId: (() => { let id = 0; return () => `id-${++id}`; })()
  });
  assert.deepEqual(week.days[0].meals.map(meal => meal.mealType), ['breakfast', 'lunch']);
});

test('weekly generation does not mutate inputs', () => {
  const catalog = [
    mealSlotRecipe('breakfast', ['早餐']),
    mealSlotRecipe('lunch', ['午餐']),
    mealSlotRecipe('dinner', ['晚餐'])
  ];
  const options = {
    babyId: 'b1', stage: 'stage4', startDate: '2026-08-11',
    excluded: [], favorites: [], disliked: [], random: () => 0,
    createId: (() => { let id = 0; return () => `id-${++id}`; })()
  };
  const catalogBefore = structuredClone(catalog);
  const optionListsBefore = structuredClone({ excluded: options.excluded, favorites: options.favorites, disliked: options.disliked });
  generateWeek(catalog, options);
  assert.deepEqual(catalog, catalogBefore);
  assert.deepEqual({ excluded: options.excluded, favorites: options.favorites, disliked: options.disliked }, optionListsBefore);
});

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

test('recent group diversity outranks staple rotation', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸', { staple: '米饭' }),
    rotationRecipe(2, '肉丸', '软丸', '煮', { staple: '米饭' }),
    rotationRecipe(3, '饭团', '颗粒饭', '焖', { staple: '面条' })
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 2]);
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

test('shape rotation keeps a candidate that improves only texture', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(3, '肉丸', '软团', '蒸'),
    rotationRecipe(2, '面条', '碎面', '蒸')
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 2]);
});

test('shape rotation keeps a candidate that improves only cooking method', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(3, '肉丸', '软团', '蒸'),
    rotationRecipe(2, '面条', '软团', '煮')
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 2]);
});

test('missing legacy shape fields do not receive a false diversity advantage', () => {
  const catalog = [
    rotationRecipe(1, '饭团', '软团', '蒸'),
    rotationRecipe(2, '面条', '软团', '蒸'),
    { id: 3, stage: 'stage4', name: 'legacy', group: '肉丸', staple: '肉', ingredients: [] }
  ];
  assert.deepEqual(generatedRecipeIds(catalog).slice(0, 2), [1, 2]);
});

test('meal replacement rejects an unknown meal id', () => {
  const catalog = [rotationRecipe(1, '饭团', '软团', '蒸')];
  assert.throws(
    () => replaceMeal({ days: [{ meals: [] }] }, 'missing', catalog, { stage: 'stage4' }),
    /找不到要替换的餐次/
  );
});
test('favorite persistence keeps the catalog recipe id type for V2 string ids', () => {
  const recipe=recipes.find(item=>typeof item.id==='string');
  assert.ok(recipe);
  const selected=toggleRecipeFavorite({favorites:[]},String(recipe.id),recipes);
  assert.deepEqual(selected.favorites,[recipe.id]);
  assert.equal(typeof selected.favorites[0],'string');
  assert.deepEqual(toggleRecipeFavorite(selected,String(recipe.id),recipes).favorites,[]);
});

test('favorite and dislike interactions persist using the V2 string catalog id', async () => {
  const recipe=recipes.find(item=>typeof item.id==='string'&&item.vegetable);
  const writes=[];
  const repository={async get(){return{id:'baby-1',babyId:'baby-1',favorites:[],disliked:[]}},async put(store,value){writes.push({store,value});return value}};
  await persistRecipePreference(repository,'baby-1',String(recipe.id),recipes,'favorite','2026-08-12T00:00:00.000Z');
  await persistRecipePreference(repository,'baby-1',String(recipe.id),recipes,'dislike','2026-08-12T00:00:00.000Z');
  assert.equal(writes[0].store,'foodPreferences');
  assert.deepEqual(writes[0].value.favorites,[recipe.id]);
  assert.equal(typeof writes[0].value.favorites[0],'string');
  assert.deepEqual(writes[1].value.disliked,[recipe.vegetable]);
  assert.deepEqual(toggleRecipeDislike({disliked:[]},String(recipe.id),recipes).disliked,[recipe.vegetable]);
});
