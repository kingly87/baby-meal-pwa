import { addMinutes, localDateKey } from '../../core/dates.js';

const LOCKED_STATUSES = new Set(['completed', 'skipped', 'adjusted']);

function copyTasks(tasks) {
  return tasks.map(task => ({ ...task }));
}

function matchesSleepScope(task, babyId, date) {
  return task.babyId === babyId && task.date === date;
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
  if (!sleep?.babyId || !sleep.endAt || !['night', 'nap'].includes(sleep.type)) return result;
  const date = sleep.date || localDateKey(new Date(sleep.endAt));

  if (sleep.type === 'night') {
    const wakeIndex = result.findIndex(task =>
      task.type === 'wake' && matchesSleepScope(task, sleep.babyId, date)
    );
    if (wakeIndex < 0) return result;
    if (['skipped', 'adjusted'].includes(result[wakeIndex].status)) return result;
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
  const meal = result
    .filter(task =>
      task.type === 'meal'
      && !LOCKED_STATUSES.has(task.status)
      && matchesSleepScope(task, sleep.babyId, date)
      && new Date(task.plannedAt).getTime() >= startTime
    )
    .reduce((earliest, task) =>
      !earliest || new Date(task.plannedAt).getTime() < new Date(earliest.plannedAt).getTime()
        ? task
        : earliest
    , null);
  const mealIndex = meal ? result.findIndex(task => task.id === meal.id) : -1;
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
