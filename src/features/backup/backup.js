import { SCHEMA_VERSION, STORE_NAMES } from '../../core/schema.js';
import { parseAndValidateBackup } from './validate.js';

export async function createBackup(repository, now = () => new Date().toISOString()) {
  const data = await repository.exportAll();
  const counts = Object.fromEntries(STORE_NAMES.map(store => [store, data[store]?.length || 0]));
  return { app: 'baby-growth-assistant', schemaVersion: SCHEMA_VERSION, exportedAt: now(), counts, data };
}

export function previewBackup(text) {
  const backup = parseAndValidateBackup(text);
  return { schemaVersion: backup.schemaVersion, exportedAt: backup.exportedAt, babyCount: backup.data.babies.length, recordCount: STORE_NAMES.reduce((sum, store) => sum + backup.data[store].length, 0) };
}

export async function importBackup(repository, text) { const backup = parseAndValidateBackup(text); await repository.replaceAll(backup.data); return previewBackup(backup); }
export async function restoreBackupIntoEmpty(repository, text) {
  const recordsByStore=await Promise.all(STORE_NAMES.map(store=>repository.list(store)));
  if(recordsByStore.some(records=>records.length)) throw new Error('当前已有数据，不能直接覆盖');
  const backup=parseAndValidateBackup(text);
  await repository.replaceAll(backup.data);
  return {schemaVersion:backup.schemaVersion,exportedAt:backup.exportedAt,babyCount:backup.data.babies.length,recordCount:STORE_NAMES.reduce((sum,store)=>sum+backup.data[store].length,0)};
}
export async function resetApplication(repository, storage = globalThis.localStorage) { await repository.clearAll(); storage?.removeItem?.('babyGrowthAssistantV1Ui'); storage?.removeItem?.('babyGrowthAssistantV1LastExport'); }
