export function createNumericRecord(input, createId = () => crypto.randomUUID()) {
  const value = Number(input.value);
  if (!Number.isFinite(value)) throw new Error('请输入有效数值');
  if (value < 0) throw new Error('记录数值不能为负数');
  if (!input.babyId || Number.isNaN(new Date(input.occurredAt).getTime())) throw new Error('记录日期无效');
  const now = new Date().toISOString();
  return { id:createId(), babyId:input.babyId, type:input.type, value, unit:input.unit || (input.type === 'milk' || input.type === 'water' ? 'ml' : ''), occurredAt:new Date(input.occurredAt).toISOString(), note:String(input.note || '').trim(), createdAt:now, updatedAt:now };
}

export function createCountRecord(input, createId = () => crypto.randomUUID()) {
  if (!['stool','urine'].includes(input?.type)) throw new Error('记录类型只允许便便或尿尿');
  if (!input.babyId) throw new Error('记录缺少宝宝');
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error('记录时间无效');
  const value = input.count === undefined ? 1 : Number(input.count);
  if (!Number.isInteger(value) || value <= 0) throw new Error('记录次数必须为正整数');
  const now = new Date().toISOString();
  return { id:createId(), babyId:input.babyId, type:input.type, value, unit:'次', occurredAt:occurredAt.toISOString(), note:String(input.note || '').trim(), createdAt:now, updatedAt:now };
}

export async function persistCountRecord(repository, input, createId, now = () => new Date()) {
  const record=createCountRecord({...input,occurredAt:input.occurredAt ?? now()},createId);
  await repository.put('dailyRecords',record);
  return record;
}

export async function updateDailyRecord(repository, patch, now = () => new Date()) {
  const item=await repository.get('dailyRecords',patch.id);
  if(!item)throw new Error('找不到记录');
  const countType=['stool','urine'].includes(item.type);
  const value=Number(patch.value);
  if(!Number.isFinite(value))throw new Error('请输入有效数值');
  if(countType&&(!Number.isInteger(value)||value<=0))throw new Error('记录次数必须为正整数');
  if(!countType&&value<0)throw new Error('记录数值不能为负数');
  const occurredDate=new Date(patch.occurredAt===undefined?item.occurredAt:patch.occurredAt);
  if(Number.isNaN(occurredDate.getTime()))throw new Error('记录时间无效');
  const occurredAt=occurredDate.toISOString();
  const updated={...item,value,occurredAt,note:String(patch.note??item.note??'').trim(),updatedAt:now().toISOString()};
  await repository.put('dailyRecords',updated);
  return updated;
}

export function updateById(records, id, patch) { let found=false; const result=records.map(item=>item.id===id?(found=true,{...item,...patch,id:item.id,updatedAt:new Date().toISOString()}):{...item}); if(!found)throw new Error('找不到记录'); return result; }
export function removeById(records, id) { if(!records.some(item=>item.id===id))throw new Error('找不到记录'); return records.filter(item=>item.id!==id).map(item=>({...item})); }

