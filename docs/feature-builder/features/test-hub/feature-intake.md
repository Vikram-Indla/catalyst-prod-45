# Feature Intake: test-hub

**Date:** 2026-06-26
**Slug:** test-hub
**Objective:** Rebuild Test Hub as Catalyst-native AI-assisted test management, benchmarked against AIO Tests documentation, reusing existing Catalyst patterns at every layer.

---

## Inputs

**Requestor:** Vikram  
**Priority:** P0

**External benchmarks to research:**

| Benchmark | Access method | Why benchmarked |
|---|---|---|
| AIO Tests (152 PDFs) | `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/` | Primary UX and feature reference |
| AIO Tests knowledge base | `/Users/vikramindla/Downloads/aio-tests-knowledge/` | Structured summaries (7 dirs: decisions, target-state, current-state, forensic, pipeline, handovers, prompt-library, source-refs) |
| AIO Tests HTML export | `/Users/vikramindla/Downloads/aio-test-enhanced.html` | Alt rendering format |

**Known constraints:**
1. All DB reads/writes → `tm_*` tables only. Never `th_*` (legacy, retired per TESTHUB_BUILD_HANDOVER.md)
2. Dashboard mounts canonical `ProjectDashboardPage` with `mode='test'`
3. Filters mount canonical `FiltersListPage` with `hubType='test'`
4. No program increments. No PI picker. Use `sprint_id` → `iterations.id`
5. Admin config (priorities, types, statuses, run statuses) drives all UI — never hardcode
6. CATY AI entry point via `AIIntelligenceButton` pattern only
7. `priority_id` on `tm_test_cases` is UUID FK → `tm_case_priorities`. Never access `row.priority` text (zero-assumption rule)

**Related Catalyst features/modules:**
- Project Hub (canonical JiraTable, FilterDropdown, sidebar pattern)
- Admin module (AdminLayout, 5 existing test admin pages at `/admin/test/*`)
- CATY AI (AIIntelligenceButton, CatyAIChat, useAIGeneration hook in test-management)
- For You feed (ActivityPanel pattern for audit/comments)
- Releases module (potential cycle↔sprint linkage)

**Suspected existing implementations (confirmed in exp-001):**
- `TestHubSidebar` — `src/components/layout/TestHubSidebar.tsx`
- 14 routes registered in `src/routes/FullAppRoutes.tsx` lines 139–673
- 19 page files under `src/pages/testhub/`
- 18 hooks under `src/hooks/test-management/`
- Full domain type system in `src/types/test-management.ts`
- 5 admin pages under `src/pages/admin/test/`

**Suspected DB tables (confirmed in TESTHUB_GAP_ANALYSIS.md + TESTHUB_BUILD_HANDOVER.md):**

| Table | Purpose | Notes |
|---|---|---|
| `tm_test_cases` | Cases | `priority_id` UUID FK, `case_type_id` UUID FK — no text `priority` column |
| `tm_test_steps` | Steps per case | `step_number, action, expected_result, test_data` |
| `tm_test_cycles` | Cycles | `sprint_id` FK to iterations, NO `pi_id` |
| `tm_cycle_scope` | Cases in cycle | `current_status` not `execution_status` |
| `tm_test_runs` | Execution runs | No `test_case_id` column — join through `tm_cycle_scope` |
| `tm_step_results` | Per-step outcome | `run_id, step_id, status, actual_result` |
| `tm_defects` | Defects | `defect_key, severity, status, external_id, external_url` |
| `tm_defect_links` | Defect ↔ run | `defect_id, test_run_id, step_result_id` |
| `tm_folders` | Folder tree | `name, parent_id, path, depth, project_id` |
| `tm_test_sets` + `tm_set_cases` | Sets + membership | `is_smart, smart_query` for dynamic sets |
| `tm_environments` | Environment config | Admin managed |
| `tm_case_priorities` | Priority config | `name, level, color, sort_order` — admin managed |
| `tm_case_types` | Type config | `name, icon, color` — admin managed |
| `tm_labels` + `tm_case_labels` | Labels | junction |
| `th_*` tables | DEAD — legacy | NEVER READ OR WRITE |
