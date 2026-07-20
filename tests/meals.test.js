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
