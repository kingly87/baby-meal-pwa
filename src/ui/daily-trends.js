import{esc}from'./render.js';

const METRICS={sleep:{label:'睡眠',unit:'小时'},milk:{label:'奶量',unit:'ml'},stool:{label:'便便',unit:'次'},urine:{label:'尿尿',unit:'次'}};
const RANGES=[7,14,30];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const number=value=>Number.isInteger(value)?String(value):String(Math.round(value*100)/100);

function safeModel(source){
  const model=source&&typeof source==='object'?source:{};
  const metric=METRICS[model.metric]?model.metric:'sleep';
  const days=RANGES.includes(model.days)?model.days:7;
  const points=Array.isArray(model.points)?model.points.filter(point=>point&&typeof point==='object').map(point=>({date:typeof point.date==='string'?point.date:'',value:finite(point.value)&&point.value>=0?point.value:0,hasData:point.hasData===true&&finite(point.value)&&point.value>=0})):[];
  return{metric,days,points,average:finite(model.average)?model.average:null,delta:finite(model.delta)?model.delta:null};
}
function dateLabel(value){const match=/^\d{4}-(\d{2})-(\d{2})$/.exec(value);return match?`${Number(match[1])}月${Number(match[2])}日`:'日期未知'}
function metricControls(selected){return`<div class="trend-metrics" role="group" aria-label="生活趋势指标">${Object.entries(METRICS).map(([key,item])=>`<button type="button" data-trend-metric="${key}" aria-pressed="${key===selected}">${item.label}</button>`).join('')}</div>`}
function rangeControls(selected){return`<div class="trend-ranges" role="group" aria-label="趋势时间范围">${RANGES.map(days=>`<button type="button" data-trend-days="${days}" aria-pressed="${days===selected}">${days}天</button>`).join('')}</div>`}
function barChart(model,definition){
  const maximum=Math.max(0,...model.points.filter(point=>point.hasData).map(point=>point.value)),labelStep=Math.max(1,Math.ceil(model.points.length/6));
  const bars=model.points.map((point,index)=>{const label=dateLabel(point.date),valueLabel=point.hasData?`${number(point.value)} ${definition.unit}`:'无数据',height=point.hasData&&maximum>0?Math.round(point.value/maximum*100):0,showDate=index===0||index===model.points.length-1||index%labelStep===0;return`<button type="button" class="trend-bar" aria-label="${esc(label)}，${esc(valueLabel)}" data-missing="${!point.hasData}"><span class="trend-bar-track"><span class="trend-bar-fill" style="height:${height}%" aria-hidden="true"></span>${point.hasData?'':'<span class="trend-missing-mark" aria-hidden="true">—</span>'}</span>${showDate?`<span class="trend-date" aria-hidden="true">${esc(label.replace('月','/').replace('日',''))}</span>`:'<span class="trend-date-placeholder" aria-hidden="true"></span>'}</button>`}).join('');
  if(!bars)return'<div class="trend-chart-empty">这段时间还没有记录</div>';
  return`<div class="trend-scroll"><span class="visually-hidden" role="img" aria-label="${definition.label}最近 ${model.days} 天趋势图"></span><div class="trend-chart" role="group" aria-label="每日数据柱" style="--trend-count:${model.points.length}">${bars}</div></div>`;
}
function summary(model,unit){const average=model.average==null?'平均 暂无数据':`平均 ${number(model.average)} ${unit}`;let comparison=`前 ${model.days} 天暂无可比较数据`;if(model.delta===0)comparison=`与前 ${model.days} 天持平`;else if(model.delta!=null)comparison=`比前 ${model.days} 天${model.delta>0?'增加':'减少'} ${number(Math.abs(model.delta))} ${unit}`;return`<div class="trend-summary"><strong>${average}</strong><span>${comparison}</span></div>`}
export function dailyTrendChart(source){const model=safeModel(source),definition=METRICS[model.metric];return`<div class="daily-trend-widget">${metricControls(model.metric)}<div class="trend-heading"><div><span class="label">每日对比</span><h3>${definition.label}</h3></div>${rangeControls(model.days)}</div>${barChart(model,definition)}${summary(model,definition.unit)}</div>`}
