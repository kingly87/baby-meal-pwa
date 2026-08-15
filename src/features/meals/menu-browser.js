import{weekStart}from'./week-menu.js';

export function historyMenus(menus,{babyId,date}={}){
  let currentWeek;try{currentWeek=weekStart(date)}catch{return[]}
  return menus.filter(menu=>{if(menu?.babyId!==babyId)return false;try{return weekStart(menu.startDate??menu.days?.[0]?.date)!==currentWeek}catch{return false}}).sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||'')));
}

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
