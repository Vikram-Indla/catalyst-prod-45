# Session 007 — Phase 4a: Execution engine (run + step results + percolation + counters)

**Date:** 2026-06-27
**Branch:** main
**Goal:** Run a case in a cycle → per-step results → percolation → run/scope status → cycle counters (plan §Phase 4 KEY). ExecutionPage pre-existed.

## Probe
- ExecutionPage uses canonical tm_test_runs + tm_step_results + tm_cycle_scope ✓ (not legacy test_cycle_executions).
- tm_execution_status enum lowercase: not_run/in_progress/passed/failed/blocked/skipped. handleSave lowercases ✓.
- Percolation is DB-driven: tm_step_results_percolate → tm_calculate_run_status → updates run.status + scope.current_status. BUT trigger is AFTER UPDATE OF status only (not INSERT) — app INSERTs results, so trigger doesn't fire on that path; handleSave compensates by manually setting run.status (at insert) + scope.current_status. OK.

## Bugs found + fixed
1. **ExecutionPage wrong columns** (followed stale TESTHUB_BUILD_HANDOVER.md): tm_test_runs insert used cycle_id/scope_id/case_id (real: cycle_scope_id only); tm_step_results used run_id/step_id (real: test_run_id/test_step_id). FIXED handleSave.
2. **D13 — every tm_cycle_scope UPDATE 400'd.** Two audit triggers (tm_log_cycle_scope_status_change, tm_log_cycle_assignment_change) read dead `test_cases.test_key` (real: tm_test_cases.case_key); status_change also used OLD/NEW.status (col is current_status). FIXED both fns (mig 160000). Then audit INSERT 409'd because tm_cycle_execution_audit.test_case_id FK also pointed at dead test_cases → repointed → tm_test_cases (mig 170000, table empty). Approved by Vikram (fix path).

## Proven live (authed POST replicating fixed handleSave)
- Run insert (cycle_scope_id) → 201; 3 step results [passed,passed,failed] → 201.
- Scope PATCH current_status='failed' → 200 (was 400/409 before D13).
- Full chain DB-verified: run.status='failed' (percolated), scope.current_status='failed', cycle CYC-001 failed_count=1/not_run=2, audit row {status_changed→failed, TC-001}.
- tsc clean; npm run build clean.

## Remaining Phase 4
- 4b: evidence attach (th_execution_attachments?), effort timer (duration_seconds wired), defect-from-exec (trg_tm_auto_create_defect on tm_test_runs — Phase 5 overlap).
- 4c: cycle rollups / multi-run "Add Run" (run_number hardcoded 1 in handleSave — needs next-run-number).

## Test artifacts left on cyij
SET-001 (3 cases), CYC-001 (3 cases; TC-001 run=failed with 3 step results + audit row).
