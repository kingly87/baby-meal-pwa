import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import {
  findMenuForWeek,
  normalizeMenu,
  saveCurrentWeek,
  weekRange,
  weekStart
} from '../src/features/meals/week-menu.js';

class TrackingMemoryRepository extends MemoryRepository {
  puts = [];
  deletes = [];
  async put(store, value) {
    this.puts.push([store, structuredClone(value)]);
    return super.put(store, value);
  }
  async delete(store, id) {
    this.deletes.push([store, id]);
    return super.delete(store, id);
  }
}

class SerializableMemoryRepository extends TrackingMemoryRepository {
  queue = Promise.resolve();
  transaction(stores, callback) {
    const result = this.queue.then(() => super.transaction(stores, callback));
    this.queue = result.catch(() => {});
    return result;
  }
}

test('weekStart normalizes a local calendar date to Monday', () => {
  assert.equal(weekStart('2026-08-15'), '2026-08-10');
  assert.equal(weekStart('2026-08-10'), '2026-08-10');
});

test('saveCurrentWeek adds a menu for a new natural week with one put', async () => {
  const repository = new TrackingMemoryRepository();
  const generated = { id: 'new-menu', babyId: 'baby-1', startDate: '2026-08-17', days: [] };

  const saved = await saveCurrentWeek(repository, [], generated, '2026-08-18T01:02:03.000Z');

  assert.deepEqual(saved, { ...generated, createdAt: '2026-08-18T01:02:03.000Z', updatedAt: '2026-08-18T01:02:03.000Z' });
  assert.equal(repository.puts.length, 1);
  assert.notEqual(repository.puts[0][1], generated);
});

test('saveCurrentWeek updates the same baby week while keeping stable identity and timestamps', async () => {
  const existing = { id: 'stable-id', babyId: 'baby-1', startDate: '2026-08-10', createdAt: 'old-created', updatedAt: 'old-updated', days: [{ date: '2026-08-10', meals: [] }] };
  const repository = new TrackingMemoryRepository({ weeklyMenus: [existing] });
  const generated = { id: 'throwaway-id', babyId: 'baby-1', startDate: '2026-08-12', createdAt: 'new-created', title: 'new content', days: [{ date: '2026-08-12', meals: [{ id: 'meal' }] }] };

  const saved = await saveCurrentWeek(repository, [existing], generated, '2026-08-15T08:00:00.000Z');

  assert.equal(repository.puts.length, 1);
  assert.deepEqual(saved, {
    ...generated,
    id: 'stable-id',
    createdAt: 'old-created',
    updatedAt: '2026-08-15T08:00:00.000Z'
  });
});

test('saveCurrentWeek leaves other babies and weeks untouched', async () => {
  const menus = [
    { id: 'other-week', babyId: 'baby-1', startDate: '2026-08-03', createdAt: 'a' },
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10', createdAt: 'b' }
  ];
  const repository = new TrackingMemoryRepository({ weeklyMenus: menus });
  await saveCurrentWeek(repository, menus, { id: 'new', babyId: 'baby-1', startDate: '2026-08-10', days: [] });
  assert.equal(repository.puts.length, 1);
  assert.equal(repository.puts[0][1].id, 'new');
  assert.deepEqual(repository.deletes, []);
  assert.deepEqual((await repository.list('weeklyMenus')).map(menu => menu.id).sort(), ['new', 'other-baby', 'other-week']);
});

test('saveCurrentWeek rejects invalid generated identity before writing', async () => {
  for (const generated of [
    { id: 'x', startDate: '2026-08-10' },
    { id: 'x', babyId: '', startDate: '2026-08-10' },
    { id: 'x', babyId: 'baby-1' },
    { id: 'x', babyId: 'baby-1', startDate: '2026-02-30' }
  ]) {
    const repository = new TrackingMemoryRepository();
    await assert.rejects(saveCurrentWeek(repository, [], generated), /babyId|startDate/);
    assert.equal(repository.puts.length, 0);
  }
});

test('saveCurrentWeek does not mutate menus, existing, or generated inputs', async () => {
  const existing = { id: 'stable', babyId: 'baby-1', startDate: '2026-08-10', createdAt: 'created', days: [{ meals: [{ id: 'old' }] }] };
  const menus = [existing];
  const generated = { id: 'new', babyId: 'baby-1', startDate: '2026-08-15', createdAt: 'new-created', days: [{ meals: [{ id: 'new-meal' }] }] };
  const menusSnapshot = structuredClone(menus);
  const generatedSnapshot = structuredClone(generated);
  const repository = new TrackingMemoryRepository({ weeklyMenus: [existing] });

  await saveCurrentWeek(repository, menus, generated, '2026-08-15T08:00:00.000Z');

  assert.deepEqual(menus, menusSnapshot);
  assert.deepEqual(existing, menusSnapshot[0]);
  assert.deepEqual(generated, generatedSnapshot);
});

test('saveCurrentWeek refreshes stale snapshots and removes only duplicate records in the target baby week', async () => {
  const repository = new TrackingMemoryRepository({ weeklyMenus: [
    { id: 'later', babyId: 'baby-1', startDate: '2026-08-12', createdAt: '2026-08-12T00:00:00.000Z' },
    { id: 'keeper', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-10T00:00:00.000Z' },
    { id: 'other-week', babyId: 'baby-1', startDate: '2026-08-03' },
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10' }
  ] });

  const saved = await saveCurrentWeek(repository, [], {
    id: 'generated', babyId: 'baby-1', startDate: '2026-08-15', days: [{ meals: [] }]
  }, '2026-08-15T08:00:00.000Z');

  assert.equal(saved.id, 'keeper');
  assert.equal(saved.createdAt, '2026-08-10T00:00:00.000Z');
  assert.deepEqual(repository.deletes, [['weeklyMenus', 'later']]);
  assert.deepEqual((await repository.list('weeklyMenus')).map(menu => menu.id).sort(), ['keeper', 'other-baby', 'other-week']);
});

test('saveCurrentWeek breaks equal-createdAt duplicate ties by stable id order', async () => {
  const repository = new TrackingMemoryRepository({ weeklyMenus: [
    { id: 'z-menu', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-10T00:00:00.000Z' },
    { id: 'a-menu', babyId: 'baby-1', startDate: '2026-08-11', createdAt: '2026-08-10T00:00:00.000Z' }
  ] });

  const saved = await saveCurrentWeek(repository, [], { id: 'new', babyId: 'baby-1', startDate: '2026-08-15' }, '2026-08-15T08:00:00.000Z');

  assert.equal(saved.id, 'a-menu');
  assert.deepEqual(repository.deletes, [['weeklyMenus', 'z-menu']]);
});

test('saveCurrentWeek serializes concurrent first writes into one menu', async () => {
  const repository = new SerializableMemoryRepository();
  const now = '2026-08-15T08:00:00.000Z';

  await Promise.all([
    saveCurrentWeek(repository, [], { id: 'generated-b', babyId: 'baby-1', startDate: '2026-08-10', days: [] }, now),
    saveCurrentWeek(repository, [], { id: 'generated-a', babyId: 'baby-1', startDate: '2026-08-15', days: [] }, now)
  ]);

  const menus = await repository.list('weeklyMenus', { babyId: 'baby-1' });
  assert.equal(menus.length, 1);
  assert.equal(repository.puts.length, 2);
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
