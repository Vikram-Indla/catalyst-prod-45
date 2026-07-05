-- ============================================================================
-- STRATA — Jira connector sync + clear-to-NULL flags on update RPCs
-- CAT-STRATA-20260705-001 · Session 004 follow-ups (owner-directed items 5+10)
--
-- Part 1 · strata_sync_jira(): pulls the platform's Jira mirror
--   (ph_jira_projects / ph_jira_sprints — populated by the existing platform
--   sync) into canonical, source-agnostic STRATA objects:
--     · strata_project_cards  (source_system 'jira', source_key = project_key,
--       mapping stays config-light: name/description/last_synced_at +
--       sync_metadata carrying the upstream ids)
--     · strata_milestones     (sprints → milestones, matched by
--       (project_card_id, name); done sprints → progress 100, others keep
--       their existing progress — never invented)
--   Every run is logged in strata_upload_runs (channel 'jira', run_key
--   JIRA-SYNC-<n>), each created card gets a lineage record, and the run
--   emits an audit event. Guard: data_steward | strategy_office | admin.
--   Idempotent: re-runs update in place (source key match).
--
-- Part 2 · clear-to-NULL: the session-004 update RPCs used COALESCE patch
--   semantics, so a set field could never be cleared from the UI. Each RPC
--   below is DROPPED and recreated with p_clear_* booleans (drop first —
--   adding defaulted params via CREATE OR REPLACE would create an ambiguous
--   overload for PostgREST). Behaviour unchanged when flags are false.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.strata_jira_sync_seq START 1000;

CREATE OR REPLACE FUNCTION public.strata_sync_jira()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jp record;
  sp record;
  run_id uuid;
  card_id uuid;
  ms_id uuid;
  n_created int := 0;
  n_updated int := 0;
  n_ms int := 0;
  ms_status text;
  ms_progress numeric;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','strategy_office']) THEN
    RAISE EXCEPTION 'Jira sync requires data_steward, strategy_office or admin role';
  END IF;

  INSERT INTO public.strata_upload_runs
    (run_key, channel, initiated_by, file_name, row_count_raw, status)
  VALUES
    ('JIRA-SYNC-' || nextval('public.strata_jira_sync_seq'), 'jira', auth.uid(),
     'ph_jira mirror', (SELECT count(*) FROM public.ph_jira_projects WHERE is_active), 'writing')
  RETURNING id INTO run_id;

  FOR jp IN SELECT * FROM public.ph_jira_projects WHERE is_active LOOP
    SELECT id INTO card_id FROM public.strata_project_cards
     WHERE source_system = 'jira' AND source_key = jp.project_key;

    IF card_id IS NULL THEN
      INSERT INTO public.strata_project_cards
        (name, source_system, source_key, last_synced_at, sync_metadata, stage, created_by)
      VALUES
        (jp.name, 'jira', jp.project_key, now(),
         jsonb_build_object('jira_project_id', jp.jira_project_id, 'ph_project_id', jp.id,
                            'sync_run_id', run_id),
         'delivery', auth.uid())
      RETURNING id INTO card_id;
      INSERT INTO public.strata_lineage_records (entity_table, entity_id, upload_run_id, written_by, config_context)
      VALUES ('strata_project_cards', card_id, run_id, auth.uid(),
              jsonb_build_object('channel', 'jira', 'source_key', jp.project_key));
      n_created := n_created + 1;
    ELSE
      UPDATE public.strata_project_cards
         SET name = jp.name,
             last_synced_at = now(),
             sync_metadata = COALESCE(sync_metadata, '{}'::jsonb)
               || jsonb_build_object('jira_project_id', jp.jira_project_id,
                                     'ph_project_id', jp.id, 'sync_run_id', run_id),
             updated_at = now()
       WHERE id = card_id;
      n_updated := n_updated + 1;
    END IF;

    -- Sprints → milestones for this project (match by name, update in place).
    FOR sp IN
      SELECT * FROM public.ph_jira_sprints s
       WHERE s.project_id = jp.id AND s.deleted_at IS NULL
    LOOP
      ms_status := CASE
        WHEN sp.status IN ('done','closed','completed','complete') THEN 'done'
        WHEN sp.status IN ('active','in_progress','started') THEN 'in_progress'
        ELSE 'planned' END;
      ms_progress := CASE WHEN ms_status = 'done' THEN 100 ELSE NULL END;

      SELECT id INTO ms_id FROM public.strata_milestones
       WHERE project_card_id = card_id AND name = COALESCE(sp.title, sp.name);
      IF ms_id IS NULL THEN
        INSERT INTO public.strata_milestones
          (project_card_id, name, baseline_start, baseline_end, forecast_date, actual_date,
           status, progress, weight, order_index)
        VALUES
          (card_id, COALESCE(sp.title, sp.name), sp.start_date,
           COALESCE(sp.end_date, sp.target_date), sp.target_date, sp.actual_date,
           ms_status, COALESCE(ms_progress, 0), 1, COALESCE(sp.sort_order, 0));
      ELSE
        UPDATE public.strata_milestones
           SET baseline_start = COALESCE(sp.start_date, baseline_start),
               baseline_end = COALESCE(sp.end_date, sp.target_date, baseline_end),
               forecast_date = COALESCE(sp.target_date, forecast_date),
               actual_date = COALESCE(sp.actual_date, actual_date),
               status = ms_status,
               progress = COALESCE(ms_progress, progress),
               updated_at = now()
         WHERE id = ms_id;
      END IF;
      n_ms := n_ms + 1;
    END LOOP;

    -- Derived progress with provenance after milestone writes.
    PERFORM public.strata_calc_execution_progress(card_id);
  END LOOP;

  UPDATE public.strata_upload_runs
     SET status = 'completed', row_count_valid = n_created + n_updated,
         completed_at = now(), updated_at = now()
   WHERE id = run_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_upload_runs', run_id, 'RPC:sync_jira', auth.uid(),
          format('%s cards created, %s updated, %s milestones synced', n_created, n_updated, n_ms));

  RETURN jsonb_build_object('run_id', run_id, 'cards_created', n_created,
                            'cards_updated', n_updated, 'milestones_synced', n_ms);
END;
$$;

COMMENT ON FUNCTION public.strata_sync_jira() IS
  'Jira connector (F-GOV-010): syncs the platform ph_jira mirror into source-agnostic strata_project_cards + strata_milestones with run log, lineage and audit. Idempotent by source key.';

-- ---------------------------------------------------------------------------
-- Part 2 · clear-to-NULL flag rebuilds (DROP first: defaulted-param overloads
-- are ambiguous to PostgREST).
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.strata_update_kpi(uuid,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid);
CREATE FUNCTION public.strata_update_kpi(
  p_kpi uuid,
  p_name text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_frequency text DEFAULT NULL,
  p_entry_method text DEFAULT NULL,
  p_accountable_owner uuid DEFAULT NULL,
  p_data_owner uuid DEFAULT NULL,
  p_reporter uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL,
  p_escalation_owner uuid DEFAULT NULL,
  p_data_source uuid DEFAULT NULL,
  p_threshold_scheme uuid DEFAULT NULL,
  p_kpi_type uuid DEFAULT NULL,
  p_clear_validator boolean DEFAULT false,
  p_clear_data_source boolean DEFAULT false,
  p_clear_escalation_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'updating a KPI requires strategy_office, kpi_owner or admin role';
  END IF;
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.status NOT IN ('draft','pending_approval') THEN
    RAISE EXCEPTION 'only draft or pending KPIs can be edited (current: %); retire and recreate to change an approved KPI', k.status;
  END IF;
  IF p_direction IS NOT NULL AND p_direction NOT IN ('higher_better','lower_better','band','manual') THEN
    RAISE EXCEPTION 'direction must be higher_better | lower_better | band | manual';
  END IF;
  IF p_frequency IS NOT NULL AND p_frequency NOT IN ('weekly','monthly','quarterly','half_yearly','yearly') THEN
    RAISE EXCEPTION 'frequency must be weekly | monthly | quarterly | half_yearly | yearly';
  END IF;
  IF p_entry_method IS NOT NULL AND p_entry_method NOT IN ('upload','manual','connector') THEN
    RAISE EXCEPTION 'entry_method must be upload | manual | connector';
  END IF;
  IF p_validator IS NOT NULL AND p_validator = COALESCE(p_accountable_owner, k.accountable_owner_id) THEN
    RAISE EXCEPTION 'validator must differ from the accountable owner (separation of duties)';
  END IF;
  IF p_data_source IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_data_sources WHERE id = p_data_source) THEN
    RAISE EXCEPTION 'data source not found';
  END IF;
  IF p_threshold_scheme IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_threshold_schemes WHERE id = p_threshold_scheme) THEN
    RAISE EXCEPTION 'threshold scheme not found';
  END IF;
  IF p_kpi_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_type_configs WHERE id = p_kpi_type) THEN
    RAISE EXCEPTION 'KPI type config not found';
  END IF;

  UPDATE public.strata_kpis
     SET name = COALESCE(btrim(p_name), name),
         unit = COALESCE(p_unit, unit),
         direction = COALESCE(p_direction, direction),
         frequency = COALESCE(p_frequency, frequency),
         entry_method = COALESCE(p_entry_method, entry_method),
         accountable_owner_id = COALESCE(p_accountable_owner, accountable_owner_id),
         data_owner_id = COALESCE(p_data_owner, data_owner_id),
         reporter_id = COALESCE(p_reporter, reporter_id),
         validator_id = CASE WHEN p_clear_validator THEN NULL ELSE COALESCE(p_validator, validator_id) END,
         escalation_owner_id = CASE WHEN p_clear_escalation_owner THEN NULL ELSE COALESCE(p_escalation_owner, escalation_owner_id) END,
         data_source_id = CASE WHEN p_clear_data_source THEN NULL ELSE COALESCE(p_data_source, data_source_id) END,
         threshold_scheme_id = COALESCE(p_threshold_scheme, threshold_scheme_id),
         kpi_type_id = COALESCE(p_kpi_type, kpi_type_id),
         updated_at = now()
   WHERE id = p_kpi;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', p_kpi, 'RPC:update_kpi', auth.uid(), 'KPI governance metadata updated');
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_initiative(uuid,text,text,uuid,uuid,text,text,numeric,text,text);
CREATE FUNCTION public.strata_update_initiative(
  p_initiative uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_sponsor uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_budget_envelope numeric DEFAULT NULL,
  p_business_case text DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL,
  p_clear_sponsor boolean DEFAULT false,
  p_clear_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ini record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating an initiative requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO ini FROM public.strata_initiatives WHERE id = p_initiative;
  IF ini IS NULL THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF ini.status = 'stopped' AND p_status IS NULL THEN
    RAISE EXCEPTION 'stopped (archived) initiatives cannot be edited';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('draft','active','on_hold','completed','stopped') THEN
    RAISE EXCEPTION 'status must be draft | active | on_hold | completed | stopped';
  END IF;
  IF p_budget_envelope IS NOT NULL AND p_budget_envelope < 0 THEN
    RAISE EXCEPTION 'budget envelope cannot be negative';
  END IF;

  UPDATE public.strata_initiatives
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         sponsor_id = CASE WHEN p_clear_sponsor THEN NULL ELSE COALESCE(p_sponsor, sponsor_id) END,
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         stage = COALESCE(p_stage, stage),
         status = COALESCE(p_status, status),
         budget_envelope = COALESCE(p_budget_envelope, budget_envelope),
         business_case = COALESCE(p_business_case, business_case),
         value_hypothesis = COALESCE(p_value_hypothesis, value_hypothesis),
         updated_at = now()
   WHERE id = p_initiative;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiatives', p_initiative, 'RPC:update_initiative', auth.uid(),
          CASE WHEN p_status IS NOT NULL AND p_status <> ini.status
               THEN format('status %s → %s', ini.status, p_status) ELSE 'updated' END);
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_project_card(uuid,text,uuid,text,numeric,date,date,date,text,text,text,text);
CREATE FUNCTION public.strata_update_project_card(
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
  p_clear_execution_health boolean DEFAULT false
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
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', p_project, 'RPC:update_project_card', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_stage IS NOT NULL THEN format('stage → %s', p_stage) END,
            CASE WHEN p_execution_health IS NOT NULL OR p_clear_execution_health THEN 'health updated' END,
            'edited'));
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_benefit(uuid,text,text,uuid,uuid,text,uuid,uuid,text,text,numeric,text);
CREATE FUNCTION public.strata_update_benefit(
  p_benefit uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_portfolio uuid DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL,
  p_causal_mechanism text DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_lifecycle_stage text DEFAULT NULL,
  p_clear_owner boolean DEFAULT false,
  p_clear_validator boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  stages text[] := ARRAY['identified','qualified','approved','baselined','in_flight','forecast_revised','realized','finance_validated','closed'];
  old_idx int; new_idx int;
  next_owner uuid; next_validator uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a benefit requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = p_benefit;
  IF b IS NULL THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF b.lifecycle_stage = 'closed' AND p_lifecycle_stage IS NULL THEN
    RAISE EXCEPTION 'closed benefits cannot be edited';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;
  IF p_portfolio IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_portfolios WHERE id = p_portfolio) THEN
    RAISE EXCEPTION 'portfolio not found';
  END IF;
  next_owner := CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, b.owner_id) END;
  next_validator := CASE WHEN p_clear_validator THEN NULL ELSE COALESCE(p_validator, b.validator_id) END;
  IF next_validator IS NOT NULL AND next_validator = next_owner THEN
    RAISE EXCEPTION 'validator must differ from the benefit owner (separation of duties)';
  END IF;
  IF p_lifecycle_stage IS NOT NULL THEN
    old_idx := array_position(stages, b.lifecycle_stage);
    new_idx := array_position(stages, p_lifecycle_stage);
    IF new_idx IS NULL THEN
      RAISE EXCEPTION 'lifecycle stage must be one of: %', array_to_string(stages, ', ');
    END IF;
    IF new_idx < old_idx AND p_lifecycle_stage <> 'forecast_revised' THEN
      RAISE EXCEPTION 'lifecycle cannot move backwards (% → %)', b.lifecycle_stage, p_lifecycle_stage;
    END IF;
    IF p_lifecycle_stage = 'finance_validated' THEN
      RAISE EXCEPTION 'finance_validated is reached through realized-value validation, not manual edit';
    END IF;
  END IF;

  UPDATE public.strata_benefits
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         owner_id = next_owner,
         validator_id = next_validator,
         unit = COALESCE(p_unit, unit),
         category_id = COALESCE(p_category, category_id),
         portfolio_id = COALESCE(p_portfolio, portfolio_id),
         value_hypothesis = COALESCE(p_value_hypothesis, value_hypothesis),
         causal_mechanism = COALESCE(p_causal_mechanism, causal_mechanism),
         confidence = COALESCE(p_confidence, confidence),
         lifecycle_stage = COALESCE(p_lifecycle_stage, lifecycle_stage),
         updated_at = now()
   WHERE id = p_benefit;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefits', p_benefit, 'RPC:update_benefit', auth.uid(),
          CASE WHEN p_lifecycle_stage IS NOT NULL
               THEN format('lifecycle %s → %s', b.lifecycle_stage, p_lifecycle_stage) ELSE 'updated' END);
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_assumption(uuid,text,uuid,numeric,text);
CREATE FUNCTION public.strata_update_assumption(
  p_assumption uuid,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_clear_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating an assumption requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO a FROM public.strata_assumptions WHERE id = p_assumption;
  IF a IS NULL THEN RAISE EXCEPTION 'assumption not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','holding','broken','retired') THEN
    RAISE EXCEPTION 'status must be open | holding | broken | retired';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;

  UPDATE public.strata_assumptions
     SET description = COALESCE(btrim(p_description), description),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         confidence = COALESCE(p_confidence, confidence),
         status = COALESCE(p_status, status),
         updated_at = now()
   WHERE id = p_assumption;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_assumptions', p_assumption, 'RPC:update_assumption', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) ELSE 'updated' END);
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_portfolio(uuid,text,text,uuid,uuid,numeric,text);
CREATE FUNCTION public.strata_update_portfolio(
  p_portfolio uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_value_target numeric DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_clear_owner boolean DEFAULT false,
  p_clear_category boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active','archived') THEN
    RAISE EXCEPTION 'status must be active | archived';
  END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;

  UPDATE public.strata_portfolios
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         category_id = CASE WHEN p_clear_category THEN NULL ELSE COALESCE(p_category, category_id) END,
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         value_target = COALESCE(p_value_target, value_target),
         status = COALESCE(p_status, status),
         updated_at = now()
   WHERE id = p_portfolio;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:update_portfolio', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) ELSE 'updated' END);
END;
$$;
