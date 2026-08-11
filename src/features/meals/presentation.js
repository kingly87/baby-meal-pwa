const STATUS_LABELS={planned:'计划中',eaten:'已吃',skipped:'已跳过'};

export function cleanRecipeName(name=''){
  return String(name).replace(/·搭配\d+$/,'');
}

export function mealSummary(recipe={}){
  const amounts=(Array.isArray(recipe.ingredients)?recipe.ingredients:[])
    .filter(item=>typeof item==='string')
    .filter(item=>!item.includes('适量')&&!item.includes('可作为'))
    .filter(item=>/\d|克|毫升|(?:^|\s)(?:g|ml)(?:\s|$)/i.test(item))
    .slice(0,2)
    .join(' · ');
  return{
    amounts,
    meta:[recipe.staple,recipe.texture,recipe.stageName].filter(Boolean).join(' · ')
  };
}

export function presentMeal(meal={},recipe){
  const summary=mealSummary(recipe);
  return{
    name:cleanRecipeName(recipe?.name||meal.name||'未命名辅食'),
    amounts:summary.amounts||meal.group||'食谱信息待补充',
    meta:summary.meta,
    status:STATUS_LABELS[meal.status]||STATUS_LABELS.planned,
    statusClass:STATUS_LABELS[meal.status]?meal.status:'planned'
  };
}
