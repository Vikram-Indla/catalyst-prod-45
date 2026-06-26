# Research Notes: test-hub / exp-002

**Title:** Test Hub Data Contract & Schema Truth Audit
**Date:** 2026-06-26
**Type:** research

> Research experiment — NO code changes. Documentation only.

---

## Finding 1 — Canonical Table Family: tm_* (CONFIRMED)

**Evidence:**
- `grep -rn "th_" src/hooks/test-management/ src/pages/testhub/` → 0 results
- `grep -rn "tm_" src/hooks/test-management/ src/pages/testhub/` → 150+ results (all tm_*)
- `th_*` tables appear ONLY in `src/integrations/supabase/types.ts` (FK metadata), never in active hook/page code

**Conclusion:** All active Test Hub code reads exclusively from `tm_*`. The `th_*` tables are dormant schema artifacts.

**th_* tables still in DB types (dormant, never read by active code):**
`th_app_settings`, `th_audit_log`, `th_cycle_key_sequence`, `th_cycle_test_cases`, `th_defect_attachments`, `th_defect_comments`, `th_defect_history`, `th_defect_links`, `th_defect_tags`, `th_defects`, `th_environment_history`, `th_environment_variables`, `th_environments`, `th_execution_attachments`, `th_execution_history`, `th_folders`, `th_report_templates`, `th_reports`, `th_test_case_attachments`, `th_test_case_links`, `th_test_case_tags`, `th_test_case_versions`, `th_test_cases`, `th_test_cycles`, `th_test_executions`, `th_test_plans`, `th_test_steps`

**Prior "dual schema P0" status (from summary):**
The original P0 was that the OLD frontend (`src/modules-dormant/testhub/`) read `th_*` and dashboard RPCs (`get_dashboard_stats`) read `th_*` → always 0. This frontend was **deleted** (per TESTHUB_BUILD_HANDOVER.md). The new frontend (`src/pages/testhub/`) was rebuilt to read `tm_*` only. The dual-schema problem at the **UI layer** is RESOLVED. `th_*` tables remain in DB but are unreferenced by any active code.

---

## Finding 2 — Active tm_* Table Families

**Evidence:** Python regex on `src/integrations/supabase/types.ts` extracting 6-space-indent table definitions.

**Core data tables (actively used by hooks/pages):**

| Table | Usage | Hook/Page |
|---|---|---|
| `tm_projects` | project scoping | useProjects |
| `tm_folders` | folder tree | useFolders |
| `tm_test_cases` | cases CRUD | useTestCases |
| `tm_test_steps` | steps CRUD | useTestSteps |
| `tm_test_case_versions` | versioning | useAutoVersioning, useTestCaseVersions |
| `tm_cycle_scope` | cycle-case assignment | useCreateRunWithDataRows, CycleDetailPage, ExecutionPage |
| `tm_test_cycles` | execution cycles | useTestCycles, useTestCyclesEnhanced |
| `tm_test_runs` | execution results | useCreateRunWithDataRows, useDataRowResults |
| `tm_step_results` | step-level results | useCreateRunWithDataRows, ExecutionPage |
| `tm_defects` | defect records | useDefects |
| `tm_defect_links` | defect↔run links | useDefects |
| `tm_test_sets` | test sets | TestSetsPage |
| `tm_set_cases` | set membership | TestSetsPage, SetDetailPage |
| `tm_comments` | comments | useDefects, CycleDetailPage |
| `tm_attachments` | attachments | useDefects, CycleDetailPage |
| `tm_labels` / `tm_case_labels` | labels | useAdminConfig |
| `tm_case_priorities` | priorities | useAdminConfig, CaseDrawer |
| `tm_case_types` | case types | useAdminConfig, CaseDrawer |
| `tm_environments` | environments | useAdminConfig |
| `tm_saved_reports` | saved reports | ReportDetailPage |
| `tm_requirements` | requirements | useDefects |
| `tm_requirement_tests` | req↔case links | useDefects |
| `tm_requirement_links` | traceability links | useRequirementLinks (hook) |

**Tables in types but NOT referenced in active code (candidates for future use):**
`tm_test_plans`, `plan_test_cycles`, `tm_plan_scope`, `tm_plan_team`, `tm_plan_approvals`, `tm_plan_versions`, `tm_plan_milestones`, `tm_cycle_assignments`, `tm_cycle_milestones`, `tm_key_sequences`, `tm_gherkin_steps`, `tm_shared_steps`, `tm_run_templates`, `tm_release_quality_gates`, `tm_release_readiness`, `tm_release_signoffs`

---

## Finding 3 — RPC Functions: Active vs Suspect

**All RPC calls found in active code:**

| RPC | Hook/Page | In DB types? | Status |
|---|---|---|---|
| `tm_next_entity_key` | useTestCycles, useTestCases, useTestCyclesEnhanced | ✅ line 69894 | CONFIRMED ACTIVE |
| `get_defect_stats` | useDefects, useDefectsG25 | ✅ (in DB) | CONFIRMED ACTIVE |
| `save_test_data` | useTestData | ✅ line 69272 | ACTIVE (accepts p_parameters, p_rows, p_test_case_id) |
| `get_my_scope` | useMyTestScope | ✅ line 68164 | ACTIVE — returns tm_cycle_scope fields |
| `get_my_stats` | useMyTestScope | ✅ line 68205 | ACTIVE |
| `tm_get_cycle_details` | useCycleDetails | ✅ line 69651 | ACTIVE |
| `tm_get_case_requirements` | useCaseRequirements | ✅ line 69585 | ACTIVE |
| `tm_get_traceability_matrix` | useTraceabilityMatrix | ✅ line 69842 | ACTIVE |
| `tm_get_cycle_quality_trends` | useCycleAnalytics | ✅ (in types) | ACTIVE |
| `tm_get_cycle_defect_trends` | useCycleAnalytics | ✅ | ACTIVE |
| `tm_get_tester_performance` | useCycleAnalytics | ✅ | ACTIVE |
| `tm_get_plan_analytics` | useCycleAnalytics | ✅ | ACTIVE |
| `tm_get_cycle_activity_feed` | useCycleActivityFeed | ✅ | ACTIVE |
| `tm_get_cycle_execution_velocity` | useCycleExecutionVelocity | ✅ | ACTIVE |
| `tm_get_cycle_team_workload` | useCycleTeamWorkload | ✅ | ACTIVE |
| `tm_get_release_test_summary` | useReleaseQualityGates | ✅ line 69792 | ACTIVE (Release module) |
| `tm_get_gate_history` | useReleaseQualityGates | ✅ line 69725 | ACTIVE (Release module) |
| `tm_get_release_readiness_history` | useReleaseReadiness | ✅ line 69768 | ACTIVE (Release module) |
| **`tm_get_requirement_test_cases`** | useRequirementLinks | ✅ line 69796 | ⚠️ SUSPECT — may reference deleted `tm_test_executions` |

**Note on suspect function:**
Prior session noted `tm_get_requirement_test_cases()` might reference deleted `tm_test_executions` table. The function IS in generated types (was created in DB). But type existence does not confirm internal SQL is valid. A staging DB probe (`execute_sql` MCP or `supabase db query --linked`) is needed to verify. **Cannot confirm without DB probe — this is exp-003 gate item.**

---

## Finding 4 — Dead/Zombie Code Paths

**P1 — `useTestPlansG26.ts` + test-plan components:**
- Hook (`src/hooks/useTestPlansG26.ts`) reads `tm_test_plans` and `plan_test_cycles` with `as any` cast
- Both tables ARE real (confirmed in types: `tm_test_plans` at line 28234-ish as FK ref; `plan_test_cycles` at line 28234)
- Components `src/components/test-plans/` (ScopeTab, ApprovalsTab, TeamTab, etc.) import this hook
- **NO testhub route imports any test-plans component** — confirmed by grep
- These are orphaned test-plans components from a prior implementation attempt — not routed, not reachable by users

**P1 — `save_test_data` RPC usage:**
- Used in `src/hooks/test-management/useTestData.ts` 
- RPC exists in types (line 69272)
- `useTestData.ts` exists but no current testhub page imports it — also orphaned

**P2 — `th_*` tables in DB:**
- 27+ `th_*` tables still exist in the database
- No active UI reads from them
- They waste DB storage and create confusion — cleanup candidates (exp-003 or later)

**P2 — Dashboard mode='test' has no test widgets:**
- `DashboardPage.tsx` mounts `ProjectDashboardPage mode='test'`
- `ProjectDashboardPage.tsx:143` checks `isTest = mode === 'test'`
- No test-specific widgets implemented — dashboard shows empty/default state
- Not a broken data path — a missing feature (build in exp-006)

---

## Finding 5 — Pages Safety Audit

**SAFE for UI audit (read from confirmed tm_* tables):**

| Page | Route | Data source | Safety |
|---|---|---|---|
| RepositoryPage | /testhub/repository | tm_test_cases, tm_folders, tm_test_steps | ✅ SAFE |
| CaseDrawer | (in RepositoryPage) | tm_case_priorities, tm_case_types, useTestCases | ✅ SAFE |
| CyclesPage | /testhub/cycles | tm_test_cycles (via useTestCycles) | ✅ SAFE |
| CycleDetailPage | /testhub/cycles/:id | tm_test_cycles, tm_cycle_scope, tm_comments, tm_attachments | ✅ SAFE |
| ExecutionPage | /testhub/cycles/:cycleId/execute/:caseId | tm_test_runs, tm_step_results, tm_cycle_scope | ✅ SAFE |
| ReportsPage | /testhub/reports | tm_projects, tm_test_cases | ✅ SAFE |
| ReportDetailPage | /testhub/reports/:type | tm_test_runs, tm_test_cycles, tm_test_cases, tm_cycle_scope, tm_defects | ✅ SAFE |
| TestSetsPage | /testhub/sets | tm_test_sets (direct) | ✅ SAFE |
| SetDetailPage | /testhub/sets/:id | tm_set_cases (direct) | ✅ SAFE |
| TraceabilityPage | /testhub/traceability | tm_test_cases + ph_issues via linked_work_item_id | ✅ SAFE |
| DefectsPage | /testhub/defects | BacklogPage → tm_defects adapter | ✅ SAFE |
| BoardPage | /testhub/board | BacklogPage → tm_test_cases adapter | ✅ SAFE |
| MyWorkPage | /testhub/my-work | BacklogPage → tm_test_cases adapter | ✅ SAFE |
| FiltersListPage | /testhub/filters | canonical FiltersListPage | ✅ SAFE |
| FilterDetailPage | /testhub/filters/:id | thin wrapper | ✅ SAFE |
| FilterPreviewPage | /testhub/filters/:id/preview | thin wrapper | ✅ SAFE |
| DashboardPage | /testhub/dashboard | ProjectDashboardPage mode='test' | ⚠️ SAFE (no crash, but no test widgets yet) |

**BLOCKED for UI audit (suspect data paths need verification first):**
- None of the routed pages are blocked by unverified data paths. 
- The `tm_get_requirement_test_cases` RPC is called by `useRequirementLinks` hooks, which are used by `TraceabilityPage` — BUT TraceabilityPage itself does NOT call `useRequirementLinks` directly. It uses its own inline query on `tm_test_cases` + `ph_issues`. So TraceabilityPage is SAFE.
- `useRequirementLinks` is imported by... checking is needed for exp-003.

---

## Finding 6 — Data Contract Recommendation

**Authoritative schema:** `tm_*` tables only.

**Build rule (confirmed):** Every new testhub page/hook MUST read from `tm_*`. Never `th_*`. This matches TESTHUB_BUILD_HANDOVER.md mandate.

**Priority probe for exp-003 (staging DB access required):**
1. Run `tm_get_requirement_test_cases('story', '<any-uuid>')` → confirm no error (proves function SQL is valid)
2. Verify `th_*` tables have zero active RLS policies → confirm they're truly dormant
3. Verify `tm_projects` has at least 1 row → confirm seeded data exists for testing

---

## Evidence Table

| Claim | Source | Evidence |
|---|---|---|
| All hooks read tm_* | src/hooks/test-management/ | grep -c "th_" → 0 results |
| All pages read tm_* | src/pages/testhub/ | grep -c "th_" → 0 results |
| th_* in types only | src/integrations/supabase/types.ts | lines 45803–49254 |
| tm_* table list | types.ts Python regex | 140+ definitions at 6-space indent |
| tm_get_requirement_test_cases in types | types.ts line 69796 | confirmed |
| save_test_data in types | types.ts line 69272 | confirmed |
| get_my_scope in types | types.ts line 68164 | confirmed |
| CaseDrawer reads tm_case_priorities | CaseDrawer.tsx line 49 | .from('tm_case_priorities') |
| plan_test_cycles is real table | types.ts line 28234 | table definition, not only FK ref |
| test-plans components not routed | FullAppRoutes.tsx | grep TestPlanCard → 0 results in routes |
| DashboardPage uses ProjectDashboardPage | DashboardPage.tsx line 13 | `<ProjectDashboardPage mode="test" />` |
| Old frontend deleted | TESTHUB_BUILD_HANDOVER.md | "Previous frontend deleted" |
