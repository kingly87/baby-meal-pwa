import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../data/recipes.js';

test('recipe catalog contains 600 unique complete recipes', () => {
  assert.equal(recipes.length, 600);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 600);
  for (const recipe of recipes) {
    for (const key of ['id', 'name', 'stage', 'group', 'ingredients', 'steps', 'staple']) {
      assert.ok(recipe[key] !== undefined, `recipe ${recipe.id} missing ${key}`);
    }
    assert.ok(Array.isArray(recipe.ingredients));
    assert.ok(Array.isArray(recipe.steps));
  }
});

test('each feeding stage contains 120 recipes', () => {
  for (const stage of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
    assert.equal(recipes.filter((recipe) => recipe.stage === stage).length, 120, stage);
  }
});
