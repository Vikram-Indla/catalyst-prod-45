# Plan Lock — CAT-TESTHUB-PRODREADY-20260707-001

Status: ACTIVE (auto-approved under /goal autonomous loop, 2026-07-07).
Objective: close production-readiness gaps found in 02_CANONICAL_DISCOVERY.md.

## Slices (each ≤2h, risk order)

S1 (DONE) — Console errors: strip isSelected/testId from DropdownMenu custom triggers.
  Files: RepositoryPage.tsx, CyclesPage.tsx (2 sites).

S2 — Defect-from-failure inside run player.
  File: src/pages/testhub/cycles/ExecutionPage.tsx.
  Reuse EXACT pattern from CycleDetailPage.tsx:735-755 (useCreateDefect + source lineage:
  source_test_case_id, cycle_scope_id, run context prefill). Button appears on FAIL/BLOCKED
  verdicts. No new components; canonical modal already exists (defect create via useDefects).

S3 — Plan rename + delete.
  File: src/pages/testhub/plans/TestPlansPage.tsx + TestPlanDetailPage.tsx.
  Row action menu (canonical DropdownMenu) → Rename (canonical modal, tm_test_plans.name
  update), Delete (canonical confirm modal; delete tm_test_plan_cases refs then plan).
  Locked plans: no rename/delete (guard).

S4 — Execution delete.
  Files: executions/ExecutionsPage.tsx (+useTestExecutions.ts add useDeleteTestExecution).
  Canonical confirm modal. Guard: block if execution has cycles (tm_test_cycles FK).

S5 — Legacy ref repair: useTestCases.ts:140,224 `test_cycle_executions` → tm_* equivalent
  (verify live schema before edit; if column-compatible replacement impossible, remove the
  dead join and derive from tm_test_runs).

S6 — Seed repair (cyij staging, idempotent SQL):
  a) assign SENAEI-BAU cases to its 8 folders (deterministic spread by case type/title);
  b) populate tm_test_plan_cases for RVPL-001/002 (subsets of its cases);
  c) step results for a sample of its runs (honest statuses matching run status);
  d) tm_defect_links for its 13 defects → runs/cases (lineage).
  No DDL. Committed migration file NOT required (environment-specific data repair) —
  logged here + in 06_VALIDATION_EVIDENCE.md instead. (Ledger discipline: no ledger row
  minted since no migration file.)

S7 — Tests: unit tests for the new mutations (plan rename/delete, execution delete,
  defect-from-run prefill builder) following existing repo test patterns.

S8 — Browser evidence sweep after Vikram signs in (blocked externally).

## Non-scope
- Test Sets rebuild (E7/D-004 keeps sets → plans redirect). Orphaned tm_test_sets writes:
  surfaced as decision item, not silently removed.
- Dead-hook deletion sweep (useTestPlansG26 etc.) — flagged, separate cleanup.
- Repository dev-mode first-paint perf.
- tm_audit_logs duplicate table drop (DDL — needs Vikram).

## Forbidden
- New colors (ADS tokens only), hand-rolled UI, drawer CRUD, git add -A, prod DB.

## Validation
- tsc no new errors vs baseline; lint:colors:gate; audit:ads:gate.
- DB probes for each seed repair (counts before/after).
- Screenshots per surface post-sign-in.

## Stop conditions
- Any schema surprise on S5/S6 → probe first, re-plan slice.
- Auth stays unavailable → complete S1-S7, document S8 blocker.
