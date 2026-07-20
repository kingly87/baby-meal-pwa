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
  assert.throws(()=>previewBackup(JSON.stringify({app:'baby-growth-assistant',schemaVersion:0,data:{}})),/不支持/);
  const repo=new MemoryRepository({babies:[{id:'original'}]});
  await assert.rejects(importBackup(repo,JSON.stringify({app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{name:'missing id'}]}})),/缺少 id/);
  assert.deepEqual((await repo.list('babies')).map(x=>x.id),['original']);
});

test('valid import replaces atomically and reset clears all stores', async () => {
  const repo=new MemoryRepository({babies:[{id:'old'}]});
  const payload={app:'baby-growth-assistant',schemaVersion:1,exportedAt:'2026-07-20T12:00:00.000Z',data:{babies:[{id:'new',name:'新宝宝'}]}};
  await importBackup(repo,JSON.stringify(payload)); assert.deepEqual((await repo.list('babies')).map(x=>x.id),['new']);
  await resetApplication(repo,{removeItem(){this.called=true}}); assert.equal((await repo.list('babies')).length,0);
});

test('backup rejects duplicate ids and orphan baby records', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚'}]}};
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,babies:[{id:'b1',name:'柚柚'},{id:'b1',name:'重复'}]}})),/重复 id/);
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,dailyRecords:[{id:'r1',babyId:'missing'}]}})),/不存在的宝宝/);
});

test('backup rejects malformed nested menus and task dates', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚',stage:'stage4'}]}};
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,weeklyMenus:[{id:'w1',babyId:'b1',days:[{date:5,meals:[]}]}]}})),/weeklyMenus/);
  assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,taskInstances:[{id:'t1',babyId:'b1',date:'bad',plannedAt:'bad'}]}})),/taskInstances/);
});

test('backup validates templates preferences reminders and application settings', () => {
  const base={app:'baby-growth-assistant',schemaVersion:1,data:{babies:[{id:'b1',name:'柚柚',stage:'stage4'}]}};
  const invalid=[
    {scheduleTemplates:[{id:'s1',babyId:'b1',rules:'bad'}]},
    {foodPreferences:[{id:'p1',babyId:'b1',excluded:'南瓜'}]},
    {reminders:[{id:'m1',babyId:'b1',title:'体检',dueDate:'bad'}]},
    {newFoodObservations:[{id:'n1',babyId:'b1',name:'南瓜',date:'2026-07-20',reactions:'bad'}]},
    {appSettings:[{id:'global',activeBabyId:'b1',notifiedTaskIds:'bad'}]}
  ];
  for(const data of invalid) assert.throws(()=>previewBackup(JSON.stringify({...base,data:{...base.data,...data}})),/无效字段/);
});
