# CAT-TASKS-20260627-001 — Validation Evidence

> Raw output from validation commands, DOM probes, API responses.
> Append — never delete.

---

## Validation entries

### Slice 1 — Create Task modal parity (2026-06-27)

**Static**
- `npx tsc --noEmit -p tsconfig.app.json`: 0 errors in touched files; total 181 = pre-existing baseline (icon-registry.ts alone = 150; none in tasks/create-story/dispatcher). No NEW type errors.
- `eslint --no-cache` on touched files: **0 errors**. Warnings = `no-restricted-imports` (direct @atlaskit) — 8 on CreateTaskModal vs **14 on the parity reference CreateStoryModal**; identical rule, fewer than the canonical reference. These are tolerated repo-wide on the create-modal surfaces (Story + BR import the same raw @atlaskit/form/select/textfield + CatalystDatePicker).
- All `CreateTaskModal` consumers compile (props {open,onOpenChange,defaultWorkstream,onSuccess} preserved) — tsc clean.

**Live (Chrome MCP, worktree dev server on :8081, branch claude/angry-lovelace-a4b08e, session transplanted from 8080)**
- (a) `/tasks/overview` opens — PASS.
- (b) `+ Create` inside `/tasks/*` opens **Create Task** modal, NOT Story — PASS (CreateDropdown route guard).
- (c) Modal renders without visual break — PASS. Canonical Atlassian shell: title "Create task" + X, "Required fields are marked with an asterisk *" helper, Title*/Description/Workstream*/Priority(ADS PriorityIcon)/Assignee/Start date*(CatalystDatePicker, prefilled)/Due date*; footer Cancel + Add task.
- (d) Required validation — PASS. Add task with empty Workstream + Due date shows ADS `@atlaskit/form` ErrorMessage "Workstream is required" / "Due date is required"; no submit.
- (e) X / Cancel close — PASS (X tested; Cancel shares handleClose).
- (f) Submit→mutation wiring — PARTIAL: submit→validate fired live; full DB create blocked because this env has **zero workstreams** (required field; same data gap empties workstreams page/sidebar → Slice 4). `useCreateTaskMutation` + caller props unchanged (tsc-clean).
- (g) Workstream empty state — PASS. Picker opens to "No workstreams yet"; no crash.
- "Add task" disabled while title empty; enables on title — PASS.

Screenshots (in session transcript): before = user-provided hand-rolled "Add Task"; after = canonical "Create task" modal, validation-errors state, post-close dashboard.

### Slice 2 — View Task = View Story parity (2026-06-27)

**Change:** `TaskCatalystView.tsx` breadcrumb props → `projectName="Tasks"` (+ projectKey fallback 'TASKS'), so the root crumb is a stable **"Tasks"** via the same canonical `TicketBreadcrumbs` Story uses. Surgical 1-block diff.

**Static**
- `git diff --name-only` = `src/components/catalyst-detail-views/task-catalyst/TaskCatalystView.tsx` (only).
- tsc (`-p tsconfig.app.json`): **0 errors in the file**; total 181 = unchanged baseline.
- eslint: file has 17 pre-existing `any`-cast errors (lines 1,85,132,150,…,419,427) — **none on my changed lines (649–658)**; my edit introduces 0 new problems. (These pre-existing errors are a Slice-6/cleanup concern, flagged.)

**Live (Chrome MCP, worktree :8081, branch claude/angry-lovelace-a4b08e)** — seeded 1 temp workstream + status + task (`TMP-888878`), then removed (0 remaining).
- (a) /tasks/overview opens — PASS.
- (b) seeded task route `/tasks/view/TMP-888878` opens — PARTIAL: route + canonical shell mount (breadcrumb renders), but BODY shows canonical "Task not found".
- (c) Breadcrumb root = **"Tasks"** — PASS (confirmed live; previously showed the workstream name). Item-key crumb shows when data loads.
- (d) status/sidebar/header via canonical pattern — **NOT live-verifiable** in this env: `TaskCatalystView.useTaskDetail` embed 400s with PGRST200 (no `tasks`↔`task_statuses` FK — DEFECT-002), app-wide, independent of my change. Canonical wiring confirmed by CODE READ (TaskCatalystView already mounts CatalystViewBase + CatalystSidebarDetails(dataSource) + CatalystStatusPill).
- (e) page does not crash on missing data — PASS (degrades to canonical "Task not found").
- (f) seeded records removed after screenshots — PASS (deleted 1 task / 4 workstreams / 1 status; 0 remaining).

**Blocker:** DEFECT-002 (missing `tasks→task_statuses` FK) prevents live render of the detail body → full sidebar/status/header parity could not be screenshotted. Needs a schema FK (forbidden in Slice 2). Breadcrumb parity verified live.

### Slice 3 — Task data-model hardening (migration file ONLY, not applied) (2026-06-27)

**Deliverable:** `supabase/migrations/20260627160000_tasks_fk_and_key_hardening.sql` (new, untracked).

**Live discovery (REST probes, no data created):**
- FK embeds all fail PGRST200: tasks→task_statuses, tasks→task_workstreams, tasks→profiles(assignee). → 6 FKs missing.
- `tasks.parent_task_id` column **does not exist** (400 "column does not exist") → self-FK N/A, excluded.
- Target PKs exist: profiles/task_statuses/task_workstreams `id` (200).
- Column nullability (types.ts tasks Row): status_id NOT NULL; workstream_id/assignee_id/created_by/reporter_id/reviewer_id nullable; key NOT NULL.
- RLS-001: anon (no token) READ ok (200) AND anon DELETE ok (200, 0 rows) → RLS off/permissive on tasks family.

**Migration contents:** orphan pre-checks (RAISE on any orphan) → 6 FKs (NOT VALID then VALIDATE; status_id RESTRICT, rest SET NULL) → PLN-N key trigger on `tasks` (fires only when key null/blank, never overwrites) → rollback SQL (commented) → opt-in RLS hardening (commented, justified).

**Validation:**
- `git status --short`: only the new untracked .sql. `git diff --name-only`: empty (no tracked file changed). No `.tsx`/`.ts` changed → tsc/eslint N/A.
- SQL syntax: no psql/sqlfluff/pg_format on PATH → no automated lint; hand-verified; key trigger copied verbatim from proven `generate_planner_task_key` (migration 20260113233959).
- No migration applied (D-010). No seed data created. Branch claude/angry-lovelace-a4b08e. Main checkout clean.

**Post-apply verification SQL (for when Vikram applies):**
- FKs present: `select conname from pg_constraint where conrelid='public.tasks'::regclass and contype='f';` (expect 6).
- Key trigger: `select tgname from pg_trigger where tgrelid='public.tasks'::regclass and tgname='set_task_key';`
- Embed works: REST `tasks?select=*,status:task_statuses(*),workstream:task_workstreams(id),assignee:profiles!tasks_assignee_id_fkey(id)&limit=1` → 200.
- Key autogen: insert a task without `key` → row gets `PLN-<n>`.

### Slice 5 — Workstreams CRUD page (2026-06-27)

**Files:** new `WorkstreamsManagerPage.tsx` + `WorkstreamFormModal.tsx`; `FullAppRoutes.tsx` route re-point (+lazy import).

**Static:** tsc 0 errors in new files (total 181 baseline). eslint 0 errors (4 @atlaskit-import warnings in WorkstreamFormModal = same tolerated create-modal pattern; 1 hook-deps annotated).

**Live (Chrome MCP, worktree :8081):**
- `/tasks/workstreams` opens — NOT 404 (was 404). Canonical CatalystPageHeader + search + JiraTable (Name+color dot / Key lozenge / Lead avatar / Tasks / Status lozenge / ⋯).
- CREATE — modal (PortalFix) → created `TEMP_SLICE5_VALIDATION` (auto key TEM), appears in list. PASS.
- EDIT/RENAME — ⋯→Edit, prefilled, renamed to `TEMP_SLICE5_RENAMED`, persisted. PASS.
- ARCHIVE — ⋯→Archive → left active list, "Archived (n)" count updated, archived view shows ARCHIVED lozenge. PASS.
- DELETE — ⋯→Delete → canonical ConfirmDeleteDialog ("can't be undone") → confirmed, row removed. PASS.
- EMPTY STATE — "No workstreams yet" + Create CTA. PASS. LOADING state observed (JiraTable isLoading).
- CREATE-TASK SELECTOR INTEGRATION (#6) — UI-created workstreams (`TEMP_SLICE5_SELECTOR`, `TEMP_SLICE5_UICREATE`) BOTH appear in the Create Task modal Workstream dropdown. PASS (shared useTaskWorkstreams + ['planner-workstreams'] invalidation).
- Page survives refresh (navigated repeatedly). +Create default-to-Task (Slice 1) still works.

**Notes:** REST-created workstreams (validation shortcut) showed a stale-cache artifact in the selector because the app persists react-query and REST bypasses invalidation; UI-created ones propagate correctly (the real path). Minor pre-existing bug noted: `useDeleteWorkstream`/`useArchiveWorkstream` don't always invalidate `planner-workstreams-archived-count` → the "Archived (n)" badge can lag (NOT my code; logged).

**Cleanup:** deleted both TEMP_SLICE5 workstreams → 0 TEMP remaining (verified). 8081 scaffolding + pg install removed. Worktree: 3 Slice-5 changes uncommitted (commit gate).

### Slice 6 — Task <-> work-item linking (2026-06-27)

**Files:** new migration `20260627170000_task_work_item_links.sql`; new `useTaskWorkItemLinks.ts`; new `TaskLinkedItemsSection.tsx`; `TaskCatalystView.tsx` integration (import + mount after Attachments, before Activity).

**Static:**
- tsc (`-p tsconfig.app.json`): 0 errors in Slice-6 files; total 181 baseline.
- eslint: 0 errors (4 @atlaskit-import warnings = tolerated pattern).
- Migration contents verified: table `task_work_item_links`; FK task_id→tasks ON DELETE CASCADE; FK created_by→profiles ON DELETE SET NULL; UNIQUE(task_id, work_item_key); CHECK `lower(work_item_type) <> 'sub-task'`; indexes on task_id + work_item_key; rollback SQL (commented).
- Hook: queries `task_work_item_links` by task_id, enriches from ph_issues; add = insert junction (created_by=auth user); remove = delete by id; picker `searchLinkableWorkItems` excludes `issue_type ilike sub-task`/`subtask`. Duplicate handled in UI (onError → flag.warning "Already linked").

**Live (read-only ph_issues probe, what's possible without the task view rendering):**
- Picker exclusion (rule #1) VALIDATED: DB has **148 sub-task issues**; the picker query (`not.ilike sub-task/subtask`) returned **50 items with 0 sub-tasks**; distinct types surfaced = Story, Production Incident, Epic, QA Bug, Backend, Frontend → supported targets present, sub-task excluded.

**BLOCKED by DEFECT-002 (honest):** the link section renders INSIDE `TaskCatalystView`, which shows "Task not found" env-wide until the tasks-FK migration is applied. Also the junction table is write-only (not applied). So live add/unlink + junction CRUD could NOT be exercised. Not faked.

**Data:** no TEMP_SLICE6_VALIDATION records created (junction not applied; only read probes) → 0 remaining. No migration applied. No scaffolding started.
