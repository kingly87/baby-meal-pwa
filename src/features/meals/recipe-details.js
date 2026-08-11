const CHEWING_LEVELS = new Set(['beginner-chewing', 'advanced-chewing']);
const REQUIRED_TEXT = ['name', 'stageName', 'group', 'staple', 'texture', 'sizeGuide', 'softnessTest'];
const REQUIRED_LISTS = ['ingredients', 'steps', 'substitutions', 'mealSlots'];
const DEFAULT_LIST_FIELDS = ['steps', 'substitutions', 'allergens', 'mealSlots'];

function fail(field, expectation) {
  throw new TypeError(`${field}: ${expectation}`);
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validId(value) {
  return isNonEmptyText(value) || (typeof value === 'number' && Number.isFinite(value));
}

function validateStringList(recipe, field, allowEmpty = false) {
  const list = recipe[field];
  if (!Array.isArray(list) || (!allowEmpty && list.length === 0)) {
    fail(field, allowEmpty ? 'must be an array' : 'must be a non-empty string array');
  }
  for (let index = 0; index < list.length; index += 1) {
    if (!isNonEmptyText(list[index])) fail(field, 'must contain only non-empty strings');
  }
}

export function validateChewingRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) fail('recipe', 'must be an object');
  if (!validId(recipe.id)) fail('id', 'must be a stable non-empty string or finite number');
  for (const field of REQUIRED_TEXT) {
    if (!isNonEmptyText(recipe[field])) fail(field, 'must be a non-empty string');
  }
  if (recipe.stage !== 'stage4') fail('stage', 'must be stage4');
  for (const field of REQUIRED_LISTS) validateStringList(recipe, field);
  validateStringList(recipe, 'allergens', true);
  if (!CHEWING_LEVELS.has(recipe.chewingLevel)) {
    fail('chewingLevel', 'must be beginner-chewing or advanced-chewing');
  }
  for (const field of ['fingerFood', 'freezable']) {
    if (typeof recipe[field] !== 'boolean') fail(field, 'must be boolean');
  }
  return true;
}

export function recipeShape(recipe) {
  const source = recipe && typeof recipe === 'object' && !Array.isArray(recipe) ? recipe : {};
  const shaped = { ...source };
  shaped.chewingLevel = CHEWING_LEVELS.has(source.chewingLevel) ? source.chewingLevel : null;
  if ('ingredients' in source) shaped.ingredients = Array.isArray(source.ingredients) ? source.ingredients.filter(item=>typeof item==='string') : [];
  for (const field of DEFAULT_LIST_FIELDS) shaped[field] = Array.isArray(source[field]) ? source[field].filter(item=>typeof item==='string') : [];
  shaped.fingerFood = typeof source.fingerFood === 'boolean' ? source.fingerFood : false;
  shaped.freezable = typeof source.freezable === 'boolean' ? source.freezable : false;
  shaped.sizeGuide = typeof source.sizeGuide === 'string' ? source.sizeGuide : '';
  shaped.softnessTest = typeof source.softnessTest === 'string' ? source.softnessTest : '';
  return shaped;
}
