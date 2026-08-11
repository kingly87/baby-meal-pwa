import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../data/recipes.js';
import { curatedStage4Rows } from '../data/stage4-recipes-v2-rows.js';
import { validateChewingRecipe } from '../src/features/meals/recipe-details.js';

test('recipe catalog contains 780 unique complete recipes', () => {
  assert.equal(recipes.length, 780);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 780);
  for (const recipe of recipes) {
    for (const key of ['id', 'name', 'stage', 'group', 'ingredients', 'steps', 'staple']) {
      assert.ok(recipe[key] !== undefined, `recipe ${recipe.id} missing ${key}`);
    }
    assert.ok(Array.isArray(recipe.ingredients));
    assert.ok(Array.isArray(recipe.steps));
  }
});

test('chewing stage expands to 300 while every other stage stays at 120', () => {
  for (const stage of ['stage1', 'stage2', 'stage3', 'stage5']) assert.equal(recipes.filter(recipe => recipe.stage === stage).length, 120, stage);
  assert.equal(recipes.filter(recipe => recipe.stage === 'stage4').length, 300);
});

test('all chewing recipes satisfy the strict enriched recipe contract', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  for (const recipe of stage4) assert.equal(validateChewingRecipe(recipe), true, recipe.name);
});

test('chewing catalog has useful level, finger-food and category coverage', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  assert.ok(stage4.filter(recipe => recipe.chewingLevel === 'beginner-chewing').length >= 120);
  assert.ok(stage4.filter(recipe => recipe.chewingLevel === 'advanced-chewing').length >= 120);
  assert.ok(stage4.filter(recipe => recipe.fingerFood).length >= 100);
  for (const category of ['手指蔬菜','蒸糕','软饼','饭团','面','意面','饺子','馄饨','肉丸','鱼饼','蒸肉饼','豆腐','早餐','混合餐']) {
    assert.ok(stage4.some(recipe => `${recipe.name}|${recipe.group}|${recipe.staple}|${recipe.texture}|${recipe.mealSlots.join('|')}`.includes(category)), category);
  }
});

test('chewing recipes are explicitly varied, uniquely named and new names have no generated pairing numbers', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  assert.equal(new Set(stage4.map(recipe => recipe.name)).size, 300);
  assert.ok(stage4.filter(recipe => typeof recipe.id === 'string').every(recipe => !/搭配\d+/.test(recipe.name)), 'new stage4 names must not contain generated pairing numbers');
  const combinations=new Set(stage4.map(recipe => `${recipe.protein}|${recipe.vegetable}|${recipe.staple}|${recipe.texture}|${recipe.cookingMethod}`));
  assert.ok(combinations.size >= 240, `only ${combinations.size} normalized recipe combinations`);
});

test('new chewing recipes are curated records rather than a cartesian or single-template catalog', () => {
  const added=recipes.filter(recipe => typeof recipe.id === 'string' && recipe.id.startsWith('stage4-v2-'));
  assert.equal(added.length,180);
  const pairs=new Set(added.map(recipe => `${recipe.protein}|${recipe.vegetable}`));
  const forms=new Set(added.map(recipe => `${recipe.staple}|${recipe.texture}`));
  assert.notEqual(pairs.size*forms.size,added.length,'new rows form a complete protein-vegetable × form cartesian product');
  const amounts=new Set(added.map(recipe => recipe.ingredients.slice(0,2).join('|')));
  assert.ok(amounts.size>=24,`only ${amounts.size} amount selections`);
  assert.ok(new Set(added.map(recipe => recipe.sizeGuide)).size>=8,'size guidance is template-identical');
  assert.ok(new Set(added.map(recipe => recipe.storage)).size>=5,'storage guidance is template-identical');
  assert.ok(new Set(added.map(recipe => recipe.substitutions.join('|'))).size>=8,'substitutions are template-identical');
  const stepPatterns=new Set(added.map(recipe => recipe.steps.join('|')
    .replaceAll(recipe.name,'{name}').replaceAll(recipe.protein,'{protein}')
    .replaceAll(recipe.vegetable,'{vegetable}').replaceAll(recipe.staple,'{staple}')
    .replaceAll(recipe.cookingMethod,'{method}').replace(/\d+/g,'#')));
  assert.ok(stepPatterns.size>=12,`only ${stepPatterns.size} semantic step patterns`);
  const methodCounts=new Map();
  for (const recipe of added) methodCounts.set(recipe.cookingMethod,(methodCounts.get(recipe.cookingMethod)||0)+1);
  assert.ok(new Set(methodCounts.values()).size>1,'cooking methods are mechanically uniform');
  for (const recipe of added) {
    const steps=recipe.steps.join('|');
    if (/蒸糕/.test(recipe.staple)) assert.match(steps,/面粉|蛋液|面糊/,recipe.name);
    if (/软饼/.test(recipe.staple)) assert.match(steps,/薄摊|面糊|加盖/,recipe.name);
    if (/碎软面|意面/.test(recipe.staple)) assert.match(`${steps}|${recipe.sizeGuide}`,/煮软|剪短|短段/,recipe.name);
    if (/饺子/.test(recipe.staple)) assert.match(steps,/饺子皮|包成|煮透/,recipe.name);
    if (/馄饨/.test(recipe.staple)) assert.match(steps,/馄饨皮|包成|煮透/,recipe.name);
    if (recipe.texture==='鱼饼') assert.match(recipe.protein,/鱼|鳕|鲈|三文鱼/,recipe.name);
    if (recipe.texture==='面条') assert.match(recipe.sizeGuide,/剪|短/,recipe.name);
    if (/软饼/.test(recipe.staple)) assert.match(recipe.cookingMethod,/小火|薄铺/,recipe.name);
    if (/饺子/.test(recipe.staple)) {
      assert.match(recipe.cookingMethod,/饺子馅.*包入.*再.*水煮.*熟透/,recipe.name);
      assert.match(steps,/先.*饺子皮.*包成.*再.*水煮.*透/,recipe.name);
    }
    if (/馄饨/.test(recipe.staple)) {
      assert.match(recipe.cookingMethod,/馄饨馅.*包入.*再.*水煮.*熟透/,recipe.name);
      assert.match(steps,/先.*馄饨皮.*包成.*再.*水煮.*透/,recipe.name);
    }
    if (/肉丸|鱼饼/.test(recipe.texture)) assert.match(recipe.cookingMethod,/剁细|扁椭圆/,recipe.name);
  }
});

test('curated form blocks do not hide short-period amount, shape or method rotations', () => {
  const blocks=new Map();
  for (const row of curatedStage4Rows) {
    const key=`${row[6]}|${row[7]}`;
    if (!blocks.has(key)) blocks.set(key,[]);
    blocks.get(key).push(row);
  }
  const minimumPeriod=values=>{
    for (let period=1;period<=values.length;period+=1) {
      if (values.every((value,index)=>value===values[index%period])) return period;
    }
    return values.length;
  };
  const singleMethodForms=new Map([
    ['薄皮软饺子','方法13'],['薄皮小馄饨','方法14'],['松软肉丸','方法09'],['无刺软鱼饼','方法09']
  ]);
  const singleShapeForms=new Set(['碎软面','软煮意面']);
  for (const [form,rows] of blocks) {
    assert.equal(rows.length,12,form);
    const proteinGrams=rows.map(row=>row[12]);
    const vegetableGrams=rows.map(row=>row[13]);
    assert.ok(minimumPeriod(proteinGrams)>6,`${form} protein amounts repeat every ${minimumPeriod(proteinGrams)}`);
    assert.ok(minimumPeriod(vegetableGrams)>6,`${form} vegetable amounts repeat every ${minimumPeriod(vegetableGrams)}`);
    if (!singleShapeForms.has(rows[0][6])) assert.ok(minimumPeriod(rows.map(row=>row[14]))>6,`${form} shapes use a short rotation`);
    if (singleMethodForms.has(rows[0][6])) {
      assert.ok(rows.every(row=>row[11]===singleMethodForms.get(rows[0][6])),`${form} does not use its declared single safe method`);
    } else assert.ok(minimumPeriod(rows.map(row=>row[11]))>6,`${form} methods use a short rotation`);
  }
});

test('chewing recipes encode safe shapes, textures and allergen-aware preparation', () => {
  const stage4=recipes.filter(recipe => recipe.stage === 'stage4');
  const forbidden=/(蜂蜜|整粒坚果|整颗(?:葡萄|番茄|圣女果)|硬(?:生)?胡萝卜|硬(?:生)?苹果)/;
  const allergenSources=[
    ['蛋',/鸡蛋|蛋液|蒸蛋/],['小麦',/小麦|面粉|面条|意面|饺子皮|馄饨皮/],['大豆',/豆腐|大豆/],
    ['奶',/牛奶|奶酪|酸奶|乳制品/],['鱼',/鳕鱼|鲈鱼|三文鱼|鱼肉/],['甲壳类',/虾|蟹/],
    ['花生',/花生/],['坚果',/坚果|杏仁|核桃|腰果/]
  ];
  for (const recipe of stage4) {
    const ingredientText=recipe.ingredients.join('|');
    const text=[recipe.name,...recipe.ingredients,...recipe.steps,recipe.sizeGuide,recipe.softnessTest].join('|');
    assert.doesNotMatch(text,forbidden,recipe.name);
    assert.match(recipe.softnessTest,/拇指|手指|压碎/,recipe.name);
    if (/鱼|鳕|鲈|三文鱼/.test(`${recipe.group}|${recipe.protein}`)) assert.match(recipe.steps.join('|'),/去刺/,recipe.name);
    if (/肉|牛|猪|鸡(?:肉|腿|胸)/.test(`${recipe.group}|${recipe.protein}`)) assert.match(recipe.steps.join('|'),/无骨|切碎|剁/,recipe.name);
    if (/花生|坚果/.test(recipe.ingredients.join('|'))) assert.ok(recipe.allergens.some(item => /花生|坚果/.test(item)),recipe.name);
    if (/蛋|蒸蛋/.test(`${recipe.protein}|${recipe.staple}`)) assert.ok(recipe.allergens.includes('蛋'),recipe.name);
    if (recipe.allergens.includes('蛋')) assert.match(recipe.ingredients.join('|'),/蛋/,recipe.name);
    if (recipe.allergens.includes('小麦')) assert.match(recipe.ingredients.join('|'),/小麦|面粉|面条|意面|饺子皮|馄饨皮/,recipe.name);
    if (recipe.allergens.includes('蛋')) assert.ok(recipe.ingredients.some(item => /蛋.*\d+.*g/.test(item)),`${recipe.name}: missing measured egg source`);
    if (recipe.allergens.includes('小麦')) assert.ok(recipe.ingredients.some(item => /(?:小麦|面粉|面条|意面|饺子皮|馄饨皮).*\d+.*g/.test(item)),`${recipe.name}: missing measured wheat source`);
    if (/豆腐|大豆/.test(recipe.ingredients.join('|'))) assert.ok(recipe.allergens.includes('大豆'),recipe.name);
    if (/小麦|面粉|面条|意面|饺子皮|馄饨皮/.test(recipe.ingredients.join('|'))) assert.ok(recipe.allergens.includes('小麦'),recipe.name);
    if (recipe.allergens.includes('大豆')) assert.ok(recipe.ingredients.some(item => /豆腐.*\d+.*g/.test(item)),`${recipe.name}: missing measured soy source`);
    for (const [allergen,source] of allergenSources) {
      if (source.test(ingredientText)) assert.ok(recipe.allergens.includes(allergen),`${recipe.name}: missing ${allergen}`);
      if (recipe.allergens.includes(allergen)) assert.match(ingredientText,source,`${recipe.name}: ${allergen} has no ingredient source`);
    }
    assert.doesNotMatch(recipe.steps.join('|'),/第\d+种处理|方法\d+/,recipe.name);
  }
});

test('egg recipes never receive meat-only deboning instructions', () => {
  const eggRecipes=recipes.filter(recipe => recipe.stage==='stage4' && /蛋/.test(recipe.protein));
  assert.ok(eggRecipes.length>0);
  for (const recipe of eggRecipes) assert.doesNotMatch(recipe.steps.join('|'),/选无骨部位/,recipe.name);
});

test('every chewing staple has an independently declared measured ingredient source', () => {
  const expectedStapleSources=new Map([
    ['软烂焖饭',/熟软米饭/],['宝宝意面',/小麦意面/],['迷你饺子',/小麦饺子皮/],['软嫩肉丸',null],
    ['软饭团',/熟软米饭/],['蒸蛋羹',/鸡蛋液/],['软乌冬',/小麦乌冬面/],['杂蔬烩饭',/熟软米饭/],
    ['蒸软手指蔬菜',null],['杂蔬蒸糕',/低筋小麦面粉/],['谷物软饼',/小麦面粉/],['软米饭团',/熟软米饭/],
    ['碎软面',/小麦面条/],['软煮意面',/小麦意面/],['薄皮软饺子',/小麦饺子皮/],['薄皮小馄饨',/小麦馄饨皮/],
    ['松软肉丸',null],['无刺软鱼饼',null],['嫩蒸肉饼',null],['嫩豆腐块',/嫩豆腐/],
    ['燕麦早餐杯',/燕麦片/],['软饭混合餐',/熟软米饭/],['山药蔬菜蒸糕',/低筋小麦面粉/]
  ]);
  const stage4=recipes.filter(recipe => recipe.stage==='stage4');
  assert.deepEqual(new Set(stage4.map(recipe=>recipe.staple)),new Set(expectedStapleSources.keys()));
  for (const recipe of stage4) {
    const source=expectedStapleSources.get(recipe.staple);
    if (source) assert.ok(recipe.ingredients.some(item=>source.test(item) && /\d+～\d+g/.test(item)),`${recipe.name}: missing measured ${recipe.staple} source`);
  }
});

test('chewing ingredients contain only quantified base foods without duplicate cores', () => {
  const normalizeCore=ingredient=>{
    const food=ingredient.replace(/\s+\d+～\d+g$/,'');
    if (/蛋/.test(food)) return '蛋';
    if (/豆腐/.test(food)) return '豆腐';
    return food;
  };
  for (const recipe of recipes.filter(recipe => recipe.stage==='stage4')) {
    assert.doesNotMatch(recipe.ingredients.join('|'),/适量/,recipe.name);
    assert.ok(recipe.ingredients.every(item=>/\d+～\d+g$/.test(item)),`${recipe.name}: ingredient amount is incomplete`);
    const cores=recipe.ingredients.map(normalizeCore);
    assert.equal(new Set(cores).size,cores.length,`${recipe.name}: duplicate core ingredient`);
  }
});
