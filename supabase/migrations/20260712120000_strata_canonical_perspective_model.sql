-- CAT-STRATA-E2E-FIXES-20260712-002 — defect V3-OPEN-011.
--
-- Canonical STRATA 5-perspective model (product decision, Vikram, 2026-07-12):
--   1 Financial, 2 Customer & Market, 3 Network & Infrastructure,
--   4 Digital & Innovation, 5 People & Capability.
--
-- Seeded model was Financial / Customer / Digital / People / ESG (30/25/20/15/10).
-- ESG has NO canonical equivalent (it is NOT Network & Infrastructure) and is
-- RETIRED, not deleted — its seed scorecard line (KPI 1208 "CO2 Reduction") is
-- RESTRICT-referenced and preserved for historical reproducibility.
--
-- Controlled CONFIG migration:
--  * Customer/Digital/People renamed IN PLACE (id + frozen slug unchanged, so
--    strategy elements, scorecard lines, model weights and calc history are all
--    preserved). Financial kept as-is.
--  * Network & Infrastructure added as a net-new approved perspective (#3).
--  * CEO Enterprise Scorecard weights rebalanced: ESG's 10 -> Network &
--    Infrastructure, so the model still totals 100 (30/25/10/20/15). Weights are
--    retained as the existing seed distribution pending authoritative values
--    (product ruling item 7). The B2B Sector Scorecard does not reference ESG and
--    is untouched (its Financial/Customer/Digital rows are renamed in place).
--
-- Pre-verified seed-only: no non-seed KPIs hang off any perspective; ESG has 0
-- strategy elements and 0 KPI links. No destructive delete of any perspective.

-- 1) Rename compatible perspectives in place (id + frozen slug unchanged).
UPDATE public.strata_perspectives
   SET order_index = 0, updated_at = now()
 WHERE id = 'a5a1a000-0000-4000-8000-000000000101'; -- Financial (name unchanged)

UPDATE public.strata_perspectives
   SET name = 'Customer & Market', order_index = 1,
       change_reason = 'V3-OPEN-011 canonical model rename', updated_at = now()
 WHERE id = 'a5a1a000-0000-4000-8000-000000000102'; -- Customer

UPDATE public.strata_perspectives
   SET name = 'Digital & Innovation', order_index = 3,
       change_reason = 'V3-OPEN-011 canonical model rename', updated_at = now()
 WHERE id = 'a5a1a000-0000-4000-8000-000000000103'; -- Digital

UPDATE public.strata_perspectives
   SET name = 'People & Capability', order_index = 4,
       change_reason = 'V3-OPEN-011 canonical model rename', updated_at = now()
 WHERE id = 'a5a1a000-0000-4000-8000-000000000104'; -- People

-- 2) Retire ESG (no canonical equivalent; NOT deleted — seed line/KPI preserved).
UPDATE public.strata_perspectives
   SET status = 'retired', effective_to = now(), order_index = 5,
       change_reason = 'V3-OPEN-011 ESG retired — no canonical equivalent (seed-only)',
       updated_at = now()
 WHERE id = 'a5a1a000-0000-4000-8000-000000000105'; -- ESG

-- 3) Add Network & Infrastructure (net-new canonical perspective #3).
INSERT INTO public.strata_perspectives
   (id, name, slug, description, order_index, default_weight, status, approved_at, effective_from, change_reason)
 VALUES
   ('a5a1a000-0000-4000-8000-000000000106', 'Network & Infrastructure', 'network-infrastructure',
    'Network reach, resilience and infrastructure investment', 2, 10, 'approved', now(), now(),
    'V3-OPEN-011 canonical model — new perspective');

-- 4) Rebalance CEO Enterprise Scorecard weights: drop ESG (10), add N&I (10).
--    Model still totals 100 (30/25/10/20/15).
DELETE FROM public.strata_scorecard_model_perspectives
 WHERE model_id = 'a5a1a000-0000-4000-8000-000000001501'
   AND perspective_id = 'a5a1a000-0000-4000-8000-000000000105'; -- remove ESG weight

INSERT INTO public.strata_scorecard_model_perspectives (id, model_id, perspective_id, weight, order_index)
 VALUES (gen_random_uuid(), 'a5a1a000-0000-4000-8000-000000001501',
         'a5a1a000-0000-4000-8000-000000000106', 10, 2); -- add N&I weight

-- Align CEO model perspective ordering to canonical.
UPDATE public.strata_scorecard_model_perspectives SET order_index = 0
 WHERE model_id = 'a5a1a000-0000-4000-8000-000000001501' AND perspective_id = 'a5a1a000-0000-4000-8000-000000000101';
UPDATE public.strata_scorecard_model_perspectives SET order_index = 1
 WHERE model_id = 'a5a1a000-0000-4000-8000-000000001501' AND perspective_id = 'a5a1a000-0000-4000-8000-000000000102';
UPDATE public.strata_scorecard_model_perspectives SET order_index = 3
 WHERE model_id = 'a5a1a000-0000-4000-8000-000000001501' AND perspective_id = 'a5a1a000-0000-4000-8000-000000000103';
UPDATE public.strata_scorecard_model_perspectives SET order_index = 4
 WHERE model_id = 'a5a1a000-0000-4000-8000-000000001501' AND perspective_id = 'a5a1a000-0000-4000-8000-000000000104';

-- 5) Assert both approved models still total 100 — fail the migration otherwise.
DO $$
BEGIN
  IF NOT public.strata_validate_model_weights('a5a1a000-0000-4000-8000-000000001501') THEN
    RAISE EXCEPTION 'V3-OPEN-011: CEO Enterprise Scorecard weights do not total 100 after migration';
  END IF;
  IF NOT public.strata_validate_model_weights('a5a1a000-0000-4000-8000-000000001502') THEN
    RAISE EXCEPTION 'V3-OPEN-011: B2B Sector Scorecard weights do not total 100 after migration';
  END IF;
END $$;
