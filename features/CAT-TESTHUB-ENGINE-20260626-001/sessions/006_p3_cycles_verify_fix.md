# Session 006 — Phase 3a: Test Cycles (CRUD + scope)

**Date:** 2026-06-27
**Branch:** main
**Goal:** Verify cycle CRUD + scope persists; counts wired (plan §Phase 3a). Cycles surface pre-existed (CyclesPage/CycleDetailPage/ExecutionPage, routes wired).

## Probe (healthy vs Sets)
- tm_test_cycles.project_id → tm_projects ✓ (correct, unlike tm_test_sets).
- tm_test_cycles + tm_cycle_scope each have 4 RLS policies ✓.
- cycle_key has NO generator trigger, but createCycle generates it via tm_next_entity_key RPC ✓.
- CyclesPage has react-router-dom import ✓ (no Sets-class crash).

## Proven live (authed POST under user RLS)
- Cycle create: 201 → CYC-001 "Regression Cycle Q3" (status 'planned' — enum is LOWERCASE).
- Scope: 3 cases → tm_cycle_scope (201). List renders CYC-001, Cases=3, 0%.

## BLOCKER found + fixed (D12)
- After adding 3 scope rows, tm_test_cycles.total_cases=4 (real=3) — counters over-count.
- Cause: tm_cycle_scope had TWO competing counter systems:
  - RECOMPUTE (correct): sync_cycle_scope_counters + cycle_scope_stats→tm_update_cycle_stats (both COUNT(*)).
  - INCREMENT (buggy): tm_cycle_scope_insert/update/delete_trigger (+1/-1, additive, fires after recompute → drift).
- RED FLAG → Vikram chose: drop the 3 increment triggers + fns, keep recompute, backfill.
- migration 20260627150000 applied via MCP. Proven: backfill CYC-001 4→3; insert→4=actual4; delete→3=actual3.

## Open flags (08)
- App status filters UPPERCASE 'PLANNED'/'IN_PROGRESS' vs lowercase enum → "Add to cycle" matches 0 (SetDetailPage:427; check CyclesPage). NOT fixed (separate).
- tm_cycle_sets table missing → "sets to cycle" (plan 3a) unsupported on cyij.
- Phase 3b (assignees + day-bucket plan) not started; tm_cycle_scope.assigned_to exists, untested.

## Commit
- migration 20260627150000 + artifacts. No source changed (bug was DB triggers; cycle CRUD code works).
