import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { createBackup, previewBackup, importBackup, resetApplication } from '../src/features/backup/backup.js';

test('backup exports version, timestamp, all stores and counts', async () => {
  const repo=new MemoryRepository(); await repo.put('babies',{id:'b1',name:'柚柚'});
  const backup=await createBackup(repo,()=> '2026-07-20T12:00:00.000Z');
  assert.equal(backup.schemaVersion,1); assert.equal(backup.exportedAt,'2026-07-20T12:00:00.000Z'); assert.equal(backup.counts.babies,1);
  assert.equal(previewBackup(JSON.stringify(backup)).babyCount,1);
});

test('invalid and old backups are rejected before replacement', async () => {
  assert.throws(()=>previewBackup('{bad'),/无法解析/);
  assert.throws(()=>previewBackup(JSON.stringify({schemaVersion:0,data:{}})),/不支持/);
  const repo=new MemoryRepository({babies:[{id:'original'}]});
  await assert.rejects(importBackup(repo,JSON.stringify({schemaVersion:1,data:{babies:[{name:'missing id'}]}})),/缺少 id/);
  assert.deepEqual((await repo.list('babies')).map(x=>x.id),['original']);
});

test('valid import replaces atomically and reset clears all stores', async () => {
  const repo=new MemoryRepository({babies:[{id:'old'}]});
  const payload={schemaVersion:1,exportedAt:'2026-07-20T12:00:00.000Z',data:{babies:[{id:'new',name:'新宝宝'}]}};
  await importBackup(repo,JSON.stringify(payload)); assert.deepEqual((await repo.list('babies')).map(x=>x.id),['new']);
  await resetApplication(repo,{removeItem(){this.called=true}}); assert.equal((await repo.list('babies')).length,0);
});
