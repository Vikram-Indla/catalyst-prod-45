# 02 — CANONICAL DISCOVERY (parallel-agent synthesis, 2026-06-26)

Four discovery agents ran in parallel: codebase map, DB+seed reality, AioTests acceptance-model extraction, canonical-components/integration.

## A. Current code state (NOT greenfield — refactor/complete)
- Routes in `src/routes/FullAppRoutes.tsx` (~655–678): dashboard, my-work, board, repository, cycles(+:id, +execute), sets(+:id), traceability, reports, filters. **No `<MG k="testhub">` route gate.**
- Pages under `src/pages/testhub/**`. Heavy **inline `supabase.from()`** in pages (repository, cycles, sets) instead of hooks — consolidation risk.
- Components: rich `src/components/test-cycles/**` (assignment-table, calendar, notifications), `src/components/releases/test-*`/**, `src/components/defects/g25/**`. Deleted `src/components/test-plans/*` flat files (staged D) — only generated usage-map references them; safe.
- Hooks: `src/hooks/test-management/**`, `src/hooks/test-cycles/**`, `src/features/test-cycles/hooks/**`. Barrel `src/hooks/test-management/index.ts` has STUB no-op exports (useTestPlans, useDeleteTestCase, useCreateTestCase, etc.) that may shadow real ones — verify imports.
- Icons: registry at `src/components/icons/icons.registry.ts`; native SVGs in `src/assets/icons/work-type/*.svg` (+`_dark/`). Consume via `<WorkItemTypeIcon type=… />`. `test-case` + `qa-bug` already registered. No per-icon .tsx components.

### Entity UI status
| Entity | UI | Service/hook | Tables/RPCs |
|---|---|---|---|
| Cases | present | useTestCases, useRepositoryData, useTestCaseVersions | tm_test_cases, tm_test_steps, rpc save_test_data, tm_next_entity_key |
| Folders | present | useFolders | tm_folders |
| Sets | present (inline) | inline supabase | tm_test_sets, tm_set_cases |
| Cycles | richest | useTestCycles(+Enhanced), test-cycles/* | tm_test_cycles, tm_cycle_scope |
| Execution/Runs | present, **0 rows** | useExecutionMutations, useCreateRunWithDataRows | tm_test_runs, tm_step_results, tm_cycle_scope.current_status |
| Defects | built but **UNROUTED** | useDefects, useDefectsG25 | tm_defects, tm_defect_links |
| Traceability | present | rpc tm_get_requirement_test_cases, tm_get_traceability_matrix | tm_requirement_links |

### Dead/gaps
1. `/testhub/defects` + `/testhub/defects/:id` routes MISSING (dead sidebar link `TestHubSidebar.tsx:39`; two orphaned DefectsPage files).
2. Execution table-name fragmentation: `tm_test_runs` (canonical) vs legacy `test_cycle_executions` (useTestCases.ts, useTestCaseExecutionHistory.ts) vs `th_test_executions` (useDefectsG25.ts) vs phantom `tm_test_executions` (RPCs, being patched).
3. Stub hooks in `test-management/index.ts`.
4. Orphaned admin pages `src/pages/admin/test/*` (TestPriorities/CaseTypes/CaseStatuses/RunStatuses/Permissions) lazy-imported (FullAppRoutes ~144–149) but never routed, absent from `src/components/admin/admin-nav.ts`. `admin-sidebar-parity.test.ts` enforces nav⇄route⇄registry lockstep.

## B. DB reality (staging cyij)
- Three families: `th_*` (dead), bare `test_*` (dead/empty), `tm_*` (LIVE). All `tm_*` RLS-enabled; gate via `tm_user_has_access()`.
- Seed rows: tm_test_cases 25, tm_test_steps 24, tm_folders 13, tm_cycle_scope 12, tm_defects 7, tm_activity_log 7, tm_case_types 4, tm_case_priorities 4, tm_test_cycles 3, tm_projects 1. Everything else 0 (runs, step_results, sets, plans, requirement_links).
- Statuses are **Postgres enums**, not config rows: tm_execution_status = {not_run,in_progress,passed,failed,blocked,skipped}; tm_case_status={draft,ready,approved,deprecated}; tm_cycle_status; tm_defect_severity; tm_defect_status.
- `tm_test_executions` NEVER existed; execution store = `tm_cycle_scope.current_status` + `tm_test_runs`/`tm_step_results`.
- **Work-item / QA-bug source = `public.ph_issues`** (2381 rows; **788 `issue_type='qa bug'`**, +3 defect, +152 production incident), keyed by `project_key`, `issue_key`, free-text `issue_type`. `public.work_items` is empty AI-staging — IGNORE. (Components agent cites `ph_work_items`+`useProjectWorkItems`; **reconcile ph_issues vs ph_work_items at Phase 0**.)
- ~100 tm RPCs incl. quick_create_defect_v2, tm_auto_create_defect_on_failure (trigger), tm_calculate_run_status, get_test_case_for_execution_v2, search_tm_defects, tm_get_traceability_matrix, sync_jira_bug_to_defect.

### Seed-wipe order (children→parents); shortcut = DELETE tm_projects cascades most
step_results → test_runs → defect_links → cycle_scope → assignments → requirement/set/label links → plan_cases → defects → test_steps → case_versions → test_cases → test_cycles → plans/sets → folders → priorities/types → labels/environments → activity_log → projects. **Never** delete ph_issues/profiles/releases.

### 🚩 RED FLAG (schema drift)
`sync_jira_bug_to_defect()` (migration 20260607) INSERTs into `tm_defects.jira_key/jira_*` with `ON CONFLICT (jira_key)`, but live cyij `tm_defects` has ZERO `jira_*` columns → any insert/update on a qa-bug `ph_issues` row that fires this trigger raises `42703 column "jira_key" does not exist` and rolls back the mutation. Must reconcile (drop trigger OR add columns) before defect work. NOT actioned.

## C. AioTests acceptance model (source = product docs; impl-spec embellishments flagged)
- **Folders**: per-entity trees (cases/sets/cycles); system folders All + Not Assigned (immutable); count includes subfolders.
- **Case**: Details (Title req; Owner; Priority; Status default Draft; Type; Components; Releases; Estimated Effort; Tags; Custom Fields) + Steps + Jira Requirements + Attachments(100MB) + Automation + Datasets.
- **Version**: integer; manual or auto-trigger; "replace version in Sets" option; grids default to latest.
- **Step**: Classic (Step/Data/Expected) or BDD/Gherkin; duplicate, copy-from-other-case, link-another-case (reuse), reorder; bulk via Excel.
- **Set**: organizational only (NO results); version-pinned membership; Published-only eligible.
- **Cycle**: tracks results; Details/Cases/Assignees tabs; build/env = CUSTOM FIELDS; lifecycle open→In Progress→Closed; Adhoc cycle undeletable.
- **Run/Execution**: Cycle→Case-in-Cycle→Run(1..N)→Run Step. Run1 auto on first exec; Add Run (adopt latest version / copy prior results). Run-step: actual result, status, defects, comments, attachments, optional assignee. Effort timer.
- **Statuses (5, no Skipped)**: Not Run, In Progress, Passed, Failed, Blocked. UP-percolation precedence Failed>Blocked>partial(In Progress)>uniform. DOWN-percolation only when Run→Passed and no step carries data.
- **Defects = Jira issues**: create new / link existing / auto-link / sub-task; bi-directional.
- **Traceability**: case↔requirement; Coverage (≥1 case) + %Done (passed+failed / total within cycles); Detail + Summary views.
- **Admin/customization** (per-project, admin-only): Case Statuses (behavior toggles), Case Priorities (Is Default), Case Types (Is Default), Run Statuses (color+type+completed flag), Custom Fields (12 types, applies-to cases/sets/cycles/runs), Field Configurations (enabled/required per group).
- **RBAC**: AioTests = per-OPERATION Include/Exclude grants (no named roles). Catalyst maps onto its module-access roles (Project Admin/QA Lead/Tester/Viewer) — mapping needs sign-off.

### Acceptance callouts (build-spec ≠ product)
No "Skipped" status; no bare hex (only run-statuses carry color, prefer ADS tokens); build/env are custom fields; no cycle dependencies/milestones/scope-lock/templates/version-bump; RBAC = operation grants; datasets ⊥ linked-case steps; default case status differs by entry point.

## D. Canonical components (reuse targets)
- List: `JiraTable<TRow>` `@/components/shared/JiraTable` (+ cell/editor factories, FlagsHost, BulkFooterBar). types.ts explicitly notes TestHub reuse.
- Detail: `CatalystViewBase` + `CatalystDetailRouter` `@/components/catalyst-detail-views/*`; sidebar `CatalystSidebarDetails`.
- Modal: `@atlaskit/modal-dialog` (existing CaseDrawer). Tabs: `@atlaskit/tabs` (unbanned).
- Status: `CatalystStatusPill` / JiraTable `StatusPill` (deprecated `shared/StatusPill.tsx` BANNED — raw rgb).
- Avatar `UserAvatar`→`CatalystAvatar`; `ProjectIcon`; `WorkItemTypeIcon`/`JiraIssueTypeIcon`; `PriorityIcon`.
- Work-item picker: `src/components/shared/AddParentPicker.tsx` (popover over project issues) = reuse target for traceability link picker.
- Module access: `useModuleAccess.ts` (testhub already a registered key); admin matrix `ModuleAccessMatrix.tsx`; admin nav `admin-nav.ts` (no testhub pocket yet). NO ModuleGate/ModuleGuard component (stale memory).

## E. Decisions required before Plan Lock
1. Defects model: project QA-bug Jira view (ph_issues) vs native tm_defects vs both.
2. Broken jira→defect trigger: drop vs add columns vs defer.
3. Reseed shape: curated realistic vs spec-scale vs minimal.
4. Case/cycle/defect detail UI: canonical CatalystViewBase vs keep CaseDrawer modal.
5. ph_issues vs ph_work_items reconciliation for the work-item source.
