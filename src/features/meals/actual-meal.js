function assertMealExists(menu, mealId) {
  const exists = menu.days.some(day => day.meals.some(meal => meal.id === mealId));
  if (!exists) throw new Error('找不到餐次');
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
  assertMealExists(menu, mealId);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('实际餐食信息无效');
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw new Error('实际餐食名称不能为空');

  const occurredAt = typeof input.occurredAt === 'string' ? new Date(input.occurredAt) : null;
  if (!occurredAt || Number.isNaN(occurredAt.getTime())) {
    throw new Error('实际用餐时间无效');
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
  assertMealExists(menu, mealId);
  return updateMeal(menu, mealId, now, meal => {
    const { actualMeal, ...withoutActualMeal } = meal;
    return withoutActualMeal;
  });
}
