import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationState, dueNotifications, reconcileNotificationMessages, nextNotificationDelay } from '../src/features/notifications/notifications.js';

test('notification permission states are explicit', () => {
  assert.equal(notificationState(undefined),'unsupported');
  assert.equal(notificationState({permission:'default'}),'needs-explanation');
  assert.equal(notificationState({permission:'denied'}),'denied');
  assert.equal(notificationState({permission:'granted'}),'granted');
});

test('future notification delay selects the next pending task and ignores finished ones', () => {
  const tasks=[{id:'done',plannedAt:'2026-07-20T09:00:00Z',status:'completed'},{id:'later',plannedAt:'2026-07-20T10:05:00Z',status:'upcoming'},{id:'next',plannedAt:'2026-07-20T10:02:00Z',status:'adjusted'}];
  assert.equal(nextNotificationDelay(tasks,'2026-07-20T10:00:00Z'),120000);
  assert.equal(nextNotificationDelay(tasks,'2026-07-20T10:03:00Z'),0);
});

test('due reconciliation includes overdue pending tasks but not completed tasks', () => {
  const tasks=[{id:'a',title:'喝奶',plannedAt:'2026-07-20T10:00:00Z',status:'upcoming'},{id:'b',title:'辅食',plannedAt:'2026-07-20T09:00:00Z',status:'completed'}];
  assert.deepEqual(dueNotifications(tasks,'2026-07-20T10:01:00Z').map(x=>x.id),['a']);
  assert.deepEqual(reconcileNotificationMessages(tasks,'2026-07-20T10:01:00Z')[0],{type:'SCHEDULE_NOTIFICATION',taskId:'a',title:'该喝奶了',plannedAt:'2026-07-20T10:00:00Z'});
});
