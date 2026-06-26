# Baseline: test-hub / test-01

**Date:** 2026-06-26
**Time:** 03:34

Research experiment — baseline = current state of Test Hub module before any revamp.

---

## Files Touched (NONE — research only)

No src/ files modified. Documentation output files only.

---

## Relevant Data State (Test Hub baseline)

```
Routes registered (FullAppRoutes.tsx lines 655–673):
  16 routes under /testhub/

Page files: 19 files under src/pages/testhub/
  4 canonical thin wrappers: Dashboard, MyWork, Board, DefectsPage
  2 canonical filter mounts: FiltersListPage, FilterDetailPage
  13 custom pages: Repository, CaseDrawer, Cycles, CycleDetail, Execution, Sets, SetDetail,
                   Traceability, Reports, ReportDetail, FilterPreview, Defects (duplicate)

Hooks: 28+ files in src/hooks/test-management/ (~6,276 lines)
  All hooks read tm_* tables (th_* tables dead)

Components: 
  Active: TestHubSidebar, StepEditor
  Orphaned: test-plans/ (9 files), test-cycles/calendar/ (5 files), assignment-table/,
            VersionDiffView.tsx

Schema: tm_* is canonical family
  Active tables: tm_test_cases, tm_test_steps, tm_test_cycles, tm_cycle_scope,
                 tm_test_runs, tm_step_results, tm_defects, tm_defect_links,
                 tm_folders, tm_test_sets, tm_set_cases, tm_environments,
                 tm_case_priorities, tm_case_types, tm_labels, tm_case_labels
  Dead tables: th_* (27+ tables, 0 active code references)

Admin routes (lines 139–144):
  /admin/test/priorities, /admin/test/types, /admin/test/statuses,
  /admin/test/run-statuses, /admin/test/permissions

AI:
  useAIGeneration.ts: EXISTS; calls ai-generate-test-cases Edge Fn
  UI trigger: NONE (hook is dead code in UI layer)

Reports:
  ReportsPage: 13 tile stubs (none implemented)
  ReportDetailPage: stub body

Issues known:
  - tm_get_requirement_test_cases: suspect SQL; staging probe needed
  - useTestPlansG26.ts: uses 'as any' (tm_test_plans types not generated)
  - Test Plans components (9): orphaned; decision needed
  - CaseDrawer: custom portal (not CatalystViewBase)
  - DashboardPage test widgets: absent (isTest mode branch empty)
```

## Baseline ADS Audit

Not applicable — research experiment, no src/ files touched.

## Baseline TypeScript

Not applicable — research experiment, no src/ files touched.
