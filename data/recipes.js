import { recipes as baseRecipes } from './recipes-base.js';
import { buildStage4RecipesV2 } from './stage4-recipes-v2.js';

const legacyStage4=baseRecipes.filter(recipe=>recipe.stage==='stage4');

export const recipes=[
  ...baseRecipes.filter(recipe=>recipe.stage!=='stage4'),
  ...buildStage4RecipesV2(legacyStage4)
].sort((left,right)=>{
  const leftId=typeof left.id==='number'?left.id:Number.MAX_SAFE_INTEGER;
  const rightId=typeof right.id==='number'?right.id:Number.MAX_SAFE_INTEGER;
  return leftId-rightId;
});
