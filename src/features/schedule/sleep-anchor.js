import { addMinutes, localDateKey } from '../../core/dates.js';

const LOCKED_STATUSES = new Set(['completed', 'skipped', 'adjusted']);

function copyTasks(tasks) {
  return tasks.map(task => ({
    ...task,
    ...(task.sleepAnchorBaseline ? { sleepAnchorBaseline: { ...task.sleepAnchorBaseline } } : {})
  }));
}

function anchored(task,changes){
  const sleepAnchorBaseline=task.sleepAnchorBaseline||{
    plannedAt:task.plannedAt,status:task.status,actualAt:task.actualAt,updatedAt:task.updatedAt
  };
  return{...task,...changes,sleepAnchorBaseline};
}

export function restoreSleepAnchors(tasks){
  return tasks.map(task=>{
    if(!task.sleepAnchorBaseline)return{...task};
    const{sleepAnchorBaseline,...rest}=task;
    return{...rest,...sleepAnchorBaseline};
  });
}

function matchesSleepScope(task, babyId, date) {
  return task.babyId === babyId && task.date === date;
}

function compareEntries(left, right) {
  const leftRule = Number.isFinite(left.task.ruleIndex);
  const rightRule = Number.isFinite(right.task.ruleIndex);
  if (leftRule !== rightRule) return leftRule ? -1 : 1;
  if (leftRule && left.task.ruleIndex !== right.task.ruleIndex) {
    return left.task.ruleIndex - right.task.ruleIndex;
  }
  return new Date(left.task.plannedAt).getTime() - new Date(right.task.plannedAt).getTime();
}

function scopedEntries(tasks, babyId, date) {
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(entry => matchesSleepScope(entry.task, babyId, date))
    .sort(compareEntries);
}

function cascade(tasks, entries, startIndex, base, anchorAt) {
  for (let cursor = startIndex + 1; cursor < entries.length; cursor++) {
    const { index } = entries[cursor];
    const task = tasks[index];
    if (LOCKED_STATUSES.has(task.status)) {
      base = task.actualAt || task.plannedAt;
      continue;
    }
    const plannedAt = addMinutes(base, task.afterMinutes);
    tasks[index] = anchored(task,{ plannedAt, status: 'upcoming', updatedAt: anchorAt });
    base = plannedAt;
  }
}

export function applySleepAnchor(tasks, sleep) {
  const result = copyTasks(tasks);
  if (!sleep?.babyId || !sleep.endAt || !['night', 'nap'].includes(sleep.type)) return result;
  if (sleep.type === 'nap') return result;
  const endTime = new Date(sleep.endAt).getTime();
  if (!Number.isFinite(endTime)) return result;
  const date = sleep.date || localDateKey(new Date(sleep.endAt));
  const entries = scopedEntries(result, sleep.babyId, date);

  const wakePosition = entries.findIndex(entry => entry.task.type === 'wake');
  if (wakePosition < 0) return result;
  const wakeIndex = entries[wakePosition].index;
  if (['skipped', 'adjusted'].includes(result[wakeIndex].status)) return result;
  result[wakeIndex] = anchored(result[wakeIndex],{
    status: 'completed',
    actualAt: sleep.endAt,
    updatedAt: sleep.endAt
  });
  cascade(result, entries, wakePosition, sleep.endAt, sleep.endAt);
  return result;
}
