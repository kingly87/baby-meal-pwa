import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { todayView } from '../src/ui/today.js';
import { formatTimelineDate } from '../src/ui/render.js';
import { onboardingView } from '../src/ui/onboarding.js';
import { mealsView } from '../src/ui/meals.js';
import { growthView, chartSvg } from '../src/ui/growth.js';

test('today view exposes current, next, sleep, quick actions and timeline regions', () => {
  const html=todayView({baby:{name:'柚柚'},primary:null,next:null,sleepMinutes:0,timeline:[]});
  for(const id of ['current-task-card','next-task-card','sleep-summary','quick-actions','today-timeline']) assert.match(html,new RegExp(`id="${id}"`));
});

test('today task offers cascade, keep-later and manual adjustment controls', () => {
  const html=todayView({baby:{name:'柚柚'},primary:{id:'t1',title:'辅食',type:'meal',status:'upcoming',plannedAt:'2026-07-20T10:00:00Z'},next:null,sleepMinutes:0,timeline:[]});
  for(const action of ['complete-task','complete-task-keep','adjust-task']) assert.match(html,new RegExp(`data-action="${action}"`));
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
