-- CAT-STRATA-FOUNDATION-20260709-001 · session 006
-- Closes two acceptance gaps found in session 005 (06_VALIDATION_EVIDENCE.md):
--  1. REQ-012/REQ-013: no Sector / CXO scorecard existed on the reference
--     tenant, so the "Sector / CXO Scorecards" group never rendered and the
--     CEO → Sector/CXO drilldown leg could not be exercised. Seeds a B2B
--     Sector Scorecard model + live Q2 FY2026 instance + 4 lines reusing
--     the existing demo KPIs (conventions of 20260705100600).
--  2. Charter truthfulness: seeded theme charters for B2B Growth Engine and
--     Network Excellence carry status='complete' but owner_id NULL (inserted
--     directly, bypassing the RPC completeness derivation) — the Strategy
--     Room correctly shows "Charter incomplete". Backfills owner_id from the
--     ZZTEST charter's owner so field-level truth matches the stored status.
-- Idempotent: per-statement guards; skips if the demo cycle is absent.

DO $seed$
DECLARE
  demo_cycle uuid := 'a5a1a000-0000-4000-8000-000000001001';
  q2_period  uuid := 'a5a1a000-0000-4000-8000-000000001012';
  threshold  uuid := 'a5a1a000-0000-4000-8000-000000000201';
  model_id   uuid := 'a5a1a000-0000-4000-8000-000000001502';
  inst_id    uuid := 'a5a1a000-0000-4000-8000-000000001513';
  p_fin uuid := 'a5a1a000-0000-4000-8000-000000000101';
  p_cus uuid := 'a5a1a000-0000-4000-8000-000000000102';
  p_dig uuid := 'a5a1a000-0000-4000-8000-000000000103';
  k_b2b uuid := 'a5a1a000-0000-4000-8000-000000001201';
  k_chn uuid := 'a5a1a000-0000-4000-8000-000000001202';
  k_nps uuid := 'a5a1a000-0000-4000-8000-000000001203';
  k_dig uuid := 'a5a1a000-0000-4000-8000-000000001204';
  charter_owner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = demo_cycle) THEN
    RAISE NOTICE 'STRATA demo cycle absent — sector scorecard seed skipped';
    RETURN;
  END IF;

  -- 1a. Sector / CXO scorecard model (owner_scope_type='sector' drives the
  --     REQ-012 grouping on the Scorecards landing).
  IF NOT EXISTS (SELECT 1 FROM public.strata_scorecard_models WHERE id = model_id) THEN
    INSERT INTO public.strata_scorecard_models
      (id, name, slug, description, owner_scope_type, rollup_method,
       threshold_scheme_id, period_granularity, version, status,
       effective_from, change_reason)
    VALUES
      (model_id, 'B2B Sector Scorecard', 'b2b-sector-scorecard',
       'Sector / CXO scorecard for the B2B sector, rolling up into the CEO Enterprise Scorecard (DEMO SEED).',
       'sector', 'weighted_average', threshold, 'quarter', 1, 'approved',
       now(), 'DEMO SEED — Sector / CXO Scorecard (REQ-012/REQ-013)');
  END IF;

  -- 1b. Model perspective weights — the calc engine's weighted_average rollup
  --     iterates these; without them the total score is has_data=false.
  IF NOT EXISTS (SELECT 1 FROM public.strata_scorecard_model_perspectives smp
                  WHERE smp.model_id = 'a5a1a000-0000-4000-8000-000000001502') THEN
    INSERT INTO public.strata_scorecard_model_perspectives (model_id, perspective_id, weight, order_index)
    VALUES (model_id, p_fin, 40, 0), (model_id, p_cus, 35, 1), (model_id, p_dig, 25, 2);
  END IF;

  -- 1c. Live Q2 FY2026 instance.
  IF NOT EXISTS (SELECT 1 FROM public.strata_scorecard_instances WHERE id = inst_id) THEN
    INSERT INTO public.strata_scorecard_instances
      (id, model_id, model_version, cycle_id, period_id, name, slug, status)
    VALUES
      (inst_id, model_id, 1, demo_cycle, q2_period,
       'B2B Sector Scorecard · Q2 FY2026', 'b2b-sector-scorecard-q2-fy2026', 'live');
  END IF;

  -- 1c. Lines: sector-relevant KPIs already carrying Q2 actuals.
  IF NOT EXISTS (SELECT 1 FROM public.strata_scorecard_lines WHERE instance_id = inst_id) THEN
    INSERT INTO public.strata_scorecard_lines
      (instance_id, perspective_id, ref_type, kpi_id, weight, order_index)
    VALUES
      (inst_id, p_fin, 'kpi', k_b2b, 100, 0),
      (inst_id, p_cus, 'kpi', k_chn,  50, 1),
      (inst_id, p_cus, 'kpi', k_nps,  50, 2),
      (inst_id, p_dig, 'kpi', k_dig, 100, 3);
  END IF;

  -- 2. Charter owner backfill (field-level truth = stored status).
  SELECT owner_id INTO charter_owner
    FROM public.strata_theme_charters
   WHERE owner_id IS NOT NULL
   ORDER BY updated_at DESC LIMIT 1;

  IF charter_owner IS NOT NULL THEN
    UPDATE public.strata_theme_charters
       SET owner_id = charter_owner, updated_at = now()
     WHERE owner_id IS NULL AND status = 'complete';
  END IF;

  RAISE NOTICE 'STRATA sector scorecard seed + charter owner backfill applied';
END;
$seed$;

-- Post-apply verification:
--   REQ-012: SELECT name, owner_scope_type FROM strata_scorecard_models ORDER BY name;
--   REQ-013: SELECT name, slug, status FROM strata_scorecard_instances WHERE model_id::text LIKE '%1502';
--   charters: SELECT count(*) FROM strata_theme_charters WHERE status='complete' AND owner_id IS NULL; -- expect 0
