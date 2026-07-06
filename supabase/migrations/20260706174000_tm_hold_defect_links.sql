-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B6: hold verdict + defect link repair (D-003)
-- 1) 'hold' step-result verdict (V2: pass/fail/blocked/hold/skipped)
-- 2) denormalized cycle_scope_id on defect links (fast lineage queries; live FK
--    target of test_run_id is tm_test_runs — the bootstrap-file "misnamed FK"
--    was corrected on the live DB at some point).
-- 3) non_test_origin flag (V2: defects must carry run/step lineage unless explicitly non-test-origin)

-- 1) hold verdict (additive; cannot be used in the same transaction it is added)
ALTER TYPE public.tm_execution_status ADD VALUE IF NOT EXISTS 'hold';

-- 2) Scope lineage denormalization
ALTER TABLE public.tm_defect_links
  ADD COLUMN IF NOT EXISTS cycle_scope_id uuid REFERENCES public.tm_cycle_scope(id) ON DELETE SET NULL;

UPDATE public.tm_defect_links dl
SET cycle_scope_id = r.cycle_scope_id
FROM public.tm_test_runs r
WHERE dl.test_run_id = r.id AND dl.cycle_scope_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tm_defect_links_cycle_scope ON public.tm_defect_links (cycle_scope_id) WHERE cycle_scope_id IS NOT NULL;

-- 3) Non-test-origin flag
ALTER TABLE public.tm_defect_links
  ADD COLUMN IF NOT EXISTS non_test_origin boolean NOT NULL DEFAULT false;
