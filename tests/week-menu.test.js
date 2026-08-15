import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMenuForWeek,
  normalizeMenu,
  weekRange,
  weekStart
} from '../src/features/meals/week-menu.js';

test('weekStart normalizes a local calendar date to Monday', () => {
  assert.equal(weekStart('2026-08-15'), '2026-08-10');
  assert.equal(weekStart('2026-08-10'), '2026-08-10');
});

test('weekRange spans Monday through Sunday', () => {
  assert.deepEqual(weekRange('2026-08-15'), {
    startDate: '2026-08-10',
    endDate: '2026-08-16'
  });
});

test('week calculations safely cross month and year boundaries', () => {
  assert.deepEqual(weekRange('2026-09-01'), {
    startDate: '2026-08-31',
    endDate: '2026-09-06'
  });
  assert.deepEqual(weekRange('2027-01-01'), {
    startDate: '2026-12-28',
    endDate: '2027-01-03'
  });
});

test('weekStart rejects malformed and impossible dates', () => {
  for (const value of ['2026-2-03', '2026-02-30', 'not-a-date', '', null]) {
    assert.throws(() => weekStart(value), /菜单日期无效/);
  }
});

test('normalizeMenu maps legacy two-meal days without mutating input', () => {
  const menu = {
    id: 'menu-1',
    babyId: 'baby-1',
    days: [{ date: '2026-08-10', meals: [{ id: 'a' }, { id: 'b' }] }]
  };
  const snapshot = structuredClone(menu);
  const normalized = normalizeMenu(menu);

  assert.deepEqual(normalized.days[0].meals.map(meal => meal.mealType), ['lunch', 'dinner']);
  assert.deepEqual(menu, snapshot);
  assert.notEqual(normalized, menu);
  assert.notEqual(normalized.days[0], menu.days[0]);
  assert.notEqual(normalized.days[0].meals[0], menu.days[0].meals[0]);
});

test('normalizeMenu maps legacy three-meal days', () => {
  const normalized = normalizeMenu({
    days: [{ meals: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }]
  });
  assert.deepEqual(
    normalized.days[0].meals.map(meal => meal.mealType),
    ['breakfast', 'lunch', 'dinner']
  );
});

test('normalizeMenu preserves existing valid meal types', () => {
  const normalized = normalizeMenu({
    days: [{ meals: [
      { id: 'a', mealType: 'breakfast' },
      { id: 'b', mealType: 'dinner' }
    ] }]
  });
  assert.deepEqual(normalized.days[0].meals.map(meal => meal.mealType), ['breakfast', 'dinner']);
});

test('normalizeMenu preserves explicit unknown meal types and only fills missing legacy values', () => {
  const normalized = normalizeMenu({
    days: [{ meals: [
      { id: 'a', mealType: 'snack' },
      { id: 'b', mealType: null },
      { id: 'c' }
    ] }]
  });
  assert.deepEqual(
    normalized.days[0].meals.map(meal => meal.mealType),
    ['snack', 'lunch', 'dinner']
  );
});

test('normalizeMenu safely clones abnormal days without inventing meal types', () => {
  const menu = {
    days: [
      { meals: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] },
      { note: 'missing meals' }
    ]
  };
  const normalized = normalizeMenu(menu);
  assert.equal(normalized.days[0].meals.length, 4);
  assert.ok(normalized.days[0].meals.every(meal => meal.mealType === undefined));
  assert.deepEqual(normalized.days[1], { note: 'missing meals' });
});

test('findMenuForWeek matches only the same baby and natural week', () => {
  const menus = [
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10', days: [] },
    { id: 'previous-week', babyId: 'baby-1', startDate: '2026-08-03', days: [] },
    { id: 'expected', babyId: 'baby-1', startDate: '2026-08-12', days: [] }
  ];
  const found = findMenuForWeek(menus, { babyId: 'baby-1', date: '2026-08-15' });
  assert.equal(found.id, 'expected');
  assert.notEqual(found, menus[2]);
});

test('findMenuForWeek returns null for missing or invalid menu arrays', () => {
  assert.equal(findMenuForWeek([], { babyId: 'baby-1', date: '2026-08-15' }), null);
  assert.equal(findMenuForWeek(null, { babyId: 'baby-1', date: '2026-08-15' }), null);
  assert.equal(findMenuForWeek({}, { babyId: 'baby-1', date: '2026-08-15' }), null);
});
