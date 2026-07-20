export function selectPrimaryTask(tasks, now = new Date().toISOString()) {
  const pending = tasks.filter(task => !['completed','skipped'].includes(task.status));
  const sleeping = pending.find(task => task.type === 'sleep' && task.status === 'current');
  if (sleeping) return sleeping;
  const overdue = pending.filter(task => task.status === 'overdue').sort((a,b) => a.plannedAt.localeCompare(b.plannedAt))[0];
  if (overdue) return overdue;
  const time = new Date(now).getTime();
  return pending.sort((a,b) => Math.abs(new Date(a.plannedAt).getTime() - time) - Math.abs(new Date(b.plannedAt).getTime() - time))[0] || null;
}
