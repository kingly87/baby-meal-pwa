import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { replaySleepScheduleAtomically } from '../src/app.js';
import { createDefaultTemplate } from '../src/features/schedule/template.js';
import { completeTask, skipTask, adjustTask } from '../src/features/schedule/engine.js';

const baseTask=(id,date,type,plannedAt,afterMinutes,babyId='b1')=>({
  id,babyId,date,type,plannedAt,afterMinutes,status:'upcoming',actualAt:null,updatedAt:`${date}T00:00:00.000Z`
});
const night=(id,endAt,babyId='b1')=>({id,babyId,type:'night',startAt:'2026-07-19T23:00:00.000Z',endAt,durationMinutes:480});
const seed=()=>({
  scheduleTemplates:[{...createDefaultTemplate('b1'),id:'tpl',napToMealMinutes:60}],
  taskInstances:[
    baseTask('wake20','2026-07-20','wake','2026-07-20T08:00:00.000Z',0),
    baseTask('meal20','2026-07-20','meal','2026-07-20T10:00:00.000Z',120),
    baseTask('wake21','2026-07-21','wake','2026-07-21T08:00:00.000Z',0),
    baseTask('meal21','2026-07-21','meal','2026-07-21T10:00:00.000Z',120),
    baseTask('other','2026-07-20','wake','2026-07-20T08:00:00.000Z',0,'b2')
  ]
});

test('editing, moving, changing type and deleting sleep restores then replays anchors', async () => {
  const repo=new MemoryRepository(seed());
  const first=night('s1','2026-07-20T07:00:00.000Z');
  await replaySleepScheduleAtomically(repo,{nextSession:first});
  assert.equal((await repo.get('taskInstances','meal20')).plannedAt,'2026-07-20T09:00:00.000Z');

  const edited={...first,type:'nap',startAt:'2026-07-20T08:30:00.000Z',endAt:'2026-07-20T09:30:00.000Z'};
  await replaySleepScheduleAtomically(repo,{nextSession:edited,previousSession:first});
  assert.equal((await repo.get('taskInstances','wake20')).plannedAt,'2026-07-20T08:00:00.000Z');
  assert.equal((await repo.get('taskInstances','meal20')).plannedAt,'2026-07-20T10:30:00.000Z');

  const moved=night('s1','2026-07-21T07:00:00.000Z');
  await replaySleepScheduleAtomically(repo,{nextSession:moved,previousSession:edited});
  assert.equal((await repo.get('taskInstances','meal20')).plannedAt,'2026-07-20T10:00:00.000Z');
  assert.equal((await repo.get('taskInstances','meal21')).plannedAt,'2026-07-21T09:00:00.000Z');
  assert.equal((await repo.get('taskInstances','other')).plannedAt,'2026-07-20T08:00:00.000Z');

  await replaySleepScheduleAtomically(repo,{previousSession:moved,deleteId:'s1'});
  assert.equal(await repo.get('sleepSessions','s1'),undefined);
  assert.equal((await repo.get('taskInstances','meal21')).plannedAt,'2026-07-21T10:00:00.000Z');
});

test('sleep and task writes roll back together when replay fails', async () => {
  class FailingRepository extends MemoryRepository {
    fail=false;
    async put(store,value){if(this.fail&&store==='taskInstances')throw new Error('task write failed');return super.put(store,value)}
  }
  const repo=new FailingRepository(seed());
  repo.fail=true;
  await assert.rejects(replaySleepScheduleAtomically(repo,{nextSession:night('s1','2026-07-20T07:00:00.000Z')}),/task write failed/);
  assert.equal(await repo.get('sleepSessions','s1'),undefined);
  assert.equal((await repo.get('taskInstances','meal20')).plannedAt,'2026-07-20T10:00:00.000Z');
});

test('manual locks survive atomic sleep editing and deletion after a real cascade', async () => {
  const repo=new MemoryRepository(seed());
  await repo.put('taskInstances',baseTask('later-one','2026-07-20','milk','2026-07-20T10:30:00.000Z',30));
  await repo.put('taskInstances',baseTask('later-two','2026-07-20','meal','2026-07-20T11:00:00.000Z',30));
  const original=night('locked-sleep','2026-07-20T07:00:00.000Z');
  await replaySleepScheduleAtomically(repo,{nextSession:original});

  let tasks=(await repo.list('taskInstances',{babyId:'b1'})).filter(task=>task.date==='2026-07-20');
  tasks=completeTask(tasks,'meal20','2026-07-20T09:15:00.000Z',{cascade:true});
  assert.equal(tasks.find(task=>task.id==='later-one').plannedAt,'2026-07-20T09:45:00.000Z');
  for(const task of tasks)await repo.put('taskInstances',task);
  tasks=skipTask(tasks,'later-one','2026-07-20T09:50:00.000Z');
  for(const task of tasks)await repo.put('taskInstances',task);
  await repo.put('taskInstances',adjustTask(tasks.find(task=>task.id==='later-two'),'2026-07-20T11:30:00.000Z','2026-07-20T10:00:00.000Z'));

  const edited={...original,endAt:'2026-07-20T06:30:00.000Z'};
  await replaySleepScheduleAtomically(repo,{nextSession:edited,previousSession:original});
  assert.equal((await repo.get('taskInstances','meal20')).status,'completed');
  assert.equal((await repo.get('taskInstances','meal20')).actualAt,'2026-07-20T09:15:00.000Z');
  assert.equal((await repo.get('taskInstances','later-one')).status,'skipped');
  assert.equal((await repo.get('taskInstances','later-two')).status,'adjusted');
  assert.equal((await repo.get('taskInstances','later-two')).plannedAt,'2026-07-20T11:30:00.000Z');

  await replaySleepScheduleAtomically(repo,{previousSession:edited,deleteId:edited.id});
  assert.equal((await repo.get('taskInstances','meal20')).status,'completed');
  assert.equal((await repo.get('taskInstances','later-one')).status,'skipped');
  assert.equal((await repo.get('taskInstances','later-two')).plannedAt,'2026-07-20T11:30:00.000Z');
});
