import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dailyTrendChart } from '../src/ui/daily-trends.js';

const model={
  metric:'sleep',days:7,unit:'小时',average:11.5,previousAverage:11.1,delta:.4,
  points:[
    {date:'2026-08-01',value:11,hasData:true},
    {date:'2026-08-02',value:0,hasData:false},
    {date:'2026-08-03',value:0,hasData:true}
  ]
};

test('renders the approved single metric controls and accessible bars',()=>{
  const html=dailyTrendChart(model);
  assert.match(html,/aria-label="生活趋势指标"/);
  assert.match(html,/data-trend-metric="sleep"[^>]*aria-pressed="true"/);
  assert.match(html,/data-trend-metric="milk"[^>]*aria-pressed="false"/);
  assert.match(html,/data-trend-days="7"[^>]*aria-pressed="true"/);
  assert.match(html,/data-trend-days="14"[^>]*aria-pressed="false"/);
  assert.match(html,/<svg[^>]*class="trend-chart"[^>]*role="group"[^>]*aria-label="睡眠最近 7 天趋势图"/);
  assert.match(html,/<g class="trend-bar"[^>]*tabindex="0"[^>]*role="img"/);
  assert.doesNotMatch(html,/role="graphics-symbol"/);
  assert.match(html,/<rect class="trend-hit-target"[^>]*width="44"/);
  assert.match(html,/<title>8月1日，11 小时<\/title>/);
  assert.match(html,/aria-label="8月1日，11 小时"/);
  assert.match(html,/aria-label="8月2日，无数据"[^>]*data-missing="true"/);
  assert.match(html,/aria-label="8月3日，0 小时"[^>]*data-missing="false"/);
});

test('shows average and signed period delta with the selected unit',()=>{
  const html=dailyTrendChart(model);
  assert.match(html,/平均 11\.5 小时/);
  assert.match(html,/比前 7 天增加 0\.4 小时/);
  assert.match(dailyTrendChart({...model,metric:'milk',unit:'ml',delta:-12}),/比前 7 天减少 12 ml/);
  assert.match(dailyTrendChart({...model,metric:'stool',unit:'次',delta:0}),/与前 7 天持平/);
  assert.match(dailyTrendChart({...model,average:null,delta:null}),/平均 暂无数据/);
});

test('handles all-zero, malformed and hostile input without crashing or injecting markup',()=>{
  const zero=dailyTrendChart({...model,metric:'urine',unit:'次',average:0,delta:null,points:[{date:'2026-08-01',value:0,hasData:true}]});
  assert.match(zero,/class="trend-bar-fill"[^>]*height="0"/);
  assert.doesNotMatch(zero,/NaN|Infinity/);
  const malformed=dailyTrendChart({metric:'<img src=x onerror=alert(1)>',days:999,unit:'<b>x<\/b>',points:[null,{date:'<x>',value:'bad',hasData:true}]});
  assert.doesNotMatch(malformed,/<img|<b>|<x>/);
  assert.match(malformed,/data-trend-metric="sleep"[^>]*aria-pressed="true"/);
  assert.doesNotThrow(()=>dailyTrendChart());
});

test('limits dense date labels while retaining every bar',()=>{
  const points=Array.from({length:30},(_,index)=>({date:`2026-08-${String(index+1).padStart(2,'0')}`,value:index,hasData:true}));
  const html=dailyTrendChart({...model,days:30,points});
  assert.equal((html.match(/<g class="trend-bar"/g)||[]).length,30);
  assert.ok((html.match(/class="trend-date"/g)||[]).length<=7);
  assert.equal((html.match(/<title>8月/g)||[]).length,30);
  assert.match(html,/width="1320"/);
});

test('uses phone-safe wrapping, scroll containment and non-color missing marks',async()=>{
  const css=await readFile('assets/styles/app.css','utf8');
  for(const token of ['overflow-x:auto','max-width:380px','.trend-missing-mark','stroke-dasharray','.visually-hidden'])assert.ok(css.includes(token),token);
  assert.match(css,/\.trend-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
