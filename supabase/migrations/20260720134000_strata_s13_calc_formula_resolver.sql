-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S13 — wire calc to the date-scoped formula resolver
-- Forward-only. STRATA-KPI-003 (remaining portion): strata_calc_kpi_achievement now resolves the
-- effective formula version via strata_resolve_kpi_formula(kpi, as_of) instead of "latest approved".
-- The resolver falls back to latest-approved when no distinct effective window exists, so results
-- are IDENTICAL on current data (single approved formula per KPI) — verified by before/after on
-- staging — and become correct when a KPI carries multiple approved formula versions over time.
-- Only the formula-resolution line changes; all other logic is byte-preserved from 20260717170000.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_kpi_achievement(p_kpi uuid, p_period uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  k record; t record; a record; f record; per record;
  achievement numeric; score numeric; band text; conf numeric; scheme uuid;
  v_as_of timestamptz; v_resolved uuid; v_scheme_version int;
  result jsonb; provenance jsonb;
BEGIN
  PERFORM public.strata_calc_guard();

  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  v_as_of := per.ends_on::timestamptz;

  v_resolved := public.strata_resolve_kpi_effective(p_kpi, v_as_of);
  IF v_resolved IS NULL THEN
    RETURN jsonb_build_object('kpi_id', p_kpi, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL, 'reason', 'no_effective_kpi_version');
  END IF;

  SELECT * INTO k FROM public.strata_kpis WHERE id = v_resolved;

  SELECT * INTO t FROM public.strata_kpi_targets
   WHERE kpi_id = v_resolved AND period_id = p_period AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  SELECT * INTO a FROM public.strata_kpi_actuals
   WHERE kpi_id = v_resolved AND period_id = p_period
     AND validation_status IN ('validated','accepted_with_exception')
   ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;

  -- STRATA-KPI-003: date-scoped effective formula (falls back to latest approved).
  SELECT * INTO f FROM public.strata_kpi_formula_versions
   WHERE id = public.strata_resolve_kpi_formula(v_resolved, v_as_of);

  IF t IS NULL OR a IS NULL THEN
    RETURN jsonb_build_object('kpi_id', v_resolved, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL,
      'reason', CASE WHEN t IS NULL THEN 'no_approved_target' ELSE 'no_eligible_actual' END,
      'ineligible_actuals', (
        SELECT jsonb_agg(jsonb_build_object('id', x.id, 'validation_status', x.validation_status))
          FROM public.strata_kpi_actuals x
         WHERE x.kpi_id = v_resolved AND x.period_id = p_period
           AND x.validation_status NOT IN ('validated','accepted_with_exception')));
  END IF;

  CASE k.direction
    WHEN 'higher_better' THEN
      achievement := CASE WHEN t.target = 0 THEN NULL ELSE a.value / t.target * 100 END;
    WHEN 'lower_better' THEN
      achievement := CASE WHEN a.value <= 0 THEN 150 WHEN t.target = 0 THEN NULL ELSE t.target / a.value * 100 END;
    WHEN 'band' THEN
      IF t.band_min IS NOT NULL AND t.band_max IS NOT NULL AND a.value >= t.band_min AND a.value <= t.band_max THEN
        achievement := 100;
      ELSIF t.tolerance IS NOT NULL AND t.tolerance > 0 THEN
        achievement := greatest(0, 100 - (least(abs(a.value - t.band_min), abs(a.value - t.band_max)) / t.tolerance) * 100);
      ELSE
        achievement := 0;
      END IF;
    ELSE
      achievement := a.value;
  END CASE;

  achievement := CASE WHEN achievement IS NULL THEN NULL ELSE least(greatest(achievement, 0), 150) END;
  score := CASE WHEN achievement IS NULL THEN NULL ELSE least(achievement, 100) END;
  scheme := k.threshold_scheme_id;
  band := public.strata_band_from_score(score, scheme);
  conf := COALESCE(a.confidence, 1.0) * CASE WHEN a.validation_status = 'validated' THEN 1.0 ELSE 0.6 END;
  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  provenance := jsonb_build_object(
    'provenance_schema', 1,
    'kpi_id', v_resolved, 'kpi_lineage_id', k.lineage_id, 'kpi_version', k.version,
    'kpi_revision_class', k.revision_class,
    'formula_version', f.version, 'formula_version_id', f.id,
    'target_version', t.version, 'target_id', t.id,
    'actual_id', a.id, 'actual_validation_status', a.validation_status,
    'actual_exception_reason', a.exception_reason,
    'actual_exception_authorized_by', a.exception_authorized_by,
    'actual_exception_authorized_at', a.exception_authorized_at,
    'eligibility_rule', 'E-7 cond.3: only validated | accepted_with_exception actuals count',
    'threshold_scheme_id', scheme, 'threshold_scheme_version', v_scheme_version,
    'resolved_as_of', v_as_of, 'requested_kpi_id', p_kpi);

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key,
     formula_version, inputs, source_run_ids, config_context, confidence)
  VALUES
    ('kpi', v_resolved, p_period, 'achievement_pct', achievement, score, band,
     COALESCE('v' || f.version::text, 'direction:' || k.direction),
     jsonb_build_object('actual', a.value, 'target', t.target, 'baseline', t.baseline,
                        'band_min', t.band_min, 'band_max', t.band_max, 'tolerance', t.tolerance,
                        'direction', k.direction, 'actual_validation_status', a.validation_status,
                        'target_version', t.version),
     CASE WHEN a.upload_run_id IS NOT NULL THEN ARRAY[a.upload_run_id] ELSE NULL END,
     provenance, conf);

  result := jsonb_build_object(
    'kpi_id', v_resolved, 'period_id', p_period,
    'achievement', round(achievement, 2), 'score', round(score, 2), 'status_key', band,
    'formula_version', COALESCE('v' || f.version::text, 'direction:' || k.direction),
    'actual', a.value, 'target', t.target,
    'actual_validation_status', a.validation_status,
    'accepted_with_exception', (a.validation_status = 'accepted_with_exception'),
    'exception_reason', a.exception_reason,
    'source_run_id', a.upload_run_id, 'confidence', round(conf, 3),
    'provenance', provenance, 'calculated_at', now());
  RETURN result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_calc_kpi_achievement(uuid, uuid) TO authenticated;
