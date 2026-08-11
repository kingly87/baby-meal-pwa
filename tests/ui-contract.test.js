import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { todayView } from '../src/ui/today.js';
import { formatTimelineDate } from '../src/ui/render.js';
import { onboardingView } from '../src/ui/onboarding.js';
import { mealsView, recipeMatchesFilters } from '../src/ui/meals.js';
import { growthView, chartSvg } from '../src/ui/growth.js';
import { recordsView } from '../src/ui/records.js';
import { formatDateTimeLocal } from '../src/app.js';
import { openActionDialog } from '../src/ui/dialogs.js';

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
  const recipe={id:1,name:'南瓜饭',stage:'stage4',stageName:'咀嚼练习期',ingredients:['南瓜']};
  const meals=mealsView({week:null,recipes:[recipe],stage:'stage4',shopping:[{id:'s1',name:'南瓜',done:false,inStock:false}]});
  for(const action of ['toggle-shopping','add-shopping','favorite-recipe','dislike-food']) assert.match(meals,new RegExp(`data-action="${action}"`));
  assert.match(meals,/data-stage="stage4"/);
  assert.match(growthView({timeline:[]}),/data-growth="tooth"/);
  assert.match(chartSvg({ready:true,min:8,max:9,points:[{x:0,y:1,value:8,date:'2026-07-20'},{x:1,y:0,value:9,date:'2026-07-21'}]}),/<polyline/);
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
  for(const field of ['customTitle','customType','customAfter','enabled-','napToMealMinutes']) assert.ok(app.includes(field),field);
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
