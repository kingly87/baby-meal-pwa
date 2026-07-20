export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMinutes(iso, minutes) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('无效时间');
  return new Date(date.getTime() + Number(minutes) * 60_000).toISOString();
}

