import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dailyTrendChart } from '../src/ui/daily-trends.js';

const model={
  metric:'sleep',days:7,average:11.5,delta:.4,
  points:[
    {date:'2026-08-01',value:11.3,hasData:true},
    {date:'2026-08-02',value:0,hasData:false},
    {date:'2026-08-03',value:0,hasData:true}
  ]
};

test('labels every point with its value and compact date, preserving missing and real zero',()=>{
  const html=dailyTrendChart(model);
  assert.match(html,/aria-label="生活趋势指标"/);
  assert.match(html,/data-trend-metric="sleep"[^>]*aria-pressed="true"/);
  assert.match(html,/data-trend-metric="milk"[^>]*aria-pressed="false"/);
  assert.match(html,/data-trend-days="7"[^>]*aria-pressed="true"/);
  assert.match(html,/data-trend-days="14"[^>]*aria-pressed="false"/);
  assert.equal((html.match(/class="trend-value"/g)||[]).length,3);
  assert.equal((html.match(/class="trend-date"/g)||[]).length,3);
  assert.match(html,/<text class="trend-value"[^>]*>11\.3<\/text>/);
  assert.match(html,/<text class="trend-value"[^>]*>—<\/text>/);
  assert.match(html,/<text class="trend-value"[^>]*>0<\/text>/);
  for(const date of ['8/1','8/2','8/3'])assert.match(html,new RegExp(`class="trend-date"[^>]*>${date.replace('/','\\/')}<\\/text>`));
  assert.match(html,/aria-label="8月1日，11\.3 小时"/);
  assert.match(html,/aria-label="8月2日，无数据"[^>]*data-missing="true"/);
  assert.match(html,/aria-label="8月3日，0 小时"[^>]*data-missing="false"/);
  assert.match(html,/<title>8月1日，11\.3 小时<\/title>/);
  assert.match(html,/<g class="trend-bar"[^>]*tabindex="0"[^>]*role="img"/);
  assert.match(html,/<rect class="trend-hit-target"[^>]*width="44"/);
  assert.match(html,/class="trend-missing-mark"/);
  assert.match(html,/class="trend-bar-fill"[^>]*height="0"/);
  assert.doesNotMatch(html,/role="graphics-symbol"/);
});

test('uses a responsive seven-day viewBox and scrollable 44px slots for longer ranges',()=>{
  const points=days=>Array.from({length:days},(_,index)=>({date:`2026-08-${String(index+1).padStart(2,'0')}`,value:index,hasData:true}));
  const seven=dailyTrendChart({...model,points:points(7)});
  assert.match(seven,/<div class="trend-scroll" data-range="7">/);
  assert.match(seven,/<svg[^>]*width="100%"[^>]*viewBox="0 0 308 214"/);
  for(const days of [14,30]){
    const html=dailyTrendChart({...model,days,points:points(days)});
    assert.match(html,new RegExp(`<div class="trend-scroll" data-range="${days}">`));
    assert.match(html,new RegExp(`width="${days*44}"`));
    assert.equal((html.match(/class="trend-bar"/g)||[]).length,days);
    assert.equal((html.match(/class="trend-value"/g)||[]).length,days);
    assert.equal((html.match(/class="trend-date"/g)||[]).length,days);
  }
});

test('keeps metric units in chart accessibility and summaries',()=>{
  for(const [metric,label,unit] of [['sleep','睡眠','小时'],['milk','奶量','ml'],['stool','便便','次'],['urine','尿尿','次']]){
    const html=dailyTrendChart({...model,metric});
    assert.match(html,new RegExp(`aria-label="${label}最近 7 天趋势图"`));
    assert.match(html,new RegExp(`aria-label="8月1日，11\\.3 ${unit}"`));
    assert.match(html,new RegExp(`平均 11\\.5 ${unit}`));
    assert.match(html,new RegExp(`增加 0\\.4 ${unit}`));
  }
  assert.match(dailyTrendChart({...model,metric:'milk',delta:-12}),/比前 7 天减少 12 ml/);
  assert.match(dailyTrendChart({...model,metric:'stool',delta:0}),/与前 7 天持平/);
  assert.match(dailyTrendChart({...model,average:null,delta:null}),/平均 暂无数据/);
});

test('escapes hostile point content and excludes non-finite labels',()=>{
  const html=dailyTrendChart({metric:'<img src=x>',days:999,average:Infinity,delta:NaN,points:[
    {date:'<script>alert(1)</script>',value:Infinity,hasData:true},
    {date:'2026-08-02',value:-1,hasData:true}
  ]});
  assert.doesNotMatch(html,/<img|<script|NaN|Infinity/);
  assert.equal((html.match(/class="trend-value"/g)||[]).length,2);
  assert.match(html,/>—<\/text>/);
  assert.match(html,/data-trend-metric="sleep"[^>]*aria-pressed="true"/);
  assert.match(dailyTrendChart({...model,points:[{date:'2026-08-01',value:12345.67,hasData:true}]}),/>12345\.67<\/text>/);
  assert.doesNotThrow(()=>dailyTrendChart());
});

test('styles readable value labels, seven-day fitting and explicit horizontal scrolling',async()=>{
  const css=await readFile('assets/styles/app.css','utf8');
  assert.match(css,/\.trend-scroll\{[^}]*overflow-x:auto/s);
  assert.match(css,/\.trend-scroll\[data-range="7"\]\{[^}]*overflow-x:hidden/s);
  assert.match(css,/\.trend-scroll\[data-range="7"\] \.trend-chart\{[^}]*width:100%/s);
  assert.match(css,/\.trend-value\{[^}]*font-size:[^;}]+[^}]*text-anchor:middle/s);
  assert.match(css,/\.trend-date\{[^}]*font-size:[^;}]+[^}]*text-anchor:middle/s);
  assert.match(css,/\.trend-missing-mark\{[^}]*stroke-dasharray/s);
  assert.match(css,/\.trend-bar:focus[^}]*\.trend-hit-target\{[^}]*stroke:/s);
  assert.match(css,/\.trend-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.ok(css.includes('.visually-hidden'));
});
