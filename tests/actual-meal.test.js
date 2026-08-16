import test from 'node:test';
import assert from 'node:assert/strict';
import { saveActualMeal, removeActualMeal } from '../src/features/meals/actual-meal.js';

const NOW = '2026-08-16T08:00:00.000Z';

function menu() {
  return {
    id: 'menu-1',
    babyId: 'baby-1',
    updatedAt: 'old-menu-update',
    days: [
      {
        date: '2026-08-16',
        label: 'today',
        meals: [
          { id: 'meal-1', recipeId: 'recipe-1', name: '计划粥', status: 'planned', mealType: 'breakfast', updatedAt: 'old-meal-update' },
          { id: 'meal-2', recipeId: 'recipe-2', name: '计划面', status: 'skipped', mealType: 'lunch', updatedAt: 'other-update' }
        ]
      }
    ]
  };
}

test('saveActualMeal adds a normalized actual meal without changing plan fields or status', () => {
  const source = menu();
  const input = { name: '  苹果泥  ', occurredAt: '2026-08-16T07:30:00Z', amount: ' 80g ', note: ' 吃完了 ', markEaten: false };
  const sourceBefore = structuredClone(source);
  const inputBefore = structuredClone(input);

  const saved = saveActualMeal(source, 'meal-1', input, NOW);

  assert.deepEqual(saved.days[0].meals[0], {
    ...source.days[0].meals[0],
    actualMeal: {
      name: '苹果泥',
      occurredAt: '2026-08-16T07:30:00.000Z',
      amount: '80g',
      note: '吃完了',
      createdAt: NOW,
      updatedAt: NOW
    },
    updatedAt: NOW
  });
  assert.equal(saved.days[0].meals[0].recipeId, 'recipe-1');
  assert.equal(saved.days[0].meals[0].name, '计划粥');
  assert.equal(saved.days[0].meals[0].status, 'planned');
  assert.equal(saved.updatedAt, NOW);
  assert.deepEqual(source, sourceBefore);
  assert.deepEqual(input, inputBefore);
  assert.deepEqual(saved.days[0].meals[1], source.days[0].meals[1]);
});

test('saveActualMeal marks the target meal eaten when requested and safely normalizes non-string optional fields', () => {
  const saved = saveActualMeal(menu(), 'meal-1', {
    name: '香蕉', occurredAt: '2026-08-16T09:10:11+08:00', amount: 20, note: null, markEaten: true
  }, NOW);

  assert.equal(saved.days[0].meals[0].status, 'eaten');
  assert.equal(saved.days[0].meals[0].actualMeal.amount, '');
  assert.equal(saved.days[0].meals[0].actualMeal.note, '');
  assert.equal(saved.days[0].meals[0].actualMeal.occurredAt, '2026-08-16T01:10:11.000Z');
});

test('saveActualMeal edits an actual meal while preserving its createdAt', () => {
  const source = menu();
  source.days[0].meals[0].actualMeal = {
    name: '旧记录', occurredAt: '2026-08-15T01:00:00.000Z', amount: '', note: '',
    createdAt: '2026-08-15T02:00:00.000Z', updatedAt: '2026-08-15T02:00:00.000Z'
  };

  const saved = saveActualMeal(source, 'meal-1', {
    name: '新记录', occurredAt: '2026-08-16T02:00:00.000Z', amount: '', note: ''
  }, NOW);

  assert.equal(saved.days[0].meals[0].actualMeal.createdAt, '2026-08-15T02:00:00.000Z');
  assert.equal(saved.days[0].meals[0].actualMeal.updatedAt, NOW);
});

test('removeActualMeal removes only the target record and preserves recipe and status', () => {
  const source = menu();
  source.days[0].meals[0].actualMeal = { name: '苹果', createdAt: 'created' };
  const sourceBefore = structuredClone(source);

  const removed = removeActualMeal(source, 'meal-1', NOW);

  assert.equal(Object.hasOwn(removed.days[0].meals[0], 'actualMeal'), false);
  assert.equal(removed.days[0].meals[0].recipeId, 'recipe-1');
  assert.equal(removed.days[0].meals[0].status, 'planned');
  assert.equal(removed.days[0].meals[0].updatedAt, NOW);
  assert.equal(removed.updatedAt, NOW);
  assert.deepEqual(removed.days[0].meals[1], source.days[0].meals[1]);
  assert.deepEqual(source, sourceBefore);
});

test('removeActualMeal safely clones a target that has no actual meal', () => {
  const source = menu();
  const removed = removeActualMeal(source, 'meal-1', NOW);
  assert.notEqual(removed, source);
  assert.equal(Object.hasOwn(removed.days[0].meals[0], 'actualMeal'), false);
  assert.equal(removed.days[0].meals[0].updatedAt, NOW);
});

test('actual meal operations reject an unknown meal id', () => {
  assert.throws(() => saveActualMeal(menu(), 'missing', { name: '苹果', occurredAt: NOW }, NOW), /找不到餐次/);
  assert.throws(() => removeActualMeal(menu(), 'missing', NOW), /找不到餐次/);
});

test('saveActualMeal rejects invalid required input', () => {
  assert.throws(() => saveActualMeal(menu(), 'meal-1', null, NOW), /实际餐食信息无效/);
  assert.throws(() => saveActualMeal(menu(), 'meal-1', { name: '   ', occurredAt: NOW }, NOW), /实际餐食名称不能为空/);
  assert.throws(() => saveActualMeal(menu(), 'meal-1', { name: '苹果', occurredAt: 'not-a-date' }, NOW), /实际用餐时间无效/);
  assert.throws(() => saveActualMeal(menu(), 'meal-1', { name: '苹果', occurredAt: 123 }, NOW), /实际用餐时间无效/);
});

test('actual meal operations reject duplicate meal ids without changing the menu', () => {
  const sameDay = menu();
  sameDay.days[0].meals.push({ id: 'meal-1', recipeId: 'duplicate-same-day', status: 'planned' });
  const crossDay = menu();
  crossDay.days.push({ date: '2026-08-17', meals: [{ id: 'meal-1', recipeId: 'duplicate-cross-day', status: 'planned' }] });

  for (const source of [sameDay, crossDay]) {
    const before = structuredClone(source);
    assert.throws(
      () => saveActualMeal(source, 'meal-1', { name: '苹果', occurredAt: NOW }, NOW),
      /餐次标识重复/
    );
    assert.throws(() => removeActualMeal(source, 'meal-1', NOW), /餐次标识重复/);
    assert.deepEqual(source, before);
  }
});

test('saveActualMeal strictly rejects nonexistent or non-ISO occurredAt timestamps', () => {
  for (const occurredAt of ['2026-02-30T08:00:00.000Z', '2026-08-16 08:00:00Z', '2026-13-01T08:00:00.000Z']) {
    assert.throws(
      () => saveActualMeal(menu(), 'meal-1', { name: '苹果', occurredAt }, NOW),
      /实际用餐时间无效/
    );
  }
});

test('actual meal operations reject an invalid now timestamp', () => {
  const input = { name: '苹果', occurredAt: NOW };
  for (const invalidNow of ['invalid', '2026-02-30T08:00:00.000Z', 123, null]) {
    assert.throws(() => saveActualMeal(menu(), 'meal-1', input, invalidNow), /更新时间无效/);
    assert.throws(() => removeActualMeal(menu(), 'meal-1', invalidNow), /更新时间无效/);
  }
});

test('saveActualMeal rejects an invalid existing actual meal createdAt', () => {
  const source = menu();
  source.days[0].meals[0].actualMeal = {
    name: '旧记录', occurredAt: NOW, amount: '', note: '', createdAt: 'not-an-iso-time', updatedAt: NOW
  };

  assert.throws(
    () => saveActualMeal(source, 'meal-1', { name: '新记录', occurredAt: NOW }, NOW),
    /实际餐食创建时间无效/
  );
});

test('saveActualMeal rejects every malformed existing actualMeal field instead of inventing createdAt', () => {
  const malformedValues = [
    {},
    null,
    'legacy-string',
    42,
    [],
    undefined
  ];

  for (const actualMeal of malformedValues) {
    const source = menu();
    source.days[0].meals[0].actualMeal = actualMeal;
    const before = structuredClone(source);

    assert.throws(
      () => saveActualMeal(source, 'meal-1', { name: '新记录', occurredAt: NOW }, NOW),
      /已有实际餐食记录无效/
    );
    assert.deepEqual(source, before);
  }
});

test('removeActualMeal can remove malformed existing actualMeal fields for recovery', () => {
  for (const actualMeal of [null, 'legacy-string', 42, [], {}]) {
    const source = menu();
    source.days[0].meals[0].actualMeal = actualMeal;
    const removed = removeActualMeal(source, 'meal-1', NOW);
    assert.equal(Object.hasOwn(removed.days[0].meals[0], 'actualMeal'), false);
  }
});

test('actual meal operations reject malformed menu structures with domain errors', () => {
  const invalidMenus = [
    null,
    {},
    { days: null },
    { days: [{}] },
    { days: [{ meals: null }] },
    { days: [{ meals: [null] }] }
  ];

  for (const invalidMenu of invalidMenus) {
    assert.throws(
      () => saveActualMeal(invalidMenu, 'meal-1', { name: '苹果', occurredAt: NOW }, NOW),
      /菜单数据无效/
    );
    assert.throws(() => removeActualMeal(invalidMenu, 'meal-1', NOW), /菜单数据无效/);
  }
});
