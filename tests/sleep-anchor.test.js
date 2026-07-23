import test from 'node:test';
import assert from 'node:assert/strict';
import { applySleepAnchor } from '../src/features/schedule/sleep-anchor.js';

const task = (id, type, plannedAt, afterMinutes, status = 'upcoming', extra = {}) => ({
  id,
  babyId: 'baby-1',
  date: '2026-07-20',
  type,
  plannedAt,
  actualAt: null,
  afterMinutes,
  status,
  updatedAt: '2026-07-20T00:00:00.000Z',
  ...extra
});

test('night sleep completion anchors wake and cascades the following schedule', () => {
  const tasks = [
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20)
  ];

  const result = applySleepAnchor(tasks, {
    type: 'night',
    endAt: '2026-07-20T07:00:00.000Z'
  });

  assert.deepEqual(result[0], {
    ...tasks[0],
    status: 'completed',
    actualAt: '2026-07-20T07:00:00.000Z',
    updatedAt: '2026-07-20T07:00:00.000Z'
  });
  assert.equal(result[1].plannedAt, '2026-07-20T07:20:00.000Z');
});

test('nap completion moves the next eligible meal by the configured interval', () => {
  const tasks = [
    task('nap', 'sleep', '2026-07-20T13:00:00.000Z', 60),
    task('meal', 'meal', '2026-07-20T14:30:00.000Z', 90),
    task('milk', 'milk', '2026-07-20T16:30:00.000Z', 120)
  ];

  const result = applySleepAnchor(tasks, {
    type: 'nap',
    startAt: '2026-07-20T13:00:00.000Z',
    endAt: '2026-07-20T14:00:00.000Z'
  });

  assert.equal(result[1].plannedAt, '2026-07-20T16:00:00.000Z');
  assert.equal(result[1].status, 'upcoming');
  assert.equal(result[1].updatedAt, '2026-07-20T14:00:00.000Z');
  assert.equal(result[2].plannedAt, '2026-07-20T18:00:00.000Z');
});

test('completed, skipped and adjusted tasks stay locked and reset the cascade base', () => {
  const tasks = [
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0),
    task('completed', 'milk', '2026-07-20T07:45:00.000Z', 20, 'completed', { actualAt: '2026-07-20T08:00:00.000Z' }),
    task('after-completed', 'meal', '2026-07-20T09:00:00.000Z', 60),
    task('skipped', 'sleep', '2026-07-20T10:30:00.000Z', 90, 'skipped'),
    task('after-skipped', 'milk', '2026-07-20T11:00:00.000Z', 30),
    task('adjusted', 'meal', '2026-07-20T12:30:00.000Z', 90, 'adjusted'),
    task('after-adjusted', 'milk', '2026-07-20T13:00:00.000Z', 30)
  ];

  const result = applySleepAnchor(tasks, { type: 'night', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(result[1], tasks[1]);
  assert.equal(result[2].plannedAt, '2026-07-20T09:00:00.000Z');
  assert.deepEqual(result[3], tasks[3]);
  assert.equal(result[4].plannedAt, '2026-07-20T11:00:00.000Z');
  assert.deepEqual(result[5], tasks[5]);
  assert.equal(result[6].plannedAt, '2026-07-20T13:00:00.000Z');
});

test('does not mutate the input array or its task objects', () => {
  const tasks = [
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20)
  ];
  const snapshot = structuredClone(tasks);

  const result = applySleepAnchor(tasks, { type: 'night', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(tasks, snapshot);
  assert.notStrictEqual(result, tasks);
  assert.notStrictEqual(result[0], tasks[0]);
  assert.notStrictEqual(result[1], tasks[1]);
});

test('unknown sleep types, missing end times and naps without candidates return unchanged copies', () => {
  const tasks = [task('milk', 'milk', '2026-07-20T08:00:00.000Z', 20)];
  for (const sleep of [
    { type: 'unknown', endAt: '2026-07-20T07:00:00.000Z' },
    { type: 'night' },
    { type: 'nap', startAt: '2026-07-20T09:00:00.000Z', endAt: '2026-07-20T10:00:00.000Z' }
  ]) {
    const result = applySleepAnchor(tasks, sleep);
    assert.deepEqual(result, tasks);
    assert.notStrictEqual(result, tasks);
    assert.notStrictEqual(result[0], tasks[0]);
  }
});

test('cascade does not alter another baby or date', () => {
  const tasks = [
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0),
    task('milk-other-baby', 'milk', '2026-07-20T07:15:00.000Z', 20, 'upcoming', { babyId: 'baby-2' }),
    task('meal-next-day', 'meal', '2026-07-21T09:00:00.000Z', 120, 'upcoming', { date: '2026-07-21' }),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20)
  ];

  const result = applySleepAnchor(tasks, { type: 'night', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(result[1], tasks[1]);
  assert.deepEqual(result[2], tasks[2]);
  assert.equal(result[3].plannedAt, '2026-07-20T07:20:00.000Z');
});
