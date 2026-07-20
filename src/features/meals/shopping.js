function ingredientName(value) { return value.replace(/\s+\d.*$/u, '').replace(/\s+适量.*$/u, '').trim(); }

export function buildShoppingList(week, catalog, createId = () => crypto.randomUUID()) {
  const recipes = new Map(catalog.map(recipe => [recipe.id, recipe]));
  const counts = new Map();
  for (const meal of week.days.flatMap(day => day.meals).filter(meal => meal.status !== 'skipped')) {
    for (const raw of recipes.get(meal.recipeId)?.ingredients || []) { const name = ingredientName(raw); counts.set(name, (counts.get(name) || 0) + 1); }
  }
  return [...counts].map(([name, quantity]) => ({ id: createId(), babyId: week.babyId, name, quantity, done: false, inStock: false, custom: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
}
