# Baseline: test-hub / exp-002

**Date:** 2026-06-26
**Type:** research

> Research experiment. Baseline = current schema state, not file state.

---

## Schema Families Present in DB

| Family | Table count (approx) | Status |
|---|---|---|
| `tm_*` | 140+ (tables + functions) | ACTIVE — all current code reads these |
| `th_*` | 27+ | DORMANT — in types.ts, zero active code references |

Source: `src/integrations/supabase/types.ts` (Python regex, 6-space indent extraction)

---

## Active tm_* Tables at Baseline

Core tables used by routed pages/hooks:

```
tm_projects, tm_folders, tm_test_cases, tm_test_steps, tm_test_case_versions,
tm_cycle_scope, tm_test_cycles, tm_test_runs, tm_step_results,
tm_defects, tm_defect_links, tm_test_sets, tm_set_cases, tm_test_set_cases,
tm_comments, tm_attachments, tm_labels, tm_case_labels,
tm_case_priorities, tm_case_types, tm_environments, tm_saved_reports,
tm_requirements, tm_requirement_tests, tm_requirement_links,
tm_cycle_assignments, tm_cycle_milestones
```

Orphaned (in DB, not used by routed pages):
```
tm_test_plans, plan_test_cycles, tm_plan_scope, tm_plan_team,
tm_plan_approvals, tm_plan_versions, tm_plan_milestones,
tm_key_sequences, tm_gherkin_steps, tm_shared_steps, tm_run_templates
```

---

## Active RPCs at Baseline

| Function | Called by | Verified in types.ts |
|---|---|---|
| `tm_next_entity_key` | useTestCycles, useTestCases | ✅ line 69894 |
| `get_defect_stats` | useDefects, useDefectsG25 | ✅ |
| `save_test_data` | useTestData | ✅ line 69272 |
| `get_my_scope` | useMyTestScope | ✅ line 68164 |
| `get_my_stats` | useMyTestScope | ✅ |
| `tm_get_cycle_details` | useCycleDetails | ✅ line 69651 |
| `tm_get_case_requirements` | useRequirementLinks | ✅ line 69585 |
| `tm_get_requirement_test_cases` | useRequirementLinks | ✅ line 69796 — ⚠️ SUSPECT |
| `tm_get_traceability_matrix` | useTraceabilityMatrix | ✅ line 69842 |
| `tm_get_cycle_quality_trends` | useCycleAnalytics | ✅ |
| `tm_get_cycle_defect_trends` | useCycleAnalytics | ✅ |
| `tm_get_tester_performance` | useCycleAnalytics | ✅ |
| `tm_get_plan_analytics` | useCycleAnalytics | ✅ |
| `tm_get_cycle_activity_feed` | useCycleActivityFeed | ✅ |
| `tm_get_cycle_execution_velocity` | useCycleExecutionVelocity | ✅ |
| `tm_get_cycle_team_workload` | useCycleTeamWorkload | ✅ |
| `tm_get_release_test_summary` | useReleaseQualityGates | ✅ |
| `tm_get_gate_history` | useReleaseQualityGates | ✅ |
| `tm_get_release_readiness_history` | useReleaseReadiness | ✅ |

Dead (in DB, not called by any active code):
```
get_dashboard_stats — reads th_* → always returned 0; DashboardPage no longer calls it
```

---

## Testhub Routes at Baseline

16 routes under `/testhub/*`:
```
/testhub/dashboard, /testhub/repository, /testhub/cycles, /testhub/cycles/:id,
/testhub/cycles/:id/execute/:caseId, /testhub/my-work, /testhub/defects,
/testhub/reports, /testhub/reports/:type, /testhub/sets, /testhub/sets/:id,
/testhub/traceability, /testhub/filters, /testhub/filters/:id,
/testhub/filters/:id/preview, /testhub/board
```

---

## Dead/Orphaned Code at Baseline

| File/dir | Status | Reason |
|---|---|---|
| `src/modules-dormant/testhub/` | DELETED (per HANDOVER.md) | Read th_* → always empty |
| `src/hooks/useTestPlansG26.ts` | EXISTS but orphaned | No route imports its consumers |
| `src/components/test-plans/` | EXISTS but dead | 9 components, none wired to any route |
| `src/hooks/test-management/useTestData.ts` | EXISTS but orphaned | No testhub page imports it |
| `get_dashboard_stats` SQL function | EXISTS in DB | Not called; reads th_* → always 0 |

## Baseline TypeScript

Not applicable — research experiment, no src/ changes made.

## Baseline ADS Audit

Not applicable — research experiment, no src/ changes made.
