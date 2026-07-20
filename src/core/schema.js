export const SCHEMA_VERSION = 1;
export const STORE_NAMES = Object.freeze([
  'babies','scheduleTemplates','taskInstances','dailyRecords','sleepSessions',
  'growthMeasurements','toothRecords','newFoodObservations','reminders',
  'weeklyMenus','shoppingItems','foodPreferences','appSettings'
]);

export function assertStore(name) {
  if (!STORE_NAMES.includes(name)) throw new Error(`未知数据类型：${name}`);
}

