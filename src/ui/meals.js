import{esc}from'./render.js';
import{cleanRecipeName,mealSummary,presentMeal}from'../features/meals/presentation.js';
import{recipeShape}from'../features/meals/recipe-details.js';

function weeklyMeal(meal,recipe){
  const item=presentMeal(meal,recipe);
  return`<div class="meal-row"><div class="meal-copy"><div class="meal-heading"><b>${esc(item.name)}</b><span class="meal-status ${item.statusClass}">${item.status}</span></div><small class="meal-amounts">${esc(item.amounts)}</small>${item.meta?`<small class="meal-meta">${esc(item.meta)}</small>`:''}</div><div class="button-row"><button data-action="replace-meal" data-id="${esc(meal.id)}">换一道</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-status="${meal.status==='eaten'?'planned':'eaten'}">${meal.status==='eaten'?'恢复':'已吃'}</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-status="${meal.status==='skipped'?'planned':'skipped'}">${meal.status==='skipped'?'恢复':'跳过'}</button></div></div>`;
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
  return`<article data-stage="${esc(recipe.stage||'legacy')}" data-chewing-level="${esc(recipe.chewingLevel||'legacy')}" data-finger-food="${recipe.fingerFood?'yes':'no'}" data-search="${esc(search)}" ${visible?'':'hidden'} class="recipe-card ${disliked.includes(recipe.vegetable)?'is-disliked':''}"><span>${esc(recipe.stageName||'阶段信息待补充')}</span><h3>${esc(cleanRecipeName(recipe.name||'未命名食谱'))}</h3><p>${esc(summary.amounts||(recipe.ingredients||[]).slice(0,2).join(' · ')||'配料用量待补充')}</p><small class="meal-meta">${esc(summary.meta||'食谱摘要待补充')}</small>${recipeDetails(recipe,source)}<div class="button-row"><button data-action="favorite-recipe" data-id="${esc(recipe.id)}">${favorites.has(recipe.id)?'已收藏':'收藏'}</button><button data-action="dislike-food" data-food="${esc(recipe.vegetable||'')}">${disliked.includes(recipe.vegetable)?'取消不喜欢':'不喜欢'}</button></div></article>`;
}

export function mealsView({week,recipes=[],stage='stage4',shopping=[],preferences={}}){
  const favorites=new Set(preferences.favorites||[]),disliked=preferences.disliked||[],byId=new Map(recipes.map(recipe=>[recipe.id,recipe]));
  const weekHtml=week?.days?.map(day=>`<article class="day-card"><h3>${day.date.slice(5)}</h3>${day.meals.map(meal=>weeklyMeal(meal,byId.get(meal.recipeId))).join('')}</article>`).join('')||'<div class="empty">还没有本周菜单。</div>';
  const shoppingHtml=shopping.length?shopping.map(item=>`<label class="shopping-row"><input type="checkbox" data-action="toggle-shopping" data-id="${esc(item.id)}" ${item.done?'checked':''}><span>${esc(item.name)} × ${item.quantity||1}</span><button type="button" data-action="stock-shopping" data-id="${esc(item.id)}">${item.inStock?'取消库存':'家里有'}</button></label>`).join(''):'<div class="empty">生成菜单后可自动整理清单。</div>';
  return`<div class="page-stack"><section class="page-title"><p class="eyebrow">辅食计划</p><h2>本周菜单</h2><p>排除食材是绝对规则，安全候选为空时不会强行生成。</p></section><section class="panel"><div class="toolbar"><button class="button primary" data-action="generate-menu">生成本周菜单</button><button class="button secondary" data-action="build-shopping">生成买菜清单</button></div><div class="week-grid">${weekHtml}</div></section><section class="panel"><div class="section-heading"><h2>买菜清单</h2><button class="text-button" data-action="add-shopping">添加</button></div><div class="shopping-list">${shoppingHtml}</div></section><section class="panel"><div class="section-heading"><h2>食谱库</h2><span>${recipes.filter(recipe=>recipe.stage===stage).length} 道当前阶段食谱</span></div><div class="recipe-filter-row"><input id="recipe-search" type="search" placeholder="搜索菜名或食材" aria-label="搜索菜名或食材"><select id="recipe-stage" aria-label="食谱阶段"><option value="${esc(stage)}">当前阶段</option><option value="all">全部阶段</option></select><select id="recipe-chewing-level" aria-label="咀嚼难度"><option value="all">全部咀嚼难度</option><option value="beginner-chewing">咀嚼入门</option><option value="advanced-chewing">咀嚼进阶</option></select><select id="recipe-finger-food" aria-label="手指食物"><option value="all">全部进食方式</option><option value="yes">手指食物</option><option value="no">非手指食物</option></select></div><div id="recipe-list" class="recipe-grid">${recipes.map(recipe=>recipeCard(recipe,{favorites,disliked,stage})).join('')}</div></section></div>`;
}
