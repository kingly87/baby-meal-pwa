# V2 Data Inheritance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Existing V1 babies load without onboarding, while an empty database can restore a V1 JSON backup directly before creating a new baby.

**Architecture:** Keep IndexedDB name `babyGrowthAssistantV1` and schema version 1. Add a pure compatibility audit that marks `appSettings.dataVersion=2` only after validation, and a dedicated empty-state recovery UI that imports only into an empty repository.

**Tech Stack:** Vanilla ES modules, IndexedDB repository, Node built-in test runner, static PWA.

---

### Task 1: V2 compatibility audit

**Files:**
- Create: `src/features/migration/v2.js`
- Create: `tests/migration-v2.test.js`

- [ ] **Step 1: Write the failing audit tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepository } from '../src/db.js';
import { auditAndMarkV2 } from '../src/features/migration/v2.js';

test('marks validated V1 data as V2 without rewriting records', async () => {
  const baby={id:'b1',name:'多米'};
  const repo=new MemoryRepository({babies:[baby],dailyRecords:[{id:'r1',babyId:'b1',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00.000Z'}]});
  const result=await auditAndMarkV2(repo,()=> '2026-08-11T00:00:00.000Z');
  assert.deepEqual(result,{babyCount:1,recordCount:2,dataVersion:2});
  assert.deepEqual(await repo.get('babies','b1'),baby);
  assert.equal((await repo.get('appSettings','global')).dataVersion,2);
});

test('does not mark invalid orphaned data', async () => {
  const repo=new MemoryRepository({dailyRecords:[{id:'r1',babyId:'missing',type:'milk',value:120,occurredAt:'2026-08-01T08:00:00.000Z'}]});
  await assert.rejects(auditAndMarkV2(repo),/引用了不存在的宝宝/);
  assert.equal(await repo.get('appSettings','global'),undefined);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/migration-v2.test.js`

Expected: FAIL because `src/features/migration/v2.js` does not exist.

- [ ] **Step 3: Implement the audit**

```js
import { STORE_NAMES } from '../../core/schema.js';

export async function auditAndMarkV2(repository,now=()=>new Date().toISOString()){
  const data=await repository.exportAll();
  const babyIds=new Set(data.babies.map(item=>item.id));
  for(const store of STORE_NAMES.filter(name=>!['babies','appSettings'].includes(name))){
    for(const item of data[store]) if(!babyIds.has(item.babyId)) throw new Error(`${store} 引用了不存在的宝宝`);
  }
  const recordCount=STORE_NAMES.reduce((sum,name)=>sum+data[name].length,0);
  const settings=data.appSettings.find(item=>item.id==='global')||{id:'global'};
  await repository.put('appSettings',{...settings,dataVersion:2,updatedAt:now()});
  return{babyCount:data.babies.length,recordCount,dataVersion:2};
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/migration-v2.test.js && npm.cmd test`

Expected: focused tests PASS and the full suite has zero failures.

- [ ] **Step 5: Commit**

```powershell
git add src/features/migration/v2.js tests/migration-v2.test.js
git commit -m "feat: audit and mark V1 data for V2"
```

### Task 2: Safe direct restore into an empty repository

**Files:**
- Modify: `src/features/backup/backup.js`
- Modify: `tests/backup.test.js`

- [ ] **Step 1: Add failing empty-restore tests**

```js
import { restoreBackupIntoEmpty } from '../src/features/backup/backup.js';

test('restores V1 backup directly only when repository is empty', async () => {
  const payload={app:'baby-growth-assistant',schemaVersion:1,exportedAt:'2026-08-11T00:00:00.000Z',data:{babies:[{id:'b1',name:'多米'}]}};
  const empty=new MemoryRepository();
  const result=await restoreBackupIntoEmpty(empty,JSON.stringify(payload));
  assert.equal(result.babyCount,1);
  assert.equal((await empty.list('babies')).length,1);
  const occupied=new MemoryRepository({babies:[{id:'existing',name:'现有宝宝'}]});
  await assert.rejects(restoreBackupIntoEmpty(occupied,JSON.stringify(payload)),/当前已有数据/);
  assert.equal((await occupied.list('babies'))[0].id,'existing');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/backup.test.js`

Expected: FAIL because `restoreBackupIntoEmpty` is not exported.

- [ ] **Step 3: Implement atomic empty restore**

```js
export async function restoreBackupIntoEmpty(repository,text){
  const current=await repository.exportAll();
  if(STORE_NAMES.some(name=>current[name].length)) throw new Error('当前已有数据，不能直接覆盖');
  const backup=parseAndValidateBackup(text);
  await repository.replaceAll(backup.data);
  return previewBackup(backup);
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/backup.test.js && npm.cmd test`

Expected: all tests PASS; malformed backups leave the empty repository unchanged.

- [ ] **Step 5: Commit**

```powershell
git add src/features/backup/backup.js tests/backup.test.js
git commit -m "feat: restore V1 backup into empty V2 app"
```

### Task 3: Recovery-first empty state

**Files:**
- Modify: `src/ui/onboarding.js`
- Modify: `src/app.js`
- Modify: `tests/app.test.js`
- Modify: `tests/ui-contract.test.js`
- Modify: `assets/styles/app.css`

- [ ] **Step 1: Add failing UI and startup tests**

```js
test('empty state offers V1 restore before baby creation', () => {
  const html=onboardingView();
  assert.ok(html.indexOf('id="onboarding-backup"') < html.indexOf('id="onboarding-form"'));
  assert.match(html,/恢复 V1 备份/);
});

test('existing V1 baby bypasses onboarding and receives dataVersion 2', async () => {
  const repo=new MemoryRepository({babies:[{id:'b1',name:'多米'}]});
  const model=await loadApplicationModel(repo);
  assert.equal(model.needsOnboarding,false);
  assert.equal((await repo.get('appSettings','global')).dataVersion,2);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/app.test.js tests/ui-contract.test.js`

Expected: FAIL because the recovery input and migration mark are absent.

- [ ] **Step 3: Wire recovery-first startup**

Implement `onboardingView()` with a primary file label containing `<input id="onboarding-backup" type="file" accept="application/json">`, followed by a separator and the existing create-baby form. Update `loadApplicationModel()` to call `auditAndMarkV2()` when babies exist. Bind the empty-state file input to `restoreBackupIntoEmpty()`, refresh after success, and show `已恢复 ${babyCount} 个宝宝、${recordCount} 条数据`.

```js
export async function loadApplicationModel(repository,options){
  const store=await new AppStore(repository,options).load();
  if(store.babies.length) await auditAndMarkV2(repository);
  return{store,needsOnboarding:!store.babies.length};
}
```

- [ ] **Step 4: Verify migration UI and regression suite**

Run: `node --test tests/app.test.js tests/backup.test.js tests/migration-v2.test.js tests/ui-contract.test.js && npm.cmd test && npm.cmd run check`

Expected: all commands exit 0; existing babies skip onboarding and empty data can restore once.

- [ ] **Step 5: Update PWA cache and project state**

Add `./src/features/migration/v2.js` to `APP_SHELL`, bump the cache revision, and record verified migration behavior in `PROJECT_STATE.md`. Update `tests/pwa.test.js` to assert both changes.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/onboarding.js src/app.js assets/styles/app.css service-worker.js tests/app.test.js tests/ui-contract.test.js tests/pwa.test.js PROJECT_STATE.md
git commit -m "feat: restore V1 data before onboarding"
```

