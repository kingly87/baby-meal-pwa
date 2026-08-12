import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE_NAMES, SCHEMA_VERSION } from '../src/core/schema.js';
import { MemoryRepository, IndexedDbRepository } from '../src/db.js';

test('schema exposes all V1 stores', () => {
  assert.equal(SCHEMA_VERSION, 1);
  for (const name of ['babies','scheduleTemplates','taskInstances','dailyRecords','sleepSessions','growthMeasurements','toothRecords','newFoodObservations','reminders','weeklyMenus','shoppingItems','foodPreferences','appSettings']) assert.ok(STORE_NAMES.includes(name), name);
});

test('repository performs CRUD by stable id and isolates babies', async () => {
  const repo = new MemoryRepository();
  await repo.put('growthMeasurements', { id: 'g1', babyId: 'b1', value: 8 });
  await repo.put('growthMeasurements', { id: 'g2', babyId: 'b2', value: 9 });
  assert.equal((await repo.get('growthMeasurements', 'g1')).value, 8);
  assert.deepEqual((await repo.list('growthMeasurements', { babyId: 'b1' })).map(x => x.id), ['g1']);
  await repo.delete('growthMeasurements', 'g1');
  assert.equal(await repo.get('growthMeasurements', 'g1'), undefined);
});

test('repository transaction rolls back on failure and clear removes all data', async () => {
  const repo = new MemoryRepository();
  await repo.put('babies', { id: 'b1', name: '柚柚' });
  await assert.rejects(repo.transaction(['babies'], async tx => { await tx.put('babies', { id: 'b2' }); throw new Error('stop'); }), /stop/);
  assert.deepEqual((await repo.list('babies')).map(x => x.id), ['b1']);
  await repo.clearAll();
  assert.equal((await repo.list('babies')).length, 0);
});

test('indexed repository exposes the same transaction workflow API', () => {
  assert.equal(typeof IndexedDbRepository.prototype.transaction,'function');
});

test('indexed repository aborts and does not commit staged writes after a request error', async () => {
  const committed=new Map(STORE_NAMES.map(name=>[name,new Map()]));
  let aborted=false;
  const request=operation=>{
    const result={};
    queueMicrotask(()=>{
      try { result.result=operation(); result.onsuccess?.(); }
      catch(error) { result.error=error; result.onerror?.(); }
    });
    return result;
  };
  const db={
    transaction(stores,mode) {
      const names=Array.isArray(stores)?stores:[stores];
      const staged=new Map(names.map(name=>[name,new Map(committed.get(name))]));
      const tx={
        error:null,
        objectStore(name) {
          const records=mode==='readwrite'?staged.get(name):committed.get(name);
          return {
            put(value) {
              return request(()=>{
                if(value.id==='fail') throw new Error('fake request failure');
                records.set(value.id,structuredClone(value));
                return value.id;
              });
            },
            getAll() { return request(()=>[...records.values()].map(structuredClone)); }
          };
        },
        abort() { aborted=true; queueMicrotask(()=>tx.onabort?.()); }
      };
      return tx;
    }
  };
  const indexedDB={open(){return request(()=>db)}};
  const repo=new IndexedDbRepository({indexedDB});

  await assert.rejects(repo.transaction(['babies'],async tx=>{
    await tx.put('babies',{id:'staged',name:'未提交'});
    await tx.put('babies',{id:'fail',name:'失败'});
  }),/fake request failure/);

  assert.equal(aborted,true);
  assert.deepEqual(await repo.list('babies'),[]);
});
