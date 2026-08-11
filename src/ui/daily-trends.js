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
  const width=Math.max(308,model.points.length*44),barTop=10,barHeight=140;
  const bars=model.points.map((point,index)=>{
    const label=dateLabel(point.date),valueLabel=point.hasData?`${number(point.value)} ${definition.unit}`:'无数据',accessible=`${label}，${valueLabel}`;
    const height=point.hasData&&maximum>0?Math.round(point.value/maximum*barHeight):0,x=index*44,fillY=barTop+barHeight-height,showDate=index===0||index===model.points.length-1||index%labelStep===0;
    return`<g class="trend-bar" tabindex="0" role="graphics-symbol" aria-label="${esc(accessible)}" data-missing="${!point.hasData}"><title>${esc(accessible)}</title><rect class="trend-hit-target" x="${x}" y="0" width="44" height="190"/><rect class="trend-bar-track" x="${x+13}" y="${barTop}" width="18" height="${barHeight}" rx="7"/>${point.hasData?`<rect class="trend-bar-fill" x="${x+13}" y="${fillY}" width="18" height="${height}" rx="7"/>`:`<rect class="trend-missing-mark" x="${x+13}" y="${barTop}" width="18" height="${barHeight}" rx="7"/><text class="trend-missing-text" x="${x+22}" y="82">—</text>`}${showDate?`<text class="trend-date" x="${x+22}" y="174">${esc(label.replace('月','/').replace('日',''))}</text>`:''}</g>`;
  }).join('');
  if(!bars)return'<div class="trend-chart-empty">这段时间还没有记录</div>';
  return`<div class="trend-scroll"><svg class="trend-chart" role="img" aria-label="${definition.label}最近 ${model.days} 天趋势图" width="${width}" height="190" viewBox="0 0 ${width} 190">${bars}</svg></div>`;
}
function summary(model,unit){const average=model.average==null?'平均 暂无数据':`平均 ${number(model.average)} ${unit}`;let comparison=`前 ${model.days} 天暂无可比较数据`;if(model.delta===0)comparison=`与前 ${model.days} 天持平`;else if(model.delta!=null)comparison=`比前 ${model.days} 天${model.delta>0?'增加':'减少'} ${number(Math.abs(model.delta))} ${unit}`;return`<div class="trend-summary"><strong>${average}</strong><span>${comparison}</span></div>`}
export function dailyTrendChart(source){const model=safeModel(source),definition=METRICS[model.metric];return`<div class="daily-trend-widget">${metricControls(model.metric)}<div class="trend-heading"><div><span class="label">每日对比</span><h3>${definition.label}</h3></div>${rangeControls(model.days)}</div>${barChart(model,definition)}${summary(model,definition.unit)}</div>`}
