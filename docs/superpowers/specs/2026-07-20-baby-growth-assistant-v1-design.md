# 宝宝成长助手 V1 完整重写设计

## Objective

从零重写一个仅供家庭自用的本地优先 PWA。保留旧版本的主要育儿记录、辅食菜单和成长管理能力，采用全新的模块化代码、暖阳成长视觉、动态作息任务流和可靠的数据备份机制。

V1 不复用旧业务代码，不兼容旧版备份，不包含照片、云同步、账号、多人共享、支付或其他商用能力。旧版 600 道食谱数据可以迁移，但必须重新验证结构与内容完整性。

## Constraints

- 运行环境：现代移动端与桌面浏览器。
- 技术栈：原生 HTML、CSS、JavaScript ES Modules、Service Worker、IndexedDB。
- 不安装第三方运行依赖；自动测试使用 Node.js 内置 `node:test`。
- 所有业务数据仅保存在当前浏览器设备。
- 不读取或迁移旧版本的个人数据。
- 原 ZIP 快照保留，不覆盖。
- 产品不是医疗设备；时间和喂养建议必须允许用户修改，并明确不构成医疗建议。

## Product Scope

### Included

- 多宝宝资料、独立设置与切换。
- 首次使用引导：昵称、生日、辅食阶段、作息模板、隐私说明和通知选择。
- 可配置作息模板与每日任务实例。
- 根据实际完成时间动态计算下一事项。
- 当前事项、下一事项、倒计时、逾期、完成、跳过和手动调整。
- 浏览器通知尽力提醒，以及重新打开应用时的逾期补偿。
- 每日奶量、喝水、排便和备注。
- 睡眠开始、结束、夜醒、小睡和汇总。
- 七天辅食菜单生成、修改、换一道、已吃、跳过和恢复。
- 排除食材、不喜欢食材和收藏食谱。
- 新食材三天观察与反应记录。
- 自动买菜清单、库存标记和自定义项目。
- 600 道食谱浏览、搜索和阶段筛选。
- 体重、身高、奶量和喝水曲线。
- 长牙时间线。
- 疫苗、体检和自定义提醒。
- 首页及成长页时间线。
- V1 数据导入、导出和完整清空。
- PWA 安装、离线使用和可控更新。

### Deferred

- 照片记录、照片备份和照片迁移。
- V5.2 或更早版本的数据导入。
- 账号、Supabase、云同步和多人共享。
- 需要服务器的稳定后台推送。
- 支付、订阅、AI 接口和运营后台。

## Information Architecture

底部导航包含五个一级入口：

1. **今天**：当前事项、下一事项、快速记录、睡眠汇总和今日时间线。
2. **菜单**：本周菜单、菜单生成与调整、买菜清单和食谱库。
3. **记录**：奶量、喝水、排便、日常状态、睡眠、新食材和提醒。
4. **成长**：成长时间线、成长曲线和长牙记录。
5. **我的**：宝宝管理、作息模板、饮食偏好、通知、备份和应用说明。

## Visual Design

采用已确认的“暖阳成长 V2”视觉：

- 奶油白背景和暖杏橙主色。
- 当前任务使用杏橙渐变主卡。
- 完成后的下一事项使用低饱和绿色。
- 睡眠信息使用浅紫色。
- 逾期和警告使用克制的砖红色。
- 卡片采用中等圆角和轻阴影。
- 主操作适合单手点击，点击目标不小于约 44×44 CSS 像素。
- 支持安全区、系统字体放大、键盘焦点和暖色深色模式。

首页首屏必须始终优先呈现当前或最近的下一事项。主卡下依次展示下一事项、今日睡眠汇总、快捷记录和时间线。

## Architecture

```text
UI and routing
  ├─ Today
  ├─ Meals
  ├─ Records
  ├─ Growth
  └─ Settings
          ↓
Feature modules
  ├─ Schedule engine
  ├─ Meal planner
  ├─ Record services
  ├─ Growth timeline
  ├─ Reminder scheduler
  └─ Backup service
          ↓
Persistence
  ├─ IndexedDB: all business records
  └─ localStorage: non-critical UI preferences only
```

模块必须使用明确输入输出，不直接依赖页面元素。UI 只调用业务接口，业务模块不拼接页面 HTML，数据层不包含业务规则。

## Schedule Engine

### Template

每个宝宝有独立模板。模板由有序规则组成，例如：

- 起床后 20 分钟喝奶。
- 喝奶后 120 分钟吃上午辅食。
- 辅食完成后 72 分钟开始午睡。
- 睡醒后指定时间安排下一次喝奶。
- 可配置每日辅食数量，以及洗澡、维生素等自定义事项。

系统提供可编辑的阶段默认模板。默认时间只用于初始化，不作为医疗建议。

### Daily Instances

每日任务由模板生成独立实例。实例至少包含稳定 ID、宝宝 ID、类型、标题、计划时间、实际时间、状态、来源规则和创建更新时间。

状态包括：`upcoming`、`current`、`completed`、`skipped`、`overdue`、`adjusted`。

完成任务时，用户可以选择：

1. 按实际完成时间顺延未完成事项。
2. 仅完成当前事项，保留后续时间。
3. 手动设置下一事项时间。

已经完成或跳过的历史实例不得因重新计算而改变。

### Home Priority

1. 优先显示逾期且未处理事项。
2. 其次显示已经到点的当前事项。
3. 其次显示最近的下一事项。
4. 睡眠正在进行时，睡眠计时卡优先。

快速记录奶量、喝水或排便不会自动中断当前主任务，除非该记录明确完成对应的作息事项。

## Notification Behavior

- 先解释用途，再由用户主动申请通知权限。
- 支持提前、到点和一次可选的逾期提醒。
- 任务完成、跳过或调整后取消旧计划并重新计算。
- 页面激活时检查逾期事项并显示补偿提醒。
- 明确提示：纯静态 PWA 在应用完全关闭或系统限制后台运行时，不能保证通知准时触发。
- 通知不得宣传为医疗、安全或喂养报警系统。

## Meal Planner Safety

菜单规则分为硬约束和软约束。

### Hard Constraints

- 排除食材永远不可进入候选集。
- 默认只从当前辅食阶段生成菜单。
- 候选为空时停止并返回人类可读原因。
- 任何兜底逻辑不得绕过排除食材或阶段限制。

### Soft Constraints

- 不喜欢食材降低权重。
- 收藏食谱提高权重。
- 尽量轮换蛋白类别和主食。
- 限制高胡萝卜素食谱频率。
- 软约束可逐级放宽，但生成结果必须返回放宽说明。

## Record Model

所有可编辑或删除的实体必须使用稳定 UUID，不允许以排序后的数组下标作为身份标识。主要实体包括：

- babies
- scheduleTemplates
- taskInstances
- dailyRecords
- milkRecords
- waterRecords
- stoolRecords
- sleepSessions
- growthMeasurements
- toothRecords
- newFoodObservations
- reminders
- weeklyMenus
- shoppingItems
- foodPreferences
- appSettings

每条业务记录至少包含 `id`、`babyId`、`createdAt` 和 `updatedAt`。需要排序的记录另存业务日期或时间字段。

输入必须验证有效日期、非负数和合理格式。明显异常的身高、体重或奶量要求再次确认，但应用不进行医学诊断。睡眠记录支持跨午夜，结束时间必须晚于开始时间。

## Timeline and Charts

时间线聚合完成餐次、奶量、睡眠、成长测量、长牙、新食材和提醒事件。首页显示最近的重要事件；成长页提供完整时间线以及类别、日期筛选。高频普通事件可以折叠。

图表使用原生 SVG。体重、身高、奶量和喝水分别展示。少于两条数据时不绘制趋势线。不在 V1 中加入医学百分位或生长标准曲线。

## Backup and Reset

V1 导出 JSON 包含：

- schema version
- exported timestamp
- all V1 business stores
- basic counts/check information

导入流程必须先解析和验证，再展示摘要，用户确认后才在单个升级/写入流程中替换数据。失败时保留原数据。成功后重新计算未来任务和通知。

完整清空必须删除 IndexedDB 业务数据和 localStorage 界面偏好，并要求二次确认。V1 不读取旧版备份，也不处理照片。

## Offline and Updates

- 首次在线访问后缓存应用壳、样式、脚本、图标和食谱数据。
- 仅缓存成功响应。
- 导航请求离线时回退应用首页。
- 静态资源失败不得返回 HTML。
- 发现新版本时提示用户确认刷新，不在记录过程中强制重载。
- 更新失败继续使用上一稳定缓存，不修改 IndexedDB 数据。

## Error Handling

- 普通保存使用轻量 toast。
- 删除支持短时间撤销。
- 完整清空必须二次确认。
- IndexedDB、存储空间、备份格式和通知权限错误使用明确中文提示。
- 空状态必须给出可执行的下一步。
- 业务错误不得只写入控制台或静默吞掉。

## Project Structure

```text
baby-meal-pwa/
├─ index.html
├─ manifest.webmanifest
├─ service-worker.js
├─ assets/
│  ├─ styles/
│  └─ icons/
├─ data/
│  └─ recipes.js
├─ src/
│  ├─ app.js
│  ├─ db.js
│  ├─ router.js
│  ├─ store.js
│  ├─ ui/
│  └─ features/
│     ├─ schedule/
│     ├─ meals/
│     ├─ records/
│     ├─ growth/
│     ├─ reminders/
│     └─ backup/
├─ tests/
├─ docs/
├─ README.md
└─ PROJECT_STATE.md
```

## Verification

自动测试至少覆盖：

- 模板生成和动态顺延。
- 完成、跳过、调整和逾期。
- 跨午夜睡眠。
- 排除食材在所有兜底层均不被绕过。
- 候选为空时返回明确错误。
- 食谱总数 600、每阶段 120、ID 唯一、字段完整。
- 稳定 ID 编辑和删除。
- 多宝宝数据隔离。
- 时间线聚合与筛选。
- 备份验证、导入成功和失败回滚。
- HTML 引用、Manifest 和 Service Worker 缓存一致性。
- IndexedDB schema 升级。

浏览器验收覆盖：

- 首次设置。
- 首页任务推进。
- 通知授权和逾期补偿。
- 菜单生成、修改及安全规则。
- 记录新增、编辑和删除。
- 多宝宝切换。
- 数据导出、清空和重新导入。
- 离线重开、PWA 安装和更新提示。
- 键盘、焦点、字体放大、移动端安全区和深色模式。

## Rollback

- 保留原有 ZIP 快照。
- 新 V1 独立建立 Git 历史。
- 设计、数据、业务和 UI 分阶段提交。
- 每个阶段必须通过对应自动测试和最小浏览器验证后再继续。
- Service Worker 更新失败时继续使用上一稳定缓存。
