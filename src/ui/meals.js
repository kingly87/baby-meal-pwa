import{esc}from'./render.js';
import{cleanRecipeName,mealSummary,presentMeal}from'../features/meals/presentation.js';

function weeklyMeal(meal,recipe){
  const item=presentMeal(meal,recipe);
  return`<div class="meal-row"><div class="meal-copy"><div class="meal-heading"><b>${esc(item.name)}</b><span class="meal-status ${item.statusClass}">${item.status}</span></div><small class="meal-amounts">${esc(item.amounts)}</small>${item.meta?`<small class="meal-meta">${esc(item.meta)}</small>`:''}</div><div class="button-row"><button data-action="replace-meal" data-id="${esc(meal.id)}">换一道</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-status="${meal.status==='eaten'?'planned':'eaten'}">${meal.status==='eaten'?'恢复':'已吃'}</button><button data-action="meal-status" data-id="${esc(meal.id)}" data-status="${meal.status==='skipped'?'planned':'skipped'}">${meal.status==='skipped'?'恢复':'跳过'}</button></div></div>`;
}

function recipeCard(recipe,{favorites,disliked,stage}){
  const summary=mealSummary(recipe);
  return`<article data-stage="${recipe.stage}" ${recipe.stage===stage?'':'hidden'} class="recipe-card ${disliked.includes(recipe.vegetable)?'is-disliked':''}"><span>${esc(recipe.stageName)}</span><h3>${esc(cleanRecipeName(recipe.name))}</h3><p>${esc(summary.amounts||recipe.ingredients.slice(0,2).join(' · '))}</p><small class="meal-meta">${esc(summary.meta)}</small><div class="button-row"><button data-action="favorite-recipe" data-id="${recipe.id}">${favorites.has(recipe.id)?'已收藏':'收藏'}</button><button data-action="dislike-food" data-food="${esc(recipe.vegetable)}">${disliked.includes(recipe.vegetable)?'取消不喜欢':'不喜欢'}</button></div></article>`;
}

export function mealsView({week,recipes=[],stage='stage4',shopping=[],preferences={}}){
  const favorites=new Set(preferences.favorites||[]);
  const disliked=preferences.disliked||[];
  const byId=new Map(recipes.map(recipe=>[recipe.id,recipe]));
  return`<div class="page-stack"><section class="page-title"><p class="eyebrow">辅食计划</p><h2>本周菜单</h2><p>排除食材是绝对规则，安全候选为空时不会强行生成。</p></section><section class="panel"><div class="toolbar"><button class="button primary" data-action="generate-menu">生成本周菜单</button><button class="button secondary" data-action="build-shopping">生成买菜清单</button></div><div class="week-grid">${week?.days?.map(day=>`<article class="day-card"><h3>${day.date.slice(5)}</h3>${day.meals.map(meal=>weeklyMeal(meal,byId.get(meal.recipeId))).join('')}</article>`).join('')||'<div class="empty">还没有本周菜单。</div>'}</div></section><section class="panel"><div class="section-heading"><h2>买菜清单</h2><button class="text-button" data-action="add-shopping">添加</button></div><div class="shopping-list">${shopping.length?shopping.map(item=>`<label class="shopping-row"><input type="checkbox" data-action="toggle-shopping" data-id="${esc(item.id)}" ${item.done?'checked':''}><span>${esc(item.name)} × ${item.quantity||1}</span><button type="button" data-action="stock-shopping" data-id="${esc(item.id)}">${item.inStock?'取消库存':'家里有'}</button></label>`).join(''):'<div class="empty">生成菜单后可自动整理清单。</div>'}</div></section><section class="panel"><div class="section-heading"><h2>食谱库</h2><span>${recipes.filter(recipe=>recipe.stage===stage).length} 道当前阶段食谱</span></div><div class="filter-row"><input id="recipe-search" type="search" placeholder="搜索菜名或食材"><select id="recipe-stage"><option value="${stage}">当前阶段</option><option value="all">全部阶段</option></select></div><div id="recipe-list" class="recipe-grid">${recipes.map(recipe=>recipeCard(recipe,{favorites,disliked,stage})).join('')}</div></section></div>`;
}
