export function isExcluded(recipe, excluded = []) {
  return excluded.some(food => recipe.group === food || recipe.protein === food || recipe.ingredients.some(item => item.includes(food)));
}

export function recipeWeight(recipe, { favorites = [], disliked = [], groupCounts = {} } = {}) {
  let weight = 4;
  if (favorites.includes(recipe.id)) weight += 6;
  if (disliked.some(food => recipe.name.includes(food) || recipe.ingredients.some(item => item.includes(food)))) weight = 1;
  weight = Math.max(1, weight - (groupCounts[recipe.group] || 0));
  return weight;
}

export function resolveRecipeId(rawId,catalog=[]){
  return catalog.find(recipe=>String(recipe.id)===String(rawId))?.id;
}

export function toggleRecipeFavorite(preferences={},rawId,catalog=[]){
  const id=resolveRecipeId(rawId,catalog);
  if(id===undefined)throw new Error('找不到食谱');
  const favorites=new Set(preferences.favorites||[]);
  favorites.has(id)?favorites.delete(id):favorites.add(id);
  return{...preferences,favorites:[...favorites]};
}

export function toggleRecipeDislike(preferences={},rawId,catalog=[]){
  const id=resolveRecipeId(rawId,catalog),recipe=catalog.find(item=>item.id===id),food=recipe?.vegetable;
  if(id===undefined||typeof food!=='string'||!food.trim())throw new Error('食谱缺少可标记的蔬菜');
  const disliked=new Set(preferences.disliked||[]);
  disliked.has(food)?disliked.delete(food):disliked.add(food);
  return{...preferences,disliked:[...disliked]};
}

export async function persistRecipePreference(repository,babyId,rawId,catalog,action,updatedAt=new Date().toISOString()){
  const current=await repository.get('foodPreferences',babyId)||{id:babyId,babyId,excluded:[],disliked:[],favorites:[]};
  const next=action==='favorite'?toggleRecipeFavorite(current,rawId,catalog):action==='dislike'?toggleRecipeDislike(current,rawId,catalog):null;
  if(!next)throw new Error('不支持的食谱偏好操作');
  return repository.put('foodPreferences',{...next,updatedAt});
}

