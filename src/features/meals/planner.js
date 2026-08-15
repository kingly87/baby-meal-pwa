import { isExcluded, recipeWeight } from './preferences.js';

const isoDate = date => date.toISOString().slice(0, 10);
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return isoDate(value); };
const DEFAULT_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_SLOT_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

export function safeCandidates(catalog, { stage, excluded = [] }) {
  const safe = catalog.filter(recipe => recipe.stage === stage && !isExcluded(recipe, excluded));
  if (!safe.length) throw new Error('当前阶段没有安全可用的食谱，请减少排除条件或更改辅食阶段。');
  return safe;
}

function candidatesForMealType(candidates, mealType) {
  const label = MEAL_SLOT_LABELS[mealType];
  if (!label) return candidates;
  if (mealType === 'breakfast') return candidates.filter(recipe => Array.isArray(recipe.mealSlots) && recipe.mealSlots.includes(label));
  return candidates.filter(recipe => !Array.isArray(recipe.mealSlots) || recipe.mealSlots.length === 0 || recipe.mealSlots.includes(label));
}

function resolveMealTypes(options) {
  if (Object.hasOwn(options, 'mealTypes')) return options.mealTypes;
  if (Object.hasOwn(options, 'mealCount')) {
    const mealCount = Math.min(3, Math.max(1, Math.ceil(options.mealCount)));
    return mealCount === 1 ? ['lunch'] : mealCount === 2 ? ['lunch', 'dinner'] : DEFAULT_MEAL_TYPES;
  }
  return DEFAULT_MEAL_TYPES;
}

function legacyMealType(meals, index) {
  if (meals.length === 2) return ['lunch', 'dinner'][index];
  if (meals.length === 3) return DEFAULT_MEAL_TYPES[index];
}

function weightedPick(list, options) {
  const weighted = list.map(recipe => ({ recipe, weight: recipeWeight(recipe, options) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.min(.999999, Math.max(0, options.random())) * total;
  for (const item of weighted) { cursor -= item.weight; if (cursor < 0) return item.recipe; }
  return weighted.at(-1).recipe;
}

function noveltyScore(recipe, recentShapes, fields) {
  return fields.reduce((score, field) => {
    const value = recipe[field];
    const knownRecent = recentShapes.map(shape => shape[field]).filter(Boolean);
    return score + (value && knownRecent.length && !knownRecent.includes(value) ? 1 : 0);
  }, 0);
}

function highestNovelty(pool, recentShapes, fields) {
  const scores = pool.map(recipe => noveltyScore(recipe, recentShapes, fields));
  const best = Math.max(...scores);
  return best > 0 ? pool.filter((recipe, index) => scores[index] === best) : pool;
}

function preferShapeVariety(pool, recentShapes) {
  if (!pool.length || !recentShapes.length) return pool;
  const groupPool = highestNovelty(pool, recentShapes, ['group']);
  return highestNovelty(groupPool, recentShapes, ['texture', 'cookingMethod']);
}

export function generateWeek(catalog, options) {
  const { babyId, stage, startDate, excluded = [], favorites = [], disliked = [], random = Math.random, createId = () => crypto.randomUUID() } = options;
  const mealTypes = resolveMealTypes(options);
  const candidates = safeCandidates(catalog, { stage, excluded });
  const candidatesByMealType = new Map(mealTypes.map(mealType => {
    const pool = candidatesForMealType(candidates, mealType);
    if (!pool.length) throw new Error(`没有安全可用的${MEAL_SLOT_LABELS[mealType] || mealType}食谱`);
    return [mealType, pool];
  }));
  const days = [], groupCounts = {}, recent = [], recentShapes = [];
  const relaxedRules = [];
  for (let day = 0; day < 7; day++) {
    const meals = [];
    for (let slot = 0; slot < mealTypes.length; slot++) {
      const mealType = mealTypes[slot];
      let pool = candidatesByMealType.get(mealType);
      const availableGroupPool = pool.filter(recipe => !meals.some(meal => meal.group === recipe.group));
      if (availableGroupPool.length) pool = availableGroupPool;
      pool = preferShapeVariety(pool, recentShapes.slice(-2));
      const staplePool = pool.filter(recipe => !recent.slice(-2).includes(recipe.staple));
      if (staplePool.length) pool = staplePool;
      else if (!relaxedRules.includes('主食轮换')) relaxedRules.push('主食轮换');
      const sameDayPool = pool.filter(recipe => !meals.some(meal => meal.group === recipe.group));
      if (sameDayPool.length) pool = sameDayPool;
      else if (!relaxedRules.includes('同日类别轮换')) relaxedRules.push('同日类别轮换');
      const recipe = weightedPick(pool, { favorites, disliked, groupCounts, random });
      recent.push(recipe.staple); groupCounts[recipe.group] = (groupCounts[recipe.group] || 0) + 1;
      recentShapes.push({ group: recipe.group, texture: recipe.texture, cookingMethod: recipe.cookingMethod });
      meals.push({ id: createId(), babyId, recipeId: recipe.id, name: recipe.name, group: recipe.group, staple: recipe.staple, texture: recipe.texture, cookingMethod: recipe.cookingMethod, status: 'planned', mealType, slot, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    days.push({ date: addDays(startDate, day), meals });
  }
  return { id: createId(), babyId, stage, startDate, days, relaxedRules, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function replaceMeal(week, mealId, catalog, options) {
  const allMeals = week.days.flatMap(day => day.meals);
  const targetIndex = allMeals.findIndex(meal => meal.id === mealId);
  if (targetIndex < 0) throw new Error('找不到要替换的餐次');
  const targetDay = week.days.find(day => day.meals.some(meal => meal.id === mealId));
  const targetMealIndex = targetDay.meals.findIndex(meal => meal.id === mealId);
  const targetMeal = targetDay.meals[targetMealIndex];
  const currentRecipeId = allMeals[targetIndex]?.recipeId;
  let candidates = safeCandidates(catalog, options).filter(recipe => recipe.id !== currentRecipeId);
  const mealType = targetMeal.mealType ?? legacyMealType(targetDay.meals, targetMealIndex);
  if (mealType) candidates = candidatesForMealType(candidates, mealType);
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
  return { ...week, days: week.days.map(day => ({ ...day, meals: day.meals.map(meal => meal.id === mealId ? { ...meal, ...(mealType != null ? { mealType } : {}), recipeId: recipe.id, name: recipe.name, group: recipe.group, staple: recipe.staple, texture: recipe.texture, cookingMethod: recipe.cookingMethod, updatedAt: new Date().toISOString() } : { ...meal }) })), updatedAt: new Date().toISOString() };
}

export function setMealStatus(week, mealId, status) { if (!['planned','eaten','skipped'].includes(status)) throw new Error('无效餐次状态'); return { ...week, days: week.days.map(day => ({ ...day, meals: day.meals.map(meal => meal.id === mealId ? { ...meal, status, updatedAt: new Date().toISOString() } : { ...meal }) })) }; }

