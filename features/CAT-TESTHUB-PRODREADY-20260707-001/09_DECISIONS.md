# Decisions — CAT-TESTHUB-PRODREADY-20260707-001

## Made this session (autonomous, low-risk)
- D1: Removed repository bulk "Add to set…" (writes had no reading surface; sets → plans
  per prior D-004/E7). Plumbing (AddToCycleSetSheet set mode, tm_set_cases) untouched.
- D2: Last-execution source = tm_cycle_scope.current_status/updated_at (legacy
  test_cycle_executions is empty; keeping it silently nulled the Last-run column).
- D3: Execution delete guarded (refuse when cycles exist) rather than cascading — cycles
  carry run evidence; cascade = silent data loss.
- D4: Seed step results mirror run verdicts exactly (failed run → step 3 failed; blocked →
  step 2 blocked); no fabricated all-pass evidence.

## Need Vikram
- Q1: Global CreateStoryModal work type 'Test Set' still creates surface-less tm_test_sets
  rows. Remove the type, or resurrect a sets surface?
- Q2: Drop dead duplicate table tm_audit_logs (0 rows; tm_audit_log is live)? DDL — held.
- Q3: Two tm_projects named "Senaei BAU" (SENAEI-BAU seed w/ 93 cases; BAU user-created,
  empty). Merge/rename to kill picker ambiguity?
- Q4: Dead-code sweep: useTestPlansG26, useCreateRunWithDataRows, useDataRowResults,
  useTestData, useRepositoryData, useTestCaseRelease, Routes.testHub.run() builder,
  legacy tables test_data_rows/test_data_parameters/test_cycle_executions.
- Q5 RESOLVED (2026-07-08, ddb44e78b): create + rename modals now submit via form
  (confirm button = type=submit); raw Enter onKeyDown removed. Verified live: the
  race leaves the modal open w/ Create disabled (no phantom submit); focused Enter
  creates (TP-0002 round-trip created + deleted).
