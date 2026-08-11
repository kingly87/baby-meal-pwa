import{esc,formatTimelineDate}from'./render.js';
import{dailyTrendChart}from'./daily-trends.js';

export function chartSvg(model){
  if(!model?.ready)return'<div class="chart-empty">至少记录两次后显示趋势。</div>';
  const width=680,height=230,pad=36,points=model.points.map(point=>`${pad+point.x*(width-pad*2)},${pad+point.y*(height-pad*2)}`).join(' ');
  return`<svg class="growth-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="成长趋势图"><line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}"/><polyline points="${points}"/>${model.points.map(point=>{const x=pad+point.x*(width-pad*2),y=pad+point.y*(height-pad*2);return`<circle cx="${x}" cy="${y}" r="5"/><text x="${x}" y="${y-12}">${point.value}</text>`}).join('')}</svg>`;
}

export function growthView({timeline=[],chart,trend}={}){
  const trendSection=trend?`<section id="daily-trends" class="panel"><div class="section-heading"><h2>生活趋势</h2></div>${dailyTrendChart(trend)}</section>`:'';
  return`<div class="page-stack"><section class="page-title"><p class="eyebrow">成长轨迹</p><h2>慢慢长大的每一天</h2></section><div class="feature-grid"><button class="summary-card action" data-growth="weight"><span class="label">体重</span><strong>添加记录</strong></button><button class="summary-card action" data-growth="height"><span class="label">身高</span><strong>添加记录</strong></button><button class="summary-card action" data-growth="tooth"><span class="label">长牙</span><strong>记录一颗牙</strong></button></div>${trendSection}<section class="panel"><div class="section-heading"><h2>成长曲线</h2><select id="chart-type"><option value="weight">体重</option><option value="height">身高</option></select></div><div id="growth-chart">${chartSvg(chart)}</div></section><section class="panel"><div class="section-heading"><h2>完整时间线</h2><select id="timeline-filter"><option value="all">全部</option><option value="growth">成长</option><option value="tooth">长牙</option><option value="new-food">新食材</option><option value="sleep">睡眠</option><option value="task">作息事项</option><option value="milk">喝奶</option><option value="water">喝水</option></select></div><div class="timeline">${timeline.map(item=>`<article data-type="${esc(item.type)}"><time>${esc(formatTimelineDate(item.date))}</time><p>${esc(item.title)}</p></article>`).join('')||'<div class="empty">还没有成长记录。</div>'}</div></section></div>`;
}
