import { STORE_NAMES } from '../../core/schema.js';

const BABY_SCOPED_STORES=STORE_NAMES.filter(name=>!['babies','appSettings'].includes(name));

export async function auditAndMarkV2(repository,now=()=>new Date().toISOString()){
  const data=await repository.exportAll();
  const babyIds=new Set(data.babies.map(item=>item.id));

  for(const store of BABY_SCOPED_STORES){
    for(const item of data[store]){
      if(!babyIds.has(item.babyId)) throw new Error(`${store} 引用了不存在的宝宝`);
    }
  }

  const recordCount=STORE_NAMES.reduce((sum,store)=>sum+data[store].length,0);
  const settings=data.appSettings.find(item=>item.id==='global')||{id:'global'};
  await repository.put('appSettings',{...settings,dataVersion:2,updatedAt:now()});

  return{babyCount:data.babies.length,recordCount,dataVersion:2};
}
