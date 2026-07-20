import { SCHEMA_VERSION, STORE_NAMES } from '../../core/schema.js';

export function parseAndValidateBackup(text) {
  let value;
  try { value=typeof text==='string'?JSON.parse(text):structuredClone(text); }
  catch { throw new Error('备份文件无法解析'); }
  if(value?.app!=='baby-growth-assistant') throw new Error('不是宝宝成长助手备份');
  if(value.schemaVersion!==SCHEMA_VERSION) throw new Error('不支持的备份版本');
  if(!value.data||typeof value.data!=='object') throw new Error('备份缺少数据内容');
  const data={};
  for(const store of STORE_NAMES) {
    const records=value.data[store]||[];
    if(!Array.isArray(records)) throw new Error(`${store} 数据格式无效`);
    const ids=new Set();
    for(const record of records) {
      if(!record||typeof record!=='object'||typeof record.id!=='string'||!record.id.trim()) throw new Error(`${store} 记录缺少 id`);
      if(ids.has(record.id)) throw new Error(`${store} 包含重复 id`);
      ids.add(record.id);
    }
    data[store]=records.map(record=>structuredClone(record));
  }
  if(!data.babies.length) throw new Error('备份中至少需要一个宝宝');
  const babyIds=new Set(data.babies.map(baby=>baby.id));
  for(const baby of data.babies) if(typeof baby.name!=='string'||!baby.name.trim()) throw new Error('宝宝资料缺少姓名');
  for(const store of STORE_NAMES.filter(name=>!['babies','appSettings'].includes(name))) {
    for(const record of data[store]) if(!babyIds.has(record.babyId)) throw new Error(`${store} 引用了不存在的宝宝`);
  }
  const global=data.appSettings.find(setting=>setting.id==='global');
  if(global?.activeBabyId&&!babyIds.has(global.activeBabyId)) throw new Error('当前宝宝设置无效');
  return {app:value.app,schemaVersion:SCHEMA_VERSION,exportedAt:value.exportedAt||null,data};
}
