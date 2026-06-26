# 08 — DRIFT LOG

Record every divergence from 03_PLAN_LOCK and every place code contradicts the acceptance model.
Format: date · what drifted · why · decision (keep/revert/rebaseline) · who.

| Date | Drift | Why | Decision | By |
|---|---|---|---|---|
| 2026-06-26 | Broken `sync_jira_bug_to_defect` trigger ABSENT on cyij (discovery assumed present) | Migration 20260607 never reached staging | D2 becomes idempotent guard, not active drop | keep |
| 2026-06-26 | Run-table consolidation (test_cycle_executions/th_test_executions → tm_test_runs) NOT done in P0 | Both legacy tables exist on cyij → no missing-table break; risk of regression now | Deferred to Phase 4 (execution) | keep |
| 2026-06-26 | `/testhub/defects/:id` detail route not added in P0 | Defect detail belongs with ph_issues repoint | Deferred to Phase 5 | keep |
| 2026-06-26 | Discovery agent reported `/testhub/defects` route MISSING; actually present at FullAppRoutes.tsx:674 | Agent read stale/partial state | No fix needed; route works. Trust live probe over agent claim | keep |
| 2026-06-26 | `useTestCases` referenced non-existent columns (`tm_test_cases.archived`, `tm_case_priorities.level`) → case list threw on every surface | Hook written against a schema variant cyij doesn't have | Fixed: aligned hook to real schema (use `sort_order`, removed archived filter) | keep |
| 2026-06-26 | "Archive cases" (AioTests feature) has no schema support on cyij | tm_test_cases has no archived column; lifecycle is status enum | RESOLVED D8: added archived column (migration 20260626110000) | keep |
| 2026-06-26 | INCIDENT: TC-010 hard-deleted by a stray click during testing (no confirm) | Trash button did instant `deleteCase.mutate` | Restored TC-010; added delete-confirm dialog. Validates the hazard | keep |
| 2026-06-26 | UX BUG: CATY floating assistant overlaps the CaseDrawer primary action (Create case) — clicks hit CATY not submit | Fixed floating widget z-over drawer footer | FLAG for design pass / Phase 1c (drawer→CatalystViewBase may move footer). Not a wiring bug | open |
| 2026-06-26 | Auto-generated case_key = `TC-0001` (4-digit) vs seed `TC-001` (3-digit) | tm_next_entity_key padding differs from manual seed | Minor cosmetic; reconcile key format in Phase 1b/admin | open |

## Rebaseline rule
Product docs (D6) win over existing code. If a slice must diverge from the plan, log it here FIRST, then amend 03_PLAN_LOCK, then proceed. No silent divergence.
