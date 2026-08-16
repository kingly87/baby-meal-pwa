import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanRecipeName, mealSummary, presentMeal } from '../src/features/meals/presentation.js';
import { mealsView } from '../src/ui/meals.js';

test('recipe display names hide every generated pairing suffix', () => {
  for (const number of [2, 3, 8, 27]) {
    assert.equal(cleanRecipeName(`嫩豆腐土豆宝宝面·搭配${number}`), '嫩豆腐土豆宝宝面');
  }
  assert.equal(cleanRecipeName('南瓜牛肉软饭'), '南瓜牛肉软饭');
});

test('meal summary shows two useful amounts and meal stage metadata', () => {
  const summary=mealSummary({
    ingredients:['嫩豆腐 20g','土豆 25g','宝宝面 适量','梨 可作为当日水果搭配'],
    staple:'宝宝面',texture:'软面',stageName:'咀嚼练习期'
  });
  assert.equal(summary.amounts,'嫩豆腐 20g · 土豆 25g');
  assert.equal(summary.meta,'宝宝面 · 软面 · 咀嚼练习期');
});

test('meal presentation degrades safely when its recipe is missing', () => {
  assert.deepEqual(
    presentMeal({name:'旧菜单·搭配8',group:'豆腐',status:'planned'}, undefined),
    {name:'旧菜单',amounts:'豆腐',meta:'',status:'计划中',statusClass:'planned'}
  );
});

test('weekly menu and recipe library show useful details without pairing numbers', () => {
  const recipe={
    id:8,name:'嫩豆腐土豆宝宝面·搭配8',group:'豆腐',stage:'stage4',
    stageName:'咀嚼练习期',staple:'宝宝面',texture:'软面',
    ingredients:['嫩豆腐 20g','土豆 25g','宝宝面 适量']
  };
  const week={days:[{date:'2026-07-23',meals:[
    {id:'m1',recipeId:8,name:recipe.name,group:'豆腐',status:'planned'},
    {id:'m2',recipeId:8,name:recipe.name,group:'豆腐',status:'eaten'},
    {id:'m3',recipeId:8,name:recipe.name,group:'豆腐',status:'skipped'}
  ]}]};
  const html=mealsView({week,recipes:[recipe],stage:'stage4'});
  assert.doesNotMatch(html,/搭配\d+/);
  for(const text of ['嫩豆腐土豆宝宝面','嫩豆腐 20g · 土豆 25g','宝宝面 · 软面 · 咀嚼练习期','计划中','已吃','已跳过']){
    assert.match(html,new RegExp(text));
  }
  assert.match(html,/class="meal-status planned"/);
  assert.match(html,/class="meal-status eaten"/);
  assert.match(html,/class="meal-status skipped"/);
});

test('PWA cache includes meal presentation module with a new revision', async () => {
  const sw=await readFile('service-worker.js','utf8');
  assert.match(sw,/baby-growth-v1-20260720-r30/);
  assert.ok(sw.includes('"./src/features/meals/presentation.js"'));
});
