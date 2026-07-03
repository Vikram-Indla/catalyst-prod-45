# TestHub Data Layer — Full Hook Map

Feature: CAT-TESTHUB-PROD-20260703-001 · Discovery agent 02 · 2026-07-03
Scope: `src/hooks/test-management/**` (21 files), `src/hooks/test-cycles/**` (23 files), `src/hooks/test-cases/**` (1), `src/hooks/testhub/**` (2), plus 6 named root/releases hooks. 54 files total. All claims carry file:line evidence.

Legend for error-handling verdicts:

- **CLEAN** — every awaited call destructures `error` and throws (react-query gets the failure).
- **MIXED** — main query throws, but N `{data}`-only silent destructures (the KNOWN BUG pattern) on secondary reads.
- **SILENT** — errors swallowed entirely (return `[]` / `null` / mock — UI shows "empty", never "failed").
- **STUB** — no data access at all / hardcoded return.

---

## 1. Master table

| Hook file | Tables (r=read, w=write) | Queries (queryKey) | Mutations | Error verdict | Stub risk |
|---|---|---|---|---|---|
| **test-management/index.ts** | none | — | `useDeleteTestCase`, `useCreateTestCase`, `useCloneTestPlan` are **no-op stubs** (lines 34–44); `useTestCycleList`/`useTestCycleListSummary` return `{data:[]}`/`{data:null}` always (46–52) | STUB | **CRITICAL — consumed by live pages** (see §3) |
| test-management/useAIGeneration.ts | edge fn `ai-generate-test-cases` (74) | none (local state, no react-query) | imperative `generateTestCases` | CLEAN (try/catch + toast, 87–123) | none |
| test-management/useAdminConfig.ts | tm_case_priorities rw, tm_case_types rw, tm_labels rw, tm_environments r, product_roles r, user_product_roles r, profiles r | `['tm-priorities',pid]` (16), `['tm-types',pid]` (114), `['tm-labels',pid]` (211), `['tm-team-members-qa-testers']` (308), `['tm-environments',pid]` (369) | create/update/delete for priorities, types, labels; `seedDefaults` (396) | CLEAN (15 throws, 0 silent) | none |
| test-management/useAutoVersioning.ts | tm_test_cases r (27), tm_test_steps r (39), tm_test_case_versions rw (50,77) | none (imperative snapshot fn) | insert version snapshot | **SILENT** — 0 throws in file; silent `{data: existingVersions}` at :50; insert error captured but never thrown | version snapshots can silently fail |
| test-management/useCreateRunWithDataRows.ts | tm_step_results w, tm_test_runs rw, tm_cycle_scope rw, tm_test_steps r, test_data_rows r (246 — legacy family) | — | create run(s) incl. data-row expansion; invalidates `tm-runs`,`tm-cycle-scope`,`tm-cycle` (193–195) | CLEAN (6 throws) | uses legacy `test_data_rows` |
| test-management/useDataRowResults.ts | test_data_parameters r (74), test_data_rows r (92), tm_test_runs r (110) | `['test-data-parameters',caseId]`, `['test-data-rows',caseId]`, `['tm-runs-by-scope',scopeId]` | none | CLEAN (3 throws) | legacy `test_data_*` family |
| **test-management/useDefects.ts** | tm_projects r (38–57), tm_defects rw, tm_test_cycles r (393), **tm_requirement_tests r (443 — NOT in generated types)**, tm_defect_links w (467), tm_comments rw, tm_attachments rw + storage bucket `tm-attachments` (822), tm_cycle_scope r (923), tm_test_runs r (931); rpc `get_defect_stats` (242) | `['tm-defects',pid,filters,page,pageSize]` (164), `['tm-defect-stats',pid]` (238), `['tm-defect',id]` (277), `['tm-defect-comments',id]` (657), `['tm-defect-attachments',id]` (773) | create (with auto-link rows), update, updateStatus (workflow-aware, 496), delete, add/delete comment, upload/delete attachment | **MIXED — 10 silent destructures** (37, 46, 137, 392, 442, 514, 528, 922, 930, 940) vs 21 throws | `generateDefectKey` (135–151) = client-side MAX scan of all defect_keys → **race-prone duplicate keys**; bypasses `tm_next_entity_key` RPC used elsewhere |
| test-management/useFolders.ts | tm_folders rw, tm_test_cases rw (reassign on delete, 251) | `['tm-folders',pid]` (30), `['tm-folders-with-counts',pid]` (86) | create, rename, delete (with case reassign), move, reorder | CLEAN (17 throws) | none |
| test-management/useProjects.ts | tm_projects rw | `['tm-projects']` (14), `['tm-project',id]` (35) | create project | CLEAN | none |
| test-management/useReleases.ts | releases r | `['releases-list']` (17) | none | CLEAN | none |
| test-management/useRepositoryData.ts | tm_folders r (81), tm_test_cases r (90) | `['repository-tree',pid]` (75) | none (exports invalidate helper, 137–139) | CLEAN | none |
| test-management/useSprintsByProject.ts | ph_jira_sprints r (19) | `['sprints-by-project',pid]` (14) | none | CLEAN | none |
| **test-management/useTestCaseExecutionHistory.ts** | **test_cycle_executions r (:24 — legacy `test_*` family)** joins tm_test_cycles, profiles | `['tm-case-execution-history',caseId]` (19) | none | **SILENT** — `if (error) { console.error; return []; }` (36–39) | error renders as "no history" |
| test-management/useTestCaseRelease.ts | releases r (30,39), tm_test_cases w (69) | `['tm-releases-selectable']` (25) | set release on case; invalidates `tm-case`,`tm-cases` | CLEAN | none |
| test-management/useTestCaseTags.ts | tm_case_labels rw (25,75,104,144), tm_labels rw (55,131) | `['tm-case-labels',caseId]` (21), `['tm-labels',pid]` (51) | add/remove label, create+attach label | CLEAN (6 throws) | none |
| test-management/useTestCaseVersions.ts | tm_test_case_versions rw, tm_test_cases rw (144,238), tm_test_steps rw (153,254,268) | `['tm-case-versions',caseId]` (48), `['tm-case-versions-count',caseId]` (105) | createVersion (137), restoreVersion (223) | MIXED — 1 silent (:161) vs 7 throws | none |
| **test-management/useTestCases.ts** (41.6K — largest) | tm_test_cases rw, tm_test_steps rw, tm_case_labels rw, tm_folders r (292), **test_cycle_executions r (136, 217 — legacy family)**; rpc `tm_next_entity_key` (307) | `['tm-cases',pid,filters]` (33), `['tm-case',caseId]` (185), `['tm-case-steps',caseId]` (260) | create (327), update (422), clone (578), delete (712), bulkDelete (739), upsertDraft | **MIXED — 11 silent destructures** (118, 135, 216, 292, 429, 486, 752, 918, 927, 937, 1154) vs 25 throws; silent ones are per-row step/execution enrichment | execution-count enrichment reads a possibly-dead table with errors swallowed → counts silently 0 |
| test-management/useTestCycles.ts | tm_test_cycles rw, tm_cycle_scope rw; rpc `tm_next_entity_key` (76) | `['tm-cycles',pid,filters]` (131), `['tm-cycle',id]` (181), `['tm-cycle-scope',id,filters]` (413) | create, update, delete, clone (344), scope add/update/remove/reorder, status update (624) | CLEAN-ish (18 throws, 1 silent :359 clone-scope read) | none |
| test-management/useTestCyclesEnhanced.ts | tm_test_cycles rw; rpc `tm_next_entity_key` (87) | `['tm-cycles-enhanced',pid,filters]` (111) | createEnhanced (287), deleteEnhanced (389), cloneEnhanced (416) | CLEAN (7 throws) | duplicate of useTestCycles create/delete/clone — two parallel cycle CRUD stacks |
| test-management/useTestData.ts | test_data_parameters r (72), test_data_rows r (99); rpc `save_test_data` (168) | key factory `testDataKeys.parameters/rows(caseId)` (67, 94) | saveTestData | CLEAN (5 throws) | legacy `test_data_*` family |
| test-management/useTestSteps.ts | tm_test_steps rw | — | add/update/delete/reorder step; invalidates `tm-case*` 4-key set (41–44 etc.) | CLEAN (7 throws) | none |
| test-cycles/useAddTestsToCycle.ts | tm_cycle_scope rw (21,41), tm_test_cycles rw (52,59) | — | add tests to cycle + recount; invalidates `cycle`,`cycle-test-cases`,`cycle-details`,`test-repository`,`tm_test_cycles`,`tm-cycles` (73–78) | MIXED — 2 silent (20, 51) | invalidates dead keys (see §4) |
| test-cycles/useApplyAssignment.ts | tm_cycle_scope w (24,42) | — | bulk apply assignments | CLEAN | none |
| **test-cycles/useAssignmentTable.ts** | tm_cycle_scope r (99, joins tm_test_cases/tm_folders/profiles), tm_case_priorities r (139) | `['assignment-table',cycleId]` (95) | none (state mgmt for filters/sort/page/selection) | **SILENT+MOCK** — catch block returns `generateMockAssignments(cycleId)` (203–206): **85 randomized fake rows** with fake names 'Ahmed S.', 'Sara M.' (16–74) on ANY error | **CRITICAL — any query failure renders a fully-populated fake table**; also silent `{data: priorities}` :139; `testType` hardcoded `'functional'` at :194 despite mapping logic above |
| test-cycles/useBulkActions.ts | tm_cycle_scope w (42,89) | — | bulkUpdate, bulkRemove — optimistic (cancelQueries + onError invalidate, 55–83) | CLEAN | none |
| **test-cycles/useCalendarData.ts** | tm_test_cycles r (21), tm_test_runs r (:45, `as any`) | `['calendar-data',cycleId,range,filters]` (17) | none | **SILENT** — 2 silent destructures (20, 44), 0 throws; header claims "ZERO MOCK DATA" but fallback `'Unknown Cycle'` (36) | maps `run.tm_test_cases?.title/module/priority` (55–60) which are **never selected** in the query (46) → always fallback values 'Untitled'/'General'/'medium'; `estimatedDurationMinutes: 30` hardcoded (64) |
| test-cycles/useCalendarNavigation.ts | none (no supabase import) | — | — | N/A (pure UI state) | none |
| test-cycles/useCycleActivityFeed.ts | rpc `tm_get_cycle_activity_feed` (38) | `['cycle-activity-feed',cycleId,limit]` (33) | none; realtime channel → invalidate (80) | CLEAN | none |
| test-cycles/useCycleAnalytics.ts | rpcs `tm_get_cycle_quality_trends` (30), `tm_get_cycle_defect_trends` (71), `tm_get_tester_performance` (116), `tm_compare_cycles` (172), `tm_get_plan_analytics` (230) | `['cycle-quality-trends']`, `['cycle-defect-trends']`, `['tester-performance']`, `['cycle-comparison']`, `['plan-analytics']` | none | CLEAN (5 throws) | none |
| test-cycles/useCycleDetails.ts | tm_test_cycles r (59), tm_cycle_scope r (80) | `['cycle-details',cycleId]` (55) | none | CLEAN (3 throws) | none |
| test-cycles/useCycleExecutionItems.ts | tm_cycle_scope r (199), tm_test_runs r (235) | factory `cycleExecutionKeys.items(cycleId)` (194) | none; 2 realtime channels → invalidate (346, 363); exports `invalidate()` (390) | CLEAN | none |
| test-cycles/useCycleExecutionVelocity.ts | rpc `tm_get_cycle_execution_velocity` (27) | `['cycle-execution-velocity',cycleId,days]` (22) | none | CLEAN | none |
| test-cycles/useCycleMutations.ts | tm_test_cycles w (69) | — | transitionStatus + convenience start/pause/resume/complete/archive/promoteToPlan (39–169); invalidates `cycle-details`,`test-cycles`,`tm-cycles-enhanced`,`tm-cycles` (29–32) | CLEAN | `['test-cycles']` is a dead key (§4) |
| test-cycles/useCycleTeamWorkload.ts | rpc `tm_get_cycle_team_workload` (35) | `['cycle-team-workload',cycleId]` (30) | none; realtime invalidate (73) | CLEAN | none |
| test-cycles/useCycleTestCases.ts | tm_cycle_scope r (68, joins), tm_test_runs r (126) | `['cycle-test-cases',cycleId,filters]` (63) | none | MIXED — 1 silent (:125 runs enrichment) | none |
| test-cycles/useExecutionMutations.ts | tm_cycle_scope rw (52,60,121,151,182), tm_test_runs w (72), tm_test_cycles w (90 counters) | — | recordResult, assign, unassign, setStatus; each invalidates execution items + cycle-details + cycle-test-cases + `cycleListKeys.all` | MIXED — 2 silent (52 currentScope, 70 auth.getUser) vs 4 throws | invalidates `cycleListKeys.all` = key of a **stub hook that never fetches** (§3) |
| test-cycles/useExecutionProgress.ts | tm_cycle_scope r (24), tm_test_runs r (37) | `['execution-progress',cycleId,days]` (18) | none | CLEAN (2 throws) | none |
| test-cycles/useInlineEdit.ts | tm_cycle_scope w (48) | — | inline field update, optimistic (63) | CLEAN | none |
| test-cycles/useSmartAssignment.ts | profiles r (42), tm_cycle_scope r (49, 87) | `['smart-assignment-team',cycleId]` (39), `['smart-assignment-tests',cycleId,ids]` (85) | none (suggestion algorithm) | **SILENT** — 0 throws; silent `{data: workloadData}` :49 | workload silently empty on error → suggestions computed on wrong data |
| **test-cycles/useTestCycleList.ts** | none | `cycleListKeys` factory (`['test-cycle-list']`) | none | STUB — `useTestCycleList()` returns `{data:[], isLoading:false}` (6–8) | **key factory is real and invalidated by 3 mutation files, but no query ever uses it** |
| test-cycles/useTestFilters.ts / useTestSelection.ts | none (no supabase import) | — | — | N/A (pure state) | none |
| test-cycles/useTestRepository.ts | tm_cycle_scope r (19), tm_case_priorities r (27), tm_test_cases r (35), tm_folders r (139) | `['test-repository',pid,cycleId,filters]` (15), `['test-modules',pid]` (136) | none | MIXED — 2 silent (18, 26) vs 2 throws | none |
| test-cycles/useTestReschedule.ts | tm_test_cycles rw (17,38,46) | — | reschedule, bulkReschedule; invalidates `calendar-data`,`test-cycles` | MIXED — 1 silent (:38) | "reschedule test" actually updates the **cycle's** planned dates, not per-test rows |
| test-cases/useRequirementLinks.ts | tm_requirement_links w (163); rpcs `tm_get_case_requirements` (62), `tm_get_requirement_test_cases` (80), `tm_get_traceability_matrix` (99), `tm_link_requirement` (134), `tm_update_coverage_status` (184) | `['case-requirements',caseId]` (58), `['requirement-test-cases',type,id]` (76), `['traceability-matrix',pid]` (95) | link, unlink, updateCoverage | CLEAN (6 throws) | none |
| testhub/useCommandCenter.ts | releases r (110), milestones r (189), cc_activity_log r + realtime (231); rpcs `get_command_center_kpis`(+`_previous`) (61–62), `get_cc_defect_trends` (136), `get_cc_team_performance` (162) | `['command-center-kpis',pid]` (58), `['release-health-grid',pid]` (107), `['defect-trends',pid,days]` (134), `['team-performance',pid]` (160), `['upcoming-milestones',pid]` (186) | none | CLEAN (7 throws); no `enabled:` guards (0 in file) | none |
| **testhub/useReleases.ts** | releases rw (57,113,170,193,201; joins release_vehicles, profiles), release_test_cycles rw (147) | **NO react-query** — `useState`/`useEffect`/`useCallback` manual fetch (48–56) | plain async `createRelease`/`updateRelease`/`deleteRelease` (170–204) + `linkCyclesToRelease` (147) | CLEAN throws (6) + toast, but **architecture outlier: zero cache integration** | mutations elsewhere invalidating `['releases-list']` etc. never refresh this page; stale-until-remount |
| useTestHubTimeline.ts | tm_projects r (76), tm_test_cycles r (85) | `['testhub-timeline']` (72) | none | CLEAN (throws at 78, 88); explicit zero-assumption mapping (55–57) | none — model hook |
| **useTestCycleByKey.ts** | tm_test_cycles r (14, `supabase as any`) | `['cycle-by-key',keyOrId,projectKey]` (8) | none | **SILENT** — `const { data } = await query.maybeSingle(); return data ?? null;` (21–22) — the canonical bug pattern | transient DB error is indistinguishable from "cycle not found" → wrongful 404/redirect on route resolution |
| useTestPlansG26.ts | tm_test_plans rw, tm_plan_scope rw, tm_plan_team rw, tm_plan_approvals rw, **plan_test_cycles rw (434,462,481 — NOT in generated types)**, tm_test_cycles r (444), tm_folders r (211), tm_test_cases r (215,240); rpc `get_plan_progress` (55); **every `.from()` is `as any`** | `['g26-test-plans',filters]` (12), `['g26-test-plan',id]` (35), `['g26-plan-progress',id]` (53), `['g26-plan-templates']` (158), `['g26-plan-scope',id]` (199), `['g26-scope-summary',id]` (228), `['g26-plan-team',id]` (293), `['g26-plan-approvals',id]`, `['g26-plan-cycles',id]` (432) | create/update/delete plan, clone-from-template, add/remove scope, team add/remove, approvals, link/unlink cycle | MOSTLY CLEAN (32 throws, 1 silent :443) | **N+1 loops**: per-scope-item folder/case lookup (209–216), per-linked-cycle detail fetch (442–449); typed-schema blindness from blanket `as any` |
| useDefectsG25.ts | tm_defects rw (typedQuery), tm_defect_links rw, tm_comments rw, **th_test_executions r (193 — legacy family)**, profiles r (204), tm_test_cases r (305); rpc `get_defect_stats` p_project_id:null (46) | `['g25-defects',filters]` (13), `['g25-defect-stats']` (44), `['g25-defect',id]` (56), `['g25-defect-history',id]` (177), `['g25-defect-comments',id]` (228), `['g25-defect-links',id]` (292), `['defects-by-cycle',id]` (355), `['defects-by-plan',id]` (389), `['defects-by-requirement',id]` (423) | create, update, updateStatus, delete, comments add/delete, links add/remove | MIXED — history query is **error-as-empty** (`if (linkErr…) return []` :184, `if (execErr…) return []` :197); 2 silent (203, 305); 18 throws elsewhere | second, parallel defect stack next to test-management/useDefects.ts — **two defect data layers over the same tm_defects table** with different query keys (`g25-*` vs `tm-defect*`) that never cross-invalidate |
| releases/useReleaseQualityGates.ts | tm_release_quality_gates rw (104,124,150,177,329,335), tm_gate_templates r (301,320); rpcs `tm_get_release_test_summary` (199), `tm_evaluate_quality_gates` (217), `tm_waive_quality_gate` (258), `tm_get_gate_history` (284) | `['release-quality-gates',rid]` (101), `['release-test-summary',rid]` (197), `['gate-history',gateId]` (282), `['gate-templates']` (298) | add/update/delete gate, evaluate, waive, apply template | CLEAN (11 throws) | none |
| releases/useReleaseReadiness.ts | rpcs `tm_get_release_readiness_history` (33), `tm_create_readiness_snapshot` (68), `tm_approve_release_readiness` (102) | `['release-readiness',rid]` (31) | createSnapshot, approve | CLEAN (3 throws) | none |

---

## 2. Silent `{data}`-only destructure catalog (KNOWN BUG pattern) — 40 instances / 16 files

| File | Lines |
|---|---|
| test-management/useAutoVersioning.ts | 50 |
| test-management/useDefects.ts | 37, 46, 137, 392, 442, 514, 528, 922, 930, 940 |
| test-management/useTestCaseVersions.ts | 161 |
| test-management/useTestCases.ts | 118, 135, 216, 292, 429, 486, 752, 918, 927, 937, 1154 |
| test-management/useTestCycles.ts | 359 |
| test-cycles/useAddTestsToCycle.ts | 20, 51 |
| test-cycles/useAssignmentTable.ts | 139 |
| test-cycles/useCalendarData.ts | 20, 44 |
| test-cycles/useCycleTestCases.ts | 125 |
| test-cycles/useExecutionMutations.ts | 52, 70 (70 is auth.getUser — benign) |
| test-cycles/useSmartAssignment.ts | 49 |
| test-cycles/useTestRepository.ts | 18, 26 |
| test-cycles/useTestReschedule.ts | 38 |
| useTestCycleByKey.ts | 21 (**route resolver — highest user impact**) |
| useTestPlansG26.ts | 443 |
| useDefectsG25.ts | 203, 305 |

Additionally, three **error-as-empty** blocks (destructure error but return `[]`): useTestCaseExecutionHistory.ts:36–39, useDefectsG25.ts:184 & 197.

## 3. Stub / mock data findings

1. **`test-management/index.ts:34–52`** — no-op mutation stubs `useDeleteTestCase`, `useCreateTestCase`, `useCloneTestPlan` and empty-data `useTestCycleList`/`useTestCycleListSummary`. Confirmed live consumers:
   - `src/pages/releases/TestCyclesPage.tsx:31–40, 94, 97` imports `useTestCycleList` + `useTestCycleListSummary` from `@/hooks/test-management` → **the page's cycle list and KPI strip are permanently empty by construction**.
   - `src/pages/releases/TestPlansPage.tsx:63, 92` imports `useCloneTestPlan` from the barrel → **"Clone plan" succeeds in the UI but does nothing** (mutationFn returns `{}`).
   - Note the real `useCreateTestCase`/`useDeleteTestCase` exist in `useTestCases.ts:323/709`; `project-work-hub/adapters/testCasesDataSource.ts:22` imports those directly (safe). Only barrel importers hit the stubs.
2. **`test-cycles/useAssignmentTable.ts:16–74, 203–206`** — `generateMockAssignments()` fabricates 85 randomized rows (fake testers 'Ahmed S.', 'Sara M.', fake TC-codes) returned as the queryFn result on **any** caught error. A permission/RLS/network failure renders a convincing fully-fake table.
3. **`test-cycles/useTestCycleList.ts:6–8`** — stub returning `[]`; its `cycleListKeys` factory is invalidated by useBulkActions.ts:79/121, useInlineEdit.ts:91, useExecutionMutations.ts:105/135/165/196 — invalidations of a query nobody runs.
4. **`test-cycles/useCalendarData.ts:52–65`** — maps `run.tm_test_cases?.title/module/priority` that the select at :46 never fetches → every calendar event shows 'Untitled'/'General'/'medium'; `estimatedDurationMinutes: 30` hardcoded.
5. `useAssignmentTable.ts:194` — `testType: 'functional'` hardcoded for all rows (mapping logic at 169–173 computed then discarded).

## 4. Query-key fragmentation (cycle domain)

Same underlying tm_test_cycles/tm_cycle_scope data is cached under **at least 9 key families**: `['tm-cycles']`, `['tm-cycles-enhanced']`, `['tm-cycle',id]`, `['tm-cycle-scope',id]`, `['cycle-details',id]`, `['cycle-test-cases',id]`, `['cycle',id]`, `['test-cycles']`, `['test-cycle-list']`, plus `['tm_test_cycles']` (underscore, useAddTestsToCycle.ts:77). Evidence of dead/miswired invalidations:

- `['test-cycles']` invalidated (useCycleMutations.ts:30, useTestReschedule.ts:26/56) — no query in scope uses that key.
- `['tm_test_cycles']` invalidated (useAddTestsToCycle.ts:77) — no query uses it.
- `['cycle',id]` invalidated (useAddTestsToCycle.ts:73, useApplyAssignment.ts:63) — no query in the scanned set uses bare `['cycle']`. UNKNOWN whether a component-level query does.
- Mutations in useTestCycles.ts invalidate `tm-cycles*` but not `cycle-details`/`cycle-test-cases` (except scope ops); useCycleMutations covers the reverse set. Cross-stack edits leave the other stack stale.

## 5. Schema-risk tables referenced by hooks

| Table | In generated types? | Hooks | Risk |
|---|---|---|---|
| `plan_test_cycles` | **NO** (0 matches in src/integrations/supabase/types.ts) | useTestPlansG26.ts:434/462/481 (`as any`) | runtime 400/PGRST205 if absent on env; types regen won't catch |
| `tm_requirement_tests` | **NO** | useDefects.ts:443 | same — and it's inside defect-create auto-linking |
| `test_cycle_executions` | yes (types.ts:37669) | useTestCases.ts:136/217, useTestCaseExecutionHistory.ts:24 | memory: `test_*` families flagged dead in TestHub revamp notes — verify live data before porting |
| `th_test_executions` | yes (types.ts:41197) | useDefectsG25.ts:193 | joined by `tm_defect_links.test_run_id` → semantic mismatch risk (run id vs execution id) |
| `test_data_parameters` / `test_data_rows` | yes | useTestData.ts, useDataRowResults.ts, useCreateRunWithDataRows.ts:246 | legacy `test_*` family |

## 6. RPC inventory (28 + 1 edge fn)

`tm_next_entity_key`, `get_defect_stats`, `save_test_data`, `tm_get_cycle_activity_feed`, `tm_get_cycle_quality_trends`, `tm_get_cycle_defect_trends`, `tm_get_tester_performance`, `tm_compare_cycles`, `tm_get_plan_analytics`, `tm_get_cycle_execution_velocity`, `tm_get_cycle_team_workload`, `tm_get_case_requirements`, `tm_get_requirement_test_cases`, `tm_get_traceability_matrix`, `tm_link_requirement`, `tm_update_coverage_status`, `get_command_center_kpis`, `get_command_center_kpis_previous`, `get_cc_defect_trends`, `get_cc_team_performance`, `get_plan_progress`, `tm_get_release_test_summary`, `tm_evaluate_quality_gates`, `tm_waive_quality_gate`, `tm_get_gate_history`, `tm_get_release_readiness_history`, `tm_create_readiness_snapshot`, `tm_approve_release_readiness`; edge function `ai-generate-test-cases` (useAIGeneration.ts:74). Existence on staging cyij NOT verified in this pass (UNKNOWN — DB probe is another agent's lane).

## 7. Duplicate/parallel stacks (consolidation targets)

1. **Defects ×2**: test-management/useDefects.ts (`tm-defect*` keys, project-scoped, workflow-aware status) vs useDefectsG25.ts (`g25-*` keys, global, own link/history model). Same `tm_defects` table, zero cross-invalidation.
2. **Cycles CRUD ×2**: useTestCycles.ts vs useTestCyclesEnhanced.ts (independent create/delete/clone, separate keys) + a third mutation surface in test-cycles/useCycleMutations.ts.
3. **Releases ×3**: test-management/useReleases.ts (react-query, `releases-list`), testhub/useReleases.ts (manual state, no cache), releases/* hooks — plus `useCommandCenter.useReleaseHealthGrid` reading releases directly.
4. **Defect key generation**: client-side MAX-scan (useDefects.ts:135–151) vs `tm_next_entity_key` RPC (useTestCases.ts:307, useTestCycles.ts:76) — inconsistent, the former races.

## 8. Realtime subscriptions

`.channel()` invalidation wiring exists in: useCycleActivityFeed.ts, useCycleExecutionItems.ts (2 channels), useCycleTeamWorkload.ts, testhub/useCommandCenter.ts (cc_activity_log). All invalidate-on-change; none mutate cache directly.
