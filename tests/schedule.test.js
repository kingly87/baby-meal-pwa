import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultTemplate } from '../src/features/schedule/template.js';
import { generateTasks, completeTask, skipTask, adjustTask, updateOverdue } from '../src/features/schedule/engine.js';
import { restoreSleepAnchors } from '../src/features/schedule/sleep-anchor.js';
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

test('manual next task time must be after completion time', () => {
  const tasks=[{id:'a',plannedAt:'2026-07-20T10:00:00Z',status:'upcoming',afterMinutes:0},{id:'b',plannedAt:'2026-07-20T11:00:00Z',status:'upcoming',afterMinutes:60}];
  assert.throws(()=>completeTask(tasks,'a','2026-07-20T10:30:00Z',{nextPlannedAt:'2026-07-20T10:00:00Z'}),/晚于/);
});

test('manual completion, skip and adjustment survive later sleep anchor restoration', () => {
  const anchored={
    id:'anchored',plannedAt:'2026-07-20T09:00:00.000Z',status:'upcoming',actualAt:null,updatedAt:'2026-07-20T07:00:00.000Z',afterMinutes:20,
    sleepAnchorBaseline:{plannedAt:'2026-07-20T08:20:00.000Z',status:'upcoming',actualAt:null,updatedAt:'2026-07-20T00:00:00.000Z'}
  };
  for(const cascade of [true,false]){
    const completed=completeTask([anchored],anchored.id,'2026-07-20T09:10:00.000Z',{cascade});
    assert.equal(restoreSleepAnchors(completed)[0].status,'completed');
    assert.equal(restoreSleepAnchors(completed)[0].actualAt,'2026-07-20T09:10:00.000Z');
  }
  const skipped=restoreSleepAnchors(skipTask([anchored],anchored.id,'2026-07-20T09:10:00.000Z'))[0];
  assert.equal(skipped.status,'skipped');
  const adjusted=restoreSleepAnchors([adjustTask(anchored,'2026-07-20T09:30:00.000Z','2026-07-20T09:10:00.000Z')])[0];
  assert.equal(adjusted.status,'adjusted');
  assert.equal(adjusted.plannedAt,'2026-07-20T09:30:00.000Z');
});
