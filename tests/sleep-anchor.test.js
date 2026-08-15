import test from 'node:test';
import assert from 'node:assert/strict';
import { applySleepAnchor, restoreSleepAnchors } from '../src/features/schedule/sleep-anchor.js';

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
    babyId: 'baby-1',
    endAt: '2026-07-20T07:00:00.000Z'
  });

  assert.deepEqual(result[0], {
    ...tasks[0],
    status: 'completed',
    actualAt: '2026-07-20T07:00:00.000Z',
    updatedAt: '2026-07-20T07:00:00.000Z',
    sleepAnchorBaseline:{
      plannedAt:tasks[0].plannedAt,status:tasks[0].status,actualAt:tasks[0].actualAt,updatedAt:tasks[0].updatedAt
    }
  });
  assert.equal(result[1].plannedAt, '2026-07-20T07:20:00.000Z');
});

test('sleep anchors restore original task fields and preserve the first baseline across replays', () => {
  const original=[
    task('wake','wake','2026-07-20T08:00:00.000Z',0),
    task('meal','meal','2026-07-20T10:00:00.000Z',120)
  ];
  const first=applySleepAnchor(original,{type:'night',babyId:'baby-1',endAt:'2026-07-20T07:00:00.000Z'});
  const replayed=applySleepAnchor(first,{type:'night',babyId:'baby-1',endAt:'2026-07-20T06:30:00.000Z'});
  assert.deepEqual(replayed[0].sleepAnchorBaseline,{
    plannedAt:original[0].plannedAt,status:original[0].status,actualAt:original[0].actualAt,updatedAt:original[0].updatedAt
  });
  assert.deepEqual(restoreSleepAnchors(replayed),original);

  const napOriginal=[task('nap','sleep','2026-07-20T13:00:00.000Z',60),task('meal','meal','2026-07-20T14:30:00.000Z',90)];
  const napped=applySleepAnchor(napOriginal,{type:'nap',babyId:'baby-1',startAt:'2026-07-20T13:00:00.000Z',endAt:'2026-07-20T14:00:00.000Z'});
  assert.deepEqual(restoreSleepAnchors(napped),napOriginal);
});

test('nap completion leaves every task unchanged and returns a deep structural copy', () => {
  const tasks = [
    task('nap', 'sleep', '2026-07-20T13:00:00.000Z', 60),
    task('meal', 'meal', '2026-07-20T14:30:00.000Z', 90),
    task('milk', 'milk', '2026-07-20T16:30:00.000Z', 120)
  ];

  const snapshot = structuredClone(tasks);
  const result = applySleepAnchor(tasks, {
    type: 'nap',
    babyId: 'baby-1',
    startAt: '2026-07-20T13:00:00.000Z',
    endAt: '2026-07-20T14:00:00.000Z'
  }, { napToMealMinutes: 5 });

  assert.deepEqual(tasks, snapshot);
  assert.deepEqual(result, tasks);
  assert.notStrictEqual(result, tasks);
  result.forEach((item,index)=>assert.notStrictEqual(item,tasks[index]));
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

  const result = applySleepAnchor(tasks, { type: 'night', babyId: 'baby-1', endAt: '2026-07-20T07:00:00.000Z' });

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

  const result = applySleepAnchor(tasks, { type: 'night', babyId: 'baby-1', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(tasks, snapshot);
  assert.notStrictEqual(result, tasks);
  assert.notStrictEqual(result[0], tasks[0]);
  assert.notStrictEqual(result[1], tasks[1]);
});

test('unknown sleep types, missing end times and naps without candidates return unchanged copies', () => {
  const tasks = [task('milk', 'milk', '2026-07-20T08:00:00.000Z', 20)];
  for (const sleep of [
    { type: 'unknown', babyId: 'baby-1', endAt: '2026-07-20T07:00:00.000Z' },
    { type: 'night', babyId: 'baby-1' },
    { type: 'nap', babyId: 'baby-1', startAt: '2026-07-20T09:00:00.000Z', endAt: '2026-07-20T10:00:00.000Z' }
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

  const result = applySleepAnchor(tasks, { type: 'night', babyId: 'baby-1', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(result[1], tasks[1]);
  assert.deepEqual(result[2], tasks[2]);
  assert.equal(result[3].plannedAt, '2026-07-20T07:20:00.000Z');
});

test('missing baby id returns an unchanged copy', () => {
  const tasks = [
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20)
  ];

  const result = applySleepAnchor(tasks, { type: 'night', endAt: '2026-07-20T07:00:00.000Z' });

  assert.deepEqual(result, tasks);
  assert.notStrictEqual(result[0], tasks[0]);
});

test('derives the local end date and strictly isolates another date', () => {
  const derivedDate = [
    String(new Date('2026-07-20T07:00:00.000Z').getFullYear()),
    String(new Date('2026-07-20T07:00:00.000Z').getMonth() + 1).padStart(2, '0'),
    String(new Date('2026-07-20T07:00:00.000Z').getDate()).padStart(2, '0')
  ].join('-');
  const tasks = [
    task('other-date-wake', 'wake', '2026-07-19T06:30:00.000Z', 0, 'upcoming', { date: '2026-07-19' }),
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0, 'upcoming', { date: derivedDate }),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20, 'upcoming', { date: derivedDate })
  ];

  const result = applySleepAnchor(tasks, {
    type: 'night',
    babyId: 'baby-1',
    endAt: '2026-07-20T07:00:00.000Z'
  });

  assert.deepEqual(result[0], tasks[0]);
  assert.equal(result[1].actualAt, '2026-07-20T07:00:00.000Z');
  assert.equal(result[2].plannedAt, '2026-07-20T07:20:00.000Z');
});

test('nap ignores legacy interval configuration even when eligible meals exist', () => {
  const tasks = [
    task('later-meal', 'meal', '2026-07-20T17:00:00.000Z', 180),
    task('earlier-meal', 'meal', '2026-07-20T15:00:00.000Z', 120)
  ];

  const result = applySleepAnchor(tasks, {
    type: 'nap',
    babyId: 'baby-1',
    date: '2026-07-20',
    startAt: '2026-07-20T13:00:00.000Z',
    endAt: '2026-07-20T14:00:00.000Z'
  }, { napToMealMinutes: 1 });

  assert.deepEqual(result, tasks);
});

test('night cascades through logical rule order while preserving physical array order', () => {
  const tasks = [
    task('meal', 'meal', '2026-07-20T09:00:00.000Z', 120, 'upcoming', { ruleIndex: 2 }),
    task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0, 'upcoming', { ruleIndex: 0 }),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20, 'upcoming', { ruleIndex: 1 })
  ];

  const result = applySleepAnchor(tasks, {
    type: 'night',
    babyId: 'baby-1',
    date: '2026-07-20',
    endAt: '2026-07-20T07:00:00.000Z'
  });

  assert.deepEqual(result.map(item => item.id), ['meal', 'wake', 'milk']);
  assert.equal(result[1].actualAt, '2026-07-20T07:00:00.000Z');
  assert.equal(result[2].plannedAt, '2026-07-20T07:20:00.000Z');
  assert.equal(result[0].plannedAt, '2026-07-20T09:20:00.000Z');
});

test('night selects the logically earliest wake when several exist', () => {
  const tasks = [
    task('late-wake', 'wake', '2026-07-20T08:00:00.000Z', 60, 'upcoming', { ruleIndex: 3 }),
    task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20, 'upcoming', { ruleIndex: 1 }),
    task('early-wake', 'wake', '2026-07-20T06:30:00.000Z', 0, 'upcoming', { ruleIndex: 0 })
  ];

  const result = applySleepAnchor(tasks, {
    type: 'night',
    babyId: 'baby-1',
    date: '2026-07-20',
    endAt: '2026-07-20T07:00:00.000Z'
  });

  assert.equal(result[2].status, 'completed');
  assert.equal(result[2].actualAt, '2026-07-20T07:00:00.000Z');
  assert.notEqual(result[0].actualAt, '2026-07-20T07:00:00.000Z');
});

test('nap leaves duplicate ids across scopes unchanged', () => {
  const tasks = [
    task('duplicate', 'meal', '2026-07-20T15:00:00.000Z', 120, 'upcoming', { babyId: 'baby-2' }),
    task('duplicate', 'meal', '2026-07-20T15:30:00.000Z', 120)
  ];

  const result = applySleepAnchor(tasks, {
    type: 'nap',
    babyId: 'baby-1',
    date: '2026-07-20',
    startAt: '2026-07-20T13:00:00.000Z',
    endAt: '2026-07-20T14:00:00.000Z'
  });

  assert.deepEqual(result, tasks);
});

test('invalid sleep times and legacy nap intervals return unchanged copies without throwing', () => {
  const tasks = [task('meal', 'meal', '2026-07-20T15:00:00.000Z', 120)];
  const cases = [
    [{ type: 'night', babyId: 'baby-1', date: '2026-07-20', endAt: 'invalid' }, undefined],
    [{ type: 'nap', babyId: 'baby-1', date: '2026-07-20', startAt: 'invalid', endAt: '2026-07-20T14:00:00.000Z' }, undefined],
    [{ type: 'nap', babyId: 'baby-1', date: '2026-07-20', startAt: '2026-07-20T13:00:00.000Z', endAt: '2026-07-20T14:00:00.000Z' }, { napToMealMinutes: Number.NaN }],
    [{ type: 'nap', babyId: 'baby-1', date: '2026-07-20', startAt: '2026-07-20T13:00:00.000Z', endAt: '2026-07-20T14:00:00.000Z' }, { napToMealMinutes: -1 }]
  ];

  for (const [sleep, options] of cases) {
    let result;
    assert.doesNotThrow(() => { result = applySleepAnchor(tasks, sleep, options); });
    assert.deepEqual(result, tasks);
    assert.notStrictEqual(result[0], tasks[0]);
  }
});

for (const status of ['skipped', 'adjusted']) {
  test(`night sleep does not overwrite a ${status} wake`, () => {
    const tasks = [
      task('wake', 'wake', '2026-07-20T06:30:00.000Z', 0, status),
      task('milk', 'milk', '2026-07-20T06:50:00.000Z', 20)
    ];

    const result = applySleepAnchor(tasks, {
      type: 'night',
      babyId: 'baby-1',
      date: '2026-07-20',
      endAt: '2026-07-20T07:00:00.000Z'
    });

    assert.deepEqual(result, tasks);
  });
}
