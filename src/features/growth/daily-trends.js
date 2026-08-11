import { localDateKey } from '../../core/dates.js';

const METRICS={sleep:{unit:'分钟'},milk:{unit:'ml'},stool:{unit:'次'},urine:{unit:'次'}};
const RANGES=new Set([7,14,30]);

function localDay(dateKey){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))throw new Error('日期无效');
  const date=new Date(`${dateKey}T12:00:00`);
  if(Number.isNaN(date.getTime())||localDateKey(date)!==dateKey)throw new Error('日期无效');
  return date;
}

function shiftDate(dateKey,offset){
  const date=localDay(dateKey);
  date.setDate(date.getDate()+offset);
  return localDateKey(date);
}

export function dateRange(endDate,days){
  if(!Number.isInteger(days)||days<1)throw new Error('天数无效');
  localDay(endDate);
  return Array.from({length:days},(_,index)=>shiftDate(endDate,index-days+1));
}

function uniqueById(items){
  const ids=new Set();
  return items.filter(item=>{
    if(!item||typeof item!=='object')return false;
    if(item.id==null)return true;
    if(ids.has(item.id))return false;
    ids.add(item.id);
    return true;
  });
}

function finiteNonNegative(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0;
}

function recordTotals(records,metric,keys,nowMs){
  const totals=new Map(keys.map(key=>[key,{value:0,hasData:false}]));
  for(const record of uniqueById(records)){
    if(record.type!==metric)continue;
    const occurredMs=new Date(record.occurredAt).getTime();
    if(!Number.isFinite(occurredMs)||occurredMs>nowMs)continue;
    const key=localDateKey(new Date(occurredMs)),point=totals.get(key);
    if(!point)continue;
    let value=record.value;
    if(metric==='urine'&&value==null)value=1;
    if(!finiteNonNegative(value))continue;
    point.value+=value;
    point.hasData=true;
  }
  return totals;
}

function sleepTotals(sleeps,keys,nowMs){
  const totals=new Map(keys.map(key=>[key,{value:0,hasData:false}]));
  for(const session of uniqueById(sleeps)){
    const startMs=new Date(session.startAt).getTime();
    const suppliedEnd=session.endAt==null?nowMs:new Date(session.endAt).getTime();
    if(!Number.isFinite(startMs)||!Number.isFinite(suppliedEnd)||startMs>=suppliedEnd||startMs>=nowMs)continue;
    const endMs=Math.min(suppliedEnd,nowMs);
    for(const key of keys){
      const dayStart=new Date(`${key}T00:00:00`),dayEnd=new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate()+1);
      const overlap=Math.min(endMs,dayEnd.getTime())-Math.max(startMs,dayStart.getTime());
      if(overlap<=0)continue;
      const point=totals.get(key);
      point.value+=overlap/60_000;
      point.hasData=true;
    }
  }
  for(const point of totals.values())point.value=Math.round(point.value);
  return totals;
}

function average(points){
  const present=points.filter(point=>point.hasData);
  if(!present.length)return null;
  return Math.round(present.reduce((sum,point)=>sum+point.value,0)/present.length*100)/100;
}

function pointsFor({records,sleeps,metric,keys,nowMs}){
  const totals=metric==='sleep'?sleepTotals(sleeps,keys,nowMs):recordTotals(records,metric,keys,nowMs);
  return keys.map(date=>({date,...totals.get(date)}));
}

export function dailyTrendModel({records=[],sleeps=[],metric='sleep',days=7,endDate,now=new Date()}={}){
  if(!METRICS[metric])throw new Error('不支持的趋势指标');
  if(!RANGES.has(days))throw new Error('趋势范围只能是 7、14 或 30 天');
  const nowDate=new Date(now),nowMs=nowDate.getTime();
  if(!Number.isFinite(nowMs))throw new Error('当前时间无效');
  const lastDate=endDate||localDateKey(nowDate);
  const currentKeys=dateRange(lastDate,days);
  const previousKeys=dateRange(shiftDate(currentKeys[0],-1),days);
  const source={records:Array.isArray(records)?records:[],sleeps:Array.isArray(sleeps)?sleeps:[],metric,nowMs};
  const points=pointsFor({...source,keys:currentKeys});
  const previousPoints=pointsFor({...source,keys:previousKeys});
  const currentAverage=average(points),previousAverage=average(previousPoints);
  const delta=currentAverage==null||previousAverage==null?null:Math.round((currentAverage-previousAverage)*100)/100;
  return{metric,days,unit:METRICS[metric].unit,points,average:currentAverage,previousAverage,delta};
}
