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
function compactDate(label){return label==='日期未知'?label:label.replace('月','/').replace('日','')}
function metricControls(selected){return`<div class="trend-metrics" role="group" aria-label="生活趋势指标">${Object.entries(METRICS).map(([key,item])=>`<button type="button" data-trend-metric="${key}" aria-pressed="${key===selected}">${item.label}</button>`).join('')}</div>`}
function rangeControls(selected){return`<div class="trend-ranges" role="group" aria-label="趋势时间范围">${RANGES.map(days=>`<button type="button" data-trend-days="${days}" aria-pressed="${days===selected}">${days}天</button>`).join('')}</div>`}
function barChart(model,definition){
  const maximum=Math.max(0,...model.points.filter(point=>point.hasData).map(point=>point.value));
  const slotWidth=44,chartHeight=214,barTop=34,barHeight=140,width=model.days===7?'100%':String(Math.max(model.days,model.points.length)*slotWidth),viewWidth=model.days===7?308:Math.max(model.days,model.points.length)*slotWidth;
  const bars=model.points.map((point,index)=>{
    const label=dateLabel(point.date),visibleValue=point.hasData?number(point.value):'—',valueLabel=point.hasData?`${visibleValue} ${definition.unit}`:'无数据',accessible=`${label}，${valueLabel}`;
    const height=point.hasData&&maximum>0?Math.round(point.value/maximum*barHeight):0,x=index*slotWidth,fillY=barTop+barHeight-height,valueY=Math.max(18,fillY-7);
    const valueFit=visibleValue.length>6?' textLength="36" lengthAdjust="spacingAndGlyphs"':'';
    return`<g class="trend-bar" tabindex="0" role="img" aria-label="${esc(accessible)}" data-missing="${!point.hasData}"><title>${esc(accessible)}</title><rect class="trend-hit-target" x="${x}" y="0" width="44" height="214"/><text class="trend-value" x="${x+22}" y="${point.hasData?valueY:24}"${valueFit}>${esc(visibleValue)}</text><rect class="trend-bar-track" x="${x+13}" y="${barTop}" width="18" height="${barHeight}" rx="7"/>${point.hasData?`<rect class="trend-bar-fill" x="${x+13}" y="${fillY}" width="18" height="${height}" rx="7"/>`:`<rect class="trend-missing-mark" x="${x+13}" y="${barTop}" width="18" height="${barHeight}" rx="7"/>`}<text class="trend-date" x="${x+22}" y="202">${esc(compactDate(label))}</text></g>`;
  }).join('');
  if(!bars)return'<div class="trend-chart-empty">这段时间还没有记录</div>';
  return`<div class="trend-scroll" data-range="${model.days}"><svg class="trend-chart" role="group" aria-label="${definition.label}最近 ${model.days} 天趋势图" width="${width}" height="${chartHeight}" viewBox="0 0 ${viewWidth} ${chartHeight}">${bars}</svg></div>`;
}
function summary(model,unit){const average=model.average==null?'平均 暂无数据':`平均 ${number(model.average)} ${unit}`;let comparison=`前 ${model.days} 天暂无可比较数据`;if(model.delta===0)comparison=`与前 ${model.days} 天持平`;else if(model.delta!=null)comparison=`比前 ${model.days} 天${model.delta>0?'增加':'减少'} ${number(Math.abs(model.delta))} ${unit}`;return`<div class="trend-summary"><strong>${average}</strong><span>${comparison}</span></div>`}
export function dailyTrendChart(source){const model=safeModel(source),definition=METRICS[model.metric];return`<div class="daily-trend-widget">${metricControls(model.metric)}<div class="trend-heading"><div><span class="label">每日对比</span><h3>${definition.label}</h3></div>${rangeControls(model.days)}</div>${barChart(model,definition)}${summary(model,definition.unit)}</div>`}
