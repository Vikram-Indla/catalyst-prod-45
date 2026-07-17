-- CAT-STRATA-IMPL-20260712-001 · R4b · E-7 condition 3 — only ELIGIBLE actuals count
-- Plan Lock: E-7 ("validated OR accepted-with-exception actual"), E-6, D-5 · authorization R4.
--
-- ── THE DEFECT ─────────────────────────────────────────────────────────────
-- strata_calc_kpi_achievement preferred a validated actual and then FELL BACK to a `pending` one
-- (damping confidence x0.6). So an unvalidated number counted in official reporting, merely with a
-- quieter confidence score — and confidence is not exclusion. E-7 condition 3 requires a
-- "validated **or** accepted-with-exception actual". `pending` is neither.
--
-- Blueprint §2.1 claims the calcs "filter validation_status='validated' — a WHITELIST, so quarantined
-- is excluded BY CONSTRUCTION". That claim is FALSE about the mechanism and accidentally true about
-- the outcome: quarantined never matched either branch, so it was excluded — but by *not being
-- listed*, not by a whitelist. `pending` WAS listed, and counted. The blueprint's reassuring sentence
-- described a control that did not exist.
--
-- ── BLAST RADIUS: measured BEFORE writing, and it is ZERO ───────────────────
-- Probed 2026-07-17: strata_kpi_actuals = 18 rows, ALL `validated`. pending/quarantined/rejected/
-- accepted_with_exception/reversed = 0. So removing the fallback changes NO current number, exactly
-- like F-7. The rule is in force from now.
-- ⚠️ The handover carried MY OWN note saying "pending actuals EXIST today, so this WILL move live
-- numbers". It was written from memory and never checked. It was wrong. Corrected here — the same
-- inherit-a-claim-without-re-testing failure this feature has hit a dozen times, this time mine.
--
-- ── The eligible set is now ONE query, not a preference chain ───────────────
-- A fallback chain silently encodes a hierarchy of acceptability. One predicate over the eligible
-- states says exactly what is allowed and cannot grow a quiet extra tier later.
--
-- ── Confidence damping is RETAINED for accepted_with_exception ──────────────
-- accepted_with_exception COUNTS (E-6) but is not the same claim as independent validation: it
-- counted *despite failing validation*, by authorization. The pre-existing x0.6 damp is the honest
-- signal for that, and it is exclusion-free — the value counts fully, the confidence reports what it
-- is. E-6 also requires the exception to stay VISIBLE downstream, so the flag, reason and authorizer
-- ride in the provenance rather than being flattened into a number.

CREATE OR REPLACE FUNCTION public.strata_calc_kpi_achievement(p_kpi uuid, p_period uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- E-7 condition 1: approved AND effective KPI, enforced in its own right (F-10 backward extension).
  v_resolved := public.strata_resolve_kpi_effective(p_kpi, v_as_of);
  IF v_resolved IS NULL THEN
    RETURN jsonb_build_object('kpi_id', p_kpi, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL, 'reason', 'no_effective_kpi_version');
  END IF;

  SELECT * INTO k FROM public.strata_kpis WHERE id = v_resolved;

  SELECT * INTO t FROM public.strata_kpi_targets
   WHERE kpi_id = v_resolved AND period_id = p_period AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  -- E-7 condition 3: ELIGIBLE actuals only. One predicate, no fallback tier.
  -- validated             — checked by someone other than the submitter.
  -- accepted_with_exception — counts by Strategy Office authorization (E-6/D-5).
  -- pending / quarantined / rejected / reversed are NOT eligible and yield Missing, never a number.
  SELECT * INTO a FROM public.strata_kpi_actuals
   WHERE kpi_id = v_resolved AND period_id = p_period
     AND validation_status IN ('validated','accepted_with_exception')
   ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;

  SELECT * INTO f FROM public.strata_kpi_formula_versions
   WHERE kpi_id = v_resolved AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  IF t IS NULL OR a IS NULL THEN
    -- Zero-assumption. `no_eligible_actual` is deliberately distinct from the old `no_actual`: an
    -- actual may well EXIST and simply not be eligible (pending, quarantined, rejected, reversed).
    -- Reporting "no actual" in that case would send someone hunting for data that is already there.
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
  -- x0.6 now applies ONLY to accepted_with_exception (pending can no longer reach here).
  conf := COALESCE(a.confidence, 1.0) * CASE WHEN a.validation_status = 'validated' THEN 1.0 ELSE 0.6 END;
  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  provenance := jsonb_build_object(
    'provenance_schema', 1,
    'kpi_id', v_resolved, 'kpi_lineage_id', k.lineage_id, 'kpi_version', k.version,
    'kpi_revision_class', k.revision_class,
    'formula_version', f.version, 'formula_version_id', f.id,
    'target_version', t.version, 'target_id', t.id,
    'actual_id', a.id, 'actual_validation_status', a.validation_status,
    -- E-6: the exception must remain VISIBLE downstream — never flattened into the number.
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
