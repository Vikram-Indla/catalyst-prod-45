# CAT-TASKS-20260627-001 — Plan Lock

> Status: DRAFT — awaiting Vikram approval before any implementation.
> Branch: claude/angry-lovelace-a4b08e (RING-FENCED to tasks module only).

## Feature Work ID
CAT-TASKS-20260627-001

## Feature name
tasks — Task Management module overhaul

## Locked decisions (Vikram, 2026-06-27)
- Workstream-page parity target = **AllProjectsPage** (`/project-hub/projects`).
- Task<->work-item linkage = **new junction table** (many-to-many), e.g. `task_work_item_links`.
- Workstream rebuild = **new test route then cut over** (e.g. `/tasks/workstreams-v2`).
- **First slice = Create Task modal parity** (this Plan Lock).
- Live tables are `tasks` / `task_statuses` / `task_workstreams` (NOT the legacy `planner_*`).
- Toast = `flag.*()` (ADS @atlaskit/flag from `src/components/shared/JiraTable/flags.tsx`). User picker = MiniAvatar pattern (@atlaskit/avatar + resolveAvatarUrl), identical to Story.

---

## FULL FEATURE SEQUENCE (each slice gets its own Plan-Lock approval)
- **Slice 1 (THIS LOCK): Create Task modal parity** + default-to-Task in global Create when in /tasks/*.
- Slice 2: View Task = View Story parity (CatalystViewBase shell, TicketBreadcrumbs, CatalystSidebarDetails).
- Slice 3: Task<->work-item linking — junction table migration + link UI on task view (rules #1/#2).
- Slice 4: Workstream page — AllProjectsPage replica w/ full CRUD on test route, then cut over.
- Slice 5: Wiring — notifications on assign/create/status, home-page surfacing, Timeline/Board/All-Work/Kanban.
- Slice 6: ADS sweep — remaining hand-rolled + 135+ banned colors (esp. tasks/insights/*).

---

# ===== SLICE 1 — CREATE TASK MODAL PARITY =====

## Timebox
2 hours — one slice.

## Objective
Refactor the Create Task modal to exact Atlassian/Create-Story parity using only canonical Catalyst / @atlaskit components, WITHOUT breaking existing call sites or the `useCreateTaskMutation` data path; and make the global Create flow default the work-item type to **Task** whenever the user is inside the tasks module.

## Business outcome
Creating a task feels identical to creating a story/business request (same shell, controls, user picker, toast), and the `+ Create` button inside Tasks goes straight to task creation.

## Exact slice
1. Rebuild `CreateTaskModal` internals with: PortalFix modal shell, `@atlaskit/form` Fields, `@atlaskit/textfield` (title + description multiline), `@atlaskit/select` (workstream, priority, assignee), `@atlaskit/datetime-picker` (start + due), `@atlaskit/button/new` (Cancel/Add), `flag.*()` success/error. Keep exported component name + props `{open,onOpenChange,defaultWorkstream,onSuccess}` and the `PlannerCreateModal` wrapper unchanged.
2. Rebuild the three field components (`AssigneeSelect`, `PrioritySelect`, `WorkstreamSelect`) on `@atlaskit/select`. Assignee renders MiniAvatar (@atlaskit/avatar size=small + resolveAvatarUrl) — visually identical to Story's picker.
3. Wire `CreateDropdown.tsx` so `defaultWorkType='Task'` when the active route is `/tasks/*` (Task selection routes through existing `onOpenTask` to the refactored modal). Preserve current Story / Business-Request defaults elsewhere.

## Non-scope (explicitly NOT this slice)
View-task parity; junction table / linking; workstream page; notifications/home/timeline wiring; insights Tailwind cleanup; any change to `useCreateTaskMutation` insert logic or invalidation keys; any DB migration.

## Canonical components (selected)
- PortalFix modal — `src/components/workhub/create-story/PortalFix.tsx`
- @atlaskit/form, @atlaskit/textfield, @atlaskit/select, @atlaskit/datetime-picker, @atlaskit/button/new, @atlaskit/avatar
- PriorityIcon — `src/components/icons/PriorityIcon.tsx`
- flag toast — `src/components/shared/JiraTable/flags.tsx`
- resolveAvatarUrl (avatar cascade, per CreateStoryModal)

## Canonical screens (reference)
- `src/components/workhub/create-story/CreateStoryModal.tsx` (parity reference)
- `src/components/business-requests/CreateBusinessRequestModal.tsx` (format consistency)

## Files to modify
- `src/modules/tasks/components/CreateTaskModal/CreateTaskModal.tsx` — rebuild UI with canonical components; keep props/exports/submit hook.
- `src/modules/tasks/components/CreateTaskModal/fields/AssigneeSelect.tsx` — @atlaskit/select + MiniAvatar.
- `src/modules/tasks/components/CreateTaskModal/fields/PrioritySelect.tsx` — @atlaskit/select + PriorityIcon.
- `src/modules/tasks/components/CreateTaskModal/fields/WorkstreamSelect.tsx` — @atlaskit/select.
- `src/modules/tasks/components/CreateTaskModal/types.ts` — option/types only if needed.
- `src/components/ja/CreateDropdown.tsx` — default work-type to 'Task' on /tasks/* (surgical, ~1 line + route check).

## Files forbidden
- `src/modules/tasks/components/CreateTaskModal/hooks/useCreateTaskMutation.ts` — READ-ONLY (do not touch insert/invalidation).
- `src/components/workhub/create-story/CreateStoryModal.tsx` — do not refactor Story to share code (avoid Story regression); replicate the building blocks instead.
- Any DB migration / `planner_*` table. Any file outside the modify list.

## UI/UX rules
- ADS tokens only (`var(--ds-*)` / `token()`); ZERO hex, rgb, hsl, Tailwind color classes.
- No hand-rolled modal/dropdown/calendar/input/button/avatar — canonical or @atlaskit only.
- Zero-assumption rendering: unknown assignee/workstream => empty, never a fake default.
- Title required; required-field validation matches Story modal behavior.

## Data/backend rules
- No schema change. Submit path stays `useCreateTaskMutation` -> `tasks` insert, with all existing invalidation keys untouched.

## Integration/wiring rules
- `CreateDropdown` default-to-Task must be route-driven and must not change Story/BR defaults elsewhere.
- Refactored modal must still satisfy every existing caller of `CreateTaskModal` / `PlannerCreateModal`.

## Parallel discovery agents
All 5 discovery agents ran (see 12_AGENT_OUTPUTS.md / 02_CANONICAL_DISCOVERY.md). Planner + QA captured below.

## Karpathy loop hypotheses
- [LOOP-001] Live task table is `tasks` not `planner_tasks` — CONFIRMED (62 code refs; insert in useCreateTaskMutation hits `tasks`). KEEP.
- [LOOP-002] CreateStoryModal already supports `defaultWorkType` + `onOpenTask` handoff — CONFIRMED (CreateStoryModal:135,403; CreateDropdown:62). KEEP — reuse this path for default-to-Task.
- [LOOP-003] Refactoring modal internals while preserving props keeps all call sites working — TO VALIDATE in execution (grep callers, tsc).

## Screenshot checklist
- [ ] Create Task modal (light) — canonical shell, all fields.
- [ ] Create Task modal (dark) — tokens correct, no bare colors.
- [ ] Assignee select open — MiniAvatar faces identical to Story picker.
- [ ] Start/Due @atlaskit/datetime-picker open.
- [ ] Success `flag` toast on create.
- [ ] `+ Create` inside /tasks/* opens Task creation by default; `+ Create` in project hub still defaults Story.

## Validation commands
```bash
npx tsc --noEmit -p tsconfig.app.json   # compare against ~157 baseline errors, no NEW errors
# DOM/behaviour probes via Chrome MCP (vitest is broken on Node 20)
```

## Regression risks
- Changing modal props would break callers — MITIGATION: keep props/exports identical; grep all callers first.
- `CreateDropdown` default change leaking into non-tasks routes — MITIGATION: strict route guard, screenshot both contexts.
- @atlaskit/datetime-picker date format mismatch with existing `start_date`/`due_date` (date strings) — MITIGATION: format to ISO yyyy-MM-dd before submit, matching current hook input.

## Stop conditions
- Any banned color introduced → stop.
- Any hand-rolled UI introduced → stop.
- NEW TypeScript error above baseline → stop.
- Any caller of CreateTaskModal breaks → stop.

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert. No endless patching.

## Commit rules
Stage explicit files only (never `git add -A`). Commit message references CAT-TASKS-20260627-001. Screenshot signoff required before commit.

## Vikram amendments (2026-06-27, on approval)
A1. Screenshot evidence to lock: current Add Task modal is NOT acceptable (visibly hand-rolled, not Catalyst/Atlassian-aligned) — capture before/after.
A2. `/tasks/workstreams` returns 404 — logged as confirmed defect/gap for **Slice 4** (NOT fixed in Slice 1).
A3. Default-to-Task: inside `/tasks/*`, global `+ Create` opens the dedicated Create Task flow DIRECTLY. Never open Story as default; never require manual work-type change.
A4. User picker: replicate Story picker building blocks inside Tasks for Slice 1 — log as TEMPORARY TECH DEBT (future: extract shared module). Do NOT refactor CreateStoryModal; do NOT change Story behavior.
A5. Constraints (hard): useCreateTaskMutation untouched; no DB migration; no schema change; no workstream CRUD; no View Task; no notifications/home/timeline wiring; no broad ADS sweep. Only Slice-1 files unless a dependency is proven AND logged before modification.
A6. Modal parity requirements: canonical-first then @atlaskit; no hand-rolled shell/toast; no banned colors; no raw Tailwind visual styling where a canonical/ADS primitive exists. Match Create Story / Create Business Request on density, spacing, footer, close behavior, validation, loading, disabled, error. Required fields clearly marked. Save disabled while invalid/submitting. Cancel/Close consistent. Success/failure via Catalyst/ADS flag only. Priority selector: no custom non-ADS colored pills unless already canonical. Assignee = same avatar/user pattern as Story. Workstream selector gracefully handles zero workstreams.
A7. Validation before "done": tsc; lint if available; targeted build/test if available; manual checks (a) /tasks/overview opens (b) +Create from /tasks/* opens Create Task not Story (c) modal opens without visual break (d) required validation works (e) Cancel + X close (f) submit calls existing mutation without breaking caller props (g) workstream empty state no crash. Capture before/after screenshots. Report exact files changed + exact validation output.
A8. STOP after Slice 1 + validation. No Slice 2 without approval. Deliver ruthless delta report (changed / unchanged / remaining gaps / validation evidence / screenshot evidence / risks-debt / next Slice 2 recommendation).

## Plan Lock status
Slice 1: APPROVED (amendments A1–A8) + COMMITTED 2f7122a66 ("feat(tasks): align create task modal with ADS create flow"). 2026-06-27.

---

# ===== SLICE 2 — VIEW TASK = VIEW STORY PARITY (DRAFT) =====
> Status: DRAFT — awaiting Vikram approval. NO CODE until approved.

## Timebox
2 hours — one slice.

## Discovery findings (2 parallel read-only agents, 2026-06-27)
1. **Task detail route + files:** `/tasks/view/:taskKey` (FullAppRoutes.tsx:638) → `src/modules/tasks/pages/TasksDetailPage.tsx` → `CatalystDetailRouter` with `entityKind='task'`, `fullPageMode`, `projectKey='TASKS'`.
2. **Story detail + canonical files:** `CatalystViewStory` (`src/components/catalyst-detail-views/story/CatalystViewStory.tsx`) inside `CatalystViewBase` (`shared/CatalystViewBase.tsx`), breadcrumb `TicketBreadcrumbs` (`src/modules/project-work-hub/components/TicketBreadcrumbs.tsx`), `CatalystSidebarDetails` (`shared/sections/CatalystSidebarDetails.tsx`), `CatalystStatusPill` (`shared/sections/CatalystStatusPill.tsx`).
3. **Already uses CatalystDetailRouter?** YES. `entityKind='task'` short-circuits to **`TaskCatalystView`** (`src/components/catalyst-detail-views/task-catalyst/TaskCatalystView.tsx`), which renders **CatalystViewBase + CatalystSidebarDetails (via `dataSource` adapter → tasks table) + CatalystStatusPill**. So the canonical SHELL parity already largely EXISTS. (Note: a separate `task/CatalystViewTask.tsx` handles Jira/ph_issues tasks — NOT our path; leave it alone.)
4. **Breadcrumb required = `Home › Tasks › [Task key]`.** Current TaskCatalystView passes `projectKey=workstream.key_prefix`, `projectName=workstream.name||'Tasks'`, `itemType='Task'`, `parentKey=null` → renders `[Workstream] › Task › KEY`. `TicketBreadcrumbs` builds `Project › Parent › KEY` (no leading "Home"). Target wording differs → needs alignment via props (projectName='Tasks', projectHref='/tasks/overview') and a decision on the leading "Home" crumb.
5. **Components to reuse (no modification):** CatalystViewBase, TicketBreadcrumbs, CatalystSidebarDetails, CatalystStatusPill, CatalystViewBase layout primitives — all already consumed by TaskCatalystView.

## Objective
Bring the **Tasks-Hub task detail view** (`TaskCatalystView`) to visual + behavioral parity with the Story view: correct **`Home › Tasks › [key]`** breadcrumb, story-equivalent shell/sidebar/status-pill presentation, and aligned more-menu — WITHOUT modifying shared canonical components and WITHOUT task↔work-item linking (Slice 3) or sprint/release (N/A to tasks).

## Exact slice
1. Breadcrumb → `Home › Tasks › [task key]` (the explicit requirement). Achieve via props on TaskCatalystView (projectName='Tasks', projectHref='/tasks/overview', itemType='Task'); decide leading-"Home" crumb approach (see Risks — may need a TicketBreadcrumbs prop; if so, RAISE before touching shared file).
2. Verify TaskCatalystView's shell/sidebar/status-pill render identically to CatalystViewStory (spacing, sidebar field order, status pill, title editor, activity). Fix only task-side divergences.
3. Align the more-menu to story conventions where applicable to tasks (Copy link, Delete today → add what's task-appropriate; Clone/Move/Archive only if trivially supported — else defer + log).

## Non-scope (NOT Slice 2)
Task↔work-item linking / LinkedWorkItemsSection (Slice 3) · Acceptance Criteria / Subtasks panels (defer; tasks have no subtasks per rules) · Release/Sprint (N/A) · notifications/home/timeline (Slice 5) · workstream page (Slice 4) · any DB/schema change · CreateTaskModal (Slice 1, done) · the Jira `task/CatalystViewTask.tsx`.

## Files PROPOSED for modification
- `src/components/catalyst-detail-views/task-catalyst/TaskCatalystView.tsx` — breadcrumb props, more-menu, any task-side presentation divergence.
- (possibly) `src/modules/tasks/pages/TasksDetailPage.tsx` — only if breadcrumb/props plumbing requires it.

## Files FORBIDDEN to modify
- `CatalystViewBase.tsx`, `CatalystSidebarDetails.tsx`, `CatalystStatusPill.tsx`, `TicketBreadcrumbs.tsx`, `CatalystViewStory.tsx` (shared canonical — reuse via props; if a shared change is truly required, STOP and raise a RED FLAG).
- `task/CatalystViewTask.tsx` (different/Jira path).
- `useCreateTaskMutation.ts`, any migration/`.sql`, any workstream/notification/timeline file.

## UI/UX rules
ADS tokens only; canonical-first; zero hand-rolled UI; zero-assumption rendering (no fake parent/status defaults); match Story density/spacing/sidebar order.

## Data/backend rules
No schema change. Task detail reads `tasks` (+ status/workstream/assignee joins) via existing `useTaskDetail`; writes via existing `dataSource` callbacks. Untouched.

## Validation plan
- `npx tsc --noEmit -p tsconfig.app.json` — no NEW errors over baseline.
- `eslint --no-cache` on touched files — 0 errors.
- Live Chrome MCP: open a real task detail at `/tasks/view/:taskKey`; verify breadcrumb = `Home › Tasks › KEY`, sidebar/status/title parity, more-menu. Side-by-side vs a Story detail.

## Screenshot plan
Before (current task detail breadcrumb + layout) · after (Home › Tasks › KEY + story-parity) · a Story detail for side-by-side.

## Risks / debt
- **R1 (BLOCKER for live validation):** this env has **zero tasks and zero workstreams** (DATA-001) → no task detail to open. Slice 2 visual validation needs ≥1 task. PROPOSAL: with consent, seed one workstream + one task (SQL/Supabase MCP) purely for validation, or point me at an env that has tasks. **Needs Vikram decision.**
- **R2:** leading "Home" crumb may not be supported by TicketBreadcrumbs without a prop change (shared file = forbidden). If required, RAISE before editing; fallback = first crumb "Tasks" linking to /tasks/overview.
- **R3:** more-menu Clone/Move/Archive for tasks may need new handlers — if non-trivial, defer to a later slice and log, rather than expand Slice 2.

## Stop conditions
Banned color · hand-rolled UI · NEW tsc error · need to modify a forbidden shared file · scope creep into linking/sprint → STOP.

## Plan Lock status (Slice 2)
APPROVED (Option 1) + COMMITTED e824c333e ("feat(tasks): align task detail breadcrumb with tasks module"). 2026-06-27. DEFECT-002 deferred to Slice 3.

---

# ===== SLICE 3 — TASK DATA-MODEL HARDENING / SCHEMA REPAIR (DRAFT) =====
> Status: DRAFT — discovery + plan only. NO code/migration until Vikram approves.

## Discovery findings (live FK probe + migrations agent, 2026-06-27)
1. **Live tables:** `tasks`, `task_statuses`, `task_workstreams` are **Lovable-created — NOT present in any repo migration** (no CREATE TABLE in supabase/migrations; only reflected in `src/integrations/supabase/types.ts`). Legacy `planner_tasks`/`planner_statuses`/`planner_workstreams` ARE in migrations (20260113233959), have proper FKs + key trigger, and run **in parallel** (no rename, no bridging views) — i.e. stale duplicates the app does NOT use.
2. **FK gaps (root of DEFECT-002), all confirmed live (PGRST200):**
   - `tasks.status_id` → `task_statuses.id` — MISSING
   - `tasks.workstream_id` → `task_workstreams.id` — MISSING
   - `tasks.assignee_id` → `profiles.id` (embed expects FK name `tasks_assignee_id_fkey`) — MISSING
   - also expected by types.ts: `tasks.created_by`, `reporter_id`, `reviewer_id` → `profiles.id`; `parent_task_id` → `tasks.id` (self).
   PostgREST needs real DB FKs to resolve `TaskCatalystView.useTaskDetail` embeds → without them the detail body can't load.
3. **Key generation:** trigger `set_planner_task_key`/`generate_planner_task_key()` is on **`planner_tasks`**, generating `PLN-N` (20260113233959:94-113). **No trigger/default on `tasks.key`**, which is NOT NULL → direct inserts (incl. the app's `useCreateTaskMutation`, which omits key) fail unless key supplied. Explains empty tasks dataset in this env.
4. **RLS:** migrations define RLS for `planner_*` but **NOT** for `tasks`/`task_statuses`/`task_workstreams`. Agent inferred "RLS off", BUT live diverges from migrations (Lovable may set RLS via its UI) — observed: authenticated writes succeed. **RLS state is UNVERIFIED. Must probe live before any RLS change. Do NOT blindly enable/alter RLS** (risk: break app if app relies on current posture, or duplicate existing Lovable policies).
5. **Migrations stale/duplicated:** `planner_*` family is legacy/parallel; key + notification triggers split across tables (`catalyst_notify_tasks` IS correctly on `tasks` — 20260617030000 — but reads `task_statuses`, so it silently NULLs status until FK/data exist).

## Objective
Produce (NOT yet apply) a precise, reversible repair migration that adds the missing `tasks` FK constraints + a `tasks.key` auto-generation mechanism so the canonical `TaskCatalystView` embeds resolve and tasks can be created — restoring the task detail view end-to-end. Schema-only; no app code, no feature work.

## Exact slice (planned — pending approval + decisions below)
1. Migration adds FKs on `tasks`: status_id→task_statuses (ON DELETE RESTRICT), workstream_id→task_workstreams (SET NULL), assignee_id/created_by/reporter_id/reviewer_id→profiles (SET NULL), parent_task_id→tasks (SET NULL). Use `ADD CONSTRAINT … NOT VALID` then `VALIDATE CONSTRAINT` (online-safe), after an orphan-row pre-check.
2. Migration adds `tasks.key` generation (trigger + function, mirroring `generate_planner_task_key` but on `tasks`). **Key format = DECISION D-008.**
3. (Conditional) RLS: only if live probe shows `tasks*` RLS is OFF/insecure → add permissive policies matching `planner_tasks`. Otherwise OUT of scope. **DECISION D-009.**

## Non-scope (NOT Slice 3)
Task↔work-item linking (its own slice) · workstream CRUD page (Slice 4) · notifications/home/timeline/board wiring (Slice 5) · ADS sweep (Slice 6) · dropping/migrating legacy `planner_*` (separate cleanup) · any app/TSX code change.

## Files PROPOSED for modification
- ONE new migration: `supabase/migrations/<ts>_tasks_fk_and_key_hardening.sql`. (Possibly regenerate `src/integrations/supabase/types.ts` AFTER apply — flag before touching.)

## Files FORBIDDEN
- Any existing migration (no edits to history) · any `.tsx`/app code · `planner_*` tables · CreateTask/CreateStory/workstream/notification/timeline/board files.

## How the migration gets APPLIED (key constraint)
The dev DB `cyijbdeuehohvhnsywig` is **NOT in the connected Supabase MCP** (only `lmqwtldpfacrrlvdnmld` = catalyst-prod is, which must NOT be touched). So Slice 3 can WRITE the migration file but applying it needs either: (a) Vikram applies via the project's pipeline (`supabase db push`/CI) to the dev project, or (b) the dev project ref is added to an MCP for `apply_migration`. **DECISION D-010.**

## Validation plan (post-apply)
- Pre-apply: orphan-row check (`select count(*) from tasks where status_id not in (select id from task_statuses)`, etc.).
- Post-apply: re-run the live FK probe → all embeds 200; insert a task WITHOUT key → trigger fills it.
- DB introspection: confirm 6 FKs + trigger exist.

## UI validation after schema fix
- Seed temp workstream+status+task (TEMP_SLICE3_VALIDATION), then: `/tasks/view/:taskKey` renders the FULL canonical detail body (left content + sidebar + status pill + title), breadcrumb stays `Tasks › KEY`; remove temp data after. Screenshot before/after + Story side-by-side.

## Rollback strategy
Migration is reversible: `DROP CONSTRAINT` for each FK + `DROP TRIGGER`/`DROP FUNCTION`. Document down-migration. FKs added NOT VALID first → if VALIDATE fails on orphans, abort cleanly without locking.

## Risks / debt
- **R1:** Adding FKs to a table with orphan data fails — pre-check + clean/null orphans first. (This env's `tasks` is empty → trivial; other envs may differ.)
- **R2:** RLS posture unknown — must verify live; changing it blindly is dangerous (D-009).
- **R3:** Migration cannot be applied via MCP to the dev DB (D-010) — needs Vikram's pipeline or MCP access.
- **R4:** `types.ts` regen after apply may produce a large diff — handle as a separate, flagged step.
- **R5:** Legacy `planner_*` duplication remains (out of scope; note for a cleanup slice).

## Decisions needed before Slice 3 execution
- **D-008 (key format):** `tasks.key` generator → `PLN-N` (matches existing useCreateTaskMutation comment) vs workstream `key_prefix`-based (e.g. `TMP-N`) vs `TASK-N`. Recommend **PLN-N** for continuity unless you want per-workstream prefixes.
- **D-009 (RLS):** verify live RLS; include permissive policies only if OFF/insecure, else exclude from Slice 3? Recommend **verify + include only if needed**.
- **D-010 (apply path):** you apply the migration file via pipeline, OR add `cyijbdeuehohvhnsywig` to an MCP for apply_migration?
- **D-011 (FK set):** confirm the full FK set (status, workstream, assignee, created_by, reporter, reviewer, parent_task_id self) — all, or a minimal subset (status+workstream+assignee) to unblock the view?

## Stop conditions
Editing existing migrations · touching app code · enabling RLS without live verification · adding FKs without orphan pre-check · scope creep into linking/CRUD/wiring → STOP.

## Plan Lock status (Slice 3)
APPROVED + COMMITTED f2036e2a6 ("fix(tasks): add task fk and key hardening migration") — file only, NOT applied. RLS deferred (RLS-001 open). 2026-06-27.

---

# ===== APPLY GATE (Slice 3 migration) — Vikram/pipeline action, not Claude =====
Claude cannot reach the dev DB `cyijbdeuehohvhnsywig` (only catalyst-prod is in MCP). Safe apply path:
1. **Apply (you/pipeline):** on a feature/staging branch of the dev project, `supabase db push` (or run the SQL via the Supabase SQL editor for that project). NOT catalyst-prod. The migration is reversible (rollback block in-file) and orphan-guarded (aborts cleanly if bad data).
2. **Verify FKs:** `select conname from pg_constraint where conrelid='public.tasks'::regclass and contype='f';` → expect 6 (tasks_status_id_fkey, _workstream_id_fkey, _assignee_id_fkey, _created_by_fkey, _reporter_id_fkey, _reviewer_id_fkey).
3. **Verify embeds:** REST `tasks?select=*,status:task_statuses(*),workstream:task_workstreams(id),assignee:profiles!tasks_assignee_id_fkey(id)&limit=1` → **200** (no PGRST200).
4. **Verify key autogen:** insert a task WITHOUT `key` → row gets `PLN-<n>`.
5. **Regen types (only if needed):** `types.ts` already lists these FK relationships, so a runtime-200 embed likely means NO regen needed. If PostgREST/types drift, run `supabase gen types typescript` for the dev project (you/pipeline — Claude has no dev-DB MCP) and commit the diff separately.
6. **Confirm to Claude** the migration is applied → unblocks Slice 4 execution.

---

# ===== SLICE 4 — TASK DETAIL VALIDATION CLOSURE (Option A) (DRAFT) =====
> Status: DRAFT. ENTRY GATE: Slice 3 migration applied to the dev DB (above) + Vikram confirms. No execution before that. No code unless type-regen requires it.
> Chosen over Option B (workstream CRUD) because task detail is still blocked in the live DB until the migration applies; close DEFECT-002 end-to-end before new surfaces.

## Objective
Prove the canonical Task detail view renders end-to-end after the FK/key migration, regenerate Supabase types if (and only if) needed, and formally CLOSE DEFECT-002.

## Exact slice
1. Re-run the FK-embed + key-autogen verification (REST) against the dev DB post-apply.
2. If embeds 200 and types match → no `types.ts` change. If drift → regenerate types (you/pipeline), Claude reviews + commits the diff as its own file.
3. Live UI closure: seed temp workstream+status+task (`TEMP_SLICE4_VALIDATION`), open `/tasks/view/:taskKey`, confirm FULL canonical body renders (left content + `CatalystSidebarDetails` + `CatalystStatusPill` + title), breadcrumb stays `Tasks › KEY`; screenshot before/after + Story side-by-side; remove temp data.
4. Mark DEFECT-002 RESOLVED in 08_DRIFT_LOG.md.

## Non-scope
Workstream CRUD page (now Slice 5) · task↔work-item linking · notifications/home/timeline/board wiring · RLS-001 (dedicated security slice) · ADS sweep · any new feature code.

## Files proposed
Likely NONE (validation only). Possibly `src/integrations/supabase/types.ts` IF regen is required (flagged + committed separately).

## Files forbidden
App/UI `.tsx`, any migration (Slice 3 is committed/frozen), workstream/notification/timeline/board files, RLS.

## Validation plan
REST embed 200 · key autogen PLN-N · live full-body render · tsc/eslint ONLY if types.ts regenerated · no seed data left.

## Risks / debt
- R1: cannot self-apply migration (dev DB not in MCP) → gated on you.
- R2: if apply reveals orphan data in a non-empty env, migration aborts (by design) → clean orphans, re-run.
- R3: type regen needs dev-DB introspection (you/pipeline) — Claude can't run it for the dev project.

## Updated full sequence (renumbered)
Slice 4 = Task detail validation closure (this) · Slice 5 = Workstream page (AllProjects replica, CRUD, test route) · Slice 6 = wiring (notifications/home/timeline/board) · Slice 7 = ADS sweep · + dedicated **RLS-001 security slice** + **task↔work-item linking slice** (schedule with Vikram).

## Plan Lock status (Slice 4)
DRAFT — superseded by sequencing change. Task-detail closure folded into the DEFECT-002 apply gate; Workstreams brought forward as Slice 5.

---

# ===== SLICE 5 — WORKSTREAMS CRUD PAGE =====
APPROVED + COMMITTED da00b9569 ("feat(tasks): add workstreams CRUD page"). 2026-06-27.
Files: WorkstreamsManagerPage.tsx (new), WorkstreamFormModal.tsx (new), FullAppRoutes.tsx (route re-point). /tasks/workstreams no longer 404; full CRUD + selector integration validated live. Follow-ups logged (DEFECT-002, RLS-001, archived-count invalidation, dropdown placement, lead field).

---

# ===== SLICE 6 — TASK <-> WORK-ITEM LINKING (DRAFT) =====
> Status: DRAFT — discovery + plan only. NO code/migration until approved.

## Discovery findings (2026-06-27)
1. **Work-item model:** Catalyst work items are Jira-synced rows in **`ph_issues`** (issue_key + issue_type), rendered via the canonical type registry (`src/components/icons/icons.registry.ts`): story, task, epic, **sub-task**, qa-bug, feature, change-request, business-request, production-incident, business-gap, defect, etc.
2. **Excluded category = `sub-task` ONLY** (registry id `'sub-task'`).
3. **Supported link targets** = every work-item type EXCEPT sub-task: Story, Production Incident, Epic, Feature, Business Request, Defect, Change Request, QA Bug, Business Gap, Task.
4. **No existing task link table** in committed migrations (verified) → a NEW migration is required (decision D-002). Tasks have NO `linked_work_item` columns today.
5. **Canonical link UI exists**: `LinkedWorkItems` / `LinkedWorkItemsSection` (used by CatalystViewStory, CatalystViewEpic, CatalystViewDefect, the Jira `task/CatalystViewTask`) — but is ABSENT from our Tasks-Hub `TaskCatalystView`. Mirror it.

## Objective
Enable a Tasks-Hub task to be linked to any Catalyst work item EXCEPT sub-task (rules #1/#2), via a many-to-many junction, surfaced in the task detail view using the canonical linked-items UI.

## Exact slice (planned)
1. **Migration (write-only, same apply-gate as Slice 3 — D-010):** new `task_work_item_links` junction.
2. **Data hook:** `useTaskWorkItemLinks(taskId)` (+ add/remove mutations) → junction + ph_issues join for display.
3. **UI:** add a `LinkedWorkItemsSection`-equivalent to `TaskCatalystView` left content, with an Add-link picker (AsyncSelect over `ph_issues`, **excluding `issue_type='sub-task'`**), and per-row unlink (X).

## Junction table schema (proposed)
`task_work_item_links`:
- id uuid PK default gen_random_uuid()
- task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE
- work_item_key text NOT NULL   (ph_issues.issue_key — the universal work-item id)
- work_item_type text NOT NULL  CHECK (lower(work_item_type) NOT IN ('sub-task','subtask'))  -- rule #1
- link_type text NOT NULL DEFAULT 'relates'  (relates / blocks / blocked-by — keep minimal: 'relates' v1)
- created_by uuid, created_at timestamptz default now()
- UNIQUE (task_id, work_item_key)
RLS: authenticated CRUD (deferred to RLS slice — match tasks-family posture; do NOT enable RLS here unless decided). Reversible (rollback SQL in-file).

## Excluded / supported (rule lock)
Picker query: `ph_issues` where `issue_type` NOT ILIKE 'sub-task'/'subtask' AND not the task's own key; show issue type icon + key + summary (canonical WorkItemTypeIcon).

## Link UI placement (Task detail)
`TaskCatalystView` left content, after Description (mirroring Story's section order). Section: "Linked items" list (icon + key + summary + unlink X) + "+ Add link" AsyncSelect. Reuse the canonical `LinkedWorkItems`/`LinkedWorkItemsSection` if its data contract can be fed from the junction; else a thin task-specific wrapper using the same visual atoms.

## Unlink behavior
Per-row X removes the junction row (DELETE by id) → optimistic update + invalidate `['task-work-item-links', taskId]`. No confirm for a single link (reversible by re-adding); flag.success suppressed (platform), errors via flag.

## Validation plan
- Migration: write-only; orphan-safe; rollback included; apply via D-010 gate (NOT by Claude unless staging creds available).
- Post-apply: junction insert/select/delete via REST; CHECK rejects sub-task; UNIQUE prevents dupes.
- UI (gated on DEFECT-002 applied so the task view renders): open `/tasks/view/:key`, add a link (story/incident), confirm it shows; verify sub-task NOT offered in the picker; unlink; screenshot.
- tsc + eslint on touched TSX.

## Files PROPOSED for modification
- NEW migration `supabase/migrations/<ts>_task_work_item_links.sql`.
- NEW `src/modules/tasks/hooks/useTaskWorkItemLinks.ts`.
- NEW `src/modules/tasks/components/...TaskLinkedItemsSection.tsx` (or reuse LinkedWorkItems).
- MODIFY `src/components/catalyst-detail-views/task-catalyst/TaskCatalystView.tsx` (mount the section).

## Files FORBIDDEN
- Shared canonical view files (CatalystViewBase, TicketBreadcrumbs, CatalystSidebarDetails, CatalystStatusPill), CreateStory/CreateTask, useCreateTaskMutation, the Slice 3 migration, planner_*, workstream files, notifications/home/timeline/board, RLS enablement.

## Risks / dependencies
- **DEP-1 (sequencing):** Live UI validation needs the task detail view to RENDER, which is blocked by **DEFECT-002** (tasks FK migration not yet applied). So Slice 6's migration + code can be written, but UI validation is gated on DEFECT-002 apply. Recommend resolving the migration-apply path first.
- **D-010** applies: Claude writes the migration; apply via your pipeline / staging-MCP.
- Link target identity: using `ph_issues.issue_key` (text) — confirm ph_issues is the single source for all linkable types during execution (some types may live in separate tables).

## Stop conditions
Editing existing migrations · touching forbidden files · enabling RLS · linking to sub-task · scope creep into board/timeline → STOP.

## Plan Lock status (Slice 6)
DRAFT — awaiting approval. No code/migration until approved. Note DEP-1 (DEFECT-002 gates live UI validation).
