# 最近记录与提醒统一时间排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“记录”页面的日常记录、已结束睡眠、新食材观察和提醒合并为按业务时间倒序排列的稳定时间线。

**Architecture:** 保留四类卡片现有 HTML 和交互，仅在 `recordsView` 内将它们映射为统一的临时展示项，再通过一个无副作用的比较器排序并拼接。日期型字段使用本地零点，异常时间排在末尾；数据结构和备份格式不变。

**Tech Stack:** 原生 JavaScript ES modules、Node.js 内置 test runner、静态 PWA Service Worker、IndexedDB 数据由现有调用方提供。

---

## File map

- Modify: `src/ui/records.js` — 定义统一时间线项、业务时间解析和稳定排序，并继续输出现有卡片。
- Modify: `tests/ui-contract.test.js` — 覆盖跨类型排序、字段语义、异常时间、并列顺序和输入不可变性。
- Modify: `service-worker.js` — 将缓存修订从 `r30` 提升到 `r31`，让已安装 PWA 获取新渲染代码。
- Modify: `tests/pwa.test.js` — 更新当前缓存与旧缓存清理断言。
- Modify: `tests/meal-presentation.test.js` — 同步已有缓存修订契约。
- Modify: `PROJECT_STATE.md` — 记录经过测试和手动验收确认的发布事实。

### Task 1: 用失败测试锁定统一时间线契约

**Files:**
- Test: `tests/ui-contract.test.js:395-500`

- [ ] **Step 1: 添加跨类型时间排序与字段语义测试**

在 `records screen preserves stable record management controls` 测试之前加入：

```js
test('records history interleaves every type by its business time',()=>{
  const html=recordsView({
    records:[{id:'record',type:'milk',value:120,occurredAt:'2026-08-15T08:00:00'}],
    sleeps:[{id:'sleep',type:'nap',startAt:'2026-08-15T09:00:00',endAt:'2026-08-15T10:00:00',durationMinutes:60}],
    observations:[{id:'food',name:'南瓜',date:'2026-08-14',observeUntil:'2026-12-31',reactions:[]}],
    reminders:[
      {id:'latest',title:'最新提醒',dueDate:'2026-08-15T10:00:00'},
      {id:'completed',title:'旧提醒',dueDate:'2026-08-13T10:00:00',completedAt:'2026-10-01T10:00:00'}
    ]
  });
  const positions=['最新提醒','午间小睡 · 60 分钟','奶量 · 120','新食物 · 南瓜','旧提醒'].map(text=>html.indexOf(text));
  assert.ok(positions.every(position=>position>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
});
```

这个用例同时证明：新食材采用 `date` 而不是更晚的 `observeUntil`，已完成提醒采用 `dueDate` 而不是更晚的 `completedAt`。

- [ ] **Step 2: 添加本地日期、并列顺序、异常时间和不可变性测试**

紧接上一个测试加入：

```js
test('records history uses stable local-day ties and leaves invalid times last without mutation',()=>{
  const input={
    records:[
      {id:'record-b',type:'milk',value:222,occurredAt:'2026-08-16T00:00:00'},
      {id:'record-a',type:'milk',value:111,occurredAt:'2026-08-16T00:00:00'},
      {id:'invalid',type:'water',value:99,occurredAt:'not-a-date'}
    ],
    sleeps:[{id:'sleep',type:'nap',startAt:'2026-08-16T00:00:00',endAt:'2026-08-16T00:30:00',durationMinutes:30}],
    observations:[{id:'food',name:'胡萝卜',date:'2026-08-16',observeUntil:'2026-08-18',reactions:[]}],
    reminders:[{id:'reminder',title:'并列提醒',dueDate:'2026-08-16'}]
  };
  const snapshot=structuredClone(input);
  let html='';
  assert.doesNotThrow(()=>{html=recordsView(input)});
  const positions=['奶量 · 111','奶量 · 222','午间小睡 · 30 分钟','新食物 · 胡萝卜','并列提醒','喝水 · 99'].map(text=>html.indexOf(text));
  assert.ok(positions.every(position=>position>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.deepEqual(input,snapshot);
});
```

- [ ] **Step 3: 运行定向测试，确认测试先失败**

Run:

```powershell
node --test --test-name-pattern="records history" tests/ui-contract.test.js
```

Expected: 两个新增测试至少有一个 `FAIL`，现有实现仍按类型拼接或在并列时间下保留输入顺序。

- [ ] **Step 4: 提交测试契约**

```powershell
git add -- tests/ui-contract.test.js
git commit -m "test: define unified record history order"
```

### Task 2: 实现无副作用的统一时间线排序

**Files:**
- Modify: `src/ui/records.js:1-8`
- Test: `tests/ui-contract.test.js`

- [ ] **Step 1: 在 `records.js` 顶部添加时间解析和稳定比较器**

在 `labels` 后、`recordsView` 前加入：

```js
const historyTypeRank={record:0,sleep:1,observation:2,reminder:3};

function historyTime(value){
  if(typeof value!=='string'||!value.trim())return Number.NaN;
  const normalized=value.trim(),dateOnly=/^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if(dateOnly){
    const year=Number(dateOnly[1]),month=Number(dateOnly[2]),day=Number(dateOnly[3]);
    const parsed=new Date(year,month-1,day);
    if(parsed.getFullYear()!==year||parsed.getMonth()!==month-1||parsed.getDate()!==day)return Number.NaN;
    return parsed.getTime();
  }
  const parsed=Date.parse(normalized);
  return Number.isFinite(parsed)?parsed:Number.NaN;
}

function historyItem(type,id,time,html){
  return{sortTime:historyTime(time),typeRank:historyTypeRank[type],id:String(id??''),html};
}

function compareHistoryItems(left,right){
  const leftValid=Number.isFinite(left.sortTime),rightValid=Number.isFinite(right.sortTime);
  if(leftValid!==rightValid)return leftValid?-1:1;
  if(leftValid&&left.sortTime!==right.sortTime)return right.sortTime-left.sortTime;
  if(left.typeRank!==right.typeRank)return left.typeRank-right.typeRank;
  return left.id<right.id?-1:left.id>right.id?1:0;
}
```

- [ ] **Step 2: 将四类 HTML 映射成统一展示项**

把 `recordsView` 开头的 `rows`、`sleepRows`、`foodRows`、`reminderRows` 和 `history` 定义替换为：

```js
  const rows=records.map(item=>historyItem('record',item.id,item.occurredAt,`<article class="meal-row"><div><b>${labels[item.type]||esc(item.type)} · ${esc(item.value)}${['stool','urine'].includes(item.type)?' 次':''}</b><small>${esc(formatTimelineDate(item.occurredAt))}</small></div><div class="button-row"><button data-action="edit-record" data-id="${esc(item.id)}">编辑</button><button data-action="delete-record" data-id="${esc(item.id)}">删除</button></div></article>`));
  const sleepRows=sleeps.filter(item=>item.endAt).map(item=>historyItem('sleep',item.id,item.startAt,`<article class="meal-row"><div><b>${esc(item.type==='night'?'夜间睡眠':item.type==='nap'?'午间小睡':'睡眠记录')} · ${esc(item.durationMinutes)} 分钟</b><small>${esc(formatTimelineDate(item.startAt))}</small></div><div class="button-row"><button data-action="edit-sleep" data-id="${esc(item.id)}">编辑</button><button data-action="delete-sleep" data-id="${esc(item.id)}">删除</button></div></article>`));
  const foodRows=observations.map(item=>historyItem('observation',item.id,item.date,`<article class="meal-row"><div><b>新食物 · ${esc(item.name)}</b><small>观察至 ${esc(item.observeUntil)} · 已记 ${item.reactions?.length||0} 天</small></div><div class="button-row"><button data-action="add-reaction" data-id="${esc(item.id)}">记录反应</button><button data-action="delete-observation" data-id="${esc(item.id)}">删除</button></div></article>`));
  const reminderRows=reminders.map(item=>historyItem('reminder',item.id,item.dueDate,`<article class="meal-row"><div><b>${esc(item.title)}</b><small>${esc(item.dueDate)} · ${item.completedAt?'已完成':'待提醒'}</small></div><div class="button-row">${item.completedAt?'':`<button data-action="complete-reminder" data-id="${esc(item.id)}">完成</button>`}<button data-action="delete-reminder" data-id="${esc(item.id)}">删除</button></div></article>`));
  const active=sleeps.find(item=>!item.endAt);
  const history=[...rows,...sleepRows,...foodRows,...reminderRows].sort(compareHistoryItems).map(item=>item.html).join('');
  const errorStatus=dataError?`<p class="empty" role="status">${esc(dataError)}</p>`:'';
```

不要修改后续 `activeMinutes`、睡眠按钮和页面模板。这样现有卡片操作与空状态保持不变。

- [ ] **Step 3: 运行定向测试，确认统一排序通过**

Run:

```powershell
node --test --test-name-pattern="records history|records screen|sleep history" tests/ui-contract.test.js
```

Expected: 新增排序测试及既有记录/睡眠契约全部 `PASS`。

- [ ] **Step 4: 运行语法检查和差异检查**

Run:

```powershell
npm.cmd run check
git diff --check -- src/ui/records.js
```

Expected: 两条命令退出码均为 `0`，无语法错误或空白错误。

- [ ] **Step 5: 提交统一排序实现**

```powershell
git add -- src/ui/records.js
git commit -m "feat: sort record history by event time"
```

### Task 3: 提升 PWA 缓存修订并锁定更新行为

**Files:**
- Modify: `tests/pwa.test.js:21-68`
- Modify: `tests/meal-presentation.test.js:51-54`
- Modify: `service-worker.js:1`

- [ ] **Step 1: 先将缓存测试改为要求 `r31`**

在 `tests/pwa.test.js` 中作以下精确替换：

```js
assert.ok(sw.includes("const CACHE_NAME='baby-growth-v1-20260720-r31'"));
```

```js
keys:async()=>['baby-growth-v1-20260720-r30','baby-growth-v1-20260720-r31','other-app-cache'],
```

```js
assert.deepEqual(deleted,['baby-growth-v1-20260720-r30']);
```

```js
open:async name=>{assert.equal(name,'baby-growth-v1-20260720-r31'); return activeCache},
```

在 `tests/meal-presentation.test.js` 中把缓存断言改为：

```js
assert.match(sw,/baby-growth-v1-20260720-r31/);
```

- [ ] **Step 2: 运行 PWA 测试，确认在实现前失败**

Run:

```powershell
node --test tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: `FAIL`，错误指出 Service Worker 仍为 `r30`。

- [ ] **Step 3: 提升 Service Worker 缓存修订**

将 `service-worker.js` 第一行改为：

```js
const CACHE_NAME='baby-growth-v1-20260720-r31';
```

不改变 `APP_SHELL`、激活清理范围、导航网络优先或资源缓存优先策略。

- [ ] **Step 4: 重新运行 PWA 测试**

Run:

```powershell
node --test tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: 全部 `PASS`；激活测试只删除 `r30`，并保留 `other-app-cache`。

- [ ] **Step 5: 提交缓存更新**

```powershell
git add -- service-worker.js tests/pwa.test.js tests/meal-presentation.test.js
git commit -m "chore: refresh PWA cache for record ordering"
```

### Task 4: 完整验证、手机宽度验收与项目状态

**Files:**
- Modify: `PROJECT_STATE.md:1`

- [ ] **Step 1: 运行完整自动化验证**

Run:

```powershell
npm.cmd run check
npm.cmd test
git diff --check HEAD~3..HEAD -- src/ui/records.js tests/ui-contract.test.js service-worker.js tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: 语法检查和本任务差异检查退出码为 `0`；完整测试共 `343` 项通过、`0` 项失败。检查范围显式排除用户尚未提交的 `README.md` 和 `AGENTS.md`。

- [ ] **Step 2: 在本地静态服务器进行手动验收**

在一个 PowerShell 终端运行：

```powershell
py -m http.server 4173
```

打开 `http://localhost:4173/`，使用 375px 手机视口完成以下操作：

1. 在“记录”页面分别添加日常记录、补记并结束的睡眠、新食材和提醒。
2. 让四类条目的时间相互穿插，确认页面严格按最新时间在上排列，而不是按类型成组。
3. 完成一条较早到期的提醒，确认它仍按原 `dueDate` 停留在对应位置，不因当前完成时间跳到顶部。
4. 刷新页面，确认顺序保持不变且每张卡片的编辑、完成和删除按钮仍可用。
5. 在浏览器 Application 面板确认活动缓存名为 `baby-growth-v1-20260720-r31`。

Expected: 所有检查通过，页面无报错，手机宽度下无新增横向溢出。

- [ ] **Step 3: 在 `PROJECT_STATE.md` 顶部记录已验证事实**

加入：

```markdown
## 2026-10-14 最近记录与提醒统一排序

- “最近记录与提醒”已将日常记录、已结束睡眠、新食材观察和提醒合并为一条按业务时间倒序的时间线；相同时间按固定类型与 ID 稳定排序，无效时间保留并置于末尾。
- 日常记录使用 `occurredAt`，睡眠使用 `startAt`，新食材使用首次尝试 `date`，提醒无论是否完成均使用原定 `dueDate`；现有数据与备份结构无需迁移。
- Service Worker 缓存修订升级为 `baby-growth-v1-20260720-r31`。
- 自动化验证：`npm.cmd run check`、`npm.cmd test`（343 项）和 `git diff --check` 通过；375px 手机视口手动验收通过。
```

- [ ] **Step 4: 再次检查状态文件并提交**

Run:

```powershell
git diff --check -- PROJECT_STATE.md
git status --short
```

Expected: 仅本任务的 `PROJECT_STATE.md` 待提交；用户原有的 `README.md` 和 `AGENTS.md` 继续保持未暂存。

```powershell
git add -- PROJECT_STATE.md
git commit -m "docs: record unified history verification"
```

### Task 5: 最终提交范围审计

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: 核对本任务提交和工作区边界**

Run:

```powershell
git log --oneline -5
git status --short
git diff --stat HEAD~4..HEAD
```

Expected: 本实施阶段包含测试契约、排序实现、PWA 缓存和项目状态四个小提交；`README.md` 与 `AGENTS.md` 未被提交或覆盖。

- [ ] **Step 2: 确认回滚路径**

如发布后发现回归，按最新到最早的顺序对本实施阶段四个提交使用 `git revert <commit>`。设计不修改 IndexedDB 或备份结构，因此代码回滚不需要迁移用户数据。

- [ ] **Step 3: 报告结果并等待推送授权**

汇报完整测试数量、手动验收结果、缓存版本、提交列表和仍存在的用户工作区改动。除非用户明确要求“推送”，不要执行 `git push`。
