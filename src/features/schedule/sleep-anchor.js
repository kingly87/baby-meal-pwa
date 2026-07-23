import { addMinutes } from '../../core/dates.js';

const LOCKED_STATUSES = new Set(['completed', 'skipped', 'adjusted']);

function copyTasks(tasks) {
  return tasks.map(task => ({ ...task }));
}

function matchesSleepScope(task, sleep) {
  return (!sleep.babyId || task.babyId === sleep.babyId)
    && (!sleep.date || task.date === sleep.date);
}

function cascade(tasks, startIndex, base, anchorAt) {
  const { babyId, date } = tasks[startIndex];
  for (let index = startIndex + 1; index < tasks.length; index++) {
    const task = tasks[index];
    if (task.babyId !== babyId || task.date !== date) continue;
    if (LOCKED_STATUSES.has(task.status)) {
      base = task.actualAt || task.plannedAt;
      continue;
    }
    const plannedAt = addMinutes(base, task.afterMinutes);
    tasks[index] = { ...task, plannedAt, status: 'upcoming', updatedAt: anchorAt };
    base = plannedAt;
  }
}

export function applySleepAnchor(tasks, sleep, { napToMealMinutes = 120 } = {}) {
  const result = copyTasks(tasks);
  if (!sleep?.endAt || !['night', 'nap'].includes(sleep.type)) return result;

  if (sleep.type === 'night') {
    const wakeIndex = result.findIndex(task => task.type === 'wake' && matchesSleepScope(task, sleep));
    if (wakeIndex < 0) return result;
    result[wakeIndex] = {
      ...result[wakeIndex],
      status: 'completed',
      actualAt: sleep.endAt,
      updatedAt: sleep.endAt
    };
    cascade(result, wakeIndex, sleep.endAt, sleep.endAt);
    return result;
  }

  const sleepStart = sleep.startAt || sleep.endAt;
  const startTime = new Date(sleepStart).getTime();
  const mealIndex = result.findIndex(task =>
    task.type === 'meal'
    && !LOCKED_STATUSES.has(task.status)
    && matchesSleepScope(task, sleep)
    && new Date(task.plannedAt).getTime() >= startTime
  );
  if (mealIndex < 0) return result;

  const plannedAt = addMinutes(sleep.endAt, napToMealMinutes);
  result[mealIndex] = {
    ...result[mealIndex],
    plannedAt,
    status: 'upcoming',
    updatedAt: sleep.endAt
  };
  cascade(result, mealIndex, plannedAt, sleep.endAt);
  return result;
}
