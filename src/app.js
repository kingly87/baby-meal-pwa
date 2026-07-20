import{IndexedDbRepository}from'./db.js';
import{AppStore}from'./store.js';
import{createRouter}from'./router.js';
import{createId}from'./core/id.js';
import{localDateKey}from'./core/dates.js';
import{createDefaultTemplate}from'./features/schedule/template.js';
import{generateTasks,completeTask,skipTask,updateOverdue}from'./features/schedule/engine.js';
import{selectPrimaryTask}from'./features/schedule/select-current.js';
import{generateWeek,replaceMeal}from'./features/meals/planner.js';
import{buildShoppingList}from'./features/meals/shopping.js';
import{createNumericRecord}from'./features/records/records.js';
import{createSleepSession}from'./features/records/sleep.js';
import{buildTimeline}from'./features/growth/timeline.js';
import{createBackup,previewBackup,importBackup,resetApplication}from'./features/backup/backup.js';
import{notificationState,requestNotifications,notifyDueTasks}from'./features/notifications/notifications.js';
import{recipes}from'../data/recipes.js';
import{mount}from'./ui/render.js';
import{todayView}from'./ui/today.js';
import{mealsView}from'./ui/meals.js';
import{recordsView}from'./ui/records.js';
import{growthView}from'./ui/growth.js';
import{settingsView}from'./ui/settings.js';
import{onboardingView}from'./ui/onboarding.js';
import{toast}from'./ui/feedback.js';
import{openDialog}from'./ui/dialogs.js';

export async function loadApplicationModel(repository){const store=await new AppStore(repository).load();return{store,needsOnboarding:!store.babies.length}}

async function browserApp(){
 const repo=new IndexedDbRepository(),model=await loadApplicationModel(repo),store=model.store;
 const router=createRouter({onRoute:render});router.bind();
 async function refresh(){await store.load();await render(router.current)}
 async function timeline(){const data=await repo.exportAll();return buildTimeline(data,{babyId:store.activeBabyId})}
 async function render(route='today'){
  if(!store.activeBaby)return;
  const line=await timeline(),tasks=updateOverdue(store.tasks,new Date().toISOString()),primary=selectPrimaryTask(tasks),primaryIndex=tasks.findIndex(x=>x.id===primary?.id),next=tasks.slice(primaryIndex+1).find(x=>!['completed','skipped'].includes(x.status));
  const sleeps=await repo.list('sleepSessions',{babyId:store.activeBabyId}),today=localDateKey(),sleepMinutes=sleeps.filter(x=>x.startAt?.startsWith(today)&&x.durationMinutes).reduce((sum,x)=>sum+x.durationMinutes,0);
  mount('view-today',todayView({baby:store.activeBaby,primary,next,sleepMinutes,timeline:line}));
  mount('view-meals',mealsView({week:store.week,recipes,stage:store.activeBaby.stage}));
  mount('view-records',recordsView());mount('view-growth',growthView({timeline:line}));mount('view-settings',settingsView({baby:store.activeBaby,babies:store.babies}));
  document.getElementById('baby-greeting').textContent=`${store.activeBaby.name}的今天`;
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
  bindActions();
 }
 async function saveOnboarding(values){const now=new Date().toISOString(),baby={id:createId(),name:values.name.trim(),birthday:values.birthday||'',stage:values.stage,createdAt:now,updatedAt:now};await repo.put('babies',baby);await repo.put('appSettings',{id:'global',activeBabyId:baby.id,createdAt:now,updatedAt:now});const template=createDefaultTemplate(baby.id);await repo.put('scheduleTemplates',template);const tasks=generateTasks({babyId:baby.id,date:localDateKey(),wakeAt:now,template,createId});for(const task of tasks)await repo.put('taskInstances',task);document.querySelector('.modal-backdrop')?.remove();await refresh();toast('已创建宝宝的第一天');}
 function bindActions(){
  document.querySelectorAll('[data-action="complete-task"]').forEach(button=>button.onclick=async()=>{const tasks=completeTask(store.tasks,button.dataset.id,new Date().toISOString(),{cascade:true});for(const task of tasks)await repo.put('taskInstances',task);await refresh();toast('已完成，下一事项已更新')});
  document.querySelectorAll('[data-action="skip-task"]').forEach(button=>button.onclick=async()=>{for(const task of skipTask(store.tasks,button.dataset.id))await repo.put('taskInstances',task);await refresh();toast('已跳过当前事项')});
  document.querySelector('[data-action="generate-menu"]')?.addEventListener('click',async()=>{try{const prefs=await repo.get('foodPreferences',store.activeBabyId)||{};const week=generateWeek(recipes,{babyId:store.activeBabyId,stage:store.activeBaby.stage,startDate:localDateKey(),mealCount:2,excluded:prefs.excluded||[],favorites:prefs.favorites||[],disliked:prefs.disliked||[],createId});await repo.put('weeklyMenus',week);await refresh();toast('本周菜单已生成')}catch(error){toast(error.message)}});
  document.querySelectorAll('[data-action="replace-meal"]').forEach(button=>button.onclick=async()=>{const prefs=await repo.get('foodPreferences',store.activeBabyId)||{};const week=replaceMeal(store.week,button.dataset.id,recipes,{stage:store.activeBaby.stage,excluded:prefs.excluded||[],favorites:prefs.favorites||[],disliked:prefs.disliked||[]});await repo.put('weeklyMenus',week);await refresh();toast('已更换为安全候选食谱')});
  document.querySelector('[data-action="build-shopping"]')?.addEventListener('click',async()=>{if(!store.week)return toast('请先生成菜单');for(const item of buildShoppingList(store.week,recipes,createId))await repo.put('shoppingItems',item);toast('买菜清单已生成')});
  document.querySelectorAll('[data-quick],[data-record]').forEach(button=>button.onclick=()=>openRecord(button.dataset.quick||button.dataset.record));
  document.querySelectorAll('[data-growth]').forEach(button=>button.onclick=()=>openGrowth(button.dataset.growth));
  document.getElementById('active-baby')?.addEventListener('change',async event=>{await store.setActiveBaby(event.target.value);await refresh()});
  document.querySelector('[data-action="add-baby"]')?.addEventListener('click',()=>openBaby());
  document.querySelector('[data-action="edit-profile"]')?.addEventListener('click',()=>openProfile());
  document.querySelector('[data-action="edit-schedule"]')?.addEventListener('click',()=>openSchedule());
  document.querySelector('[data-action="food-preferences"]')?.addEventListener('click',()=>openPreferences());
  document.querySelector('[data-action="notification-settings"]')?.addEventListener('click',enableNotifications);
  document.querySelector('[data-action="export-data"]')?.addEventListener('click',exportData);
  document.getElementById('backup-file')?.addEventListener('change',importData);
  document.querySelector('[data-action="reset-data"]')?.addEventListener('click',resetData);
 }
 async function openRecord(type){if(type==='new-food'||type==='reminder')return toast('请在后续编辑面板中填写详细记录');const label=type==='milk'?'奶量':type==='water'?'喝水':type==='sleep'?'睡眠分钟':'排便次数';const values=await openDialog({title:`记录${label}`,body:`<label for="record-value">${label}</label><input id="record-value" name="value" type="number" min="0" required><label for="record-note">备注</label><textarea id="record-note" name="note"></textarea>`});if(!values)return;if(type==='sleep'){const end=new Date(),start=new Date(end.getTime()-Number(values.value)*60000);await repo.put('sleepSessions',createSleepSession({babyId:store.activeBabyId,startAt:start.toISOString(),endAt:end.toISOString(),note:values.note},createId))}else await repo.put('dailyRecords',createNumericRecord({babyId:store.activeBabyId,type,value:values.value,note:values.note,occurredAt:new Date().toISOString()},createId));await refresh();toast('记录已保存')}
 async function openGrowth(field){const values=await openDialog({title:`记录${field==='weight'?'体重':'身高'}`,body:`<label for="growth-value">数值</label><input id="growth-value" name="value" type="number" step="0.1" min="0" required><label for="growth-date">日期</label><input id="growth-date" name="date" type="date" value="${localDateKey()}" required>`});if(!values)return;const now=new Date().toISOString();await repo.put('growthMeasurements',{id:createId(),babyId:store.activeBabyId,date:values.date,[field]:Number(values.value),createdAt:now,updatedAt:now});await refresh();toast('成长记录已保存')}
 async function openBaby(){const values=await openDialog({title:'添加宝宝',body:'<label>昵称</label><input name="name" required><label>出生日期</label><input name="birthday" type="date"><label>辅食阶段</label><select name="stage"><option value="stage1">初尝泥糊期</option><option value="stage2">稠泥碎末期</option><option value="stage3">软烂颗粒期</option><option value="stage4">咀嚼练习期</option><option value="stage5">家庭餐过渡期</option></select>'});if(values)await saveOnboarding(values)}
 async function openProfile(){const baby=store.activeBaby,values=await openDialog({title:'编辑宝宝资料',body:`<label>昵称</label><input name="name" value="${baby.name}" required><label>生日</label><input name="birthday" type="date" value="${baby.birthday||''}"><label>辅食阶段</label><select name="stage"><option value="${baby.stage}">保持当前阶段</option><option value="stage1">初尝泥糊期</option><option value="stage2">稠泥碎末期</option><option value="stage3">软烂颗粒期</option><option value="stage4">咀嚼练习期</option><option value="stage5">家庭餐过渡期</option></select>`});if(values){await repo.put('babies',{...baby,...values,updatedAt:new Date().toISOString()});await refresh()}}
 async function openSchedule(){const template=(await repo.list('scheduleTemplates',{babyId:store.activeBabyId}))[0]||createDefaultTemplate(store.activeBabyId),values=await openDialog({title:'调整核心间隔',body:`<label>起床后喝奶（分钟）</label><input name="milk" type="number" min="0" value="${template.rules[1].afterMinutes}"><label>喝奶后辅食（分钟）</label><input name="meal" type="number" min="0" value="${template.rules[2].afterMinutes}"><label>辅食后午觉（分钟）</label><input name="sleep" type="number" min="0" value="${template.rules[3].afterMinutes}">`});if(values){template.rules[1].afterMinutes=Number(values.milk);template.rules[2].afterMinutes=Number(values.meal);template.rules[3].afterMinutes=Number(values.sleep);await repo.put('scheduleTemplates',template);toast('作息模板已保存，明日任务将使用新间隔')}}
 async function openPreferences(){const prefs=await repo.get('foodPreferences',store.activeBabyId)||{id:store.activeBabyId,babyId:store.activeBabyId,excluded:[],disliked:[],favorites:[]},values=await openDialog({title:'饮食偏好',body:`<label>绝对排除（逗号分隔）</label><input name="excluded" value="${(prefs.excluded||[]).join(',')}"><label>不喜欢（逗号分隔）</label><input name="disliked" value="${(prefs.disliked||[]).join(',')}">`});if(values){const split=value=>value.split(/[,，]/).map(x=>x.trim()).filter(Boolean);await repo.put('foodPreferences',{...prefs,excluded:split(values.excluded),disliked:split(values.disliked),updatedAt:new Date().toISOString()});toast('饮食规则已保存')}}
 async function enableNotifications(){if(notificationState()==='unsupported')return toast('当前浏览器不支持通知');if(!confirm('通知只能尽力提醒，不能作为医疗或安全报警。是否继续开启？'))return;const permission=await requestNotifications();toast(permission==='granted'?'通知已开启':'未获得通知权限')}
 async function exportData(){const backup=await createBackup(repo),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`宝宝成长助手V1备份-${localDateKey()}.json`;link.click();URL.revokeObjectURL(link.href);localStorage.setItem('babyGrowthAssistantV1LastExport',backup.exportedAt);toast('备份已导出')}
 async function importData(event){const file=event.target.files[0];if(!file)return;try{const text=await file.text(),preview=previewBackup(text);if(confirm(`备份包含 ${preview.babyCount} 个宝宝、${preview.recordCount} 条数据。确认覆盖当前数据？`)){await importBackup(repo,text);await refresh();toast('备份导入成功')}}catch(error){toast(error.message)}finally{event.target.value=''}}
 async function resetData(){if(!confirm('确定清除这台设备上的全部 V1 数据吗？此操作不可恢复。'))return;if(!confirm('请再次确认：是否已导出备份并继续清除？'))return;await resetApplication(repo);location.reload()}
 if(model.needsOnboarding){document.body.insertAdjacentHTML('beforeend',onboardingView());document.getElementById('onboarding-form').onsubmit=event=>{event.preventDefault();saveOnboarding(Object.fromEntries(new FormData(event.currentTarget)))}}else{await render();if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.register('./service-worker.js');if(notificationState()==='granted')await notifyDueTasks(store.tasks,{registration})}}
}

if(typeof document!=='undefined')browserApp().catch(error=>{console.error(error);document.body.innerHTML=`<main class="fatal"><h1>应用启动失败</h1><p>${String(error.message||error)}</p><button onclick="location.reload()">重新加载</button></main>`});
