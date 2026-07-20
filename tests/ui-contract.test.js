import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { todayView } from '../src/ui/today.js';
import { onboardingView } from '../src/ui/onboarding.js';

test('today view exposes current, next, sleep, quick actions and timeline regions', () => {
  const html=todayView({baby:{name:'柚柚'},primary:null,next:null,sleepMinutes:0,timeline:[]});
  for(const id of ['current-task-card','next-task-card','sleep-summary','quick-actions','today-timeline']) assert.match(html,new RegExp(`id="${id}"`));
});

test('onboarding contains labeled baby, birthday, stage and privacy fields', () => {
  const html=onboardingView();
  for(const id of ['onboarding-name','onboarding-birthday','onboarding-stage','onboarding-privacy']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/role="dialog"/); assert.match(html,/aria-modal="true"/);
});

test('visual system includes minimum targets, focus, safe areas and dark mode', async () => {
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/min-height:44px/); assert.match(css,/safe-area-inset/); assert.match(css,/:focus-visible/); assert.match(css,/prefers-color-scheme:dark/);
});
