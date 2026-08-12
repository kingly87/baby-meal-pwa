import { curatedStage4Rows } from './stage4-recipes-v2-rows.js';

const ADDITIONAL_ROWS=curatedStage4Rows;

const FISH=/鱼|鳕|鲈|三文鱼/;
const MEAT=/肉|牛|猪|鸡(?:肉|腿|胸)/;
const METHODS={
  '方法01':'先蒸后压，保留细小柔软颗粒',
  '方法02':'先焯后剁，再与主食拌匀',
  '方法03':'隔水蒸熟，出锅后切成柔软扁块',
  '方法04':'小火焖软，收至湿润不黏成团',
  '方法05':'蒸熟压散，再塑成容易抓握的宽条',
  '方法06':'煮软剪短，与蔬菜碎均匀混合',
  '方法07':'薄铺蒸熟，放温后分成柔软小片',
  '方法08':'先煮后拌，保持湿润且不形成小圆块',
  '方法09':'剁细混合后蒸透，轻压成扁椭圆形',
  '方法10':'低温慢蒸至熟透，拆分成柔软薄片',
  '方法11':'加少量水焖至软烂，再压成粗碎质地',
  '方法12':'分别蒸软后组合，保留可压碎的小软块',
  '方法13':'饺子馅包入薄皮后，再下锅水煮至完全熟透',
  '方法14':'馄饨馅包入薄皮后，再下锅水煮至完全熟透'
};
const METHOD_VALUES=Object.values(METHODS);
const SIZE_GUIDES={
  long:'切成约成人两指宽、宝宝手掌长的柔软长条。',flat:'压成约半厘米厚、两指宽的柔软扁片。',short:'面条剪成约一指节长，避免绕成团。',
  crumb:'保留湿润粗碎颗粒，用勺舀起不结成黏团。',wide:'做成掌心大小、边缘柔软的宽片后分块。',halfmoon:'包成扁半月形，煮软后沿中线分开。',
  oval:'塑成两指宽的扁椭圆，不做小圆球。',strip:'切成宽条并去除硬皮、筋和骨刺。',scoop:'保持可用勺压散的湿润小软块。',slice:'蒸成薄层后切为两指宽软片。'
};
const STORAGE_GUIDES={
  fresh:'建议现做现吃，放温后立即提供，不保存宝宝吃剩的部分。',chill:'熟食密封冷藏并在24小时内食用，复热后重新检查软硬。',
  freeze:'完全放凉后按单餐量冷冻，解冻后彻底复热且只复热一次。',component:'蛋白质和蔬菜分开冷冻，食用当天与现煮主食组合。',
  sameDay:'上午制成后冷藏，当天内食用；再次提供前蒸热并放温。',fishFresh:'鱼类建议现做现吃；如备餐，仅冷藏至下一餐并彻底复热后再次检查鱼刺。'
};
const SUBSTITUTIONS={
  redMeat:['可换成已安全尝试的无骨鸡肉，并同样剁细熟透。','蔬菜可换成蒸软南瓜或西葫芦。'],
  redMeatMild:['可换成已安全尝试的猪里脊，去筋后剁成细末。','胡萝卜可换成蒸软红薯，仍须压成宽条。'],
  poultry:['可换成已安全尝试的猪里脊，并去筋剁细。','蔬菜可换成煮软西兰花或土豆。'],
  fish:['可换成已安全尝试且便于去刺的鳕鱼或鲈鱼。','替换后仍须逐片检查并去净鱼刺。'],
  fishMild:['可换成已安全尝试的鲈鱼，蒸熟后逐片检查鱼刺。','西兰花可换成蒸软西葫芦并去除硬皮。'],
  shellfish:['可换成已安全尝试的去刺鱼肉。','虾类替换时仍须去壳、去虾线并切碎。'],
  tofu:['可在已安全尝试后换成鸡蛋，须彻底加热熟透。','蔬菜可换成蒸软菠菜或番茄碎。'],
  egg:['可在已安全尝试后换成嫩豆腐。','主食替换后仍保持湿润、柔软、不黏成团。']
};
const STEP_PATTERNS={
  fingerSteam:v=>[`${v}去硬皮和硬梗后蒸至中心软透。`,'顺着食材纹理切成宽条，保持表面湿润且不做小圆块。'],
  cakeSteam:v=>[`${v}蒸软剁细，与低筋面粉、蛋液和处理好的蛋白质碎调成面糊。`,'倒入浅盘蒸透，放温后切成两指宽的柔软蒸糕。'],
  pancakeCook:v=>[`${v}蒸软压碎，与面粉、蛋液和处理好的蛋白质碎调成稠面糊。`,'面糊薄摊后加盖小火焖熟，两面保持柔软、不煎出硬壳。'],
  riceBall:v=>[`${v}蒸软剁细，与熟软米饭和处理好的蛋白质碎轻拌。`,'用湿手松松压成扁椭圆饭团，不捏成紧实小球。'],
  noodleBoil:v=>[`小麦面条煮至能用手指压断，捞出剪成短段。`,`加入煮软的${v}碎和处理好的蛋白质，拌至湿润不成团。`],
  pastaSimmer:v=>[`小麦意面充分煮软后剪成短段。`,`与${v}碎和处理好的蛋白质加少量水焖匀，避免表面干硬。`],
  dumplingBoil:v=>[`${v}蒸软剁细，与处理好的蛋白质拌成湿润馅料。`,'先用小麦饺子皮薄薄包成扁半月，再下锅水煮至透后分开提供。'],
  wontonBoil:v=>[`${v}蒸软剁细，与处理好的蛋白质拌成细软馅料。`,'先用小麦馄饨皮包成扁薄小馄饨，再下锅水煮至透，剪开并放温。'],
  meatballSteam:v=>[`${v}蒸软剁细，与无骨熟肉末混合。`,'做成两指宽的扁椭圆肉丸后蒸透，不制作小圆球。'],
  fishCakeSteam:v=>[`${v}蒸软压碎，与逐片去刺的熟鱼肉混合。`,'压成两指宽的扁鱼饼并蒸透，放温后再次检查鱼刺。'],
  meatPattySteam:v=>[`${v}蒸软剁细，与去筋无骨肉末拌匀。`,'薄铺成嫩蒸肉饼并彻底蒸熟，切成宽片而非小块。'],
  tofuSteam:v=>[`${v}蒸软切细，与嫩豆腐轻轻混合。`,'隔水蒸热后切成宽条或软片，保持豆腐湿润不散成小粒。'],
  breakfastCup:v=>[`${v}蒸软压碎，与燕麦片、蛋液和处理好的蛋白质调匀。`,'装入浅杯隔水蒸透，放温后用勺压散或切成宽片。'],
  mixedStew:v=>[`${v}与熟软米饭、处理好的蛋白质加水小火焖软。`,'出锅前压散大块，保留湿润粗碎的混合餐质地。'],
  yamCake:v=>[`${v}蒸软剁细，与山药泥、低筋面粉、蛋液和蛋白质碎调成面糊。`,'浅盘蒸透后切成宽片，边缘和中心都须柔软可压碎。']
};

function allergensFromIngredients(ingredients){
  const text=ingredients.join('|');
  return [
    ['蛋',/鸡蛋|蛋液|蒸蛋/],['小麦',/小麦|面粉|面条|意面|饺子皮|馄饨皮/],['大豆',/豆腐|大豆/],
    ['奶',/牛奶|奶酪|酸奶|乳制品/],['鱼',/鳕鱼|鲈鱼|三文鱼|鱼肉/],['甲壳类',/虾|蟹/],
    ['花生',/花生/],['坚果',/坚果|杏仁|核桃|腰果/]
  ].filter(([,pattern])=>pattern.test(text)).map(([allergen])=>allergen);
}

function safeProteinStep(protein){
  if(FISH.test(protein)) return `${protein}彻底蒸熟并逐片检查去刺，再压成细碎软末。`;
  if(/蛋/.test(protein)) return `${protein}彻底加热至完全熟透，再处理成柔软小块。`;
  if(MEAT.test(protein)) return `${protein}选无骨部位，彻底煮熟后切碎或剁细。`;
  if(/虾/.test(protein)) return `${protein}去壳去虾线，彻底煮熟后切碎。`;
  return `${protein}彻底加热熟透，处理成柔软小块。`;
}

function enrichLegacy(recipe,index){
  const cookingMethod=METHOD_VALUES[Math.floor(index/12)%METHOD_VALUES.length];
  const fingerFood=/饭团|饺子|肉丸/.test(recipe.texture);
  const ingredients=mergeMeasuredIngredients([...recipe.ingredients.slice(0,2),...stapleIngredients(recipe.staple)]);
  return {
    ...recipe,
    ingredients,
    chewingLevel:index<60?'beginner-chewing':'advanced-chewing',
    fingerFood,
    freezable:!/蒸蛋/.test(recipe.texture),
    cookingMethod,
    sizeGuide:fingerFood?'做成约两指宽、宝宝容易抓握的柔软块；根据实际咀嚼能力再切小。':'煮至软烂后剪成短段或压成小软块，避免小、圆、硬或黏成团。',
    softnessTest:'上桌前用拇指和食指轻压，能够轻松压碎才提供。',
    substitutions:['同类蛋白质可在已安全尝试后等量替换。','蔬菜可换成煮软后同样容易压碎的当季蔬菜。'],
    allergens:allergensFromIngredients(ingredients),
    mealSlots:['午餐','晚餐'],
    steps:[
      safeProteinStep(recipe.protein),
      `${cookingMethod}；${recipe.vegetable}煮至柔软后与${recipe.staple}混合，成品避免小、硬、黏。`,
      '上桌前按宝宝发育能力调整大小，并用拇指和食指确认可轻松压碎。'
    ]
  };
}

function additionalRecipe(row){
  const [id,name,category,group,protein,vegetable,staple,texture,chewingLevel,fingerFood,mealSlot,method,proteinAmount,vegetableAmount,shapeKey,storageKey,substitutionKey,stepKey]=row;
  const preparationSteps=STEP_PATTERNS[stepKey](vegetable,staple);
  const ingredients=mergeMeasuredIngredients([`${protein} ${proteinAmount}`,`${vegetable} ${vegetableAmount}`,...stapleIngredients(staple)]);
  return {
    id,name,group,protein,vegetable,fruit:'',staple,stage:'stage4',stageName:'咀嚼练习期',age:'约9～12个月',
    texture,caroteneBand:/胡萝卜|南瓜|菠菜|红薯/.test(vegetable)?'high':'normal',
    ingredients,
    steps:[
      safeProteinStep(protein),
      ...preparationSteps,
      `采用“${METHODS[method]}”完成${category}，按宝宝当前能力调整后再提供。`
    ],
    storage:STORAGE_GUIDES[storageKey],
    chewingLevel,
    cookingMethod:METHODS[method],
    fingerFood:fingerFood==='true',
    freezable:['freeze','component'].includes(storageKey),
    sizeGuide:SIZE_GUIDES[shapeKey],
    softnessTest:'上桌前用拇指和食指轻压，能够轻松压碎才提供。',
    substitutions:SUBSTITUTIONS[substitutionKey],
    allergens:allergensFromIngredients(ingredients),
    mealSlots:mealSlot==='早餐'?['早餐','加餐']:mealSlot==='加餐'?['加餐']:['午餐','晚餐']
  };
}

function stapleIngredients(staple){
  if(/蒸蛋羹/.test(staple)) return ['鸡蛋液 10～15g'];
  if(/软乌冬/.test(staple)) return ['小麦乌冬面 15～25g'];
  if(/宝宝意面/.test(staple)) return ['小麦意面 15～25g'];
  if(/迷你饺子/.test(staple)) return ['小麦饺子皮 10～15g'];
  if(/软烂焖饭|软饭团|杂蔬烩饭/.test(staple)) return ['熟软米饭 20～30g'];
  if(/豆腐/.test(staple)) return ['嫩豆腐 20～30g'];
  if(/蒸蛋/.test(staple)) return ['鸡蛋液 10～15g'];
  if(/蒸糕/.test(staple)) return ['低筋小麦面粉 10～15g','鸡蛋液 5～10g'];
  if(/软饼/.test(staple)) return ['小麦面粉 10～15g','鸡蛋液 5～10g'];
  if(/早餐/.test(staple)) return ['燕麦片 10～15g','鸡蛋液 5～10g'];
  if(/意面/.test(staple)) return ['小麦意面 15～25g'];
  if(/碎软面/.test(staple)) return ['小麦面条 15～25g'];
  if(/饺子/.test(staple)) return ['小麦饺子皮 10～15g'];
  if(/馄饨/.test(staple)) return ['小麦馄饨皮 10～15g'];
  if(/饭团|混合餐/.test(staple)) return ['熟软米饭 20～30g'];
  return [];
}

function mergeMeasuredIngredients(ingredients){
  const merged=new Map();
  for (const ingredient of ingredients) {
    const match=ingredient.match(/^(.+?)\s+(\d+)～(\d+)g$/);
    if (!match) throw new Error(`未量化的基础食材：${ingredient}`);
    const [,food,min,max]=match;
    if (Number(min)<=0 || Number(max)<=0 || Number(min)>Number(max)) throw new Error(`克数范围必须为正数且由小到大：${ingredient}`);
    const core=/蛋/.test(food)?'蛋':/豆腐/.test(food)?'豆腐':food;
    const current=merged.get(core);
    if (current) {
      current.min+=Number(min);
      current.max+=Number(max);
      if (food==='嫩豆腐' || food==='鸡蛋液') current.food=food;
    } else merged.set(core,{food,min:Number(min),max:Number(max)});
  }
  return [...merged.values()].map(({food,min,max})=>`${food} ${min}～${max}g`);
}

export function buildStage4RecipesV2(legacyStage4){
  return [
    ...legacyStage4.map(enrichLegacy),
    ...ADDITIONAL_ROWS.map(additionalRecipe)
  ];
}
