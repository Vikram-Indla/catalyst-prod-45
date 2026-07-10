-- ============================================================================
-- STRATA Execution — Project Status Health & Forecast Date Calculation (RPCs).
-- CAT-STRATA-20260705-001 (continuation, session 010).
--
-- Rewrites strata_calc_execution_progress() to compute health from
-- milestone-derived baseline progress, actual progress, variance and an
-- earned-schedule forecast — replacing the prior overdue-milestone-ratio +
-- governed-threshold-scheme banding. Same function name/signature (no new
-- RPC, no duplicate calc engine). strata_create_project_card /
-- strata_update_project_card gain a trailing call so stage (On Hold) and
-- forecast_end (submitted forecast) changes recalculate immediately.
-- strata_needs_attention() gains project-card health/forecast/blocker rules.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. strata_calc_execution_progress — same signature, new algorithm.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_calc_execution_progress(p_project uuid, p_scheme uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF v_stage = 'on_hold' THEN
    health := 'on_hold';
    reason := 'Project is on hold — excluded from execution rollups.';
  ELSIF b_start IS NULL OR b_end IS NULL OR b_progress IS NULL OR a_progress IS NULL THEN
    health := 'not_available';
    reason := 'Insufficient milestone baseline or progress data to calculate health.';
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
$$;

COMMENT ON FUNCTION public.strata_calc_execution_progress(uuid, uuid) IS
  'Milestone-derived baseline/actual/variance/forecast + fixed health classification (on_hold | not_available | not_started | major_delay | minor_delay | on_track). Never manual — sole writer of calculated_health.';

-- ---------------------------------------------------------------------------
-- 2. strata_create_project_card / strata_update_project_card — recalculate
--    on write so stage (On Hold) and forecast_end (submitted forecast)
--    changes reflect immediately. Same signatures — CREATE OR REPLACE only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_project_card(
  p_name text,
  p_source_system text DEFAULT 'manual',
  p_source_key text DEFAULT NULL,
  p_pm uuid DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_end date DEFAULT NULL,
  p_stage text DEFAULT 'planning',
  p_execution_health text DEFAULT NULL,
  p_sync_metadata jsonb DEFAULT NULL,
  p_theme uuid DEFAULT NULL,
  p_card_type text DEFAULT 'standard',
  p_business_owner uuid DEFAULT NULL,
  p_lead_business_unit text DEFAULT NULL,
  p_delivery_team text DEFAULT NULL,
  p_scope_description text DEFAULT NULL,
  p_target_outcomes text DEFAULT NULL,
  p_success_criteria text DEFAULT NULL,
  p_sponsor uuid DEFAULT NULL,
  p_business_case text DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL,
  p_optional_fields jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'project name is required'; END IF;
  IF p_source_system NOT IN ('jira','manual','upload','api') THEN
    RAISE EXCEPTION 'source system must be manual | upload | api | jira';
  END IF;
  IF p_source_system <> 'manual' AND (p_source_key IS NULL OR btrim(p_source_key) = '') THEN
    RAISE EXCEPTION 'source key is required for %-sourced project cards', p_source_system;
  END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end <= p_baseline_start THEN
    RAISE EXCEPTION 'baseline end must be after baseline start';
  END IF;
  IF p_budget IS NOT NULL AND p_budget < 0 THEN RAISE EXCEPTION 'budget cannot be negative'; END IF;
  IF p_theme IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.strata_strategy_elements WHERE id = p_theme AND element_type = 'theme'
  ) THEN
    RAISE EXCEPTION 'theme not found (must be a strategy element with element_type = theme)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strata_project_cards
     WHERE source_system = p_source_system
       AND source_key IS NOT DISTINCT FROM NULLIF(btrim(COALESCE(p_source_key,'')), '')
       AND p_source_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'a project card already exists for % source key %', p_source_system, p_source_key;
  END IF;

  INSERT INTO public.strata_project_cards
    (name, source_system, source_key, pm_id, sector, budget,
     baseline_start, baseline_end, forecast_end, stage, execution_health, sync_metadata, created_by,
     theme_id, card_type, business_owner_id, lead_business_unit, delivery_team,
     scope_description, target_outcomes, success_criteria,
     sponsor_id, business_case, value_hypothesis, optional_fields)
  VALUES
    (btrim(p_name), p_source_system, NULLIF(btrim(COALESCE(p_source_key,'')), ''), p_pm, p_sector, p_budget,
     p_baseline_start, p_baseline_end, p_forecast_end, COALESCE(p_stage, 'planning'),
     p_execution_health, p_sync_metadata, auth.uid(),
     p_theme, COALESCE(p_card_type, 'standard'), p_business_owner, p_lead_business_unit, p_delivery_team,
     p_scope_description, p_target_outcomes, p_success_criteria,
     p_sponsor, p_business_case, p_value_hypothesis, COALESCE(p_optional_fields, '{}'::jsonb))
  RETURNING id INTO new_id;

  INSERT INTO public.strata_lineage_records (entity_table, entity_id, written_by, config_context)
  VALUES ('strata_project_cards', new_id, auth.uid(),
          jsonb_build_object('channel', p_source_system, 'source_key', p_source_key));

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', new_id, 'RPC:create_project_card', auth.uid(),
          format('%s project card "%s" created%s', p_source_system, btrim(p_name),
                 CASE WHEN p_theme IS NOT NULL THEN format(' under theme "%s"', public.strata_entity_name('element', p_theme)) ELSE '' END));

  PERFORM public.strata_calc_execution_progress(new_id);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_project_card(
  p_project uuid,
  p_name text DEFAULT NULL,
  p_pm uuid DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_end date DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_execution_health text DEFAULT NULL,
  p_risk_summary text DEFAULT NULL,
  p_dependency_summary text DEFAULT NULL,
  p_clear_pm boolean DEFAULT false,
  p_clear_execution_health boolean DEFAULT false,
  p_theme uuid DEFAULT NULL,
  p_card_type text DEFAULT NULL,
  p_business_owner uuid DEFAULT NULL,
  p_lead_business_unit text DEFAULT NULL,
  p_delivery_team text DEFAULT NULL,
  p_scope_description text DEFAULT NULL,
  p_target_outcomes text DEFAULT NULL,
  p_success_criteria text DEFAULT NULL,
  p_sponsor uuid DEFAULT NULL,
  p_business_case text DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL,
  p_optional_fields jsonb DEFAULT NULL,
  p_clear_theme boolean DEFAULT false,
  p_clear_sponsor boolean DEFAULT false,
  p_clear_business_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record; nbs date; nbe date;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'archived project cards cannot be edited'; END IF;
  nbs := COALESCE(p_baseline_start, pc.baseline_start);
  nbe := COALESCE(p_baseline_end, pc.baseline_end);
  IF nbs IS NOT NULL AND nbe IS NOT NULL AND nbe <= nbs THEN
    RAISE EXCEPTION 'baseline end must be after baseline start';
  END IF;
  IF p_budget IS NOT NULL AND p_budget < 0 THEN RAISE EXCEPTION 'budget cannot be negative'; END IF;
  IF p_theme IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.strata_strategy_elements WHERE id = p_theme AND element_type = 'theme'
  ) THEN
    RAISE EXCEPTION 'theme not found (must be a strategy element with element_type = theme)';
  END IF;

  UPDATE public.strata_project_cards
     SET name = COALESCE(btrim(p_name), name),
         pm_id = CASE WHEN p_clear_pm THEN NULL ELSE COALESCE(p_pm, pm_id) END,
         sector = COALESCE(p_sector, sector),
         budget = COALESCE(p_budget, budget),
         baseline_start = nbs,
         baseline_end = nbe,
         forecast_end = COALESCE(p_forecast_end, forecast_end),
         stage = COALESCE(p_stage, stage),
         execution_health = CASE WHEN p_clear_execution_health THEN NULL ELSE COALESCE(p_execution_health, execution_health) END,
         risk_summary = COALESCE(p_risk_summary, risk_summary),
         dependency_summary = COALESCE(p_dependency_summary, dependency_summary),
         theme_id = CASE WHEN p_clear_theme THEN NULL ELSE COALESCE(p_theme, theme_id) END,
         card_type = COALESCE(p_card_type, card_type),
         business_owner_id = CASE WHEN p_clear_business_owner THEN NULL ELSE COALESCE(p_business_owner, business_owner_id) END,
         lead_business_unit = COALESCE(p_lead_business_unit, lead_business_unit),
         delivery_team = COALESCE(p_delivery_team, delivery_team),
         scope_description = COALESCE(p_scope_description, scope_description),
         target_outcomes = COALESCE(p_target_outcomes, target_outcomes),
         success_criteria = COALESCE(p_success_criteria, success_criteria),
         sponsor_id = CASE WHEN p_clear_sponsor THEN NULL ELSE COALESCE(p_sponsor, sponsor_id) END,
         business_case = COALESCE(p_business_case, business_case),
         value_hypothesis = COALESCE(p_value_hypothesis, value_hypothesis),
         optional_fields = CASE WHEN p_optional_fields IS NOT NULL THEN optional_fields || p_optional_fields ELSE optional_fields END,
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', p_project, 'RPC:update_project_card', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_stage IS NOT NULL THEN format('stage → %s', p_stage) END,
            CASE WHEN p_execution_health IS NOT NULL OR p_clear_execution_health THEN 'health updated' END,
            CASE WHEN p_theme IS NOT NULL OR p_clear_theme THEN 'theme updated' END,
            CASE WHEN p_scope_description IS NOT NULL THEN 'scope description updated' END,
            CASE WHEN p_forecast_end IS NOT NULL THEN format('submitted forecast end → %s', p_forecast_end) END,
            'edited'));

  -- Rule 2 (On Hold toggle) + rule 12 (submitted forecast end change) both
  -- take effect immediately, not only on the next milestone write.
  PERFORM public.strata_calc_execution_progress(p_project);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. strata_needs_attention — + project-card health/forecast/blocker rules
--    (rule 15). Existing 9 branches untouched; 3 appended.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_needs_attention(p_period uuid DEFAULT NULL)
RETURNS TABLE (
  item_type text,
  severity text,
  entity_type text,
  entity_id uuid,
  entity_name text,
  detail text,
  due_date date
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- 1) KPI actuals awaiting attestation
  SELECT 'pending_attestation', 'warning', 'kpi', a.kpi_id,
         public.strata_entity_name('kpi', a.kpi_id),
         format('%s actual (%s) awaiting attestation', k.name, a.value), NULL::date
    FROM public.strata_kpi_actuals a
    JOIN public.strata_kpis k ON k.id = a.kpi_id
   WHERE a.validation_status = 'pending'
     AND (p_period IS NULL OR a.period_id = p_period)
  UNION ALL
  -- 2) Benefit values awaiting validation
  SELECT 'pending_benefit_validation', 'warning', 'benefit', v.benefit_id,
         public.strata_entity_name('benefit', v.benefit_id),
         format('%s %s value (%s) awaiting validation', b.name, v.value_kind, v.value), NULL::date
    FROM public.strata_benefit_values v
    JOIN public.strata_benefits b ON b.id = v.benefit_id
   WHERE v.validation_status = 'pending'
     AND (p_period IS NULL OR v.period_id = p_period)
  UNION ALL
  -- 3) Blocked dependencies
  SELECT 'blocked_dependency', 'critical', d.requesting_type, d.requesting_id,
         public.strata_entity_name(d.requesting_type, d.requesting_id),
         format('%s dependency blocked%s', d.dependency_type,
                COALESCE(' — ' || d.impact, '')), d.due_date
    FROM public.strata_dependencies d
   WHERE (d.is_blocker OR d.status = 'blocked')
     AND d.status NOT IN ('resolved','cancelled')
  UNION ALL
  -- 4) Overdue actions
  SELECT 'overdue_action', 'warning', 'action', a.id,
         a.title, format('%s overdue since %s', a.action_key, a.due_date), a.due_date
    FROM public.strata_actions a
   WHERE a.status IN ('open','in_progress') AND a.due_date IS NOT NULL AND a.due_date < now()::date
  UNION ALL
  -- 5) Overdue gates
  SELECT 'overdue_gate', 'warning', g.subject_type, g.subject_id,
         public.strata_entity_name(g.subject_type, g.subject_id),
         format('gate "%s" scheduled %s still undecided',
                public.strata_entity_name('gate_instance', g.id), g.scheduled_for), g.scheduled_for
    FROM public.strata_gate_instances g
   WHERE g.status IN ('open','in_review') AND g.scheduled_for IS NOT NULL AND g.scheduled_for < now()::date
  UNION ALL
  -- 6) Broken assumptions
  SELECT 'broken_assumption', 'critical', 'benefit', s.benefit_id,
         public.strata_entity_name('benefit', s.benefit_id),
         format('assumption broken: %s', left(s.description, 140)), NULL::date
    FROM public.strata_assumptions s
   WHERE s.status = 'broken'
  UNION ALL
  -- 7) Approved KPIs missing an actual for the (open) period
  SELECT 'missing_actual', 'warning', 'kpi', k.id, k.name,
         format('no actual submitted for %s', p.name), p.ends_on
    FROM public.strata_kpis k
    CROSS JOIN public.strata_periods p
   WHERE p_period IS NOT NULL AND p.id = p_period AND p.close_status <> 'closed'
     AND k.status = 'approved'
     AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_actuals a
                      WHERE a.kpi_id = k.id AND a.period_id = p.id)
  UNION ALL
  -- 8) Upload runs with rejected rows
  SELECT 'upload_rejections', 'warning', 'upload_run', r.id, r.run_key,
         format('%s of %s rows rejected in %s', r.row_count_rejected, r.row_count_raw, r.run_key), NULL::date
    FROM public.strata_upload_runs r
   WHERE COALESCE(r.row_count_rejected, 0) > 0 AND r.status IN ('completed','failed')
  UNION ALL
  -- 9) Active plays with incomplete charters (governance drift)
  SELECT 'governance_incomplete', 'warning', 'element', e.id, e.name,
         'active play without a complete charter', NULL::date
    FROM public.strata_strategy_elements e
    LEFT JOIN public.strata_play_charters c ON c.element_id = e.id
   WHERE e.element_type = 'play' AND e.status = 'active'
     AND (c.id IS NULL OR c.status <> 'complete')
  UNION ALL
  -- 10) Project Card major delay (Execution Health & Forecast rule 15) —
  -- includes the rule-11 forecast-override case, since that always sets
  -- calculated_health = 'major_delay' too.
  SELECT 'project_major_delay', 'critical', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Project is in major delay'), pc.final_forecast_end
    FROM public.strata_project_cards pc
   WHERE pc.calculated_health = 'major_delay'
  UNION ALL
  -- 11) Project Card health Not Available due to missing milestone baseline data
  SELECT 'project_health_unavailable', 'warning', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Insufficient milestone baseline data to calculate health'), NULL::date
    FROM public.strata_project_cards pc
   WHERE pc.calculated_health = 'not_available'
  UNION ALL
  -- 12) Project Card has an open blocker dependency, in either direction —
  -- broader than branch 3 (which only surfaces the requesting-side entity).
  SELECT 'project_blocked_dependency', 'critical', 'project_card', pc.id, pc.name,
         format('%s dependency blocked%s', d.dependency_type, COALESCE(' — ' || d.impact, '')), d.due_date
    FROM public.strata_project_cards pc
    JOIN public.strata_dependencies d
      ON (d.requesting_type = 'project_card' AND d.requesting_id = pc.id)
      OR (d.serving_type = 'project_card' AND d.serving_id = pc.id)
   WHERE d.is_blocker AND d.status NOT IN ('resolved','cancelled');
$$;

COMMENT ON FUNCTION public.strata_needs_attention(uuid) IS
  'Rule-driven Needs Attention feed (F-REP-004 + Execution Health & Forecast rule 15): attestations, validations, blockers, overdue actions/gates, broken assumptions, missing actuals, upload rejections, governance drift, project-card major delay, project-card health unavailable, project-card blocker dependencies. No seeded rows.';
