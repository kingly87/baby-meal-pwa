function validLocalDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const[year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

function timestamp(value){
  if(typeof value!=='string')return'';
  const time=Date.parse(value);
  return Number.isFinite(time)?String(time).padStart(16,'0'):'';
}

function compareRecords(a,b){
  for(const field of ['date']){const result=String(a[field]??'').localeCompare(String(b[field]??''));if(result)return result}
  for(const field of ['updatedAt','createdAt']){const result=timestamp(a[field]).localeCompare(timestamp(b[field]));if(result)return result}
  return String(a.id??'').localeCompare(String(b.id??''));
}

function latest(records,isValid,toValue){
  const record=(Array.isArray(records)?records:[]).filter(item=>item&&validLocalDate(item.date)&&isValid(item)).slice().sort(compareRecords).at(-1);
  return record?{value:toValue(record),date:record.date}:null;
}

export function latestGrowthSummary({measurements=[],teeth=[]}={}){
  const validMeasurement=field=>item=>Number.isFinite(item[field])&&item[field]>=0;
  return{
    weight:latest(measurements,validMeasurement('weight'),item=>item.weight),
    height:latest(measurements,validMeasurement('height'),item=>item.height),
    tooth:latest(teeth,item=>Number.isInteger(item.number)&&item.number>0,item=>item.number)
  };
}
