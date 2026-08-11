import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeShape, validateChewingRecipe } from '../src/features/meals/recipe-details.js';

function validRecipe(overrides = {}) {
  return {
    id: 'stage4-tofu-noodles',
    name: '豆腐蔬菜软面',
    stage: 'stage4',
    stageName: '咀嚼练习期',
    group: '豆腐',
    staple: '宝宝面',
    texture: '软烂小块',
    ingredients: ['嫩豆腐 20g', '宝宝面 30g'],
    steps: ['将面条煮软', '拌入豆腐小块'],
    substitutions: ['豆腐可换成鸡蛋'],
    allergens: ['大豆'],
    mealSlots: ['午餐'],
    chewingLevel: 'beginner-chewing',
    sizeGuide: '约0.5厘米小块',
    softnessTest: '手指轻压即碎',
    fingerFood: false,
    freezable: true,
    ...overrides
  };
}

test('accepts a complete enriched stage4 chewing recipe and preserves ingredient amounts', () => {
  const recipe = validRecipe();
  assert.equal(validateChewingRecipe(recipe), true);
  assert.deepEqual(recipeShape(recipe).ingredients, ['嫩豆腐 20g', '宝宝面 30g']);
});

for (const field of ['id', 'name', 'stage', 'stageName', 'group', 'staple', 'texture', 'sizeGuide', 'softnessTest']) {
  test(`rejects a missing or blank ${field} with a field-specific error`, () => {
    const value = field === 'id' ? undefined : '   ';
    assert.throws(() => validateChewingRecipe(validRecipe({ [field]: value })), new RegExp(field));
  });
}

for (const field of ['ingredients', 'steps', 'substitutions', 'mealSlots']) {
  test(`rejects empty or non-string entries in ${field}`, () => {
    assert.throws(() => validateChewingRecipe(validRecipe({ [field]: [] })), new RegExp(field));
    assert.throws(() => validateChewingRecipe(validRecipe({ [field]: ['ok', 3] })), new RegExp(field));
  });
}

for (const field of ['ingredients', 'steps', 'substitutions', 'mealSlots', 'allergens']) {
  test(`rejects sparse arrays in ${field}`, () => {
    assert.throws(() => validateChewingRecipe(validRecipe({ [field]: new Array(1) })), new RegExp(field));
  });
}

test('allows an empty allergens array but rejects invalid allergens', () => {
  assert.equal(validateChewingRecipe(validRecipe({ allergens: [] })), true);
  assert.throws(() => validateChewingRecipe(validRecipe({ allergens: [''] })), /allergens/);
  assert.throws(() => validateChewingRecipe(validRecipe({ allergens: 'none' })), /allergens/);
});

test('only accepts supported chewing levels', () => {
  assert.equal(validateChewingRecipe(validRecipe({ chewingLevel: 'advanced-chewing' })), true);
  assert.throws(() => validateChewingRecipe(validRecipe({ chewingLevel: 'expert' })), /chewingLevel/);
});

test('strict chewing validation only accepts stage4 recipes', () => {
  assert.throws(() => validateChewingRecipe(validRecipe({ stage: 'stage3' })), /stage/);
});

for (const field of ['fingerFood', 'freezable']) {
  test(`requires ${field} to be boolean`, () => {
    assert.throws(() => validateChewingRecipe(validRecipe({ [field]: 'false' })), new RegExp(field));
  });
}

test('normalizes a legacy recipe with safe enriched defaults', () => {
  const legacy = { id: 7, name: '南瓜粥', ingredients: ['南瓜 20g'], custom: 'kept' };
  assert.deepEqual(recipeShape(legacy), {
    ...legacy,
    chewingLevel: null,
    steps: [],
    substitutions: [],
    allergens: [],
    mealSlots: [],
    fingerFood: false,
    freezable: false,
    sizeGuide: '',
    softnessTest: ''
  });
});

test('recipeShape does not mutate input or share array references', () => {
  const source = validRecipe();
  const before = structuredClone(source);
  const shaped = recipeShape(source);
  shaped.ingredients.push('额外食材');
  shaped.steps.push('额外步骤');
  assert.deepEqual(source, before);
});

test('handles non-object inputs safely and validation errors identify recipe', () => {
  assert.deepEqual(recipeShape(null), {
    chewingLevel: null, steps: [], substitutions: [], allergens: [], mealSlots: [],
    fingerFood: false, freezable: false, sizeGuide: '', softnessTest: ''
  });
  assert.throws(() => validateChewingRecipe(null), /recipe/);
  assert.throws(() => validateChewingRecipe([]), /recipe/);
});
