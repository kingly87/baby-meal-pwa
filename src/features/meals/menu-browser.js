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
