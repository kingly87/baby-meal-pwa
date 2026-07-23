import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { loadApplicationModel, ensureDailySchedule } from '../src/app.js';
import { createDefaultTemplate } from '../src/features/schedule/template.js';

test('startup requests onboarding when there is no baby', async () => {
  const model=await loadApplicationModel(new MemoryRepository());
  assert.equal(model.needsOnboarding,true);
});

test('daily startup creates one schedule per baby and date without duplicates', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'柚柚'}],scheduleTemplates:[createDefaultTemplate('b1')]});
  await ensureDailySchedule(repo,{id:'b1'},new Date('2026-07-20T08:00:00Z'),()=>`id-${Math.random()}`);
  const first=await repo.list('taskInstances',{babyId:'b1'}); assert.ok(first.length>0);
  await ensureDailySchedule(repo,{id:'b1'},new Date('2026-07-20T09:00:00Z'),()=>`id-${Math.random()}`);
  assert.equal((await repo.list('taskInstances',{babyId:'b1'})).length,first.length);
});

test('startup loads active baby and only today scoped tasks', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'柚柚'}],appSettings:[{id:'global',activeBabyId:'b1'}],taskInstances:[{id:'old',babyId:'b1',date:'2026-07-19',status:'overdue',plannedAt:'2026-07-19T10:00:00Z'},{id:'t2',babyId:'b1',date:'2026-07-20',status:'upcoming',plannedAt:'2026-07-20T12:00:00Z'},{id:'t1',babyId:'b1',date:'2026-07-20',status:'upcoming',plannedAt:'2026-07-20T10:00:00Z'}]});
  const model=await loadApplicationModel(repo,{now:()=>new Date(2026,6,20,12)});
  assert.equal(model.store.activeBaby.name,'柚柚'); assert.deepEqual(model.store.tasks.map(task=>task.id),['t1','t2']);
});
