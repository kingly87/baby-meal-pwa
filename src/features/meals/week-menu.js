function parseLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('菜单日期无效');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('菜单日期无效');
  }
  return date;
}

function localDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addLocalDays(value, days) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function weekStart(value) {
  const date = parseLocalDate(value);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return localDateKey(date);
}

export function weekRange(value) {
  const startDate = weekStart(value);
  return { startDate, endDate: addLocalDays(startDate, 6) };
}

function cloneMeal(meal, fallbackType) {
  if (!meal || typeof meal !== 'object' || Array.isArray(meal)) return meal;
  const cloned = { ...meal };
  if (cloned.mealType == null && fallbackType) cloned.mealType = fallbackType;
  return cloned;
}

function cloneDay(day) {
  if (!day || typeof day !== 'object' || Array.isArray(day)) return day;
  if (!Array.isArray(day.meals)) return { ...day };
  const fallbackTypes = day.meals.length === 2
    ? ['lunch', 'dinner']
    : day.meals.length === 3
      ? ['breakfast', 'lunch', 'dinner']
      : [];
  return {
    ...day,
    meals: day.meals.map((meal, index) => cloneMeal(meal, fallbackTypes[index]))
  };
}

export function normalizeMenu(menu) {
  if (!menu || typeof menu !== 'object' || Array.isArray(menu)) return menu;
  return {
    ...menu,
    ...(Array.isArray(menu.days) ? { days: menu.days.map(cloneDay) } : {})
  };
}

export function findMenuForWeek(menus, { babyId, date } = {}) {
  if (!Array.isArray(menus)) return null;
  const targetWeek = weekStart(date);
  const menu = menus.find(candidate => {
    if (!candidate || candidate.babyId !== babyId) return false;
    const menuDate = candidate.startDate ?? candidate.days?.[0]?.date;
    try {
      return weekStart(menuDate) === targetWeek;
    } catch {
      return false;
    }
  });
  return menu ? normalizeMenu(menu) : null;
}

export async function saveCurrentWeek(repository, menus, generated, nowISO) {
  if (typeof generated?.babyId !== 'string' || !generated.babyId.trim()) {
    throw new Error('generated.babyId must be a non-empty string');
  }
  try {
    weekStart(generated.startDate);
  } catch {
    throw new Error('generated.startDate must be a valid local date');
  }

  const existing = findMenuForWeek(menus, {
    babyId: generated.babyId,
    date: generated.startDate
  });
  const value = structuredClone(generated);
  if (existing) {
    value.id = existing.id;
    value.createdAt = existing.createdAt;
    value.updatedAt = nowISO ?? new Date().toISOString();
  }
  return repository.put('weeklyMenus', value);
}
