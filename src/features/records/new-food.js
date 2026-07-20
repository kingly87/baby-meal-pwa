export function observationEndDate(date){const value=new Date(`${date}T12:00:00Z`);if(Number.isNaN(value.getTime()))throw new Error('观察日期无效');value.setUTCDate(value.getUTCDate()+2);return value.toISOString().slice(0,10)}
export function createObservation(input,createId=()=>crypto.randomUUID()){if(!input.name?.trim())throw new Error('请输入食材名称');observationEndDate(input.date);const now=new Date().toISOString();return{id:createId(),babyId:input.babyId,name:input.name.trim(),date:input.date,observeUntil:observationEndDate(input.date),reactions:[],note:'',createdAt:now,updatedAt:now}}

