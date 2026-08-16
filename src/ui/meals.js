import{esc}from'./render.js';
import{cleanRecipeName,mealSummary,presentMeal}from'../features/meals/presentation.js';
import{recipeShape}from'../features/meals/recipe-details.js';
import{menuRange,normalizeMenu}from'../features/meals/week-menu.js';
import{historyMenus}from'../features/meals/menu-browser.js';

const mealTypeLabels={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};
const actualMealIso=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

function actualMealDate(value){
  if(typeof value!=='string')return null;
  const match=actualMealIso.exec(value);
  if(!match)return null;
  const[,year,month,day,hour,minute,second,fraction='',zone,offsetHour,offsetMinute]=match;
  if(zone!=='Z'&&(Number(offsetHour)>23||Number(offsetMinute)>59))return null;
  const parts=[year,month,day,hour,minute,second].map(Number),local=new Date(0);
  local.setUTCFullYear(parts[0],parts[1]-1,parts[2]);
  local.setUTCHours(parts[3],parts[4],parts[5],Number(fraction.slice(0,3).padEnd(3,'0')));
  if(local.getUTCFullYear()!==parts[0]||local.getUTCMonth()!==parts[1]-1||local.getUTCDate()!==parts[2]||local.getUTCHours()!==parts[3]||local.getUTCMinutes()!==parts[4]||local.getUTCSeconds()!==parts[5])return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date;
}

function actualMealState(meal){
  if(!Object.hasOwn(meal,'actualMeal'))return{kind:'absent'};
  const actualMeal=meal.actualMeal,isObject=actualMeal&&typeof actualMeal==='object'&&!Array.isArray(actualMeal);
  const date=isObject?actualMealDate(actualMeal.occurredAt):null,createdAt=isObject&&Object.hasOwn(actualMeal,'createdAt')?actualMealDate(actualMeal.createdAt):null;
  if(!isObject||typeof actualMeal.name!=='string'||!actualMeal.name.trim()||!date||!createdAt)return{kind:'damaged'};
  return{kind:'valid',actualMeal,date};
}

function actualMealSummary(state){
  if(state.kind==='absent')return'';
  if(state.kind==='damaged')return'<section class="actual-meal-summary" aria-label="实际进食记录"><strong class="actual-meal-title">实际进食记录已损坏</strong><span>时间未知</span></section>';
  const{actualMeal,date}=state;
  const amount=typeof actualMeal.amount==='string'&&actualMeal.amount.trim()?`<span class="actual-meal-amount">份量：${esc(actualMeal.amount)}</span>`:'';
  const note=typeof actualMeal.note==='string'&&actualMeal.note.trim()?`<span class="actual-meal-note">备注：${esc(actualMeal.note)}</span>`:'';
  const local=date.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  return`<section class="actual-meal-summary" aria-label="实际进食记录"><strong class="actual-meal-title">实际吃了：${esc(actualMeal.name.trim())}</strong><time datetime="${esc(date.toISOString())}">${esc(local)}</time>${amount}${note}</section>`;
}

function weeklyMeal(meal,recipe,{editable=true,menuId}={}){
  const item=presentMeal(meal,recipe);
  const actualState=actualMealState(meal),ids=`data-id="${esc(meal.id)}" data-menu-id="${esc(menuId)}"`;
  const deleteActual=`<button class="danger" data-action="delete-actual-meal" ${ids}>删除实际进食</button>`;
  const actualActions=editable?(actualState.kind==='valid'?`<div class="actual-meal-actions"><button data-action="edit-actual-meal" ${ids}>编辑实际进食</button>${deleteActual}</div>`:actualState.kind==='damaged'?`<div class="actual-meal-actions">${deleteActual}</div>`:`<div class="actual-meal-actions"><button data-action="add-actual-meal" ${ids}>记录实际进食</button></div>`):'';
  const actions=editable?`<div class="button-row"><button data-action="replace-meal" data-id="${esc(meal.id)}" data-menu-id="${esc(menuId)}">换一道</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-menu-id="${esc(menuId)}" data-status="${meal.status==='eaten'?'planned':'eaten'}">${meal.status==='eaten'?'恢复':'已吃'}</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-menu-id="${esc(menuId)}" data-status="${meal.status==='skipped'?'planned':'skipped'}">${meal.status==='skipped'?'恢复':'跳过'}</button></div>`:'';
  return`<div class="meal-row"><div class="meal-copy"><div class="meal-heading"><b>${esc(item.name)}</b><span class="meal-type">${mealTypeLabels[meal.mealType]||'餐次'}</span><span class="meal-status ${item.statusClass}">${item.status}</span></div><small class="meal-amounts">${esc(item.amounts)}</small>${item.meta?`<small class="meal-meta">${esc(item.meta)}</small>`:''}${actualMealSummary(actualState)}${actualActions}</div>${actions}</div>`;
}

function detailList(items,fallback){
  return items.length?`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:`<p class="recipe-detail-fallback">${esc(fallback)}</p>`;
}

function recipeDetails(recipe,source){
  const allergens=recipe.allergens.length?recipe.allergens.join('、'):(recipe.chewingLevel?'未标注常见过敏原':'过敏原信息待补充');
  const storage=typeof recipe.storage==='string'&&recipe.storage.trim()?recipe.storage.trim():'保存方式待补充';
  const freezingValue=typeof source?.freezerFriendly==='boolean'?source.freezerFriendly:(typeof source?.freezable==='boolean'?source.freezable:null);
  const freezing=freezingValue===true?'可冷冻':freezingValue===false?'不建议冷冻':'冷冻信息待补充';
  const eatingMethod=recipe.chewingLevel?(recipe.fingerFood?'适合手抓':'建议使用餐具喂食'):'进食方式待补充';
  return`<details class="recipe-details"><summary>查看完整做法与安全提示</summary><div class="recipe-detail-grid"><section><h4>配料与用量</h4>${detailList(recipe.ingredients||[],'配料用量待补充')}</section><section><h4>制作步骤</h4>${detailList(recipe.steps,'详细做法待补充')}</section><section><h4>入口尺寸</h4><p>${esc(recipe.sizeGuide||'尺寸指导待补充')}</p></section><section><h4>软硬度测试</h4><p>${esc(recipe.softnessTest||'软硬度测试待补充')}</p></section><section><h4>过敏原</h4><p>${esc(allergens)}</p></section><section><h4>替换建议</h4>${detailList(recipe.substitutions,'替换建议待补充')}</section><section><h4>适用方式</h4><p>${eatingMethod}${recipe.mealSlots.length?` · ${esc(recipe.mealSlots.join('、'))}`:' · 餐次建议待补充'}</p></section><section><h4>保存说明</h4><p>${esc(storage)}</p></section><section><h4>冷冻</h4><p>${freezing}</p></section></div></details>`;
}

export function recipeMatchesFilters(recipe,{stage='all',query='',chewingLevel='all',fingerFood='all'}={}){
  const shaped=recipeShape(recipe);
  const search=[cleanRecipeName(shaped.name||''),...(shaped.ingredients||[])].filter(Boolean).join(' ').toLowerCase();
  const hasFingerFood=typeof recipe?.fingerFood==='boolean';
  return(stage==='all'||shaped.stage===stage)&&(!query||search.includes(String(query).trim().toLowerCase()))&&(chewingLevel==='all'||shaped.chewingLevel===chewingLevel)&&(fingerFood==='all'||hasFingerFood&&shaped.fingerFood===(fingerFood==='yes'));
}

function recipeCard(source,{favorites,disliked,stage}){
  const recipe=recipeShape(source),summary=mealSummary(recipe),visible=recipeMatchesFilters(recipe,{stage});
  const search=[cleanRecipeName(recipe.name||''),...(recipe.ingredients||[])].filter(Boolean).join(' ').toLowerCase();
  const dislikeButton=recipe.vegetable?`<button data-action="dislike-food" data-id="${esc(recipe.id)}">${disliked.includes(recipe.vegetable)?'取消不喜欢':'不喜欢'}</button>`:'';
  return`<article data-stage="${esc(recipe.stage||'legacy')}" data-chewing-level="${esc(recipe.chewingLevel||'legacy')}" data-finger-food="${recipe.fingerFood?'yes':'no'}" data-search="${esc(search)}" ${visible?'':'hidden'} class="recipe-card ${disliked.includes(recipe.vegetable)?'is-disliked':''}"><span>${esc(recipe.stageName||'阶段信息待补充')}</span><h3>${esc(cleanRecipeName(recipe.name||'未命名食谱'))}</h3><p>${esc(summary.amounts||(recipe.ingredients||[]).slice(0,2).join(' · ')||'配料用量待补充')}</p><small class="meal-meta">${esc(summary.meta||'食谱摘要待补充')}</small>${recipeDetails(recipe,source)}<div class="button-row"><button data-action="favorite-recipe" data-id="${esc(recipe.id)}">${favorites.has(recipe.id)?'已收藏':'收藏'}</button>${dislikeButton}</div></article>`;
}

export function mealsView({week,weeks=[],menuBrowser={},recipes=[],stage='stage4',shopping=[],preferences={},recipeBrowser={}}){
  const favorites=new Set(preferences.favorites||[]),disliked=preferences.disliked||[],byId=new Map(recipes.map(recipe=>[recipe.id,recipe]));
  const filters={stage:recipeBrowser.stage||stage,query:recipeBrowser.query||'',chewingLevel:recipeBrowser.chewingLevel||'all',fingerFood:recipeBrowser.fingerFood||'all'},limit=Math.max(1,Number(recipeBrowser.limit)||24);
  const matched=recipes.filter(recipe=>recipeMatchesFilters(recipe,filters)),shown=matched.slice(0,limit),selected=(value,current)=>value===current?' selected':'';
  const history=week?historyMenus(weeks,{babyId:week.babyId,date:week.startDate??week.days?.[0]?.date}):[...weeks].sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||''))),mode=menuBrowser.mode==='history'?'history':'current';
  const chosen=mode==='history'?history.find(menu=>menu.id===menuBrowser.selectedId):week,shownMenu=normalizeMenu(chosen),editable=mode==='current'||Boolean(menuBrowser.editingHistory);
  let shownRangeHtml='';try{const range=menuRange(shownMenu?.startDate);shownRangeHtml=`<p class="menu-range">${esc(range.startDate)} 至 ${esc(range.endDate)}</p>`}catch{}
  const weekHtml=shownMenu?.days?.map(day=>`<article class="day-card"><h3>${day.date.slice(5)}</h3>${day.meals.map(meal=>weeklyMeal(meal,byId.get(meal.recipeId),{editable,menuId:shownMenu.id})).join('')}</article>`).join('')||`<div class="empty">${mode==='history'?'请选择历史菜单。':'还没有当前7天菜单。'}</div>`;
  const historyHtml=history.map(menu=>{let range;try{range=menuRange(menu.startDate)}catch{range={startDate:menu.startDate||'日期未知',endDate:'日期未知'}}return`<button data-action="select-history" data-id="${esc(menu.id)}" aria-pressed="${mode==='history'&&menu.id===menuBrowser.selectedId}">${esc(range.startDate)} 至 ${esc(range.endDate)}</button>`}).join('')||'<div class="empty">暂无历史菜单。</div>';
  const menuNav=`<div class="menu-tabs"><button data-action="menu-current" aria-pressed="${mode==='current'}">当前7天菜单</button><button data-action="menu-history" aria-pressed="${mode==='history'}">历史菜单</button></div>${shownRangeHtml}<div class="history-list" ${mode==='history'?'':'hidden'}>${historyHtml}</div>`;
  const historyEdit=mode==='history'&&shownMenu&&!menuBrowser.editingHistory?'<button class="button secondary" data-action="edit-history">修改记录</button>':'';
  const shoppingHtml=shopping.length?shopping.map(item=>`<label class="shopping-row"><input type="checkbox" data-action="toggle-shopping" data-id="${esc(item.id)}" ${item.done?'checked':''}><span>${esc(item.name)} × ${item.quantity||1}</span><button type="button" data-action="stock-shopping" data-id="${esc(item.id)}">${item.inStock?'取消库存':'家里有'}</button></label>`).join(''):'<div class="empty">生成菜单后可自动整理清单。</div>';
  const more=shown.length<matched.length?`<button class="button secondary recipe-load-more" data-action="load-more-recipes">加载更多</button>`:'';
  return`<div class="page-stack"><section class="page-title"><p class="eyebrow">辅食计划</p><h2>${mode==='history'?'历史菜单':'当前7天菜单'}</h2><p>排除食材是绝对规则，安全候选为空时不会强行生成。</p></section><section class="panel">${menuNav}<div class="toolbar"><button class="button primary" data-action="generate-menu">生成7天菜单</button><button class="button secondary" data-action="build-shopping">生成买菜清单</button>${historyEdit}</div><div class="week-grid">${weekHtml}</div></section><section class="panel"><div class="section-heading"><h2>买菜清单</h2><button class="text-button" data-action="add-shopping">添加</button></div><div class="shopping-list">${shoppingHtml}</div></section><section class="panel"><div class="section-heading"><h2>食谱库</h2><span>显示 ${shown.length} / ${matched.length}</span></div><div class="recipe-filter-row"><input id="recipe-search" type="search" value="${esc(filters.query)}" placeholder="搜索菜名或食材" aria-label="搜索菜名或食材"><select id="recipe-stage" aria-label="食谱阶段"><option value="${esc(stage)}"${selected(stage,filters.stage)}>当前阶段</option><option value="all"${selected('all',filters.stage)}>全部阶段</option></select><select id="recipe-chewing-level" aria-label="咀嚼难度"><option value="all"${selected('all',filters.chewingLevel)}>全部咀嚼难度</option><option value="beginner-chewing"${selected('beginner-chewing',filters.chewingLevel)}>咀嚼入门</option><option value="advanced-chewing"${selected('advanced-chewing',filters.chewingLevel)}>咀嚼进阶</option></select><select id="recipe-finger-food" aria-label="手指食物"><option value="all"${selected('all',filters.fingerFood)}>全部进食方式</option><option value="yes"${selected('yes',filters.fingerFood)}>手指食物</option><option value="no"${selected('no',filters.fingerFood)}>非手指食物</option></select></div><div id="recipe-list" class="recipe-grid">${shown.map(recipe=>recipeCard(recipe,{favorites,disliked,stage:filters.stage})).join('')}</div>${more}</section></div>`;
}
