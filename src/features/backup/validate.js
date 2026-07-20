import { SCHEMA_VERSION, STORE_NAMES } from '../../core/schema.js';

export function parseAndValidateBackup(text) {
  let value;
  try { value = typeof text === 'string' ? JSON.parse(text) : structuredClone(text); } catch { throw new Error('备份文件无法解析'); }
  if (value?.schemaVersion !== SCHEMA_VERSION) throw new Error('不支持的备份版本');
  if (!value.data || typeof value.data !== 'object') throw new Error('备份缺少数据内容');
  const data = {};
  for (const store of STORE_NAMES) {
    const records = value.data[store] || [];
    if (!Array.isArray(records)) throw new Error(`${store} 数据格式无效`);
    for (const record of records) if (!record || typeof record !== 'object' || !record.id) throw new Error(`${store} 记录缺少 id`);
    data[store] = records.map(record => structuredClone(record));
  }
  return { schemaVersion: SCHEMA_VERSION, exportedAt: value.exportedAt || null, data };
}

