import { SCHEMA_VERSION, STORE_NAMES } from '../../core/schema.js';
import { parseAndValidateBackup } from '../backup/validate.js';

const BABY_SCOPED_STORES=STORE_NAMES.filter(name=>!['babies','appSettings'].includes(name));

export async function auditAndMarkV2(repository,now=()=>new Date().toISOString()){
  const data=await repository.exportAll();
  const backup={app:'baby-growth-assistant',schemaVersion:SCHEMA_VERSION,data};

  if(data.babies.length){
    parseAndValidateBackup(backup);
  }else{
    for(const store of BABY_SCOPED_STORES){
      if(data[store].length) throw new Error(`${store} 引用了不存在的宝宝`);
    }
    if(data.appSettings.some(item=>item.activeBabyId)) throw new Error('当前宝宝设置无效');
    const occupiedIds=new Set(STORE_NAMES.flatMap(store=>data[store].map(item=>item.id)));
    let auditBabyId='v2-empty-audit';
    while(occupiedIds.has(auditBabyId)) auditBabyId=`${auditBabyId}-next`;
    parseAndValidateBackup({...backup,data:{...data,babies:[{id:auditBabyId,name:'空数据库校验'}]}});
  }

  const recordCount=STORE_NAMES.reduce((sum,store)=>sum+data[store].length,0);
  const settings=data.appSettings.find(item=>item.id==='global')||{id:'global'};
  await repository.put('appSettings',{...settings,dataVersion:2,updatedAt:now()});

  return{babyCount:data.babies.length,recordCount,dataVersion:2};
}
