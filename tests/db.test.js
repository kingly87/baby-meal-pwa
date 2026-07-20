import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE_NAMES, SCHEMA_VERSION } from '../src/core/schema.js';
import { MemoryRepository } from '../src/db.js';

test('schema exposes all V1 stores', () => {
  assert.equal(SCHEMA_VERSION, 1);
  for (const name of ['babies','scheduleTemplates','taskInstances','dailyRecords','sleepSessions','growthMeasurements','toothRecords','newFoodObservations','reminders','weeklyMenus','shoppingItems','foodPreferences','appSettings']) assert.ok(STORE_NAMES.includes(name), name);
});

test('repository performs CRUD by stable id and isolates babies', async () => {
  const repo = new MemoryRepository();
  await repo.put('growthMeasurements', { id: 'g1', babyId: 'b1', value: 8 });
  await repo.put('growthMeasurements', { id: 'g2', babyId: 'b2', value: 9 });
  assert.equal((await repo.get('growthMeasurements', 'g1')).value, 8);
  assert.deepEqual((await repo.list('growthMeasurements', { babyId: 'b1' })).map(x => x.id), ['g1']);
  await repo.delete('growthMeasurements', 'g1');
  assert.equal(await repo.get('growthMeasurements', 'g1'), undefined);
});

test('repository transaction rolls back on failure and clear removes all data', async () => {
  const repo = new MemoryRepository();
  await repo.put('babies', { id: 'b1', name: '柚柚' });
  await assert.rejects(repo.transaction(['babies'], async tx => { await tx.put('babies', { id: 'b2' }); throw new Error('stop'); }), /stop/);
  assert.deepEqual((await repo.list('babies')).map(x => x.id), ['b1']);
  await repo.clearAll();
  assert.equal((await repo.list('babies')).length, 0);
});
