import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { todayView } from '../src/ui/today.js';
import { formatTimelineDate } from '../src/ui/render.js';
import { onboardingView } from '../src/ui/onboarding.js';
import { mealsView, recipeMatchesFilters } from '../src/ui/meals.js';
import { growthView, chartSvg } from '../src/ui/growth.js';
import { settingsView } from '../src/ui/settings.js';
import { recordsView } from '../src/ui/records.js';
import { formatDateTimeLocal } from '../src/app.js';
import { openActionDialog, guardedDialogClose, runDialogSubmit } from '../src/ui/dialogs.js';
import { createDefaultTemplate } from '../src/features/schedule/template.js';

function fakeDialogDocument(){
  class Node extends EventTarget{
    constructor(doc){super();this.doc=doc;this.nodes=new Map();this.removed=false}
    set innerHTML(value){
      this.html=value;
      const focusable=element=>Object.assign(element,{focus(){this.focused=true;this.owner.activeElement=this}}, {owner:this.doc});
      const title={textContent:'',id:value.match(/<h2 id="([^"]+)"/)?.[1]||''};
      const dialog={getAttribute:name=>value.match(new RegExp(`${name}="([^"]+)"`))?.[1]||null};
      const cancel=focusable({onclick:null});
      this.nodes.set('h2',title);this.nodes.set('[role="dialog"]',dialog);this.nodes.set('[data-cancel]',cancel);
      this.choices=['keep','adjust','skip'].map(value=>focusable({dataset:{value},onclick:null}));
      this.buttons=[...this.choices,cancel];
    }
    querySelector(selector){if(selector==='[data-value]')return this.choices[0];return this.nodes.get(selector)}
    querySelectorAll(selector){if(selector==='[data-value]')return this.choices;if(selector==='button:not([disabled])')return this.buttons;return[]}
    remove(){this.removed=true}
  }
  const document=new EventTarget();
  document.activeElement=null;
  const wrap=new Node(document);
  document.createElement=()=>wrap;
  document.body={append(node){this.last=node}};
  const trigger={focus(){this.focused=true;document.activeElement=this}};
  document.activeElement=trigger;
  return{document,wrap,trigger};
}

test('today view exposes current, next, sleep, quick actions and timeline regions', () => {
  const html=todayView({baby:{name:'柚柚'},primary:null,next:null,sleepMinutes:0,timeline:[]});
  for(const id of ['current-task-card','next-task-card','sleep-summary','quick-actions','today-timeline']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/data-quick="stool"[^>]*>[\s\S]*?记录便便/);
  assert.match(html,/data-quick="urine"[^>]*>[\s\S]*?记录尿尿/);
  assert.match(html,/data-quick="water"/);
  assert.equal((html.match(/data-quick="stool"/g)||[]).length,1);
  assert.equal((html.match(/data-quick="urine"/g)||[]).length,1);
});

test('records view offers independent accessible one-tap stool and urine actions', () => {
  const html=recordsView({records:[
    {id:'s1',type:'stool',value:1,occurredAt:'2026-08-11T08:00:00.000Z'},
    {id:'u1',type:'urine',value:1,occurredAt:'2026-08-11T09:00:00.000Z'}
  ]});
  assert.match(html,/data-record="stool"[^>]*aria-label="记录便便"/);
  assert.match(html,/data-record="urine"[^>]*aria-label="记录尿尿"/);
  assert.match(html,/便便 · 1 次/);
  assert.match(html,/尿尿 · 1 次/);
});

test('records view clearly reports unavailable local record history',()=>{
  const html=recordsView({records:[],sleeps:[],dataError:'记录数据暂时无法读取'});
  assert.match(html,/role="status"/);
  assert.match(html,/记录数据暂时无法读取/);
  assert.doesNotMatch(html,/还没有记录/);
});

test('today sleep summary distinguishes unavailable storage from a real zero',()=>{
  const unavailable=todayView({sleepMinutes:0,sleepUnavailable:true});
  assert.match(unavailable,/今日睡眠[\s\S]*暂不可用/);
  assert.doesNotMatch(unavailable,/今日睡眠[\s\S]*0\.0 小时/);
  assert.match(todayView({sleepMinutes:0,sleepUnavailable:false}),/今日睡眠[\s\S]*0\.0 小时/);
});

test('quick count actions disable during writes and surface errors', async () => {
  const source=await readFile('src/app.js','utf8');
  assert.match(source,/button\.disabled=true/);
  assert.match(source,/finally\{button\.disabled=false\}/);
  assert.match(source,/记录失败/);
  assert.match(source,/persistCountRecord/);
});

test('count edit dialog exposes integer count, time, note and async error handling', async () => {
  const source=await readFile('src/app.js','utf8');
  assert.match(source,/item\.type==='stool'\?'便便':item\.type==='urine'\?'尿尿'/);
  assert.match(source,/name="value" type="number" min="1" step="1"/);
  assert.match(source,/name="occurredAt" type="datetime-local"/);
  assert.match(source,/updateDailyRecord/);
  const dialogs=await readFile('src/ui/dialogs.js','utf8');
  assert.match(dialogs,/role="status"/);
  assert.match(dialogs,/runDialogSubmit/);
});

test('async dialog submit locks during storage and keeps the dialog open on failure', async () => {
  const submit={disabled:false},cancel={disabled:false},error={hidden:true,textContent:''},closed=[];
  const wrap={dataset:{},attributes:{},setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]}};
  const close=guardedDialogClose(wrap,value=>closed.push(value));
  let rejectWrite;
  const pending=runDialogSubmit({wrap,submit,cancel,error,values:{value:'1'},close,onSubmit:()=>new Promise((resolve,reject)=>{rejectWrite=reject})});
  assert.equal(submit.disabled,true);
  assert.equal(cancel.disabled,true);
  assert.equal(wrap.dataset.pending,'true');
  assert.equal(wrap.attributes['aria-busy'],'true');
  assert.equal(close(null),false);
  assert.deepEqual(closed,[]);
  const duplicate=await runDialogSubmit({wrap,submit,cancel,error,values:{value:'1'},close,onSubmit:async()=>{throw new Error('不应执行')}});
  assert.equal(duplicate,false);
  rejectWrite(new Error('保存失败'));
  assert.equal(await pending,false);
  assert.equal(submit.disabled,false);
  assert.equal(cancel.disabled,false);
  assert.equal(wrap.dataset.pending,undefined);
  assert.equal(wrap.attributes['aria-busy'],undefined);
  assert.equal(error.hidden,false);
  assert.equal(error.textContent,'保存失败');
  assert.deepEqual(closed,[]);
  assert.equal(close(null),true);
  assert.deepEqual(closed,[null]);
});

test('successful async dialog submission closes once after the pending lock', async () => {
  const submit={disabled:false},cancel={disabled:false},error={hidden:true,textContent:''},closed=[];
  const wrap={dataset:{},setAttribute(){},removeAttribute(){}};
  const close=guardedDialogClose(wrap,value=>closed.push(value));
  assert.equal(await runDialogSubmit({wrap,submit,cancel,error,values:{value:'2'},close,onSubmit:async values=>({...values,saved:true})}),true);
  assert.deepEqual(closed,[{value:'2',saved:true}]);
});

test('five today quick actions stay uniform at phone widths', async () => {
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/\.quick-grid\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}/);
  assert.match(css,/@media\(max-width:480px\)\{\.quick-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/);
});

test('today task exposes only complete and more as top-level actions', () => {
  const html=todayView({baby:{name:'柚柚'},primary:{id:'t1',title:'辅食',type:'meal',status:'upcoming',plannedAt:'2026-07-20T10:00:00Z'},next:null,sleepMinutes:0,timeline:[]});
  assert.equal((html.match(/data-action=/g)||[]).length,2);
  for(const action of ['complete-task','task-more']) assert.match(html,new RegExp(`data-action="${action}"`));
  for(const action of ['complete-task-keep','adjust-task','skip-task']) assert.doesNotMatch(html,new RegExp(`data-action="${action}"`));
});

test('onboarding contains labeled baby, birthday, stage and privacy fields', () => {
  const html=onboardingView();
  for(const id of ['onboarding-name','onboarding-birthday','onboarding-stage','onboarding-wake','onboarding-privacy']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/role="dialog"/); assert.match(html,/aria-modal="true"/);
});

test('onboarding offers V1 backup restore before creating a new baby', () => {
  const html=onboardingView();
  const backupIndex=html.indexOf('id="onboarding-backup"');
  const formIndex=html.indexOf('id="onboarding-form"');
  assert.ok(backupIndex>=0);
  assert.ok(backupIndex<formIndex);
  assert.match(html,/id="onboarding-backup"[^>]*accept="application\/json"/);
  assert.match(html,/恢复 V1 备份/);
  assert.match(html,/欢迎使用 V2/);
  assert.match(html,/id="onboarding-recovery-status"[^>]*role="status"[^>]*hidden/);
});

test('timeline timestamps are formatted in the selected local timezone', () => {
  assert.match(formatTimelineDate('2026-07-20T08:15:00.000Z','Asia/Shanghai'),/16:15/);
});

test('visual system includes minimum targets, focus, safe areas and dark mode', async () => {
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/min-height:44px/); assert.match(css,/safe-area-inset/); assert.match(css,/:focus-visible/); assert.match(css,/prefers-color-scheme:dark/);
});

test('meal and growth screens expose shopping, preferences and tooth actions', () => {
  const recipe={id:1,name:'南瓜饭',stage:'stage4',stageName:'咀嚼练习期',ingredients:['南瓜'],vegetable:'南瓜'};
  const meals=mealsView({week:null,recipes:[recipe],stage:'stage4',shopping:[{id:'s1',name:'南瓜',done:false,inStock:false}]});
  for(const action of ['toggle-shopping','add-shopping','favorite-recipe','dislike-food']) assert.match(meals,new RegExp(`data-action="${action}"`));
  assert.match(meals,/data-stage="stage4"/);
  assert.match(growthView({timeline:[]}),/data-growth="tooth"/);
  assert.match(chartSvg({ready:true,min:8,max:9,points:[{x:0,y:1,value:8,date:'2026-07-20'},{x:1,y:0,value:9,date:'2026-07-21'}]}),/<polyline/);
});

test('growth summary cards render accessible dates, fallbacks and strictly filtered values',()=>{
  const html=growthView({timeline:[],measurements:[
    {id:'w',date:'2026-08-14',weight:12.55},
    {id:'h',date:'2026-08-12',height:83.6}
  ],teeth:[{id:'t',date:'2026-08-13',number:8}]});
  assert.match(html,/data-growth="weight"[\s\S]*12\.55 kg[\s\S]*2026-08-14/);
  assert.match(html,/data-growth="weight"[\s\S]*<time datetime="2026-08-14">2026-08-14<\/time>/);
  assert.match(html,/data-growth="height"[\s\S]*83\.6 cm[\s\S]*2026-08-12/);
  assert.match(html,/data-growth="tooth"[\s\S]*第8颗[\s\S]*2026-08-13/);
  const empty=growthView({timeline:[],measurements:[],teeth:[]});
  assert.match(empty,/data-growth="weight"[\s\S]*添加记录/);
  assert.match(empty,/data-growth="tooth"[\s\S]*记录一颗牙/);
  const strictlyFiltered=growthView({timeline:[],measurements:[{id:'x',date:'2026-08-14',weight:{toString:()=>'<img onerror=alert(1)>'}}],teeth:[]});
  assert.match(strictlyFiltered,/data-growth="weight"[\s\S]*添加记录/);
  assert.doesNotMatch(strictlyFiltered,/<img|NaN|Infinity/);
});

test('menu tabs render sorted history ranges and normalize three meal labels',()=>{
  const current={id:'now',startDate:'2026-08-10',days:[{date:'2026-08-10',meals:[{id:'b',name:'粥'},{id:'l',name:'饭'},{id:'d',name:'面'}]}]};
  const old={id:'old',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'ol',name:'午饭'},{id:'od',name:'晚饭'}]}]};
  const html=mealsView({week:current,weeks:[old,current],menuBrowser:{mode:'current',selectedId:null,editingHistory:false}});
  assert.match(html,/data-action="menu-current"/);
  assert.match(html,/data-action="menu-history"/);
  assert.match(html,/早餐/);assert.match(html,/午餐/);assert.match(html,/晚餐/);
  assert.match(html,/2026-08-03[^<]*至[^<]*2026-08-09/);
  assert.deepEqual(current.days[0].meals.map(meal=>meal.mealType),[undefined,undefined,undefined]);
});

test('menu view keeps an earlier same-week menu as history but excludes exact-date duplicates',()=>{
  const current={id:'current',babyId:'b1',startDate:'2026-08-15',days:[]},sameDate={id:'same-date',babyId:'b1',startDate:'2026-08-15',days:[]},earlier={id:'earlier',babyId:'b1',startDate:'2026-08-13',days:[]},old={id:'old',babyId:'b1',startDate:'2026-08-03',days:[]};
  const html=mealsView({week:current,weeks:[current,sameDate,earlier,old],menuBrowser:{mode:'current'}});
  assert.doesNotMatch(html,/data-id="same-date"/);
  assert.match(html,/data-id="earlier"/);
  assert.match(html,/2026-08-15[^<]*至[^<]*2026-08-21/);
  assert.match(html,/2026-08-13[^<]*至[^<]*2026-08-19/);
  assert.match(html,/data-id="old"/);
});

test('history is read only until explicitly editing the selected week',()=>{
  const old={id:'old',startDate:'2026-08-03',days:[{date:'2026-08-03',meals:[{id:'m',name:'午饭'},{id:'d',name:'晚饭'}]}]};
  const readonly=mealsView({week:null,weeks:[old],menuBrowser:{mode:'history',selectedId:'old',editingHistory:false}});
  assert.match(readonly,/data-action="edit-history"/);
  assert.doesNotMatch(readonly,/data-action="replace-meal"|data-action="meal-status"/);
  const editable=mealsView({week:null,weeks:[old],menuBrowser:{mode:'history',selectedId:'old',editingHistory:true}});
  assert.match(editable,/data-menu-id="old"/);
  assert.match(editable,/data-action="replace-meal"/);
});

test('menu history mobile styles wrap controls and long text safely',async()=>{
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/\.menu-tabs[^}]*minmax\(0,1fr\)/s);
  assert.match(css,/\.history-list[^}]*overflow-wrap:anywhere/s);
  assert.match(css,/\.meal-type[^}]*white-space:nowrap/s);
  assert.match(css,/@media\(max-width:380px\)[\s\S]*\.meal-row[^}]*grid-template-columns:1fr/s);
});

const detailedRecipe={
  id:7001,name:'<南瓜&牛肉软饭>',stage:'stage4',stageName:'咀嚼练习期',group:'软饭',staple:'米饭',texture:'软饭',
  ingredients:['熟米饭 45g','南瓜 20g','牛肉 15g'],steps:['食材蒸熟','压拌成团'],chewingLevel:'beginner-chewing',
  sizeGuide:'成人拇指第一节大小',softnessTest:'拇指和食指可轻松压碎',fingerFood:true,allergens:[],
  substitutions:['牛肉可换鸡肉'],mealSlots:['午餐'],freezable:true,storage:'冷藏不超过 24 小时 <勿复热>',vegetable:'南瓜'
};

test('stage4 recipe browser exposes combined chewing filters and accessible details', () => {
  const html=mealsView({recipes:[detailedRecipe],stage:'stage4'});
  for(const id of ['recipe-search','recipe-stage','recipe-chewing-level','recipe-finger-food']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/<details[^>]*class="recipe-details"/);
  assert.match(html,/<summary>查看完整做法与安全提示<\/summary>/);
  for(const text of ['熟米饭 45g','食材蒸熟','成人拇指第一节大小','拇指和食指可轻松压碎','未标注常见过敏原','牛肉可换鸡肉','适合手抓','午餐','可冷冻']) assert.match(html,new RegExp(text));
  assert.match(html,/冷藏不超过 24 小时 &lt;勿复热&gt;/);
  assert.doesNotMatch(html,/<勿复热>/);
  assert.doesNotMatch(html,/<南瓜&牛肉软饭>/);
  assert.match(html,/&lt;南瓜&amp;牛肉软饭&gt;/);
});

test('legacy recipes render a useful fallback without fabricated safety claims', () => {
  const html=mealsView({recipes:[{id:2,name:'旧食谱',stage:'stage4',stageName:'咀嚼练习期',ingredients:['米饭']}],stage:'stage4'});
  assert.match(html,/旧食谱/);
  assert.match(html,/详细做法待补充/);
  assert.match(html,/尺寸指导待补充/);
  assert.match(html,/软硬度测试待补充/);
  assert.match(html,/过敏原信息待补充/);
  assert.match(html,/进食方式待补充/);
  assert.match(html,/保存方式待补充/);
});

test('legacy recipe storage is preserved while missing freezing metadata stays unknown', () => {
  const html=mealsView({recipes:[{id:3,name:'旧粥',stage:'stage4',stageName:'咀嚼练习期',ingredients:['米粥'],storage:'当天吃完 & 不隔夜'}],stage:'stage4'});
  assert.match(html,/当天吃完 &amp; 不隔夜/);
  assert.match(html,/冷冻信息待补充/);
  assert.doesNotMatch(html,/建议现做现吃/);
});

test('recipe filter combines stage, search, chewing level and finger food', () => {
  assert.equal(recipeMatchesFilters(detailedRecipe,{stage:'stage4',query:'牛肉',chewingLevel:'beginner-chewing',fingerFood:'yes'}),true);
  assert.equal(recipeMatchesFilters(detailedRecipe,{stage:'stage4',query:'牛肉',chewingLevel:'advanced-chewing',fingerFood:'yes'}),false);
  assert.equal(recipeMatchesFilters(detailedRecipe,{stage:'stage3',query:'',chewingLevel:'all',fingerFood:'all'}),false);
  assert.equal(recipeMatchesFilters(detailedRecipe,{stage:'all',query:'',chewingLevel:'all',fingerFood:'no'}),false);
  assert.equal(recipeMatchesFilters({name:'旧食谱',stage:'stage4',ingredients:[]},{stage:'stage4',query:'旧',chewingLevel:'all',fingerFood:'all'}),true);
  assert.equal(recipeMatchesFilters({name:'旧食谱',stage:'stage4',ingredients:[]},{stage:'stage4',query:'',chewingLevel:'all',fingerFood:'no'}),false);
});

test('recipe browser uses 320px-safe wrapping and overflow rules', async () => {
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/\.recipe-filter-row\s*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)[^}]*\}/s);
  assert.match(css,/\.recipe-card\s*\{[^}]*min-width\s*:\s*0[^}]*overflow-wrap\s*:\s*anywhere[^}]*\}/s);
  assert.match(css,/@media\s*\(max-width\s*:\s*380px\)\s*\{[^}]*\.recipe-filter-row\s*\{[^}]*grid-template-columns\s*:\s*1fr/s);
});

test('recipe browser limits initial detailed DOM and can request every matching recipe', () => {
  const catalog=Array.from({length:80},(_,index)=>({...detailedRecipe,id:`v2-${index}`,name:`食谱${index}`}));
  const initial=mealsView({recipes:catalog,stage:'stage4',recipeBrowser:{stage:'stage4',query:'',chewingLevel:'all',fingerFood:'all',limit:24}});
  assert.equal((initial.match(/class="recipe-card/g)||[]).length,24);
  assert.ok((initial.match(/<section>/g)||[]).length<250);
  assert.match(initial,/data-action="load-more-recipes"/);
  assert.match(initial,/显示 24 \/ 80/);
  const all=mealsView({recipes:catalog,stage:'stage4',recipeBrowser:{stage:'stage4',query:'',chewingLevel:'all',fingerFood:'all',limit:80}});
  assert.equal((all.match(/class="recipe-card/g)||[]).length,80);
  assert.doesNotMatch(all,/data-action="load-more-recipes"/);
});

test('recipe browser restores controlled filter values after a refresh render', () => {
  const html=mealsView({recipes:[detailedRecipe],stage:'stage4',recipeBrowser:{stage:'all',query:'南瓜',chewingLevel:'beginner-chewing',fingerFood:'yes',limit:24}});
  assert.match(html,/id="recipe-search"[^>]*value="南瓜"/);
  assert.match(html,/option value="all" selected>全部阶段/);
  assert.match(html,/option value="beginner-chewing" selected>咀嚼入门/);
  assert.match(html,/option value="yes" selected>手指食物/);
});

test('application owns recipe filter and paging state across refresh renders', async () => {
  const app=await readFile('src/app.js','utf8');
  assert.match(app,/let recipeBrowser=\{stage:null,query:'',chewingLevel:'all',fingerFood:'all',limit:24\}/);
  assert.match(app,/mealsView\(\{[^}]*recipeBrowser\}\)/);
  assert.match(app,/recipeBrowser=readRecipeFilters\(\)/);
  assert.match(app,/recipeBrowser=\{\.\.\.recipeBrowser,limit:recipeBrowser\.limit\+24\}/);
  assert.doesNotMatch(app,/Number\(button\.dataset\.id\)/);
});

test('malformed legacy recipe arrays never throw or inject markup', () => {
  const malformed={id:'legacy-x',name:'旧食谱',stage:'stage4',ingredients:[null,{bad:'<img src=x>'},'<script>alert(1)</script>'],steps:[null,{bad:'<b>'}],substitutions:[{}],mealSlots:[null]};
  assert.doesNotThrow(()=>mealsView({recipes:[malformed],stage:'stage4'}));
  const html=mealsView({recipes:[malformed],stage:'stage4'});
  assert.doesNotMatch(html,/<script>|<img|<b>/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('records screen preserves stable record management controls', () => {
  const html=recordsView({records:[{id:'r1',type:'milk',value:120,occurredAt:'2026-07-20T08:00:00Z'}],sleeps:[{id:'s1',startAt:'2026-07-20T08:00:00Z',endAt:'2026-07-20T09:00:00Z',durationMinutes:60}]});
  for(const action of ['edit-record','delete-record','edit-sleep','delete-sleep']) assert.match(html,new RegExp(`data-action="${action}"`));
});

test('records screen shows one sleep lifecycle action for each timer state', () => {
  const inactive=recordsView({sleeps:[]});
  assert.match(inactive,/data-action="sleep-start"/);
  assert.doesNotMatch(inactive,/data-action="sleep-end"/);
  assert.match(inactive,/data-record="sleep"/);
  const active=recordsView({sleeps:[{id:'s1',startAt:new Date(Date.now()-10*60_000).toISOString()}]});
  assert.match(active,/data-action="sleep-end"/);
  assert.doesNotMatch(active,/data-action="sleep-start"/);
  assert.match(active,/data-record="sleep"/);
});

test('mobile task and sleep controls use responsive full-size layouts', async () => {
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/\.hero-actions\s*\{[^}]*grid-template-columns\s*:\s*1fr\s+104px[^}]*\}/s);
  assert.match(css,/\.hero-actions\s+button\s*\{[^}]*min-height\s*:\s*48px[^}]*\}/s);
  assert.match(css,/\.hero-actions\s+button\s*\{[^}]*white-space\s*:\s*nowrap[^}]*\}/s);
  assert.match(css,/\.action-list\s+button\s*\{[^}]*white-space\s*:\s*nowrap[^}]*\}/s);
  assert.match(css,/\.sleep-main-action\s*\{[^}]*width\s*:\s*100%[^}]*min-height\s*:\s*50px[^}]*\}/s);
  assert.match(css,/@media\s*\(max-width\s*:\s*380px\)\s*\{[^}]*\.hero-actions\s*\{[^}]*grid-template-columns\s*:\s*1fr/s);
});

test('task action dialog resolves every explicit choice and cleans up', async () => {
  for(const choice of ['keep','adjust','skip']){
    const fake=fakeDialogDocument(),promise=openActionDialog({title:'<更多>',document:fake.document});
    assert.equal(fake.wrap.querySelector('h2').textContent,'<更多>');
    fake.wrap.choices.find(button=>button.dataset.value===choice).onclick();
    assert.equal(await promise,choice);
    assert.equal(fake.wrap.removed,true);
  }
});

test('task action dialog cancels from button, backdrop and Escape without leaking listeners', async () => {
  for(const cancel of ['button','backdrop','escape']){
    const fake=fakeDialogDocument();
    let activeKeydown=0;
    const add=fake.document.addEventListener.bind(fake.document),remove=fake.document.removeEventListener.bind(fake.document);
    fake.document.addEventListener=(type,listener)=>{if(type==='keydown')activeKeydown++;add(type,listener)};
    fake.document.removeEventListener=(type,listener)=>{if(type==='keydown')activeKeydown--;remove(type,listener)};
    const promise=openActionDialog({title:'更多',document:fake.document});
    if(cancel==='button')fake.wrap.querySelector('[data-cancel]').onclick();
    if(cancel==='backdrop')fake.wrap.dispatchEvent(new Event('click'));
    if(cancel==='escape'){const event=new Event('keydown');Object.defineProperty(event,'key',{value:'Escape'});fake.document.dispatchEvent(event)}
    assert.equal(await promise,null);
    assert.equal(fake.wrap.removed,true);
    assert.equal(activeKeydown,0);
    fake.wrap.querySelector('[data-cancel]').onclick();
    assert.equal(activeKeydown,0);
  }
});

test('task action dialog labels the modal, traps focus and restores the opener', async () => {
  const fake=fakeDialogDocument();
  let activeKeydown=0;
  const add=fake.document.addEventListener.bind(fake.document),remove=fake.document.removeEventListener.bind(fake.document);
  fake.document.addEventListener=(type,listener)=>{if(type==='keydown')activeKeydown++;add(type,listener)};
  fake.document.removeEventListener=(type,listener)=>{if(type==='keydown')activeKeydown--;remove(type,listener)};
  const promise=openActionDialog({title:'更多操作',document:fake.document});
  const title=fake.wrap.querySelector('h2'),dialog=fake.wrap.querySelector('[role="dialog"]');
  assert.ok(title.id);
  assert.equal(dialog.getAttribute('aria-labelledby'),title.id);
  assert.equal(fake.document.activeElement,fake.wrap.buttons[0]);
  fake.wrap.buttons.at(-1).focus();
  const tabForward=new Event('keydown');Object.defineProperties(tabForward,{key:{value:'Tab'},shiftKey:{value:false}});fake.document.dispatchEvent(tabForward);
  assert.equal(fake.document.activeElement,fake.wrap.buttons[0]);
  fake.wrap.buttons[0].focus();
  const tabBackward=new Event('keydown');Object.defineProperties(tabBackward,{key:{value:'Tab'},shiftKey:{value:true}});fake.document.dispatchEvent(tabBackward);
  assert.equal(fake.document.activeElement,fake.wrap.buttons.at(-1));
  fake.wrap.querySelector('[data-cancel]').onclick();
  assert.equal(await promise,null);
  assert.equal(fake.document.activeElement,fake.trigger);
  assert.equal(activeKeydown,0);
});

test('task action handlers are shared and obsolete top-level bindings are removed', async () => {
  const app=await readFile('src/app.js','utf8');
  for(const name of ['handleCompleteKeep','handleAdjustTask','handleSkipTask']) assert.match(app,new RegExp(`function ${name}\\(`));
  for(const action of ['complete-task-keep','adjust-task','skip-task']) assert.doesNotMatch(app,new RegExp(`querySelectorAll\\('\\[data-action="${action}"\\]'\\)`));
});

test('sleep history labels known sleep types and preserves a fallback for legacy records', () => {
  const html=recordsView({sleeps:[
    {id:'night',type:'night',startAt:'2026-07-20T08:00:00Z',endAt:'2026-07-20T09:00:00Z',durationMinutes:60},
    {id:'nap',type:'nap',startAt:'2026-07-20T10:00:00Z',endAt:'2026-07-20T11:00:00Z',durationMinutes:60},
    {id:'legacy',startAt:'2026-07-20T12:00:00Z',endAt:'2026-07-20T13:00:00Z',durationMinutes:60}
  ]});
  assert.match(html,/夜间睡眠/);
  assert.match(html,/午间小睡/);
  assert.match(html,/睡眠记录/);
});

test('datetime-local formatter uses local date fields instead of UTC slicing', () => {
  const localDate=new Date(2026,6,20,16,15);
  assert.equal(formatDateTimeLocal(localDate),'2026-07-20T16:15');
});

test('records screen manages food observations and reminders after creation', () => {
  const html=recordsView({observations:[{id:'f1',name:'南瓜',observeUntil:'2026-07-22'}],reminders:[{id:'m1',title:'体检',dueDate:'2026-07-25'}]});
  for(const action of ['add-reaction','delete-observation','complete-reminder','delete-reminder']) assert.match(html,new RegExp(`data-action="${action}"`));
});

test('schedule editor supports enabling rules and adding a custom item', async () => {
  const app=await readFile('src/app.js','utf8');
  for(const field of ['customTitle','customType','customAfter','enabled-']) assert.ok(app.includes(field),field);
  assert.doesNotMatch(app,/name="napToMealMinutes"/);
  assert.doesNotMatch(app,/午睡结束后多久吃辅食（分钟）/);
});

test('new schedule templates omit the retired nap-to-meal setting', () => {
  assert.equal(Object.hasOwn(createDefaultTemplate('baby-1'),'napToMealMinutes'),false);
});

test('sleep dialogs choose a type and completed flows share schedule recalculation', async () => {
  const app=await readFile('src/app.js','utf8');
  assert.match(app,/name="type"[\s\S]*value="nap"[\s\S]*value="night"/);
  assert.match(app,/async function saveSleepAndRecalculate/);
  assert.match(app,/sleep-end[\s\S]*saveSleepAndRecalculate/);
  assert.match(app,/edit-sleep[\s\S]*saveSleepAndRecalculate/);
  assert.match(app,/if\(type==='sleep'\)[\s\S]*saveSleepAndRecalculate/);
});

test('growth timeline exposes filterable event types', () => {
  const html=growthView({timeline:[{type:'sleep',date:'2026-07-20',title:'睡眠'}]});
  assert.match(html,/data-type="sleep"/); assert.match(html,/value="sleep"/); assert.match(html,/value="task"/);
});

test('settings page exposes a shrinkable mobile-safe content scope',async()=>{
  const html=settingsView({baby:{id:'baby-1'},babies:[{id:'baby-1',name:'一段很长很长的宝宝名字用于验证窄屏'}]});
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(html,/class="page-stack settings-page"/);
  assert.match(css,/\.app-shell\{[^}]*width:min\(100%,760px\)[^}]*\}/);
  assert.match(css,/\.settings-page\{[^}]*min-width:0[^}]*overflow-wrap:anywhere[^}]*\}/);
  assert.match(css,/\.settings-page[^}]* select[^}]*max-width:100%[^}]*min-width:0[^}]*\}/);
  assert.match(css,/\.settings-page \.button-row>\*\{[^}]*min-width:0[^}]*max-width:100%[^}]*white-space:normal[^}]*\}/);
  assert.match(css,/\.settings-page \.file-button\{[^}]*min-height:44px[^}]*\}/);
  assert.doesNotMatch(await readFile('index.html','utf8'),/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
});

test('complete timeline keeps its native filter and scrolls inside a touch region',async()=>{
  const html=growthView({timeline:Array.from({length:8},(_,index)=>({type:'sleep',date:`2026-07-${20-index}`,title:`睡眠记录 ${index}`}))});
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(html,/<select id="timeline-filter">[\s\S]*<option value="water">/);
  assert.match(html,/class="timeline timeline-scroll"/);
  assert.match(css,/#timeline-filter\{[^}]*min-height:44px[^}]*max-width:100%[^}]*min-width:0[^}]*touch-action:manipulation[^}]*\}/);
  assert.match(css,/\.timeline-scroll\{[^}]*max-height:[^;}]+[^}]*overflow-y:auto[^}]*overflow-x:hidden[^}]*-webkit-overflow-scrolling:touch[^}]*overscroll-behavior:contain[^}]*\}/);
});

test('weight entry accepts two decimal kilograms while height keeps decimal precision', async () => {
  const app=await readFile('src/app.js','utf8');
  assert.match(app,/field==='weight'\?'0\.01':'0\.1'/);
});

test('growth screen renders a supplied daily lifestyle trend model',()=>{
  const html=growthView({timeline:[],trend:{metric:'sleep',days:7,unit:'小时',average:0,delta:null,points:[]}});
  assert.match(html,/id="daily-trends"/);
  assert.match(html,/data-trend-metric="sleep"/);
  assert.match(html,/data-trend-days="7"/);
});

test('growth screen keeps the rest of the page usable when trend loading fails',()=>{
  const html=growthView({timeline:[],trendError:'趋势数据读取失败'});
  assert.match(html,/role="status"/);
  assert.match(html,/趋势数据读取失败/);
  assert.match(html,/id="growth-chart"/);
});

test('app binds trend metric and range controls without changing route',async()=>{
  const app=await readFile('src/app.js','utf8');
  assert.match(app,/data-trend-metric/);
  assert.match(app,/data-trend-days/);
  assert.match(app,/trendState\.setMetric/);
  assert.match(app,/trendState\.setDays/);
  const importHandler=app.match(/async function importData\(event\)\{[^\n]+/)?.[0]||'';
  assert.match(importHandler,/importBackup[\s\S]*trendState\.reset\(\)[\s\S]*refresh/);
  const deleteHandler=app.match(/async function deleteBaby\(\)\{[^\n]+/)?.[0]||'';
  assert.match(deleteHandler,/setActiveBaby|activeBabyId|appSettings/);
  assert.match(deleteHandler,/trendState\.reset\(\)[\s\S]*refresh/);
});
