import { SCHEMA_VERSION, STORE_NAMES } from '../../core/schema.js';

const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

function isIsoTimestamp(value) {
  if(typeof value!=='string') return false;
  const match=ISO_TIMESTAMP.exec(value);
  if(!match) return false;
  const [,year,month,date,hour,minute,second,fraction='',zone,offsetHour,offsetMinute]=match;
  if(zone!=='Z'&&(Number(offsetHour)>23||Number(offsetMinute)>59)) return false;
  const parts=[year,month,date,hour,minute,second].map(Number),local=new Date(0);
  local.setUTCFullYear(parts[0],parts[1]-1,parts[2]);
  local.setUTCHours(parts[3],parts[4],parts[5],Number(fraction.slice(0,3).padEnd(3,'0')));
  return local.getUTCFullYear()===parts[0]
    &&local.getUTCMonth()===parts[1]-1
    &&local.getUTCDate()===parts[2]
    &&local.getUTCHours()===parts[3]
    &&local.getUTCMinutes()===parts[4]
    &&local.getUTCSeconds()===parts[5]
    &&!Number.isNaN(new Date(value).getTime());
}

function isPlainObject(value) {
  if(value===null||typeof value!=='object'||Array.isArray(value)) return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===Object.prototype||prototype===null;
}

function isActualMeal(value) {
  return isPlainObject(value)
    &&typeof value.name==='string'
    &&Boolean(value.name.trim())
    &&isIsoTimestamp(value.occurredAt)
    &&typeof value.amount==='string'
    &&typeof value.note==='string'
    &&isIsoTimestamp(value.createdAt)
    &&isIsoTimestamp(value.updatedAt);
}

function hasNonPlainActualMeal(value) {
  const weeklyMenus=value?.data?.weeklyMenus;
  if(!Array.isArray(weeklyMenus)) return false;
  for(const menu of weeklyMenus) {
    if(!Array.isArray(menu?.days)) continue;
    for(const entry of menu.days) {
      if(!Array.isArray(entry?.meals)) continue;
      for(const meal of entry.meals) {
        if(!meal||typeof meal!=='object'||!Object.hasOwn(meal,'actualMeal')) continue;
        const actualMeal=meal.actualMeal;
        if(!actualMeal||typeof actualMeal!=='object'||Array.isArray(actualMeal)) continue;
        if(!isPlainObject(actualMeal)) return true;
      }
    }
  }
  return false;
}

export function parseAndValidateBackup(text) {
  let hasNonPlain=false;
  if(typeof text!=='string') {
    try { hasNonPlain=hasNonPlainActualMeal(text); }
    catch { throw new Error('备份文件无法解析'); }
  }
  if(hasNonPlain) throw new Error('weeklyMenus 包含无效字段');
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
  const date=value=>typeof value==='string'&&!Number.isNaN(new Date(value).getTime()),day=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [year,month,date]=value.split('-').map(Number),parsed=new Date(Date.UTC(year,month-1,date));return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===date},fail=store=>{throw new Error(`${store} 包含无效字段`)};
  for(const baby of data.babies)if(baby.stage&&!/^stage[1-5]$/.test(baby.stage))fail('babies');
  for(const item of data.taskInstances)if(!day(item.date)||!date(item.plannedAt)||typeof item.title!=='string'||!['upcoming','current','adjusted','overdue','completed','skipped'].includes(item.status))fail('taskInstances');
  for(const item of data.sleepSessions)if(!date(item.startAt)||item.endAt&&!date(item.endAt)||item.durationMinutes!=null&&(!Number.isFinite(item.durationMinutes)||item.durationMinutes<0))fail('sleepSessions');
  for(const item of data.dailyRecords)if(!date(item.occurredAt)||!Number.isFinite(item.value)||typeof item.type!=='string')fail('dailyRecords');
  for(const item of data.growthMeasurements)if(!day(item.date)||item.weight!=null&&!Number.isFinite(item.weight)||item.height!=null&&!Number.isFinite(item.height))fail('growthMeasurements');
  for(const item of data.weeklyMenus)if(!day(item.startDate)||!Array.isArray(item.days)||item.days.some(entry=>!entry||typeof entry!=='object'||!day(entry.date)||!Array.isArray(entry.meals)||entry.meals.some(meal=>!meal||typeof meal!=='object'||typeof meal.id!=='string'||!meal.id.trim()||typeof meal.name!=='string'||!meal.name.trim()||!['planned','eaten','skipped'].includes(meal.status)||meal.mealType!==undefined&&!['breakfast','lunch','dinner'].includes(meal.mealType)||Object.hasOwn(meal,'actualMeal')&&!isActualMeal(meal.actualMeal))))fail('weeklyMenus');
  for(const item of data.shoppingItems)if(typeof item.name!=='string'||item.quantity!=null&&(!Number.isFinite(item.quantity)||item.quantity<0))fail('shoppingItems');
  for(const item of data.scheduleTemplates)if(!Array.isArray(item.rules)||!item.rules.length||item.rules.some(rule=>typeof rule.type!=='string'||typeof rule.title!=='string'||!Number.isFinite(rule.afterMinutes)||rule.afterMinutes<0))fail('scheduleTemplates');
  for(const item of data.toothRecords)if(!day(item.date)||!Number.isFinite(item.number)||item.number<1)fail('toothRecords');
  for(const item of data.newFoodObservations)if(typeof item.name!=='string'||!day(item.date)||!day(item.observeUntil)||!Array.isArray(item.reactions)||item.reactions.some(reaction=>!day(reaction.date)||typeof reaction.text!=='string'))fail('newFoodObservations');
  for(const item of data.reminders)if(typeof item.title!=='string'||!day(item.dueDate)||item.completedAt&&!date(item.completedAt))fail('reminders');
  for(const item of data.foodPreferences)if(!Array.isArray(item.excluded)||!Array.isArray(item.disliked)||!Array.isArray(item.favorites)||item.excluded.some(value=>typeof value!=='string')||item.disliked.some(value=>typeof value!=='string'))fail('foodPreferences');
  for(const item of data.appSettings)if(item.activeBabyId&&!babyIds.has(item.activeBabyId)||item.notifiedTaskIds!=null&&(!Array.isArray(item.notifiedTaskIds)||item.notifiedTaskIds.some(value=>typeof value!=='string'))||item.notificationsEnabled!=null&&typeof item.notificationsEnabled!=='boolean')fail('appSettings');
  return {app:value.app,schemaVersion:SCHEMA_VERSION,exportedAt:value.exportedAt||null,data};
}
