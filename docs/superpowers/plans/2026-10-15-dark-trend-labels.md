# 深色模式生活趋势标签修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让生活趋势的未选中指标和时间范围按钮在系统深色模式中保持清晰可读，同时不改变现有选中状态和交互。

**Architecture:** 保留现有 HTML 和 JavaScript，仅将趋势按钮未选中背景从固定浅色替换为现有主题表面变量。使用 CSS 契约测试锁定明暗主题兼容规则，并升级 Service Worker 缓存让已安装 PWA 获取新样式。

**Tech Stack:** 原生 CSS、Node.js 内置 test runner、静态 PWA Service Worker、Chrome DevTools 移动端与深色模式模拟。

---

## File map

- Modify: `tests/daily-trends-ui.test.js` — 先增加趋势按钮主题背景和选中状态的回归断言。
- Modify: `assets/styles/app.css` — 使用 `var(--surface)` 渲染未选中趋势按钮背景。
- Modify: `tests/pwa.test.js` — 将当前缓存及旧缓存清理断言更新到 `r32`。
- Modify: `tests/meal-presentation.test.js` — 更新跨功能缓存修订契约。
- Modify: `service-worker.js` — 将缓存修订从 `r31` 提升到 `r32`。
- Modify: `PROJECT_STATE.md` — 记录经过测试和浏览器验收的事实。

### Task 1: 用失败测试复现深色模式不可读问题

**Files:**
- Modify: `tests/daily-trends-ui.test.js`
- Test: `tests/daily-trends-ui.test.js`

- [ ] **Step 1: 在现有样式契约测试中增加主题背景断言**

在 `styles readable value labels, seven-day fitting and explicit horizontal scrolling` 测试中加入：

```js
assert.match(css,/\.trend-metrics button,\.trend-ranges button\{[^}]*background:var\(--surface\)[^}]*color:var\(--ink\)/s);
assert.match(css,/\.trend-metrics button\[aria-pressed="true"\],\.trend-ranges button\[aria-pressed="true"\]\{[^}]*background:var\(--accent\)[^}]*color:#fff/s);
```

- [ ] **Step 2: 运行目标测试并确认按预期失败**

Run:

```powershell
node --test tests/daily-trends-ui.test.js
```

Expected: FAIL；第一条新增断言无法匹配，因为当前未选中背景仍是 `#fff7f0`。

- [ ] **Step 3: 提交失败测试**

```powershell
git add tests/daily-trends-ui.test.js
git commit -m "test: cover dark trend control contrast"
```

### Task 2: 最小修改趋势按钮背景

**Files:**
- Modify: `assets/styles/app.css`
- Test: `tests/daily-trends-ui.test.js`

- [ ] **Step 1: 将未选中按钮背景改为主题表面色**

把生活趋势按钮规则改为：

```css
.trend-metrics button,.trend-ranges button{min-height:44px;border:1px solid #ead3c3;border-radius:13px;background:var(--surface);color:var(--ink);font-weight:700}
```

保留现有选中状态规则：

```css
.trend-metrics button[aria-pressed="true"],.trend-ranges button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:#fff}
```

- [ ] **Step 2: 运行目标测试并确认通过**

Run:

```powershell
node --test tests/daily-trends-ui.test.js
```

Expected: PASS，且无警告或错误。

- [ ] **Step 3: 提交最小样式修复**

```powershell
git add assets/styles/app.css
git commit -m "fix: keep trend controls readable in dark mode"
```

### Task 3: 升级 PWA 缓存修订

**Files:**
- Modify: `tests/pwa.test.js`
- Modify: `tests/meal-presentation.test.js`
- Modify: `service-worker.js`
- Test: `tests/pwa.test.js`
- Test: `tests/meal-presentation.test.js`

- [ ] **Step 1: 先把缓存测试期望从 r31 更新为 r32**

将当前缓存断言改为 `baby-growth-v1-20260720-r32`；旧缓存列表使用 `r31` 和 `r32`，并期望只删除 `r31`。

```js
assert.ok(sw.includes("const CACHE_NAME='baby-growth-v1-20260720-r32'"));
```

```js
keys:async()=>['baby-growth-v1-20260720-r31','baby-growth-v1-20260720-r32','other-app-cache']
```

```js
assert.deepEqual(deleted,['baby-growth-v1-20260720-r31']);
```

```js
open:async name=>{assert.equal(name,'baby-growth-v1-20260720-r32'); return activeCache}
```

在 `tests/meal-presentation.test.js` 中将对应断言改为：

```js
assert.match(sw,/baby-growth-v1-20260720-r32/);
```

- [ ] **Step 2: 运行缓存相关测试并确认按预期失败**

Run:

```powershell
node --test tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: FAIL；`service-worker.js` 仍声明 `r31`。

- [ ] **Step 3: 将 Service Worker 缓存修订升级为 r32**

把首行改为：

```js
const CACHE_NAME='baby-growth-v1-20260720-r32';
```

- [ ] **Step 4: 重新运行缓存相关测试**

Run:

```powershell
node --test tests/pwa.test.js tests/meal-presentation.test.js
```

Expected: PASS，旧应用缓存清理与当前缓存读取仍被覆盖。

- [ ] **Step 5: 提交缓存升级**

```powershell
git add service-worker.js tests/pwa.test.js tests/meal-presentation.test.js
git commit -m "chore: refresh PWA cache for dark trend fix"
```

### Task 4: 全量验证、手机深色验收和状态记录

**Files:**
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1: 运行静态检查与完整测试**

Run:

```powershell
npm.cmd run check
npm.cmd test
git diff --check origin/main..HEAD
```

Expected: 全部退出码为 0；完整测试数量不少于当前基线 345 项。

- [ ] **Step 2: 在手机宽度深色模式验收**

通过本地 HTTP 服务打开应用，创建或载入可显示“成长 → 生活趋势”的宝宝数据，然后使用 Chrome DevTools：

1. 将视口设为 375px 宽并模拟 `prefers-color-scheme: dark`。
2. 检查睡眠、奶量、便便、尿尿四个未选中/选中标签均可读。
3. 检查 7天、14天、30天按钮的未选中/选中标签均可读。
4. 读取计算样式，确认未选中背景解析为深色 `--surface`，文字解析为浅色 `--ink`；选中状态保持强调色背景和白字。
5. 确认 `document.documentElement.scrollWidth === document.documentElement.clientWidth`。

- [ ] **Step 3: 在 PROJECT_STATE.md 顶部记录验证事实**

新增：

```markdown
## 2026-10-15 深色模式生活趋势标签修复

- 生活趋势指标和时间范围的未选中按钮使用主题表面色，深色模式下与浅色文字保持可读对比；选中状态继续使用强调色和白色文字。
- Service Worker 缓存修订升级为 `baby-growth-v1-20260720-r32`。
- 自动化检查、完整测试、375px 深色模式浏览器验收与横向溢出检查均通过。
```

- [ ] **Step 4: 检查并提交状态记录**

Run:

```powershell
git diff --check origin/main..HEAD
git status --short
```

Expected: 只有本计划内文件发生变化，且没有空白错误。

```powershell
git add PROJECT_STATE.md
git commit -m "docs: record dark trend fix verification"
```
