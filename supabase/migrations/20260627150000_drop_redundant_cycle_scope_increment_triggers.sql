-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27 · D12
-- Drop the redundant, drift-causing increment counter triggers on
-- tm_cycle_scope. Keep the authoritative recompute triggers.
--
-- tm_cycle_scope had TWO competing counter-maintenance systems on
-- tm_test_cycles.{total_cases,passed/failed/blocked/skipped/not_run/in_progress}_count:
--   1. RECOMPUTE (correct, idempotent): sync_cycle_scope_counters +
--      cycle_scope_stats→tm_update_cycle_stats, both COUNT(*) from tm_cycle_scope.
--   2. INCREMENT (buggy, additive): tm_cycle_scope_insert/update/delete_trigger,
--      which +1/-1 on top of the recompute. Fires after recompute → drift.
-- Proof: inserting 3 scope rows set total_cases=4 (real scope = 3).
--
-- Fix: drop the 3 increment triggers + their functions. The recompute
-- triggers keep all counters correct (cannot drift). Then backfill every
-- existing cycle's counters to the true counts.
-- Approved by Vikram 2026-06-27 (drift log 08, decision: drop increments + backfill).
-- Idempotent: safe to re-run.

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_insert ON public.tm_cycle_scope;
DROP TRIGGER IF EXISTS trg_tm_cycle_scope_update ON public.tm_cycle_scope;
DROP TRIGGER IF EXISTS trg_tm_cycle_scope_delete ON public.tm_cycle_scope;

DROP FUNCTION IF EXISTS public.tm_cycle_scope_insert_trigger();
DROP FUNCTION IF EXISTS public.tm_cycle_scope_update_trigger();
DROP FUNCTION IF EXISTS public.tm_cycle_scope_delete_trigger();

-- Backfill: recompute counters for every cycle to repair existing drift.
SELECT public.tm_update_cycle_stats(id) FROM public.tm_test_cycles;
