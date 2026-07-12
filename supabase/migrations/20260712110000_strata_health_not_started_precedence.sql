-- CAT-STRATA-E2E-FIXES-20260712-001 — defect V5-OPEN-023.
--
-- strata_calc_execution_progress classified a project with zero actual progress
-- but an advanced baseline (actual = 0, baseline > 0, variance >= 20) as
-- 'major_delay'. The 'not_started' branch only fired when BOTH actual AND
-- baseline progress were 0, so a project that has simply not begun read as
-- actively delayed — corrupting health distributions and escalation.
--
-- Business rule (V5-OPEN-023): whenever actual = 0 AND baseline > 0 the status
-- is 'not_started'. This precedence sits below on_hold and not_available (a
-- project with no baseline/progress data is legitimately 'not_available') and
-- ABOVE the forecast-delay override and variance bands — a project that has not
-- started cannot be "major delay". Only the health-classification block changes;
-- every other rule is byte-identical to 20260711182358.
--
-- Backfill: existing rows carry a stored calculated_health, so the function is
-- re-run for every project card to replace stale 'major_delay' values. The calc
-- guard only raises for an authenticated non-approved user (auth.uid() is NULL
-- under a migration), so the backfill loop runs cleanly.

CREATE OR REPLACE FUNCTION public.strata_calc_execution_progress(p_project uuid, p_scheme uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stage text;
  v_submitted_forecast date;
  today date := now()::date;
  b_start date;
  b_end date;
  b_progress numeric;
  a_num numeric;
  a_den numeric;
  a_progress numeric;
  variance numeric;
  eq_offset numeric;
  delay_days numeric;
  sys_forecast date;
  final_forecast date;
  fvar_days int;
  health text;
  reason text;
BEGIN
  PERFORM public.strata_calc_guard();

  SELECT stage, forecast_end INTO v_stage, v_submitted_forecast
    FROM public.strata_project_cards WHERE id = p_project;
  IF NOT FOUND THEN RAISE EXCEPTION 'project card not found'; END IF;

  -- Rule 1: project baseline start/end derive from milestones only — MIN/MAX
  -- taken independently over whichever milestones carry that respective date.
  -- Rule 4: actual progress weighted by each milestone's OWN baseline
  -- duration (not the milestone.weight column) — only milestones with both
  -- dates on the same row contribute a duration.
  SELECT min(m.baseline_start) FILTER (WHERE m.baseline_start IS NOT NULL),
         max(m.baseline_end) FILTER (WHERE m.baseline_end IS NOT NULL),
         sum(COALESCE(m.progress, 0) * (m.baseline_end - m.baseline_start))
           FILTER (WHERE m.baseline_start IS NOT NULL AND m.baseline_end IS NOT NULL AND m.baseline_end >= m.baseline_start),
         sum(m.baseline_end - m.baseline_start)
           FILTER (WHERE m.baseline_start IS NOT NULL AND m.baseline_end IS NOT NULL AND m.baseline_end >= m.baseline_start)
    INTO b_start, b_end, a_num, a_den
    FROM public.strata_milestones m
   WHERE m.project_card_id = p_project;

  a_progress := CASE WHEN a_den IS NULL OR a_den = 0 THEN NULL ELSE a_num / a_den END;

  -- Rule 4 fallback (CAT-STRATA-E2E-FIXES-20260711-001, defect 004): when no
  -- milestone carries a baseline duration, roll actual progress up as a
  -- weight-weighted average of milestone progress (milestone.weight, default 1)
  -- so progress-only milestones still report actual_progress instead of '—'.
  IF a_progress IS NULL THEN
    SELECT sum(m.progress * COALESCE(m.weight, 1)), sum(COALESCE(m.weight, 1))
      INTO a_num, a_den
      FROM public.strata_milestones m
     WHERE m.project_card_id = p_project AND m.progress IS NOT NULL;
    a_progress := CASE WHEN a_den IS NULL OR a_den = 0 THEN NULL ELSE a_num / a_den END;
  END IF;

  -- Rule 3: baseline progress-to-date over the derived project window.
  IF b_start IS NULL OR b_end IS NULL THEN
    b_progress := NULL;
  ELSIF b_end <= b_start THEN
    b_progress := 100;
  ELSIF today < b_start THEN
    b_progress := 0;
  ELSIF today > b_end THEN
    b_progress := 100;
  ELSE
    b_progress := (today - b_start)::numeric / (b_end - b_start) * 100;
  END IF;

  -- Rule 5: positive variance = behind schedule.
  variance := CASE WHEN b_progress IS NULL OR a_progress IS NULL THEN NULL ELSE b_progress - a_progress END;

  -- Rule 6: earned-schedule system forecast. Find the date on the planned
  -- baseline curve where planned progress equals today's actual progress,
  -- then carry that day-offset onto baseline end. This is NOT the same as
  -- adding variance% × duration once "today" moves past baseline_end — the
  -- offset keeps growing the longer an overdue project sits at the same
  -- actual progress, which the crude shortcut cannot express.
  IF b_start IS NULL OR b_end IS NULL OR a_progress IS NULL OR b_end <= b_start THEN
    sys_forecast := NULL;
  ELSE
    eq_offset := (a_progress / 100) * (b_end - b_start);
    delay_days := (today - b_start) - eq_offset;
    sys_forecast := b_end + round(delay_days)::int;
  END IF;

  -- Rule 8: final forecast = later of system vs. submitted (existing
  -- forecast_end column), or whichever exists, or NULL.
  final_forecast := CASE
    WHEN sys_forecast IS NOT NULL AND v_submitted_forecast IS NOT NULL THEN greatest(sys_forecast, v_submitted_forecast)
    WHEN sys_forecast IS NOT NULL THEN sys_forecast
    ELSE v_submitted_forecast
  END;

  -- Rule 9.
  fvar_days := CASE WHEN final_forecast IS NULL OR b_end IS NULL THEN NULL ELSE (final_forecast - b_end) END;

  -- Rules 10 + 11 (forecast-delay override forces Major Delay regardless of
  -- progress variance). Order matches the rule list exactly.
  -- V5-OPEN-023: Not Started precedence — zero actual progress means the project
  -- has not begun and must read 'not_started', never 'major_delay', regardless
  -- of how far the baseline has advanced. Both zero-progress branches sit below
  -- on_hold and not_available and ABOVE the forecast/variance branches.
  IF v_stage = 'on_hold' THEN
    health := 'on_hold';
    reason := 'Project is on hold — excluded from execution rollups.';
  ELSIF b_start IS NULL OR b_end IS NULL OR b_progress IS NULL OR a_progress IS NULL THEN
    health := 'not_available';
    reason := 'Insufficient milestone baseline or progress data to calculate health.';
  ELSIF a_progress = 0 AND b_progress > 0 THEN
    health := 'not_started';
    reason := 'No progress recorded although the baseline window has started.';
  ELSIF a_progress = 0 AND b_progress = 0 THEN
    health := 'not_started';
    reason := 'Baseline window has not started and no progress recorded yet.';
  ELSIF fvar_days IS NOT NULL AND fvar_days > 30 THEN
    health := 'major_delay';
    reason := format('Forecast end is %s day(s) beyond baseline end (over the 30-day major-delay threshold).', fvar_days);
  ELSIF variance >= 20 THEN
    health := 'major_delay';
    reason := format('Schedule variance is %s%%, at or above the 20%% major-delay threshold.', round(variance, 1));
  ELSIF variance >= 10 THEN
    health := 'minor_delay';
    reason := format('Schedule variance is %s%%, in the 10-20%% minor-delay band.', round(variance, 1));
  ELSE
    health := 'on_track';
    reason := 'Schedule variance is under 10% and forecast is within 30 days of baseline end.';
  END IF;

  UPDATE public.strata_project_cards
     SET actual_progress = round(a_progress, 2),
         calc_baseline_start = b_start,
         calc_baseline_end = b_end,
         baseline_progress_pct = round(b_progress, 2),
         variance_pct = round(variance, 2),
         system_forecast_end = sys_forecast,
         final_forecast_end = final_forecast,
         forecast_variance_days = fvar_days,
         calculated_health = health,
         health_reason = reason,
         execution_health = health, -- legacy mirror: pre-existing StrataBandLozenge/evidence readers keep working
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, score, status_key, formula_version, inputs, config_context)
  VALUES ('project_card', p_project, 'execution_progress', a_progress, variance, health,
          'milestone_baseline_health:v2',
          jsonb_build_object(
            'baseline_start', b_start, 'baseline_end', b_end,
            'baseline_progress_pct', b_progress, 'actual_progress_pct', a_progress,
            'variance_pct', variance, 'system_forecast_end', sys_forecast,
            'submitted_forecast_end', v_submitted_forecast, 'final_forecast_end', final_forecast,
            'forecast_variance_days', fvar_days, 'health_reason', reason),
          jsonb_build_object('threshold_scheme_id', p_scheme));

  RETURN jsonb_build_object(
    'project_card_id', p_project,
    'baseline_start', b_start, 'baseline_end', b_end,
    'baseline_progress_pct', round(coalesce(b_progress, 0), 2),
    'actual_progress_pct', round(coalesce(a_progress, 0), 2),
    'variance_pct', round(coalesce(variance, 0), 2),
    'system_forecast_end', sys_forecast, 'submitted_forecast_end', v_submitted_forecast,
    'final_forecast_end', final_forecast, 'forecast_variance_days', fvar_days,
    'calculated_health', health, 'health_reason', reason,
    'has_data', a_progress IS NOT NULL,
    'calculated_at', now());
END;
$function$;

-- Backfill: recompute health for every project card so stored 'major_delay'
-- rows that are actually 'not_started' are corrected on apply.
DO $backfill$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.strata_project_cards LOOP
    PERFORM public.strata_calc_execution_progress(r.id);
  END LOOP;
END;
$backfill$;
