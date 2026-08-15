import{weekStart}from'./week-menu.js';

export function historyMenus(menus,{babyId,date}={}){
  let currentWeek;try{currentWeek=weekStart(date)}catch{return[]}
  return menus.filter(menu=>{if(menu?.babyId!==babyId)return false;try{return weekStart(menu.startDate??menu.days?.[0]?.date)!==currentWeek}catch{return false}}).sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||'')));
}

const repositoryQueues=new WeakMap();
export function updateMenuAtomically({repository,menuId,babyId,mutate}){
  let queues=repositoryQueues.get(repository);if(!queues){queues=new Map();repositoryQueues.set(repository,queues)}
  const previous=queues.get(menuId)||Promise.resolve();
  const operation=previous.catch(()=>{}).then(()=>repository.transaction(['weeklyMenus'],async tx=>{
    const current=await tx.get('weeklyMenus',menuId);
    if(!current)throw new Error('菜单不存在，请刷新后重试');
    if(current.babyId!==babyId)throw new Error('菜单不属于当前宝宝');
    const updated=await mutate(current);
    if(updated?.id!==menuId||updated?.babyId!==babyId)throw new Error('菜单更新目标无效');
    return tx.put('weeklyMenus',updated);
  }));
  queues.set(menuId,operation);
  operation.finally(()=>{if(queues.get(menuId)===operation)queues.delete(menuId)}).catch(()=>{});
  return operation;
}

export async function runMenuMutation({repository,menuId,babyId,controls=[],prepare=async()=>undefined,mutate,refresh,notify}){
  controls.forEach(control=>{control.disabled=true});
  try{const prepared=await prepare(),updated=await updateMenuAtomically({repository,menuId,babyId,mutate:value=>mutate(value,prepared)});await refresh();return updated}catch(error){notify(error.message);return null}finally{controls.forEach(control=>{control.disabled=false})}
}

export function resetMenuBrowserForBoundary(browser){browser.reset();return browser.value()}

export function createMenuBrowser(){
  let state={mode:'current',selectedId:null,editingHistory:false};
  return{
    value:()=>({...state}),
    showCurrent(){state={mode:'current',selectedId:null,editingHistory:false}},
    showHistory(id=null){state={mode:'history',selectedId:id,editingHistory:false}},
    selectHistory(id){state={mode:'history',selectedId:id,editingHistory:false}},
    editHistory(){if(state.mode==='history'&&state.selectedId)state={...state,editingHistory:true}},
    reconcile(weeks=[]){if(state.mode==='history'&&!weeks.some(menu=>menu.id===state.selectedId))this.showCurrent()},
    reset(){this.showCurrent()}
  };
}
