import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationState, dueNotifications, reconcileNotificationMessages } from '../src/features/notifications/notifications.js';

test('notification permission states are explicit', () => {
  assert.equal(notificationState(undefined),'unsupported');
  assert.equal(notificationState({permission:'default'}),'needs-explanation');
  assert.equal(notificationState({permission:'denied'}),'denied');
  assert.equal(notificationState({permission:'granted'}),'granted');
});

test('due reconciliation includes overdue pending tasks but not completed tasks', () => {
  const tasks=[{id:'a',title:'喝奶',plannedAt:'2026-07-20T10:00:00Z',status:'upcoming'},{id:'b',title:'辅食',plannedAt:'2026-07-20T09:00:00Z',status:'completed'}];
  assert.deepEqual(dueNotifications(tasks,'2026-07-20T10:01:00Z').map(x=>x.id),['a']);
  assert.deepEqual(reconcileNotificationMessages(tasks,'2026-07-20T10:01:00Z')[0],{type:'SCHEDULE_NOTIFICATION',taskId:'a',title:'该喝奶了',plannedAt:'2026-07-20T10:00:00Z'});
});

