-- ============================================================================
-- STRATA Execution reconciliation — RPC layer.
-- CAT-STRATA-EXECUTION-RECONCILE-20260706 · Execution Reconciliation Report §N
--
-- Every RPC below whose parameter list changes is DROPPED with its exact
-- current signature first, then recreated — CREATE OR REPLACE with a widened
-- arg list creates a second PostgREST overload (ambiguous RPC resolution),
-- the same reason the 20260706120000 clear-flags migration used DROP+CREATE.
-- Two brand-new RPCs (strata_create_project_objective, strata_create_project_kpi)
-- use CREATE OR REPLACE directly since no prior version exists.
--
-- Project Objectives/KPIs reuse the EXISTING strata_strategy_elements /
-- strata_kpis frameworks (context='project'), linked to their Project Card
-- and to an optional parent Theme Objective/KPI via the EXISTING generic
-- strata_execution_links bridge — no second objective/KPI model.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. strata_create_project_card — + theme, card_type, Overview/Scope defaults,
--    migrated Initiative optional fields.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.strata_create_project_card(text,text,text,uuid,text,numeric,date,date,date,text,text,jsonb);

CREATE FUNCTION public.strata_create_project_card(
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
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_project_card(text,text,text,uuid,text,numeric,date,date,date,text,text,jsonb,uuid,text,uuid,text,text,text,text,text,uuid,text,text,jsonb) IS
  'Creates a Project Card (Execution Reconciliation §K) — imported/mapped from Jira or created manually. Links to exactly one Strategic Theme via theme_id. sponsor_id/business_case/value_hypothesis are optional, config-gated fields migrated from the deprecated Initiative model.';

-- ---------------------------------------------------------------------------
-- 2. strata_update_project_card — same additions + explicit clear flags for
--    the identity-style fields (theme/sponsor/business owner).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.strata_update_project_card(uuid,text,uuid,text,numeric,date,date,date,text,text,text,text,boolean,boolean);

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
            'edited'));
END;
$$;

COMMENT ON FUNCTION public.strata_update_project_card(uuid,text,uuid,text,numeric,date,date,date,text,text,text,text,boolean,boolean,uuid,text,uuid,text,text,text,text,text,uuid,text,text,jsonb,boolean,boolean,boolean) IS
  'Updates a Project Card, including its Strategic Theme link and Scope & Measures default fields (Execution Reconciliation §K).';

-- ---------------------------------------------------------------------------
-- 3. strata_create_project_objective — NEW. Reuses strata_strategy_elements
--    (context = ''project''), the SAME framework as Theme Objectives. Links
--    to its Project Card and (optionally) upward to a Theme Objective via the
--    existing generic strata_execution_links bridge — no second model.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_project_objective(
  p_project uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_parent_theme_objective uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record; theme_cycle uuid; new_id uuid; link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a project objective requires strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'objective name is required'; END IF;
  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.theme_id IS NULL THEN
    RAISE EXCEPTION 'project card must be linked to a Strategic Theme before adding Project Objectives';
  END IF;
  SELECT cycle_id INTO theme_cycle FROM public.strata_strategy_elements WHERE id = pc.theme_id;
  IF p_parent_theme_objective IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.strata_strategy_elements
       WHERE id = p_parent_theme_objective AND element_type = 'objective' AND context = 'theme'
    ) THEN
      RAISE EXCEPTION 'parent theme objective not found (must be a theme-context objective)';
    END IF;
  END IF;

  INSERT INTO public.strata_strategy_elements
    (cycle_id, element_type, context, name, description, parent_id, owner_id, stage, status, created_by)
  VALUES
    (theme_cycle, 'objective', 'project', btrim(p_name), p_description, p_parent_theme_objective, p_owner, 'draft', 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_execution_links
    (from_type, from_id, to_type, to_id, relationship_type, mapping_owner_id, created_by)
  VALUES
    ('project_card', p_project, 'element', new_id, 'has_objective', auth.uid(), auth.uid())
  RETURNING id INTO link_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', new_id, 'RPC:create_project_objective', auth.uid(),
          format('project objective "%s" created under %s%s', btrim(p_name),
                 public.strata_entity_name('project_card', p_project),
                 CASE WHEN p_parent_theme_objective IS NOT NULL
                      THEN format(' · linked to theme objective "%s"', public.strata_entity_name('element', p_parent_theme_objective))
                      ELSE '' END));
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_project_objective(uuid,text,text,uuid,uuid) IS
  'Creates a Project Objective inside a Project Card (Execution Reconciliation §K rule 7/9). Same strata_strategy_elements framework as Theme Objectives — context=project distinguishes scope; parent_id optionally links upward to a Theme Objective. No second objective model.';

-- ---------------------------------------------------------------------------
-- 4. strata_create_project_kpi — NEW. Reuses strata_kpis, the SAME framework
--    as Theme KPIs. Links to its Project Card and (optionally) upward to a
--    Theme KPI via the existing generic strata_execution_links bridge.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_project_kpi(
  p_project uuid,
  p_name text,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT 'higher_better',
  p_frequency text DEFAULT 'quarterly',
  p_entry_method text DEFAULT 'manual',
  p_parent_theme_kpi uuid DEFAULT NULL,
  p_accountable_owner uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'creating a project KPI requires strategy_office, kpi_owner or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'KPI name is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;
  IF p_direction NOT IN ('higher_better','lower_better','band','manual') THEN
    RAISE EXCEPTION 'direction must be higher_better | lower_better | band | manual';
  END IF;
  IF p_frequency NOT IN ('weekly','monthly','quarterly','half_yearly','yearly') THEN
    RAISE EXCEPTION 'frequency must be weekly | monthly | quarterly | half_yearly | yearly';
  END IF;
  IF p_entry_method NOT IN ('upload','manual','connector') THEN
    RAISE EXCEPTION 'entry_method must be upload | manual | connector';
  END IF;
  IF p_validator IS NOT NULL AND p_validator = p_accountable_owner THEN
    RAISE EXCEPTION 'validator must differ from the accountable owner (separation of duties)';
  END IF;
  IF p_parent_theme_kpi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_parent_theme_kpi) THEN
    RAISE EXCEPTION 'parent theme KPI not found';
  END IF;

  INSERT INTO public.strata_kpis
    (name, unit, direction, frequency, entry_method, accountable_owner_id, validator_id, status, created_by)
  VALUES
    (btrim(p_name), p_unit, p_direction, p_frequency, p_entry_method, p_accountable_owner, p_validator, 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_execution_links
    (from_type, from_id, to_type, to_id, relationship_type, mapping_owner_id, created_by)
  VALUES
    ('project_card', p_project, 'kpi', new_id, 'measures', auth.uid(), auth.uid())
  RETURNING id INTO link_id;

  IF p_parent_theme_kpi IS NOT NULL THEN
    INSERT INTO public.strata_execution_links
      (from_type, from_id, to_type, to_id, relationship_type, mapping_owner_id, created_by)
    VALUES
      ('kpi', new_id, 'kpi', p_parent_theme_kpi, 'rolls_up_to', auth.uid(), auth.uid());
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', new_id, 'RPC:create_project_kpi', auth.uid(),
          format('project KPI "%s" created for %s%s', btrim(p_name),
                 public.strata_entity_name('project_card', p_project),
                 CASE WHEN p_parent_theme_kpi IS NOT NULL
                      THEN format(' · rolls up to theme KPI "%s"', public.strata_entity_name('kpi', p_parent_theme_kpi))
                      ELSE '' END));
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_project_kpi(uuid,text,text,text,text,text,uuid,uuid,uuid) IS
  'Creates a Project KPI / Measure inside a Project Card (Execution Reconciliation §K rule 8/10). Same strata_kpis framework as Theme KPIs; optionally rolls up to a Theme KPI via strata_execution_links. No second KPI model.';

-- ---------------------------------------------------------------------------
-- 5. strata_create_milestone / strata_update_milestone — + source traceability
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.strata_create_milestone(uuid,text,uuid,date,date,date,date,text,numeric,numeric);

CREATE FUNCTION public.strata_create_milestone(
  p_project uuid,
  p_name text,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_date date DEFAULT NULL,
  p_actual_date date DEFAULT NULL,
  p_status text DEFAULT 'planned',
  p_progress numeric DEFAULT 0,
  p_weight numeric DEFAULT 1,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; next_order int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a milestone requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'milestone name is required'; END IF;
  IF p_status NOT IN ('planned','in_progress','done','missed','descoped') THEN
    RAISE EXCEPTION 'status must be planned | in_progress | done | missed | descoped';
  END IF;
  IF p_progress IS NOT NULL AND (p_progress < 0 OR p_progress > 100) THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  IF p_weight IS NULL OR p_weight <= 0 THEN RAISE EXCEPTION 'weight must be greater than 0'; END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end < p_baseline_start THEN
    RAISE EXCEPTION 'baseline end cannot precede baseline start';
  END IF;

  SELECT COALESCE(max(order_index), 0) + 1 INTO next_order
    FROM public.strata_milestones WHERE project_card_id = p_project;

  INSERT INTO public.strata_milestones
    (project_card_id, name, owner_id, baseline_start, baseline_end, forecast_date, actual_date,
     status, progress, weight, order_index, source_system, source_reference_key, source_issue_id)
  VALUES
    (p_project, btrim(p_name), p_owner, p_baseline_start, p_baseline_end, p_forecast_date, p_actual_date,
     p_status, COALESCE(p_progress, 0), p_weight, next_order, p_source_system, p_source_reference_key, p_source_issue_id)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_milestones', new_id, 'RPC:create_milestone', auth.uid(),
          format('milestone "%s" under %s', btrim(p_name), public.strata_entity_name('project_card', p_project)));

  PERFORM public.strata_calc_execution_progress(p_project);
  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_milestone(uuid,text,uuid,date,date,date,date,text,numeric,numeric);

CREATE FUNCTION public.strata_update_milestone(
  p_milestone uuid,
  p_name text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_date date DEFAULT NULL,
  p_actual_date date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_progress numeric DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ms record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a milestone requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO ms FROM public.strata_milestones WHERE id = p_milestone;
  IF ms IS NULL THEN RAISE EXCEPTION 'milestone not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('planned','in_progress','done','missed','descoped') THEN
    RAISE EXCEPTION 'status must be planned | in_progress | done | missed | descoped';
  END IF;
  IF p_progress IS NOT NULL AND (p_progress < 0 OR p_progress > 100) THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  IF p_weight IS NOT NULL AND p_weight <= 0 THEN RAISE EXCEPTION 'weight must be greater than 0'; END IF;

  UPDATE public.strata_milestones
     SET name = COALESCE(btrim(p_name), name),
         owner_id = COALESCE(p_owner, owner_id),
         baseline_start = COALESCE(p_baseline_start, baseline_start),
         baseline_end = COALESCE(p_baseline_end, baseline_end),
         forecast_date = COALESCE(p_forecast_date, forecast_date),
         actual_date = COALESCE(p_actual_date, actual_date),
         status = COALESCE(p_status, status),
         progress = COALESCE(p_progress, progress),
         weight = COALESCE(p_weight, weight),
         source_system = COALESCE(p_source_system, source_system),
         source_reference_key = COALESCE(p_source_reference_key, source_reference_key),
         source_issue_id = COALESCE(p_source_issue_id, source_issue_id),
         updated_at = now()
   WHERE id = p_milestone;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_milestones', p_milestone, 'RPC:update_milestone', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_progress IS NOT NULL THEN format('progress → %s%%', p_progress) END,
            CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) END,
            'updated'));

  PERFORM public.strata_calc_execution_progress(ms.project_card_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. strata_create_dependency / strata_update_dependency — + description,
--    owner, baseline dates, source traceability
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.strata_create_dependency(text,uuid,text,uuid,text,text,date,int,text,boolean,text);

CREATE FUNCTION public.strata_create_dependency(
  p_requesting_type text,
  p_requesting_id uuid,
  p_serving_type text,
  p_serving_id uuid DEFAULT NULL,
  p_serving_label text DEFAULT NULL,
  p_dependency_type text DEFAULT 'delivery',
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT false,
  p_status text DEFAULT 'open',
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_requesting_type NOT IN ('initiative','project_card') THEN
    RAISE EXCEPTION 'requesting type must be initiative | project_card';
  END IF;
  IF NOT public.strata_entity_exists(p_requesting_type, p_requesting_id) THEN
    RAISE EXCEPTION '% (requesting) not found', p_requesting_type;
  END IF;
  IF p_serving_type NOT IN ('initiative','project_card','external') THEN
    RAISE EXCEPTION 'serving type must be initiative | project_card | external';
  END IF;
  IF p_serving_type = 'external' THEN
    IF p_serving_label IS NULL OR btrim(p_serving_label) = '' THEN
      RAISE EXCEPTION 'external dependencies require a serving label';
    END IF;
  ELSE
    IF p_serving_id IS NULL OR NOT public.strata_entity_exists(p_serving_type, p_serving_id) THEN
      RAISE EXCEPTION '% (serving) not found', p_serving_type;
    END IF;
  END IF;
  IF p_dependency_type NOT IN ('delivery','data','decision','resource','external') THEN
    RAISE EXCEPTION 'dependency type must be delivery | data | decision | resource | external';
  END IF;
  IF p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end < p_baseline_start THEN
    RAISE EXCEPTION 'baseline end cannot precede baseline start';
  END IF;

  INSERT INTO public.strata_dependencies
    (requesting_type, requesting_id, serving_type, serving_id, serving_label,
     dependency_type, due_date, status, sla_days, impact, is_blocker, created_by,
     description, owner_id, baseline_start, baseline_end, source_system, source_reference_key, source_issue_id)
  VALUES
    (p_requesting_type, p_requesting_id, p_serving_type, p_serving_id, p_serving_label,
     p_dependency_type, p_due_date, p_status, p_sla_days, p_impact, COALESCE(p_is_blocker, false), auth.uid(),
     p_description, p_owner, p_baseline_start, p_baseline_end, p_source_system, p_source_reference_key, p_source_issue_id)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', new_id, 'RPC:create_dependency', auth.uid(),
          format('%s dependency for %s "%s"%s', p_dependency_type, p_requesting_type,
                 public.strata_entity_name(p_requesting_type, p_requesting_id),
                 CASE WHEN COALESCE(p_is_blocker,false) THEN ' · BLOCKER' ELSE '' END));
  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_dependency(uuid,text,date,int,text,boolean,text);

CREATE FUNCTION public.strata_update_dependency(
  p_dependency uuid,
  p_status text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT NULL,
  p_serving_label text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL,
  p_clear_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dep record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO dep FROM public.strata_dependencies WHERE id = p_dependency;
  IF dep IS NULL THEN RAISE EXCEPTION 'dependency not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;

  UPDATE public.strata_dependencies
     SET status = COALESCE(p_status, status),
         due_date = COALESCE(p_due_date, due_date),
         sla_days = COALESCE(p_sla_days, sla_days),
         impact = COALESCE(p_impact, impact),
         is_blocker = COALESCE(p_is_blocker, is_blocker),
         serving_label = COALESCE(p_serving_label, serving_label),
         description = COALESCE(p_description, description),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         baseline_start = COALESCE(p_baseline_start, baseline_start),
         baseline_end = COALESCE(p_baseline_end, baseline_end),
         source_system = COALESCE(p_source_system, source_system),
         source_reference_key = COALESCE(p_source_reference_key, source_reference_key),
         source_issue_id = COALESCE(p_source_issue_id, source_issue_id),
         updated_at = now()
   WHERE id = p_dependency;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', p_dependency, 'RPC:update_dependency', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) END,
            CASE WHEN p_is_blocker IS NOT NULL THEN format('blocker → %s', p_is_blocker) END,
            'updated'));
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. strata_sync_jira — populate the new milestone source-traceability
--    columns from genuinely available Jira mirror data (ph_jira_sprints.
--    jira_sprint_id). Zero-arg function: safe to CREATE OR REPLACE in place,
--    no arity change, no overload risk. Card/milestone upsert logic and
--    idempotency are UNCHANGED. Dependency import is intentionally NOT added
--    here: no ph_jira_* issue-link/dependency source table exists yet, and
--    fabricating one would violate zero-assumption data rendering.
-- ---------------------------------------------------------------------------
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
    -- Sprint id/jira_sprint_id are genuine source identifiers — never invented.
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
           status, progress, weight, order_index, source_system, source_reference_key, source_issue_id)
        VALUES
          (card_id, COALESCE(sp.title, sp.name), sp.start_date,
           COALESCE(sp.end_date, sp.target_date), sp.target_date, sp.actual_date,
           ms_status, COALESCE(ms_progress, 0), 1, COALESCE(sp.sort_order, 0),
           'jira', sp.jira_sprint_id, sp.id::text);
      ELSE
        UPDATE public.strata_milestones
           SET baseline_start = COALESCE(sp.start_date, baseline_start),
               baseline_end = COALESCE(sp.end_date, sp.target_date, baseline_end),
               forecast_date = COALESCE(sp.target_date, forecast_date),
               actual_date = COALESCE(sp.actual_date, actual_date),
               status = ms_status,
               progress = COALESCE(ms_progress, progress),
               source_system = COALESCE(source_system, 'jira'),
               source_reference_key = COALESCE(source_reference_key, sp.jira_sprint_id),
               source_issue_id = COALESCE(source_issue_id, sp.id::text),
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
  'Jira connector (F-GOV-010): syncs the platform ph_jira mirror into source-agnostic strata_project_cards + strata_milestones (with source_system/source_reference_key/source_issue_id) with run log, lineage and audit. Idempotent by source key. Dependency import deferred — no ph_jira_* issue-link source table exists.';
