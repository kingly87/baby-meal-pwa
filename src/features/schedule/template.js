export function createDefaultTemplate(babyId) {
  return {
    id: `default-${babyId}`,
    babyId,
    name: '日常作息',
    napToMealMinutes: 120,
    rules: [
      { type: 'wake', title: '起床', afterMinutes: 0 },
      { type: 'milk', title: '早间喝奶', afterMinutes: 20 },
      { type: 'meal', title: '上午辅食', afterMinutes: 120 },
      { type: 'sleep', title: '午觉', afterMinutes: 72 },
      { type: 'milk', title: '午后喝奶', afterMinutes: 30 },
      { type: 'meal', title: '下午辅食', afterMinutes: 120 },
      { type: 'bath', title: '洗澡', afterMinutes: 180 },
      { type: 'sleep', title: '夜间睡眠', afterMinutes: 60 }
    ]
  };
}

export function validateTemplate(template) {
  if (!template?.babyId || !Array.isArray(template.rules) || !template.rules.length) throw new Error('作息模板不完整');
  template.rules.forEach((rule, index) => { if (!rule.type || !rule.title || !Number.isFinite(rule.afterMinutes) || rule.afterMinutes < 0) throw new Error(`第 ${index + 1} 条作息规则无效`); });
  return template;
}

