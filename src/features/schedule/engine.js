import { addMinutes } from '../../core/dates.js';
import { validateTemplate } from './template.js';

export function generateTasks({ babyId, date, wakeAt, template, createId }) {
  validateTemplate(template);
  if (template.babyId !== babyId) throw new Error('作息模板不属于当前宝宝');
  let base = wakeAt;
  return template.rules.map((rule, index) => {
    const plannedAt = index === 0 ? wakeAt : addMinutes(base, rule.afterMinutes);
    base = plannedAt;
    return { id: createId(), babyId, date, type: rule.type, title: rule.title, plannedAt, actualAt: index === 0 ? wakeAt : null, status: index === 0 ? 'completed' : 'upcoming', ruleIndex: index, afterMinutes: rule.afterMinutes, createdAt: wakeAt, updatedAt: wakeAt };
  });
}

export function completeTask(tasks, id, actualAt, { cascade = true, nextPlannedAt } = {}) {
  if(nextPlannedAt&&new Date(nextPlannedAt).getTime()<=new Date(actualAt).getTime()) throw new Error('下一事项时间必须晚于完成时间');
  const result = tasks.map(task => ({ ...task }));
  const index = result.findIndex(task => task.id === id);
  if (index < 0) throw new Error('找不到要完成的事项');
  result[index] = { ...result[index], status: 'completed', actualAt, updatedAt: actualAt };
  if (!cascade || index === result.length - 1) return result;
  let base = actualAt;
  for (let cursor = index + 1; cursor < result.length; cursor++) {
    if (['completed', 'skipped'].includes(result[cursor].status)) { base = result[cursor].actualAt || result[cursor].plannedAt; continue; }
    const plannedAt = cursor === index + 1 && nextPlannedAt ? nextPlannedAt : addMinutes(base, result[cursor].afterMinutes);
    result[cursor] = { ...result[cursor], plannedAt, status: cursor === index + 1 && nextPlannedAt ? 'adjusted' : 'upcoming', updatedAt: actualAt };
    base = plannedAt;
  }
  return result;
}

export function skipTask(tasks, id, at = new Date().toISOString()) { return tasks.map(task => task.id === id ? { ...task, status: 'skipped', actualAt: at, updatedAt: at } : { ...task }); }
export function updateOverdue(tasks, now) { const time = new Date(now).getTime(); return tasks.map(task => ['upcoming','current','adjusted'].includes(task.status) && new Date(task.plannedAt).getTime() < time ? { ...task, status: 'overdue', updatedAt: now } : { ...task }); }
