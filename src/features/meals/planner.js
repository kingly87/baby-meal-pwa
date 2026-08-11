import { isExcluded, recipeWeight } from './preferences.js';

const isoDate = date => date.toISOString().slice(0, 10);
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return isoDate(value); };

export function safeCandidates(catalog, { stage, excluded = [] }) {
  const safe = catalog.filter(recipe => recipe.stage === stage && !isExcluded(recipe, excluded));
  if (!safe.length) throw new Error('当前阶段没有安全可用的食谱，请减少排除条件或更改辅食阶段。');
  return safe;
}

function weightedPick(list, options) {
  const weighted = list.map(recipe => ({ recipe, weight: recipeWeight(recipe, options) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.min(.999999, Math.max(0, options.random())) * total;
  for (const item of weighted) { cursor -= item.weight; if (cursor < 0) return item.recipe; }
  return weighted.at(-1).recipe;
}

function avoidsRecent(value, recentShapes, field) {
  return !value || !recentShapes.some(shape => shape[field] && shape[field] === value);
}

function preferShapeVariety(pool, recentShapes) {
  if (!pool.length || !recentShapes.length) return pool;
  const differentGroups = pool.filter(recipe => avoidsRecent(recipe.group, recentShapes, 'group'));
  const groupPool = differentGroups.length ? differentGroups : pool;
  const differentDetails = groupPool.filter(recipe =>
    avoidsRecent(recipe.texture, recentShapes, 'texture') &&
    avoidsRecent(recipe.cookingMethod, recentShapes, 'cookingMethod')
  );
  return differentDetails.length ? differentDetails : groupPool;
}

export function generateWeek(catalog, options) {
  const { babyId, stage, startDate, mealCount = 2, excluded = [], favorites = [], disliked = [], random = Math.random, createId = () => crypto.randomUUID() } = options;
  const candidates = safeCandidates(catalog, { stage, excluded });
  const days = [], groupCounts = {}, recent = [], recentShapes = [];
  const relaxedRules = [];
  for (let day = 0; day < 7; day++) {
    const meals = [];
    for (let slot = 0; slot < Math.min(3, Math.max(1, mealCount)); slot++) {
      let pool = candidates.filter(recipe => !recent.slice(-2).includes(recipe.staple) && !meals.some(meal => meal.group === recipe.group));
      if (!pool.length) { pool = candidates.filter(recipe => !meals.some(meal => meal.group === recipe.group)); if (!relaxedRules.includes('主食轮换')) relaxedRules.push('主食轮换'); }
      if (!pool.length) { pool = candidates; if (!relaxedRules.includes('同日类别轮换')) relaxedRules.push('同日类别轮换'); }
      pool = preferShapeVariety(pool, recentShapes.slice(-2));
      const recipe = weightedPick(pool, { favorites, disliked, groupCounts, random });
      recent.push(recipe.staple); groupCounts[recipe.group] = (groupCounts[recipe.group] || 0) + 1;
      recentShapes.push({ group: recipe.group, texture: recipe.texture, cookingMethod: recipe.cookingMethod });
      meals.push({ id: createId(), babyId, recipeId: recipe.id, name: recipe.name, group: recipe.group, staple: recipe.staple, texture: recipe.texture, cookingMethod: recipe.cookingMethod, status: 'planned', slot, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    days.push({ date: addDays(startDate, day), meals });
  }
  return { id: createId(), babyId, stage, startDate, days, relaxedRules, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function replaceMeal(week, mealId, catalog, options) {
  const allMeals = week.days.flatMap(day => day.meals);
  const targetIndex = allMeals.findIndex(meal => meal.id === mealId);
  const currentRecipeId = allMeals[targetIndex]?.recipeId;
  let candidates = safeCandidates(catalog, options).filter(recipe => recipe.id !== currentRecipeId);
  if (!candidates.length) throw new Error('没有其他安全食谱可以替换');
  const recentShapes = allMeals.slice(Math.max(0, targetIndex - 2), Math.max(0, targetIndex)).map(meal => {
    const recipe = catalog.find(item => item.id === meal.recipeId);
    return {
      group: meal.group ?? recipe?.group,
      texture: meal.texture ?? recipe?.texture,
      cookingMethod: meal.cookingMethod ?? recipe?.cookingMethod
    };
  });
  candidates = preferShapeVariety(candidates, recentShapes);
  const recipe = weightedPick(candidates, { ...options, groupCounts: {}, random: options.random || Math.random });
  return { ...week, days: week.days.map(day => ({ ...day, meals: day.meals.map(meal => meal.id === mealId ? { ...meal, recipeId: recipe.id, name: recipe.name, group: recipe.group, staple: recipe.staple, texture: recipe.texture, cookingMethod: recipe.cookingMethod, updatedAt: new Date().toISOString() } : { ...meal }) })), updatedAt: new Date().toISOString() };
}

export function setMealStatus(week, mealId, status) { if (!['planned','eaten','skipped'].includes(status)) throw new Error('无效餐次状态'); return { ...week, days: week.days.map(day => ({ ...day, meals: day.meals.map(meal => meal.id === mealId ? { ...meal, status, updatedAt: new Date().toISOString() } : { ...meal }) })) }; }

