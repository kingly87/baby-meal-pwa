import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { replaySleepScheduleAtomically } from '../src/app.js';
import { createDefaultTemplate } from '../src/features/schedule/template.js';

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
