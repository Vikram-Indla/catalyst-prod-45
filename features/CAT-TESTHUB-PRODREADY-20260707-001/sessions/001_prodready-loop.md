# Session 001 — 2026-07-07 — production-readiness loop (/goal)

## Done
- Discovery: 2 parallel agents (code map + cyij DB audit) + live browser sweep w/ screenshots.
  Full outputs summarized in 02_CANONICAL_DISCOVERY.md.
- S1 Console errors: DropdownMenu custom triggers leaked isSelected/testId to DOM buttons.
  Fixed RepositoryPage.tsx (folder menu) + CyclesPage.tsx ×2 (bulk menu, row menu).
- S5 Legacy source: useTestCases.ts read last-execution from dead-empty test_cycle_executions
  (always null → silent lie). Re-pointed both sites to tm_cycle_scope (test_case_id,
  current_status, updated_at).
- S2 Defect-from-failure in run player: ExecutionPage.tsx — failed/blocked save arms a
  SectionMessage strip; LogDefectFromRunModal files via useCreateDefect with full lineage
  (source_test_run_id, source_test_case_id, run_id, cycle_id, step_id = first failed step
  result — step-results insert now returns ids). Prompt clears on case switch.
- S3 Plan rename/delete: TestPlansPage.tsx row-actions menu + canonical modals; locked plans
  guarded; delete removes tm_test_plan_cases (test_plan_id FK) then plan.
- S4 Execution delete: useDeleteTestExecution (guard: blocks when tm_test_cycles.execution_id
  refs exist) + ExecutionsPage row menu + confirm modal.
- Orphan write closed: repository bulk "Add to set…" removed (sets deprecated D-004; nothing
  reads tm_set_cases). AddToCycleSetSheet set-mode plumbing left intact.
- S6 Seed repair (cyij, idempotent SQL, verified): folderless 92→0 (type-based folder spread);
  step-less cases →0 (3 authored steps each); tm_test_plan_cases 0→50 (RVPL-001=20 Functional,
  RVPL-002=30 Regression+UAT; totals updated by trg_tm_update_plan_stats); step results 0→144
  for terminal runs (status mirrors run verdict — no fabricated passes); 13/13 defects got
  source run/case + 26 tm_defect_links rows (auto_execution shape).
- S7 Tests: src/hooks/test-management/__tests__/useDeleteTestExecution.test.tsx — 3/3 pass.

## Validation
- tsc --noEmit: no errors in touched files (whole-repo run clean).
- lint:colors:gate 0=baseline0; audit:ads:gate all categories at baseline.
- vitest: 3/3 new tests pass.
- DB probe after seed repair: {folderless:0, no-steps:0, plan_refs:50, step_results:144,
  defects_with_run:13, defect_links:26, plan totals 20/30}.

## Blocked / queued
- Browser evidence sweep: app session expired mid-probe; password entry is user-only.
  Queued: case full page, create/edit/move/clone case, plan add-cases, run + defect-from-run,
  traceability matrix, screenshots.
- Decisions for Vikram: (1) 'Test Set' work type in global CreateStoryModal still writes
  surface-less tm_test_sets rows — remove type or build a sets read surface? (2) tm_audit_logs
  dead duplicate table (DDL drop). (3) duplicate "Senaei BAU" tm_projects rows (SENAEI-BAU
  seed vs user 'BAU'). (4) dead hooks sweep (useTestPlansG26, useCreateRunWithDataRows,
  useDataRowResults, useTestData, useRepositoryData, useTestCaseRelease, dead Routes.testHub.run()).
