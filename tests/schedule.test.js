import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultTemplate } from '../src/features/schedule/template.js';
import { generateTasks, completeTask, updateOverdue } from '../src/features/schedule/engine.js';
import { selectPrimaryTask } from '../src/features/schedule/select-current.js';

const clock = '2026-07-20T08:00:00.000Z';
const ids = (() => { let i = 0; return () => `t${++i}`; })();

test('default template generates configurable wake, milk, meal and nap chain', () => {
  const template = createDefaultTemplate('b1');
  const tasks = generateTasks({ babyId: 'b1', date: '2026-07-20', wakeAt: clock, template, createId: ids });
  assert.deepEqual(tasks.slice(0, 4).map(x => x.type), ['wake','milk','meal','sleep']);
  assert.equal(tasks[1].plannedAt, '2026-07-20T08:20:00.000Z');
  assert.equal(tasks[2].plannedAt, '2026-07-20T10:20:00.000Z');
});

test('actual completion cascades unfinished tasks but preserves completed history', () => {
  const template = createDefaultTemplate('b1');
  let tasks = generateTasks({ babyId: 'b1', date: '2026-07-20', wakeAt: clock, template, createId: ids });
  tasks = completeTask(tasks, tasks[1].id, '2026-07-20T08:35:00.000Z', { cascade: true });
  assert.equal(tasks[1].actualAt, '2026-07-20T08:35:00.000Z');
  assert.equal(tasks[2].plannedAt, '2026-07-20T10:35:00.000Z');
  const completedPlan = tasks[1].plannedAt;
  tasks = completeTask(tasks, tasks[2].id, '2026-07-20T10:50:00.000Z', { cascade: true });
  assert.equal(tasks[1].plannedAt, completedPlan);
  assert.equal(tasks[3].plannedAt, '2026-07-20T12:02:00.000Z');
});

test('manual next time overrides cascade and overdue task has priority', () => {
  const template = createDefaultTemplate('b1');
  let tasks = generateTasks({ babyId: 'b1', date: '2026-07-20', wakeAt: clock, template, createId: ids });
  tasks = completeTask(tasks, tasks[1].id, '2026-07-20T08:25:00.000Z', { cascade: true, nextPlannedAt: '2026-07-20T10:40:00.000Z' });
  assert.equal(tasks[2].plannedAt, '2026-07-20T10:40:00.000Z');
  tasks = updateOverdue(tasks, '2026-07-20T10:50:00.000Z');
  assert.equal(selectPrimaryTask(tasks, '2026-07-20T10:50:00.000Z').status, 'overdue');
});
