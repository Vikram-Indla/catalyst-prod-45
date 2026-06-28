# CAT-TASKS-20260627-001 — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

### Confirmed defects/gaps (logged, deferred)
- **DEFECT-001 (Slice 4):** `/tasks/workstreams` returns 404. Cause: static route segment outranks `/tasks/:view` in RR6 (deprecated 2026-06-17). Workstreams UI component exists (`WorkstreamsPage.tsx`) but is unreachable. Fix scheduled for Slice 4 (workstream page rebuild + route re-point). NOT in Slice 1 scope.
- **DATA-001 (Slice 4/5):** This staging env has **zero `task_workstreams`** rows → workstream picker shows "No workstreams yet", workstreams page/sidebar empty, and a task cannot be created (workstream required). Blocks full create-flow validation (f). Pre-existing data condition, not a code defect.
- **DATA-002 (Slice 2):** Env also has **zero `task_statuses`** rows; `tasks.status_id` is NOT NULL. To validate, seeded 1 temp status + 1 temp workstream + 1 temp task (all `TEMP_SLICE2_VALIDATION`), then removed (verified 0 remaining). `tasks.key` is also NOT NULL and the auto-key trigger did NOT fire on a direct REST insert (likely bound to legacy `planner_tasks`) — had to supply key explicitly.
- **RLS-001 (NEW — security finding, Slice 3 verification):** Verified live — with only the public anon key and NO user token, an unauthenticated client can READ and DELETE `tasks` (anon DELETE → HTTP 200). RLS is effectively off/permissive on the tasks family (tasks/task_statuses/task_workstreams). Per D-009 the Slice 3 migration leaves RLS unchanged; proposed hardening is included COMMENTED-OUT/opt-in in the migration file + flagged for an explicit decision. Mirrors the existing permissive planner_tasks posture.
- **SCHEMA-NOTE (Slice 3):** Live `tasks` table has NO `parent_task_id` column (verified types.ts + REST) → D-011 self-FK excluded; subtask/parent linking would require a column add (separate slice). Also: `tasks`/`task_statuses`/`task_workstreams` are Lovable-created, absent from migrations; legacy `planner_*` remain as parallel duplicates (cleanup = separate slice).
- **DEFECT-002 (NEW — needs schema attention, NOT Slice 2):** In this dev DB the **`tasks` table has NO foreign-key relationship to `task_statuses`** (and the embed also needs `task_workstreams`). `TaskCatalystView.useTaskDetail` runs `select(*,status:task_statuses(*),workstream:task_workstreams(...),assignee:profiles!tasks_assignee_id_fkey(...))` → PostgREST returns **PGRST200 "Could not find a relationship between 'tasks' and 'task_statuses'"** → the hook throws → the task-detail BODY renders the canonical "Task not found" state for ANY task in this env (app-wide, NOT caused by Slice 2). Fixing requires a DB FK/migration → forbidden in Slice 2. Blocks live verification of sidebar/status/header parity; breadcrumb parity WAS verified live.

## Process incidents
- **PROC-001 (resolved, 2026-06-27):** Slice 1 edits were first written to **main-checkout file paths** (`…/Catalyst-web/src/…` without the `.claude/worktrees/…` prefix) because discovery/Read reported main paths. They landed on the MAIN checkout (branch `fix/dark-status-pill-contrast`), breaking ring-fencing. Main had a clean tree beforehand → no user WIP lost. Fixed: relocated to worktree, reverted main, removed sentinel. Memory saved: `worktree-path-trap`. No rebaseline of the Plan Lock required — outcome unchanged, all code now ring-fenced to `claude/angry-lovelace-a4b08e`.
