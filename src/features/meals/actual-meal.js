const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

function parseIsoTimestamp(value) {
  if (typeof value !== 'string') return null;
  const match = ISO_TIMESTAMP.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, fraction = '', zone, offsetHour, offsetMinute] = match;
  if (zone !== 'Z' && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) return null;

  const parts = [year, month, day, hour, minute, second].map(Number);
  const local = new Date(0);
  local.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
  local.setUTCHours(parts[3], parts[4], parts[5], Number(fraction.slice(0, 3).padEnd(3, '0')));
  if (
    local.getUTCFullYear() !== parts[0]
    || local.getUTCMonth() !== parts[1] - 1
    || local.getUTCDate() !== parts[2]
    || local.getUTCHours() !== parts[3]
    || local.getUTCMinutes() !== parts[4]
    || local.getUTCSeconds() !== parts[5]
  ) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validateMenu(menu) {
  if (!menu || typeof menu !== 'object' || Array.isArray(menu) || !Array.isArray(menu.days)) {
    throw new Error('菜单数据无效');
  }
  for (const day of menu.days) {
    if (!day || typeof day !== 'object' || Array.isArray(day) || !Array.isArray(day.meals)) {
      throw new Error('菜单数据无效');
    }
    if (day.meals.some(meal => !meal || typeof meal !== 'object' || Array.isArray(meal))) {
      throw new Error('菜单数据无效');
    }
  }
}

function findUniqueMeal(menu, mealId) {
  validateMenu(menu);
  const matches = menu.days.flatMap(day => day.meals).filter(meal => meal.id === mealId);
  if (matches.length === 0) throw new Error('找不到餐次');
  if (matches.length > 1) throw new Error('餐次标识重复');
  return matches[0];
}

function validateNow(now) {
  if (!parseIsoTimestamp(now)) throw new Error('更新时间无效');
}

function updateMeal(menu, mealId, now, transform) {
  return {
    ...menu,
    days: menu.days.map(day => ({
      ...day,
      meals: day.meals.map(meal => meal.id === mealId
        ? { ...transform(meal), updatedAt: now }
        : { ...meal })
    })),
    updatedAt: now
  };
}

export function saveActualMeal(menu, mealId, input, now = new Date().toISOString()) {
  const targetMeal = findUniqueMeal(menu, mealId);
  validateNow(now);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('实际餐食信息无效');
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw new Error('实际餐食名称不能为空');

  const occurredAt = parseIsoTimestamp(input.occurredAt);
  if (!occurredAt) {
    throw new Error('实际用餐时间无效');
  }
  const existingCreatedAt = targetMeal.actualMeal?.createdAt;
  if (existingCreatedAt !== undefined && !parseIsoTimestamp(existingCreatedAt)) {
    throw new Error('实际餐食创建时间无效');
  }

  return updateMeal(menu, mealId, now, meal => ({
    ...meal,
    ...(input.markEaten === true ? { status: 'eaten' } : {}),
    actualMeal: {
      name,
      occurredAt: occurredAt.toISOString(),
      amount: typeof input.amount === 'string' ? input.amount.trim() : '',
      note: typeof input.note === 'string' ? input.note.trim() : '',
      createdAt: meal.actualMeal?.createdAt || now,
      updatedAt: now
    }
  }));
}

export function removeActualMeal(menu, mealId, now = new Date().toISOString()) {
  findUniqueMeal(menu, mealId);
  validateNow(now);
  return updateMeal(menu, mealId, now, meal => {
    const { actualMeal, ...withoutActualMeal } = meal;
    return withoutActualMeal;
  });
}
