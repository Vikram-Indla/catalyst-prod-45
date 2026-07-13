-- CAT-STRATA-IMPL-20260712-001 · task_e44f1ba9 — scorecard plan-variance rollup.
--
-- The Scorecards Index (anchor 12) wants "ranked by variance to plan" ("−7.2 vs
-- plan"). A naive plan rollup that feeds targets in as actuals is DEGENERATE:
-- the engine scores actual/target, so target/target = 100 for every KPI and the
-- "plan score" is a constant 100 (Vikram-confirmed 2026-07-13). Instead:
--
-- Targets in strata_kpi_targets are PER PERIOD — the period target IS the plan,
-- and 100 on the achievement scale means "exactly on plan". The live instance
-- rollup caps each line's score at 100, which destroys the above-plan signal.
-- This migration adds a READ-ONLY rollup over the UNCAPPED achievements
-- (engine-clamped to [0,150]): plan_index 100 = on plan, variance = plan_index
-- − 100, signed like the anchor ("+1.9 / −7.2 vs plan").
--
-- Zero-assumption rules:
--   · no approved target or no actual → the line contributes nothing (NULL);
--   · benefit lines have no per-period plan concept → excluded, counted in
--     total_lines but never covered_lines;
--   · locked instances → has_data=false ('locked_snapshot'): plan variance was
--     not frozen in the snapshot and recomputing from live tables would
--     misstate the frozen basis (mirror of "NEVER recalc locked");
--   · nothing is written to strata_calculated_values — display metric only,
--     provenance stays with strata_calc_scorecard_instance.

-- Read-only replica of strata_calc_kpi_achievement's math (same target/actual
-- selection, same direction cases, same [0,150] clamp) WITHOUT the capped
-- score and WITHOUT the provenance INSERT. Keep in lockstep with the engine.
CREATE OR REPLACE FUNCTION public.strata_kpi_plan_achievement(p_kpi uuid, p_period uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  k record; t record; a record; achievement numeric;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO t FROM public.strata_kpi_targets
   WHERE kpi_id = p_kpi AND period_id = p_period AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  -- Prefer validated actuals; fall back to pending (same as the engine).
  SELECT * INTO a FROM public.strata_kpi_actuals
   WHERE kpi_id = p_kpi AND period_id = p_period AND validation_status = 'validated'
   ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;
  IF a IS NULL THEN
    SELECT * INTO a FROM public.strata_kpi_actuals
     WHERE kpi_id = p_kpi AND period_id = p_period AND validation_status = 'pending'
     ORDER BY submitted_at DESC LIMIT 1;
  END IF;

  IF t IS NULL OR a IS NULL THEN RETURN NULL; END IF;

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
    ELSE -- manual: the submitted value already IS an achievement percentage
      achievement := a.value;
  END CASE;

  RETURN CASE WHEN achievement IS NULL THEN NULL ELSE least(greatest(achievement, 0), 150) END;
END;
$function$;

-- Plan-variance rollup: same weights/structure as strata_calc_scorecard_instance
-- (line weight within perspective, model weight across perspectives), aggregating
-- uncapped plan achievements. Read-only.
CREATE OR REPLACE FUNCTION public.strata_calc_scorecard_plan_variance(p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inst record; model record; line record; persp record;
  ach numeric; lines jsonb := '[]'::jsonb;
  p_total numeric; total numeric := 0; total_weight numeric := 0;
  covered int := 0; n_lines int := 0;
BEGIN
  PERFORM public.strata_calc_guard();

  SELECT * INTO inst FROM public.strata_scorecard_instances WHERE id = p_instance;
  IF inst IS NULL THEN RAISE EXCEPTION 'scorecard instance not found'; END IF;

  IF inst.status = 'locked' THEN
    RETURN jsonb_build_object(
      'instance_id', p_instance, 'period_id', inst.period_id,
      'plan_index', NULL, 'variance', NULL, 'has_data', false,
      'reason', 'locked_snapshot',
      'covered_lines', 0, 'total_lines', 0, 'calculated_at', now());
  END IF;

  SELECT * INTO model FROM public.strata_scorecard_models WHERE id = inst.model_id;

  FOR line IN
    SELECT l.* FROM public.strata_scorecard_lines l
    WHERE l.instance_id = p_instance ORDER BY l.order_index
  LOOP
    n_lines := n_lines + 1;
    ach := NULL;
    IF line.ref_type = 'kpi' THEN
      ach := public.strata_kpi_plan_achievement(line.kpi_id, inst.period_id);
    ELSIF line.ref_type = 'objective' THEN
      -- objective plan achievement = mean of its member KPIs' plan achievements
      SELECT avg(public.strata_kpi_plan_achievement(ek.kpi_id, inst.period_id))
        INTO ach FROM public.strata_element_kpis ek WHERE ek.element_id = line.element_id;
    END IF; -- benefit lines: no per-period plan concept → excluded

    IF ach IS NOT NULL THEN covered := covered + 1; END IF;
    lines := lines || jsonb_build_object(
      'line_id', line.id, 'perspective_id', line.perspective_id,
      'weight', line.weight, 'achievement', round(coalesce(ach, 0), 2),
      'has_data', ach IS NOT NULL);
  END LOOP;

  FOR persp IN
    SELECT mp.perspective_id, mp.weight AS model_weight
      FROM public.strata_scorecard_model_perspectives mp
     WHERE mp.model_id = model.id ORDER BY mp.order_index
  LOOP
    SELECT CASE WHEN sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean) > 0
                THEN sum((l->>'achievement')::numeric * (l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
                   / sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
           END
      INTO p_total
      FROM jsonb_array_elements(lines) l
     WHERE (l->>'perspective_id')::uuid = persp.perspective_id;

    IF p_total IS NOT NULL THEN
      total := total + p_total * persp.model_weight;
      total_weight := total_weight + persp.model_weight;
    END IF;
  END LOOP;

  total := CASE WHEN total_weight > 0 THEN total / total_weight END;

  RETURN jsonb_build_object(
    'instance_id', p_instance, 'period_id', inst.period_id,
    'plan_index', CASE WHEN total IS NULL THEN NULL ELSE round(total, 2) END,
    'variance', CASE WHEN total IS NULL THEN NULL ELSE round(total - 100, 2) END,
    'has_data', total IS NOT NULL,
    'covered_lines', covered, 'total_lines', n_lines,
    'calculated_at', now());
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_kpi_plan_achievement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_calc_scorecard_plan_variance(uuid) TO authenticated;
