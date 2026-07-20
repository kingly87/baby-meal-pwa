import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { loadApplicationModel } from '../src/app.js';

test('startup requests onboarding when there is no baby', async () => {
  const model=await loadApplicationModel(new MemoryRepository());
  assert.equal(model.needsOnboarding,true);
});

test('startup loads active baby and scoped data', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'柚柚'}],appSettings:[{id:'global',activeBabyId:'b1'}],taskInstances:[{id:'t1',babyId:'b1',status:'upcoming',plannedAt:'2026-07-20T10:00:00Z'}]});
  const model=await loadApplicationModel(repo);
  assert.equal(model.store.activeBaby.name,'柚柚'); assert.equal(model.store.tasks.length,1);
});
