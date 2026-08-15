import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { AppStore } from '../src/store.js';

function repositoryWithMenus(weeklyMenus) {
  return new MemoryRepository({
    babies: [{ id: 'baby-1' }, { id: 'baby-2' }],
    appSettings: [{ id: 'global', activeBabyId: 'baby-1' }],
    weeklyMenus
  });
}

test('AppStore keeps all baby menus sorted but selects the menu containing today', async () => {
  const store = new AppStore(repositoryWithMenus([
    { id: 'current', babyId: 'baby-1', startDate: '2026-08-10' },
    { id: 'future', babyId: 'baby-1', startDate: '2026-08-17' },
    { id: 'history', babyId: 'baby-1', startDate: '2026-08-03' }
  ]), { now: () => new Date(2026, 7, 15, 12) });

  await store.load();

  assert.deepEqual(store.weeks.map(menu => menu.id), ['future', 'current', 'history']);
  assert.equal(store.week.id, 'current');
});

test('AppStore uses null when the active baby has no menu for the current week', async () => {
  const store = new AppStore(repositoryWithMenus([
    { id: 'future', babyId: 'baby-1', startDate: '2026-08-17' },
    { id: 'history', babyId: 'baby-1', startDate: '2026-08-03' }
  ]), { now: () => new Date(2026, 7, 15, 12) });

  await store.load();

  assert.equal(store.week, null);
});

test('AppStore isolates the current week after switching babies', async () => {
  const store = new AppStore(repositoryWithMenus([
    { id: 'baby-1-current', babyId: 'baby-1', startDate: '2026-08-10' },
    { id: 'baby-2-current', babyId: 'baby-2', startDate: '2026-08-10' },
    { id: 'baby-2-future', babyId: 'baby-2', startDate: '2026-08-17' }
  ]), { now: () => new Date(2026, 7, 15, 12) });

  await store.load();
  await store.setActiveBaby('baby-2');

  assert.deepEqual(store.weeks.map(menu => menu.id), ['baby-2-future', 'baby-2-current']);
  assert.equal(store.week.id, 'baby-2-current');
});
