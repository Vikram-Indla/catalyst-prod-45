-- ============================================================================
-- STRATA — Centralized calculation engine (RPCs + provenance)
-- CAT-STRATA-20260705-001 · Blueprint §20 · D-003/Q5
-- UI NEVER computes enterprise scores. Every result persists to
-- strata_calculated_values with formula version, inputs, source runs,
-- config context and confidence. All banding comes from threshold schemes
-- (governed records) — there are no RAG constants anywhere in this engine.
-- ============================================================================

-- Guard: engine callable by approved users; service-role (no auth.uid) allowed for seeds/jobs.
CREATE OR REPLACE FUNCTION public.strata_calc_guard()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_is_approved() THEN
    RAISE EXCEPTION 'calculation engine requires an approved user';
  END IF;
END;
$$;

-- Band resolution from a governed threshold scheme.
-- bands: [{key, label, min_score}] — highest min_score wins; no match → lowest band.
CREATE OR REPLACE FUNCTION public.strata_band_from_score(p_score numeric, p_scheme uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE band text;
BEGIN
  IF p_score IS NULL OR p_scheme IS NULL THEN RETURN NULL; END IF;
  SELECT b->>'key' INTO band
    FROM public.strata_threshold_schemes s,
         jsonb_array_elements(s.bands) b
   WHERE s.id = p_scheme AND (b->>'min_score')::numeric <= p_score
   ORDER BY (b->>'min_score')::numeric DESC
   LIMIT 1;
  IF band IS NULL THEN
    SELECT b->>'key' INTO band
      FROM public.strata_threshold_schemes s,
           jsonb_array_elements(s.bands) b
     WHERE s.id = p_scheme
     ORDER BY (b->>'min_score')::numeric ASC
     LIMIT 1;
  END IF;
  RETURN band;
END;
$$;

-- ---------------------------------------------------------------------------
-- KPI achievement (direction-aware; documented deterministic scoring)
--   higher_better : achievement = actual / target × 100
--   lower_better  : achievement = target / actual × 100 (actual ≤ 0 → 150 cap case)
--   band          : within [band_min, band_max] → 100; outside with tolerance t:
--                   100 − (distance / t × 100), floored at 0; no tolerance → 0
--   manual        : achievement = actual (assumed already 0–100)
-- Achievement is capped to [0, 150]; the rollup score uses min(achievement, 100).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_kpi_achievement(p_kpi uuid, p_period uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k record; t record; a record; f record;
  achievement numeric; score numeric; band text; conf numeric; scheme uuid;
  result jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;

  SELECT * INTO t FROM public.strata_kpi_targets
   WHERE kpi_id = p_kpi AND period_id = p_period AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  -- Prefer validated actuals; fall back to pending (marked in provenance, confidence damped)
  SELECT * INTO a FROM public.strata_kpi_actuals
   WHERE kpi_id = p_kpi AND period_id = p_period AND validation_status = 'validated'
   ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;
  IF a IS NULL THEN
    SELECT * INTO a FROM public.strata_kpi_actuals
     WHERE kpi_id = p_kpi AND period_id = p_period AND validation_status = 'pending'
     ORDER BY submitted_at DESC LIMIT 1;
  END IF;

  SELECT * INTO f FROM public.strata_kpi_formula_versions
   WHERE kpi_id = p_kpi AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  IF t IS NULL OR a IS NULL THEN
    -- Zero-assumption rule: no target or no actual → no number, no fake default.
    RETURN jsonb_build_object(
      'kpi_id', p_kpi, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL,
      'reason', CASE WHEN t IS NULL THEN 'no_approved_target' ELSE 'no_actual' END
    );
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
    ELSE -- manual
      achievement := a.value;
  END CASE;

  achievement := CASE WHEN achievement IS NULL THEN NULL ELSE least(greatest(achievement, 0), 150) END;
  score := CASE WHEN achievement IS NULL THEN NULL ELSE least(achievement, 100) END;
  scheme := k.threshold_scheme_id;
  band := public.strata_band_from_score(score, scheme);
  conf := COALESCE(a.confidence, 1.0) * CASE WHEN a.validation_status = 'validated' THEN 1.0 ELSE 0.6 END;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key,
     formula_version, inputs, source_run_ids, config_context, confidence)
  VALUES
    ('kpi', p_kpi, p_period, 'achievement_pct', achievement, score, band,
     COALESCE('v' || f.version::text, 'direction:' || k.direction),
     jsonb_build_object('actual', a.value, 'target', t.target, 'baseline', t.baseline,
                        'band_min', t.band_min, 'band_max', t.band_max, 'tolerance', t.tolerance,
                        'direction', k.direction, 'actual_validation_status', a.validation_status,
                        'target_version', t.version),
     CASE WHEN a.upload_run_id IS NOT NULL THEN ARRAY[a.upload_run_id] ELSE NULL END,
     jsonb_build_object('threshold_scheme_id', scheme, 'kpi_version', k.version),
     conf);

  result := jsonb_build_object(
    'kpi_id', p_kpi, 'period_id', p_period,
    'achievement', round(achievement, 2), 'score', round(score, 2), 'status_key', band,
    'formula_version', COALESCE('v' || f.version::text, 'direction:' || k.direction),
    'actual', a.value, 'target', t.target,
    'actual_validation_status', a.validation_status,
    'source_run_id', a.upload_run_id, 'confidence', round(conf, 3),
    'calculated_at', now()
  );
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Scorecard instance rollup (weighted; per line → per perspective → total)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_scorecard_instance(p_instance uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inst record; model record; line record; persp record;
  line_res jsonb; lines jsonb := '[]'::jsonb;
  persp_scores jsonb := '{}'::jsonb;
  persp_weights jsonb := '{}'::jsonb;
  line_score numeric; p_total numeric; p_weight numeric;
  total numeric := 0; total_weight numeric := 0;
  scheme uuid; band text; perspectives jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT * INTO inst FROM public.strata_scorecard_instances WHERE id = p_instance;
  IF inst IS NULL THEN RAISE EXCEPTION 'scorecard instance not found'; END IF;
  SELECT * INTO model FROM public.strata_scorecard_models WHERE id = inst.model_id;
  scheme := model.threshold_scheme_id;

  -- Per-line scores
  FOR line IN
    SELECT l.*, p.name AS perspective_name FROM public.strata_scorecard_lines l
    JOIN public.strata_perspectives p ON p.id = l.perspective_id
    WHERE l.instance_id = p_instance ORDER BY l.order_index
  LOOP
    line_score := NULL;
    IF line.ref_type = 'kpi' THEN
      line_res := public.strata_calc_kpi_achievement(line.kpi_id, inst.period_id);
      line_score := (line_res->>'score')::numeric;
    ELSIF line.ref_type = 'objective' THEN
      -- objective score = weighted mean of its KPI achievements
      SELECT avg((public.strata_calc_kpi_achievement(ek.kpi_id, inst.period_id)->>'score')::numeric)
        INTO line_score
        FROM public.strata_element_kpis ek WHERE ek.element_id = line.element_id;
      line_res := jsonb_build_object('element_id', line.element_id, 'score', line_score);
    ELSE
      line_res := public.strata_calc_benefit_realization(line.benefit_id);
      line_score := least(COALESCE((line_res->>'realization_index')::numeric, 0) * 100, 100);
    END IF;

    INSERT INTO public.strata_calculated_values
      (entity_type, entity_id, period_id, metric_key, value, score, status_key,
       formula_version, inputs, config_context)
    VALUES
      ('scorecard_line', line.id, inst.period_id, 'score', line_score, line_score,
       public.strata_band_from_score(line_score, scheme),
       'rollup:' || model.rollup_method,
       jsonb_build_object('ref_type', line.ref_type, 'weight', line.weight, 'detail', line_res),
       jsonb_build_object('model_id', model.id, 'model_version', model.version, 'threshold_scheme_id', scheme));

    lines := lines || jsonb_build_object(
      'line_id', line.id, 'ref_type', line.ref_type, 'perspective_id', line.perspective_id,
      'weight', line.weight, 'score', round(coalesce(line_score, 0), 2),
      'has_data', line_score IS NOT NULL,
      'status_key', public.strata_band_from_score(line_score, scheme), 'detail', line_res);
  END LOOP;

  -- Per-perspective weighted scores + model-weighted total
  FOR persp IN
    SELECT mp.perspective_id, mp.weight AS model_weight, p.name
      FROM public.strata_scorecard_model_perspectives mp
      JOIN public.strata_perspectives p ON p.id = mp.perspective_id
     WHERE mp.model_id = model.id ORDER BY mp.order_index
  LOOP
    SELECT CASE WHEN sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean) > 0
                THEN sum((l->>'score')::numeric * (l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
                   / sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
           END
      INTO p_total
      FROM jsonb_array_elements(lines) l
     WHERE (l->>'perspective_id')::uuid = persp.perspective_id;

    band := public.strata_band_from_score(p_total, scheme);
    INSERT INTO public.strata_calculated_values
      (entity_type, entity_id, period_id, metric_key, value, score, status_key, formula_version, config_context)
    VALUES
      ('perspective', persp.perspective_id, inst.period_id, 'score', p_total, p_total, band,
       'rollup:' || model.rollup_method,
       jsonb_build_object('model_id', model.id, 'instance_id', p_instance, 'threshold_scheme_id', scheme));

    perspectives := perspectives || jsonb_build_object(
      'perspective_id', persp.perspective_id, 'name', persp.name,
      'weight', persp.model_weight, 'score', round(coalesce(p_total, 0), 2),
      'has_data', p_total IS NOT NULL, 'status_key', band);

    IF p_total IS NOT NULL THEN
      total := total + p_total * persp.model_weight;
      total_weight := total_weight + persp.model_weight;
    END IF;
  END LOOP;

  total := CASE WHEN total_weight > 0 THEN total / total_weight END;
  band := public.strata_band_from_score(total, scheme);

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key, formula_version, inputs, config_context)
  VALUES
    ('scorecard_instance', p_instance, inst.period_id, 'score', total, total, band,
     'rollup:' || model.rollup_method,
     jsonb_build_object('perspectives', perspectives),
     jsonb_build_object('model_id', model.id, 'model_version', model.version, 'threshold_scheme_id', scheme));

  RETURN jsonb_build_object(
    'instance_id', p_instance, 'period_id', inst.period_id,
    'score', round(coalesce(total, 0), 2), 'has_data', total IS NOT NULL, 'status_key', band,
    'rollup_method', model.rollup_method, 'model_id', model.id, 'model_version', model.version,
    'perspectives', perspectives, 'lines', lines, 'calculated_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- YTD aggregation (method from KPI type config normalization or parameter)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_ytd(p_kpi uuid, p_cycle uuid, p_method text DEFAULT 'sum')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ytd_actual numeric; ytd_target numeric; runs uuid[];
BEGIN
  PERFORM public.strata_calc_guard();
  IF p_method NOT IN ('sum','avg','last') THEN RAISE EXCEPTION 'method must be sum | avg | last'; END IF;
  WITH acts AS (
    SELECT a.value, a.upload_run_id, p.starts_on
      FROM public.strata_kpi_actuals a
      JOIN public.strata_periods p ON p.id = a.period_id
     WHERE a.kpi_id = p_kpi AND p.cycle_id = p_cycle
       AND a.validation_status = 'validated' AND p.starts_on <= now()::date
  )
  SELECT CASE p_method
           WHEN 'sum' THEN (SELECT sum(value) FROM acts)
           WHEN 'avg' THEN (SELECT avg(value) FROM acts)
           WHEN 'last' THEN (SELECT value FROM acts ORDER BY starts_on DESC LIMIT 1)
         END,
         (SELECT COALESCE(array_agg(DISTINCT upload_run_id) FILTER (WHERE upload_run_id IS NOT NULL), '{}') FROM acts)
    INTO ytd_actual, runs;
  SELECT CASE p_method
           WHEN 'sum' THEN sum(t.target) WHEN 'avg' THEN avg(t.target)
           ELSE (SELECT t2.target FROM public.strata_kpi_targets t2
                 JOIN public.strata_periods p2 ON p2.id = t2.period_id
                 WHERE t2.kpi_id = p_kpi AND p2.cycle_id = p_cycle AND t2.status = 'approved'
                 ORDER BY p2.starts_on DESC LIMIT 1)
         END
    INTO ytd_target
    FROM public.strata_kpi_targets t
    JOIN public.strata_periods p ON p.id = t.period_id
   WHERE t.kpi_id = p_kpi AND p.cycle_id = p_cycle AND t.status = 'approved' AND p.starts_on <= now()::date;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, formula_version, inputs, source_run_ids, config_context)
  VALUES ('kpi', p_kpi, 'ytd', ytd_actual, 'ytd:' || p_method,
          jsonb_build_object('ytd_target', ytd_target, 'cycle_id', p_cycle),
          runs, jsonb_build_object('method', p_method));

  RETURN jsonb_build_object('kpi_id', p_kpi, 'cycle_id', p_cycle, 'method', p_method,
                            'ytd_actual', ytd_actual, 'ytd_target', ytd_target,
                            'variance', CASE WHEN ytd_target IS NOT NULL AND ytd_actual IS NOT NULL THEN ytd_actual - ytd_target END,
                            'source_run_ids', runs, 'calculated_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- Benefit realization index = cumulative validated realized / cumulative planned
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_benefit_realization(p_benefit uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE planned numeric; realized numeric; forecast numeric; idx numeric; runs uuid[];
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT sum(value) FILTER (WHERE value_kind = 'planned'),
         sum(value) FILTER (WHERE value_kind = 'realized' AND validation_status = 'validated'),
         sum(value) FILTER (WHERE value_kind = 'forecast'),
         COALESCE(array_agg(DISTINCT upload_run_id) FILTER (WHERE upload_run_id IS NOT NULL), '{}')
    INTO planned, realized, forecast, runs
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND p.starts_on <= now()::date;

  idx := CASE WHEN planned IS NULL OR planned = 0 THEN NULL ELSE COALESCE(realized, 0) / planned END;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, formula_version, inputs, source_run_ids)
  VALUES ('benefit', p_benefit, 'realization_index', idx, 'realization:v1',
          jsonb_build_object('planned_to_date', planned, 'realized_validated', realized, 'forecast', forecast),
          runs);

  RETURN jsonb_build_object('benefit_id', p_benefit, 'realization_index', round(coalesce(idx,0), 4),
                            'has_data', idx IS NOT NULL,
                            'planned_to_date', planned, 'realized_validated', realized, 'forecast', forecast,
                            'source_run_ids', runs, 'calculated_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- Portfolio value at risk
--   VaR = Σ over portfolio benefits of max(0, planned_total − realized_validated)
--         × (1 − confidence), plus 100% weighting when the benefit has an
--         open/blocking gate (gate exposure).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_value_at_risk(p_portfolio uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE var_total numeric := 0; detail jsonb := '[]'::jsonb; b record;
        planned numeric; realized numeric; exposure numeric; gate_open boolean;
BEGIN
  PERFORM public.strata_calc_guard();
  FOR b IN SELECT * FROM public.strata_benefits WHERE portfolio_id = p_portfolio LOOP
    SELECT sum(value) FILTER (WHERE value_kind = 'planned'),
           sum(value) FILTER (WHERE value_kind = 'realized' AND validation_status = 'validated')
      INTO planned, realized
      FROM public.strata_benefit_values WHERE benefit_id = b.id;
    SELECT EXISTS (SELECT 1 FROM public.strata_gate_instances g
                   WHERE g.subject_type = 'benefit' AND g.subject_id = b.id AND g.status IN ('open','in_review'))
      INTO gate_open;
    exposure := greatest(0, COALESCE(planned, 0) - COALESCE(realized, 0))
                * CASE WHEN gate_open THEN 1.0 ELSE (1 - COALESCE(b.confidence, 0.5)) END;
    var_total := var_total + exposure;
    detail := detail || jsonb_build_object('benefit_id', b.id, 'name', b.name,
                'planned', planned, 'realized_validated', realized,
                'confidence', b.confidence, 'gate_open', gate_open, 'exposure', round(exposure, 2));
  END LOOP;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, formula_version, inputs)
  VALUES ('portfolio', p_portfolio, 'value_at_risk', var_total, 'var:v1', jsonb_build_object('benefits', detail));

  RETURN jsonb_build_object('portfolio_id', p_portfolio, 'value_at_risk', round(var_total, 2),
                            'benefits', detail, 'formula_version', 'var:v1', 'calculated_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- Execution progress = milestone-weighted progress; schedule variance from baselines
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_execution_progress(p_project uuid, p_scheme uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_progress numeric; overdue int; total int; band text; sched_score numeric;
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT CASE WHEN sum(m.weight) > 0 THEN sum(COALESCE(m.progress, 0) * m.weight) / sum(m.weight) END,
         count(*) FILTER (WHERE m.status NOT IN ('done','descoped') AND m.baseline_end IS NOT NULL AND m.baseline_end < now()::date),
         count(*)
    INTO v_progress, overdue, total
    FROM public.strata_milestones m WHERE m.project_card_id = p_project;

  sched_score := CASE WHEN total = 0 THEN NULL ELSE greatest(0, 100 - (overdue::numeric / total) * 100) END;
  band := public.strata_band_from_score(sched_score, p_scheme);

  UPDATE public.strata_project_cards
     SET actual_progress = round(COALESCE(v_progress, actual_progress), 2),
         execution_health = COALESCE(band, execution_health),
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, score, status_key, formula_version, inputs, config_context)
  VALUES ('project_card', p_project, 'execution_progress', v_progress, sched_score, band,
          'milestone_weighted:v1',
          jsonb_build_object('milestones_total', total, 'milestones_overdue', overdue),
          jsonb_build_object('threshold_scheme_id', p_scheme));

  RETURN jsonb_build_object('project_card_id', p_project, 'progress', round(coalesce(v_progress,0), 2),
                            'has_data', v_progress IS NOT NULL,
                            'schedule_score', sched_score, 'status_key', band,
                            'milestones_total', total, 'milestones_overdue', overdue, 'calculated_at', now());
END;
$$;

-- Convenience: recalculate everything for a period (used by uploads pipeline + seeds).
CREATE OR REPLACE FUNCTION public.strata_calc_period(p_period uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst record; kpi record; results jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  FOR kpi IN SELECT DISTINCT k.id FROM public.strata_kpis k
             JOIN public.strata_kpi_targets t ON t.kpi_id = k.id AND t.period_id = p_period
             WHERE k.status = 'approved'
  LOOP
    PERFORM public.strata_calc_kpi_achievement(kpi.id, p_period);
  END LOOP;
  FOR inst IN SELECT id FROM public.strata_scorecard_instances WHERE period_id = p_period AND status <> 'locked' LOOP
    results := results || public.strata_calc_scorecard_instance(inst.id);
  END LOOP;
  RETURN jsonb_build_object('period_id', p_period, 'instances', results, 'calculated_at', now());
END;
$$;
