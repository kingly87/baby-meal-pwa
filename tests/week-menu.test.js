import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import {
  findMenuForDate,
  normalizeMenu,
  saveCurrentMenu,
  menuRange
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

test('saveCurrentMenu adds a menu for an exact date with one put', async () => {
  const repository = new TrackingMemoryRepository();
  const generated = { id: 'new-menu', babyId: 'baby-1', startDate: '2026-08-17', days: [] };

  const saved = await saveCurrentMenu(repository, [], generated, '2026-08-18T01:02:03.000Z');

  assert.deepEqual(saved, { ...generated, createdAt: '2026-08-18T01:02:03.000Z', updatedAt: '2026-08-18T01:02:03.000Z' });
  assert.equal(repository.puts.length, 1);
  assert.notEqual(repository.puts[0][1], generated);
});

test('saveCurrentMenu updates the same baby date while keeping stable identity and timestamps', async () => {
  const existing = { id: 'stable-id', babyId: 'baby-1', startDate: '2026-08-10', createdAt: 'old-created', updatedAt: 'old-updated', days: [{ date: '2026-08-10', meals: [] }] };
  const repository = new TrackingMemoryRepository({ weeklyMenus: [existing] });
  const generated = { id: 'throwaway-id', babyId: 'baby-1', startDate: '2026-08-10', createdAt: 'new-created', title: 'new content', days: [{ date: '2026-08-10', meals: [{ id: 'meal' }] }] };

  const saved = await saveCurrentMenu(repository, [existing], generated, '2026-08-15T08:00:00.000Z');

  assert.equal(repository.puts.length, 1);
  assert.deepEqual(saved, {
    ...generated,
    id: 'stable-id',
    createdAt: 'old-created',
    updatedAt: '2026-08-15T08:00:00.000Z'
  });
});

test('saveCurrentMenu leaves other babies and dates untouched', async () => {
  const menus = [
    { id: 'other-week', babyId: 'baby-1', startDate: '2026-08-03', createdAt: 'a' },
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10', createdAt: 'b' }
  ];
  const repository = new TrackingMemoryRepository({ weeklyMenus: menus });
  await saveCurrentMenu(repository, menus, { id: 'new', babyId: 'baby-1', startDate: '2026-08-10', days: [] });
  assert.equal(repository.puts.length, 1);
  assert.equal(repository.puts[0][1].id, 'new');
  assert.deepEqual(repository.deletes, []);
  assert.deepEqual((await repository.list('weeklyMenus')).map(menu => menu.id).sort(), ['new', 'other-baby', 'other-week']);
});

test('saveCurrentMenu rejects invalid generated identity before writing', async () => {
  for (const generated of [
    { id: 'x', startDate: '2026-08-10' },
    { id: 'x', babyId: '', startDate: '2026-08-10' },
    { id: 'x', babyId: 'baby-1' },
    { id: 'x', babyId: 'baby-1', startDate: '2026-02-30' }
  ]) {
    const repository = new TrackingMemoryRepository();
    await assert.rejects(saveCurrentMenu(repository, [], generated), /babyId|startDate/);
    assert.equal(repository.puts.length, 0);
  }
});

test('saveCurrentMenu does not mutate menus, existing, or generated inputs', async () => {
  const existing = { id: 'stable', babyId: 'baby-1', startDate: '2026-08-10', createdAt: 'created', days: [{ meals: [{ id: 'old' }] }] };
  const menus = [existing];
  const generated = { id: 'new', babyId: 'baby-1', startDate: '2026-08-15', createdAt: 'new-created', days: [{ meals: [{ id: 'new-meal' }] }] };
  const menusSnapshot = structuredClone(menus);
  const generatedSnapshot = structuredClone(generated);
  const repository = new TrackingMemoryRepository({ weeklyMenus: [existing] });

  await saveCurrentMenu(repository, menus, generated, '2026-08-15T08:00:00.000Z');

  assert.deepEqual(menus, menusSnapshot);
  assert.deepEqual(existing, menusSnapshot[0]);
  assert.deepEqual(generated, generatedSnapshot);
});

test('saveCurrentMenu refreshes stale snapshots and removes only duplicate records on the target date', async () => {
  const repository = new TrackingMemoryRepository({ weeklyMenus: [
    { id: 'later', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-12T00:00:00.000Z' },
    { id: 'keeper', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-10T00:00:00.000Z' },
    { id: 'other-week', babyId: 'baby-1', startDate: '2026-08-03' },
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10' }
  ] });

  const saved = await saveCurrentMenu(repository, [], {
    id: 'generated', babyId: 'baby-1', startDate: '2026-08-10', days: [{ meals: [] }]
  }, '2026-08-15T08:00:00.000Z');

  assert.equal(saved.id, 'keeper');
  assert.equal(saved.createdAt, '2026-08-10T00:00:00.000Z');
  assert.deepEqual(repository.deletes, [['weeklyMenus', 'later']]);
  assert.deepEqual((await repository.list('weeklyMenus')).map(menu => menu.id).sort(), ['keeper', 'other-baby', 'other-week']);
});

test('saveCurrentMenu breaks equal-createdAt duplicate ties by stable id order', async () => {
  const repository = new TrackingMemoryRepository({ weeklyMenus: [
    { id: 'z-menu', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-10T00:00:00.000Z' },
    { id: 'a-menu', babyId: 'baby-1', startDate: '2026-08-10', createdAt: '2026-08-10T00:00:00.000Z' }
  ] });

  const saved = await saveCurrentMenu(repository, [], { id: 'new', babyId: 'baby-1', startDate: '2026-08-10' }, '2026-08-15T08:00:00.000Z');

  assert.equal(saved.id, 'a-menu');
  assert.deepEqual(repository.deletes, [['weeklyMenus', 'z-menu']]);
});

test('saveCurrentMenu serializes concurrent first writes for the same date into one menu', async () => {
  const repository = new MemoryRepository();
  const now = '2026-08-15T08:00:00.000Z';

  await Promise.all([
    saveCurrentMenu(repository, [], { id: 'generated-b', babyId: 'baby-1', startDate: '2026-08-15', days: [] }, now),
    saveCurrentMenu(repository, [], { id: 'generated-a', babyId: 'baby-1', startDate: '2026-08-15', days: [] }, now)
  ]);

  const menus = await repository.list('weeklyMenus', { babyId: 'baby-1' });
  assert.equal(menus.length, 1);
});

test('menuRange spans seven exact local dates from the menu start', () => {
  assert.deepEqual(menuRange('2026-08-15'), {
    startDate: '2026-08-15',
    endDate: '2026-08-21'
  });
});

test('menu ranges safely cross month and year boundaries', () => {
  assert.deepEqual(menuRange('2026-09-01'), {
    startDate: '2026-09-01',
    endDate: '2026-09-07'
  });
  assert.deepEqual(menuRange('2027-01-01'), {
    startDate: '2027-01-01',
    endDate: '2027-01-07'
  });
});

test('menuRange rejects malformed and impossible dates', () => {
  for (const value of ['2026-2-03', '2026-02-30', 'not-a-date', '', null]) {
    assert.throws(() => menuRange(value), /菜单日期无效/);
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

test('findMenuForDate matches only the same baby and exact valid date', () => {
  const menus = [
    { id: 'other-baby', babyId: 'baby-2', startDate: '2026-08-10', days: [] },
    { id: 'previous-week', babyId: 'baby-1', startDate: '2026-08-03', days: [] },
    { id: 'same-week-not-current', babyId: 'baby-1', startDate: '2026-08-10', days: [] },
    { id: 'expected', babyId: 'baby-1', startDate: '2026-08-15', days: [] }
  ];
  const found = findMenuForDate(menus, { babyId: 'baby-1', date: '2026-08-15' });
  assert.equal(found.id, 'expected');
  assert.notEqual(found, menus[3]);
});

test('findMenuForDate returns null for missing arrays and rejects invalid target dates', () => {
  assert.equal(findMenuForDate([], { babyId: 'baby-1', date: '2026-08-15' }), null);
  assert.equal(findMenuForDate(null, { babyId: 'baby-1', date: '2026-08-15' }), null);
  assert.equal(findMenuForDate({}, { babyId: 'baby-1', date: '2026-08-15' }), null);
  assert.throws(() => findMenuForDate([], { babyId: 'baby-1', date: '2026-02-30' }), /菜单日期无效|鑿滃崟鏃ユ湡鏃犳晥/);
});

test('findMenuForDate never treats a day date as the explicit menu identity', () => {
  const menus = [
    { id: 'missing', babyId: 'baby-1', days: [{ date: '2026-08-15', meals: [] }] },
    { id: 'invalid', babyId: 'baby-1', startDate: '2026-02-30', days: [{ date: '2026-08-15', meals: [] }] }
  ];
  assert.equal(findMenuForDate(menus, { babyId: 'baby-1', date: '2026-08-15' }), null);
});

test('saveCurrentMenu never uses a day date to choose the stable keeper', async () => {
  const repository = new TrackingMemoryRepository({ weeklyMenus: [
    { id: 'legacy', babyId: 'baby-1', createdAt: 'old', days: [{ date: '2026-08-15', meals: [] }] },
    { id: 'invalid', babyId: 'baby-1', startDate: '2026-02-30', createdAt: 'older', days: [{ date: '2026-08-15', meals: [] }] }
  ] });
  const saved = await saveCurrentMenu(repository, [], { id: 'generated', babyId: 'baby-1', startDate: '2026-08-15' }, '2026-08-15T00:00:00.000Z');
  assert.equal(saved.id, 'generated');
  assert.ok(await repository.get('weeklyMenus', 'legacy'));
  assert.ok(await repository.get('weeklyMenus', 'invalid'));
});

test('saveCurrentMenu keeps only the six newest exact-date menus for one baby', async () => {
  const old = Array.from({ length: 6 }, (_, index) => ({ id: `m${index + 1}`, babyId: 'baby-1', startDate: `2026-08-0${index + 1}`, updatedAt: `2026-08-0${index + 1}T00:00:00.000Z` }));
  const repository = new TrackingMemoryRepository({ weeklyMenus: [...old, { id: 'other', babyId: 'baby-2', startDate: '2026-01-01' }] });
  await saveCurrentMenu(repository, [], { id: 'new', babyId: 'baby-1', startDate: '2026-08-15' }, '2026-08-15T00:00:00.000Z');
  assert.deepEqual((await repository.list('weeklyMenus', { babyId: 'baby-1' })).map(menu => menu.id).sort(), ['m2', 'm3', 'm4', 'm5', 'm6', 'new']);
  assert.ok(await repository.get('weeklyMenus', 'other'));
});

test('saveCurrentMenu counts only valid dates and preserves damaged records during retention', async () => {
  const valid = Array.from({ length: 6 }, (_, index) => ({ id: `m${index + 1}`, babyId: 'baby-1', startDate: `2026-08-0${index + 1}` }));
  const damaged = [
    { id: 'bad-missing', babyId: 'baby-1', days: [{ date: '2026-08-15' }] },
    { id: 'bad-invalid', babyId: 'baby-1', startDate: 'zzzz' }
  ];
  const repository = new TrackingMemoryRepository({ weeklyMenus: [...valid, ...damaged, { id: 'other', babyId: 'baby-2', startDate: 'zzzz' }] });
  await saveCurrentMenu(repository, [], { id: 'new', babyId: 'baby-1', startDate: '2026-08-15' });
  const babyMenus = await repository.list('weeklyMenus', { babyId: 'baby-1' });
  assert.deepEqual(babyMenus.filter(menu => /^m\d$|^new$/.test(menu.id)).map(menu => menu.id).sort(), ['m2', 'm3', 'm4', 'm5', 'm6', 'new']);
  assert.ok(await repository.get('weeklyMenus', 'bad-missing'));
  assert.ok(await repository.get('weeklyMenus', 'bad-invalid'));
  assert.ok(await repository.get('weeklyMenus', 'other'));
});

test('saveCurrentMenu rolls back put and pruning when a delete fails', async () => {
  class FailingRepository extends TrackingMemoryRepository { async delete(store, id) { if (id === 'm1') throw new Error('delete failed'); return super.delete(store, id); } }
  const old = Array.from({ length: 6 }, (_, index) => ({ id: `m${index + 1}`, babyId: 'baby-1', startDate: `2026-08-0${index + 1}` }));
  const repository = new FailingRepository({ weeklyMenus: old });
  await assert.rejects(saveCurrentMenu(repository, [], { id: 'new', babyId: 'baby-1', startDate: '2026-08-15' }), /delete failed/);
  assert.deepEqual((await repository.list('weeklyMenus', { babyId: 'baby-1' })).map(menu => menu.id).sort(), old.map(menu => menu.id).sort());
});
