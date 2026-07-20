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

