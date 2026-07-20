# Baby Growth Assistant V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete local-first baby schedule, feeding, records, growth, reminder, and backup PWA from scratch using the approved Warm Sunshine V2 design.

**Architecture:** Browser UI modules call pure feature services; feature services operate on explicit records and repository interfaces; IndexedDB is the production repository and an in-memory repository supports deterministic tests. The app runs without a backend, while the Service Worker caches the application shell and provides best-effort notification handling.

**Tech Stack:** HTML5, CSS, JavaScript ES Modules, IndexedDB, Service Worker, Web Notifications, Web App Manifest, Node.js `node:test` with no third-party dependencies.

---

## File Map

- `index.html`: accessible application shell and five-tab navigation.
- `assets/styles/app.css`: Warm Sunshine V2 responsive visual system.
- `assets/icons/*.svg`: V1 PWA icons.
- `data/recipes.js`: validated 600-recipe ES module.
- `src/app.js`: composition root and application startup.
- `src/db.js`: IndexedDB schema, migrations, transactions, and repository API.
- `src/store.js`: active baby and UI state coordination.
- `src/router.js`: five-tab client-side navigation.
- `src/core/*.js`: IDs, dates, validation, and event helpers.
- `src/features/schedule/*.js`: templates, daily instances, progression, and home priority.
- `src/features/meals/*.js`: recipe safety, weekly planning, and shopping derivation.
- `src/features/records/*.js`: daily, sleep, new-food, reminder, and tooth records.
- `src/features/growth/*.js`: timeline aggregation and SVG chart model.
- `src/features/backup/*.js`: V1 export validation and atomic import orchestration.
- `src/features/notifications/*.js`: permission, foreground reconciliation, and service-worker messages.
- `src/ui/*.js`: rendering, dialogs, toasts, forms, onboarding, and feature controllers.
- `service-worker.js`: offline shell, controlled updates, and notification events.
- `manifest.webmanifest`: install metadata.
- `tests/*.test.js`: unit, integration, structure, and PWA contract tests.

### Task 1: Project skeleton and recipe contract

**Files:**
- Create: `package.json`, `index.html`, `assets/styles/app.css`, `assets/icons/icon.svg`
- Create: `src/core/id.js`, `src/core/dates.js`, `tests/structure.test.js`, `tests/recipes.test.js`
- Create: `data/recipes.js` from the validated V5.2 dataset, converting only the module export wrapper

- [ ] Write structure and recipe tests first. Assert required files, unique HTML IDs, referenced roots, exactly 600 recipes, 120 recipes per stage, unique IDs, and required recipe fields.
- [ ] Run `node --test tests/structure.test.js tests/recipes.test.js` and verify failure because the new files do not exist.
- [ ] Create the minimal application shell, core helpers, styles, icon, package scripts, and recipe module.
- [ ] Re-run the two tests and verify zero failures.
- [ ] Commit with `git commit -m "feat: scaffold v1 application"`.

### Task 2: Repository and multi-baby isolation

**Files:**
- Create: `src/db.js`, `src/core/schema.js`, `tests/db.test.js`

- [ ] Write failing tests for schema version, stable UUID records, CRUD by ID, baby-scoped reads, transactions, full clear, and migration of an empty database.
- [ ] Run `node --test tests/db.test.js` and verify expected missing-module failures.
- [ ] Implement an IndexedDB repository plus an API-compatible memory repository for tests. Define stores for babies, schedule templates, task instances, daily records, sleep sessions, growth, teeth, new foods, reminders, menus, shopping, food preferences, and settings.
- [ ] Re-run database tests and verify all pass.
- [ ] Commit with `git commit -m "feat: add local data repository"`.

### Task 3: Configurable schedule engine

**Files:**
- Create: `src/features/schedule/template.js`, `src/features/schedule/engine.js`, `src/features/schedule/select-current.js`
- Create: `tests/schedule.test.js`

- [ ] Write failing tests for default templates, custom intervals, daily task generation, actual-time cascading, preserve-schedule completion, manual next-time override, skipped and overdue states, completed-history immutability, and sleep priority.
- [ ] Run `node --test tests/schedule.test.js` and confirm behavioral failures.
- [ ] Implement pure template and schedule functions with explicit clock input and immutable outputs.
- [ ] Re-run tests and verify all pass.
- [ ] Commit with `git commit -m "feat: implement configurable daily schedule"`.

### Task 4: Safe menu planner and shopping list

**Files:**
- Create: `src/features/meals/planner.js`, `src/features/meals/preferences.js`, `src/features/meals/shopping.js`
- Create: `tests/meals.test.js`

- [ ] Write failing tests proving excluded ingredients are never selected at any fallback level, stage boundaries are enforced, empty safe candidates return a Chinese error, favorites gain weight without bypassing safety, dislikes lose weight, weekly outputs have stable meal IDs, and shopping items aggregate safely.
- [ ] Run `node --test tests/meals.test.js` and confirm failures.
- [ ] Implement hard-constraint filtering, soft-constraint scoring, deterministic injected random selection, weekly generation, meal replacement, status changes, and shopping aggregation.
- [ ] Re-run tests, including a repeated all-excluded generation test with zero violations.
- [ ] Commit with `git commit -m "feat: add safe weekly meal planning"`.

### Task 5: Records, sleep, growth, teeth, and timeline

**Files:**
- Create: `src/features/records/records.js`, `src/features/records/sleep.js`, `src/features/records/new-food.js`
- Create: `src/features/growth/timeline.js`, `src/features/growth/chart.js`
- Create: `tests/records.test.js`, `tests/growth.test.js`

- [ ] Write failing tests for non-negative numeric records, invalid date rejection, stable-ID edits/deletes after sorting, cross-midnight sleep, new-food three-day observation, timeline filtering/folding, and no trend line below two points.
- [ ] Run the record and growth tests and verify failures.
- [ ] Implement validated record constructors and immutable update/delete helpers, sleep duration calculation, timeline aggregation, and SVG chart model generation.
- [ ] Re-run tests and verify all pass.
- [ ] Commit with `git commit -m "feat: add baby records and growth timeline"`.

### Task 6: V1 backup and reset

**Files:**
- Create: `src/features/backup/backup.js`, `src/features/backup/validate.js`
- Create: `tests/backup.test.js`

- [ ] Write failing tests for schema-versioned export, store counts, malformed-file rejection, old-version rejection, import preview, atomic replacement, rollback on failure, and complete clear.
- [ ] Run `node --test tests/backup.test.js` and confirm failures.
- [ ] Implement JSON export, strict validation, preview summary, repository transaction import, and clear-all orchestration.
- [ ] Re-run tests and verify all pass.
- [ ] Commit with `git commit -m "feat: add versioned local backups"`.

### Task 7: State, onboarding, routing, and Warm Sunshine UI

**Files:**
- Create: `src/store.js`, `src/router.js`, `src/ui/render.js`, `src/ui/onboarding.js`, `src/ui/today.js`, `src/ui/meals.js`, `src/ui/records.js`, `src/ui/growth.js`, `src/ui/settings.js`, `src/ui/feedback.js`
- Modify: `index.html`, `assets/styles/app.css`
- Create: `tests/ui-contract.test.js`

- [ ] Write failing UI contract tests for five navigation roots, onboarding fields, main current-task card, next-task card, sleep summary, timeline, accessible labels, dialog semantics, and minimum CSS target sizes.
- [ ] Run `node --test tests/ui-contract.test.js` and confirm failures.
- [ ] Implement onboarding and five-tab UI using DOM APIs and escaped text, with event delegation and stable IDs. Implement the approved orange current card, green next card, purple sleep summary, quick actions, timeline, responsive layout, safe areas, focus states, and warm dark mode.
- [ ] Re-run UI contract tests and all prior tests.
- [ ] Commit with `git commit -m "feat: build warm sunshine v1 interface"`.

### Task 8: Notifications and application composition

**Files:**
- Create: `src/features/notifications/notifications.js`, `src/app.js`
- Modify: `src/ui/settings.js`, `src/ui/today.js`
- Create: `tests/notifications.test.js`, `tests/app.test.js`

- [ ] Write failing tests for permission explanation before request, denied/default/granted states, due-task reconciliation, cancellation/rescheduling messages, overdue catch-up, and startup with no existing baby.
- [ ] Run notification and app tests and confirm failures.
- [ ] Implement notification adapter with injected browser APIs, foreground reconciliation, service-worker messaging, and composition-root startup/error handling.
- [ ] Re-run tests and verify all pass.
- [ ] Commit with `git commit -m "feat: integrate reminders and application startup"`.

### Task 9: PWA shell, offline behavior, and updates

**Files:**
- Create: `service-worker.js`, `manifest.webmanifest`, `assets/icons/icon-192.svg`, `assets/icons/icon-512.svg`
- Create: `tests/pwa.test.js`

- [ ] Write failing tests for manifest V1 metadata, all runtime files in the cache list, successful-response-only caching, navigation-only fallback, old-cache cleanup, skip-waiting message, and notification click behavior.
- [ ] Run `node --test tests/pwa.test.js` and confirm failures.
- [ ] Implement the versioned service worker, controlled update flow, install metadata, and service-worker notification handlers.
- [ ] Re-run PWA tests and the full suite.
- [ ] Commit with `git commit -m "feat: make v1 installable and offline"`.

### Task 10: Documentation, browser acceptance, and release

**Files:**
- Create: `README.md`, `PROJECT_STATE.md`, `docs/V1-ACCEPTANCE.md`
- Modify: `.gitignore`

- [ ] Run `npm test` and require zero failures and zero unhandled warnings.
- [ ] Run `node --check` across every JavaScript file.
- [ ] Serve the project locally and execute the acceptance checklist: onboarding, schedule progression, menu safety, CRUD, multi-baby isolation, export/import/reset, responsive UI, offline reopen, notification permission, and update prompt.
- [ ] Run `git diff --check` and review `git status` so legacy ZIP files remain untracked and excluded.
- [ ] Document setup, local serving, GitHub/Cloudflare deployment, data privacy, notification limitations, backup procedure, test commands, and verified project state.
- [ ] Commit with `git commit -m "docs: release baby growth assistant v1"`.
- [ ] Push `main` to `origin`; if Git Credential Manager requires interaction, ask the user to complete browser authentication and retry only the push.
