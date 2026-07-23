import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { todayView } from '../src/ui/today.js';
import { formatTimelineDate } from '../src/ui/render.js';
import { onboardingView } from '../src/ui/onboarding.js';
import { mealsView } from '../src/ui/meals.js';
import { growthView, chartSvg } from '../src/ui/growth.js';
import { recordsView } from '../src/ui/records.js';
import { formatDateTimeLocal } from '../src/app.js';

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
  assert.match(css,/\.sleep-main-action\s*\{[^}]*width\s*:\s*100%[^}]*min-height\s*:\s*50px[^}]*\}/s);
  assert.match(css,/@media\s*\(max-width\s*:\s*380px\)\s*\{[^}]*\.hero-actions\s*\{[^}]*grid-template-columns\s*:\s*1fr/s);
});

test('task action dialog exposes three explicit choices', async () => {
  const dialogs=await readFile('src/ui/dialogs.js','utf8');
  assert.match(dialogs,/export function openActionDialog/);
  for(const value of ['keep','adjust','skip']) assert.match(dialogs,new RegExp(`data-value=["'\`]${value}["'\`]`));
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
