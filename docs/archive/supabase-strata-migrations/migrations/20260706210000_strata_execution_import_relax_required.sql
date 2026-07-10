-- ============================================================================
-- STRATA Execution import — relax required-field validation for real-world
-- (Jira-style single-sheet) source files; add non-blocking warnings.
-- CAT-STRATA-20260705-001 · Session 009 (Execution Excel Import v2)
--
-- Owner feedback: a real "Jira (13).xls" export was rejected outright because
-- it has no Strategic Theme / Business Owner / Project Manager / Lead Business
-- Unit / Delivery Team / Scope Description / Target Outcomes / Success
-- Criteria / Dependency Description / Requesting Project-Team / Impact Note
-- columns at all — fields the v1 RPC treated as hard-required for every row.
-- Real-world exports must not be rejected wholesale for missing fields that
-- were never part of the source system's data model.
--
-- Changes (same function signature — CREATE OR REPLACE only, no arity change):
-- 1. Project Cards: Strategic Theme, Business Owner, Project Manager, Lead
--    Business Unit, Delivery Team, Scope Description, Target Outcomes,
--    Success Criteria become OPTIONAL (blank allowed, resolves to NULL).
--    theme_id is already a nullable FK — an unthemed card is a real, already-
--    supported state (the existing "Unassigned Strategic Theme" bucket).
-- 2. Dependencies: Description, Requesting Project/Team, Serving Department/
--    Team, Owner, Impact Note become OPTIONAL; Blocker defaults to false when
--    blank (was hard-required with no default).
-- 3. Owner-name resolution (Business Owner/Project Manager/Milestone Owner/
--    Dependency Owner) on a NON-BLANK value that matches zero users is now a
--    WARNING, not a row-rejecting error — real "Leading Department"-style
--    values will essentially never match a person's name. A value matching
--    2+ users remains a hard error (genuine ambiguity is never guessed).
-- 4. Every row result now carries a `warnings` array alongside `errors`, so
--    a row can be `status: valid` with warnings the UI surfaces but does not
--    block on.
-- 5. Fixed a latent record-reuse bug: `v_owner_match`/`v_pm_match` (Project
--    Cards pass) were never reset between loop iterations. Harmless in v1
--    because a blank owner was already rejected before the match step ran;
--    with owners now optional, a blank owner on row N would otherwise
--    silently inherit row N-1's matched profile. Now explicitly reset to
--    NULL at the top of every iteration (matching the pattern already used
--    in the Milestones/Dependencies passes).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.strata_import_execution_batch(
  p_project_cards jsonb DEFAULT '[]'::jsonb,
  p_milestones jsonb DEFAULT '[]'::jsonb,
  p_dependencies jsonb DEFAULT '[]'::jsonb,
  p_dry_run boolean DEFAULT true,
  p_file_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run_id uuid;
  v_row jsonb;
  v_idx int;
  v_errors text[];
  v_warnings text[];
  v_valid_card_refs text[] := ARRAY[]::text[];
  v_seen text[];
  v_card_results jsonb := '[]'::jsonb;
  v_milestone_results jsonb := '[]'::jsonb;
  v_dependency_results jsonb := '[]'::jsonb;
  v_cards_created int := 0; v_cards_updated int := 0; v_cards_rejected int := 0;
  v_ms_created int := 0; v_ms_updated int := 0; v_ms_rejected int := 0;
  v_dep_created int := 0; v_dep_updated int := 0; v_dep_rejected int := 0;
  -- per-row scratch
  v_ref text; v_name text; v_theme_name text; v_theme_id uuid;
  v_business_owner text; v_pm text; v_lbu text; v_dteam text; v_status_raw text; v_status text;
  v_bs date; v_be date; v_scope text; v_outcomes text; v_success text;
  v_owner_match record; v_pm_match record;
  v_existing_card uuid; v_card_id uuid; v_action text;
  v_ms_owner text; v_ms_fe date; v_ms_ae date; v_ms_progress numeric; v_ms_weight numeric;
  v_ms_id uuid; v_existing_ms uuid;
  v_dep_desc text; v_dep_req text; v_dep_serving text; v_dep_owner text; v_dep_blocker boolean;
  v_dep_impact text; v_dep_id uuid; v_existing_dep uuid;
  v_project_card_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'importing Execution data requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;

  IF NOT p_dry_run THEN
    INSERT INTO public.strata_upload_runs (channel, initiated_by, file_name, row_count_raw, status)
    VALUES ('excel', auth.uid(), p_file_name,
            jsonb_array_length(coalesce(p_project_cards,'[]'::jsonb))
              + jsonb_array_length(coalesce(p_milestones,'[]'::jsonb))
              + jsonb_array_length(coalesce(p_dependencies,'[]'::jsonb)),
            'writing')
    RETURNING id INTO v_run_id;
  END IF;

  -- =========================================================================
  -- Pass 1 — Project Cards
  -- =========================================================================
  v_seen := ARRAY[]::text[];
  FOR v_row, v_idx IN SELECT value, ordinality::int FROM jsonb_array_elements(coalesce(p_project_cards, '[]'::jsonb)) WITH ORDINALITY LOOP
    v_errors := ARRAY[]::text[];
    v_warnings := ARRAY[]::text[];
    v_owner_match := NULL;
    v_pm_match := NULL;
    v_ref := nullif(btrim(coalesce(v_row->>'referenceId', '')), '');
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_theme_name := nullif(btrim(coalesce(v_row->>'strategicTheme', '')), '');
    v_business_owner := nullif(btrim(coalesce(v_row->>'businessOwner', '')), '');
    v_pm := nullif(btrim(coalesce(v_row->>'projectManager', '')), '');
    v_lbu := nullif(btrim(coalesce(v_row->>'leadBusinessUnit', '')), '');
    v_dteam := nullif(btrim(coalesce(v_row->>'deliveryTeam', '')), '');
    v_status_raw := nullif(btrim(coalesce(v_row->>'deliveryStatus', '')), '');
    v_scope := nullif(btrim(coalesce(v_row->>'scopeDescription', '')), '');
    v_outcomes := nullif(btrim(coalesce(v_row->>'targetOutcomes', '')), '');
    v_success := nullif(btrim(coalesce(v_row->>'successCriteria', '')), '');

    -- Hard-required: identity, dates, status. Everything else is optional —
    -- real-world source files (Jira exports) frequently lack Strategic Theme /
    -- Business Owner / Project Manager / Lead Business Unit / Delivery Team /
    -- Scope Description / Target Outcomes / Success Criteria entirely.
    IF v_ref IS NULL THEN v_errors := array_append(v_errors, 'Project Reference ID is required'); END IF;
    IF v_name IS NULL THEN v_errors := array_append(v_errors, 'Project Name is required'); END IF;
    IF v_status_raw IS NULL THEN v_errors := array_append(v_errors, 'Delivery Status is required'); END IF;

    v_bs := public.strata_safe_date(v_row->>'baselineStart');
    v_be := public.strata_safe_date(v_row->>'baselineEnd');
    IF nullif(btrim(coalesce(v_row->>'baselineStart','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline Start Date is required');
    ELSIF v_bs IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline Start Date "%s" is not a valid date', v_row->>'baselineStart'));
    END IF;
    IF nullif(btrim(coalesce(v_row->>'baselineEnd','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline End Date is required');
    ELSIF v_be IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline End Date "%s" is not a valid date', v_row->>'baselineEnd'));
    END IF;
    IF v_bs IS NOT NULL AND v_be IS NOT NULL AND v_be <= v_bs THEN
      v_errors := array_append(v_errors, 'Baseline End Date must be after Baseline Start Date');
    END IF;

    IF v_ref IS NOT NULL THEN
      IF v_ref = ANY(v_seen) THEN
        v_errors := array_append(v_errors, format('Duplicate Project Reference ID "%s" within this file', v_ref));
      ELSE
        v_seen := array_append(v_seen, v_ref);
      END IF;
    END IF;

    -- Strategic Theme: optional. If a value IS supplied (per-row or via a
    -- batch default applied client-side before this call) but doesn't match
    -- a configured theme, that is still a hard error — themes are never
    -- auto-created. A genuinely blank theme resolves to NULL (the existing,
    -- already-supported "Unassigned Strategic Theme" state).
    v_theme_id := NULL;
    IF v_theme_name IS NOT NULL THEN
      SELECT id INTO v_theme_id FROM public.strata_strategy_elements
       WHERE element_type = 'theme' AND lower(btrim(name)) = lower(v_theme_name) LIMIT 1;
      IF v_theme_id IS NULL THEN
        v_errors := array_append(v_errors, format('Strategic Theme "%s" does not match any configured theme — themes are not auto-created', v_theme_name));
      END IF;
    END IF;

    IF v_business_owner IS NOT NULL THEN
      SELECT * INTO v_owner_match FROM public.strata_resolve_profile_by_name(v_business_owner);
      IF v_owner_match.match_count = 0 THEN
        v_warnings := array_append(v_warnings, format('Business Owner "%s" did not match any user — left blank', v_business_owner));
      ELSIF v_owner_match.match_count > 1 THEN
        v_errors := array_append(v_errors, format('Business Owner "%s" matches %s users — ambiguous', v_business_owner, v_owner_match.match_count));
      END IF;
    END IF;
    IF v_pm IS NOT NULL THEN
      SELECT * INTO v_pm_match FROM public.strata_resolve_profile_by_name(v_pm);
      IF v_pm_match.match_count = 0 THEN
        v_warnings := array_append(v_warnings, format('Project Manager "%s" did not match any user — left blank', v_pm));
      ELSIF v_pm_match.match_count > 1 THEN
        v_errors := array_append(v_errors, format('Project Manager "%s" matches %s users — ambiguous', v_pm, v_pm_match.match_count));
      END IF;
    END IF;

    v_status := NULL;
    IF v_status_raw IS NOT NULL THEN
      v_status := public.strata_resolve_picklist_value('delivery_status', v_status_raw);
      IF v_status IS NULL THEN
        v_errors := array_append(v_errors, format('Delivery Status "%s" is not a configured value', v_status_raw));
      END IF;
    END IF;

    IF array_length(v_errors, 1) > 0 THEN
      v_cards_rejected := v_cards_rejected + 1;
      v_card_results := v_card_results || jsonb_build_object(
        'row_number', v_idx, 'reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(v_errors), 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    v_valid_card_refs := array_append(v_valid_card_refs, v_ref);
    SELECT id INTO v_existing_card FROM public.strata_project_cards WHERE reference_id = v_ref;
    v_action := CASE WHEN v_existing_card IS NULL THEN 'create' ELSE 'update' END;

    IF p_dry_run THEN
      v_cards_created := v_cards_created + CASE WHEN v_action = 'create' THEN 1 ELSE 0 END;
      v_cards_updated := v_cards_updated + CASE WHEN v_action = 'update' THEN 1 ELSE 0 END;
      v_card_results := v_card_results || jsonb_build_object(
        'row_number', v_idx, 'reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    BEGIN
      IF v_existing_card IS NULL THEN
        v_card_id := public.strata_create_project_card(
          p_name := v_name, p_source_system := 'upload', p_source_key := v_ref,
          p_pm := v_pm_match.matched_id, p_stage := v_status, p_theme := v_theme_id,
          p_business_owner := v_owner_match.matched_id, p_lead_business_unit := v_lbu, p_delivery_team := v_dteam,
          p_baseline_start := v_bs, p_baseline_end := v_be,
          p_scope_description := v_scope, p_target_outcomes := v_outcomes, p_success_criteria := v_success);
        UPDATE public.strata_project_cards SET reference_id = v_ref WHERE id = v_card_id;
        v_cards_created := v_cards_created + 1;
      ELSE
        PERFORM public.strata_update_project_card(
          p_project := v_existing_card, p_name := v_name, p_pm := v_pm_match.matched_id,
          p_stage := v_status, p_theme := v_theme_id,
          p_business_owner := v_owner_match.matched_id, p_lead_business_unit := v_lbu, p_delivery_team := v_dteam,
          p_baseline_start := v_bs, p_baseline_end := v_be,
          p_scope_description := v_scope, p_target_outcomes := v_outcomes, p_success_criteria := v_success);
        v_card_id := v_existing_card;
        v_cards_updated := v_cards_updated + 1;
      END IF;

      INSERT INTO public.strata_lineage_records (entity_table, entity_id, upload_run_id, written_by, config_context)
      VALUES ('strata_project_cards', v_card_id, v_run_id, auth.uid(),
              jsonb_build_object('source_system', 'upload', 'import_method', 'manual_excel', 'row_number', v_idx, 'reference_id', v_ref));

      v_card_results := v_card_results || jsonb_build_object(
        'row_number', v_idx, 'reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'id', v_card_id, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
    EXCEPTION WHEN OTHERS THEN
      v_cards_rejected := v_cards_rejected + 1;
      v_card_results := v_card_results || jsonb_build_object(
        'row_number', v_idx, 'reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(ARRAY[SQLERRM]), 'warnings', to_jsonb(v_warnings));
    END;
  END LOOP;

  -- =========================================================================
  -- Pass 2 — Milestones
  -- =========================================================================
  v_seen := ARRAY[]::text[];
  FOR v_row, v_idx IN SELECT value, ordinality::int FROM jsonb_array_elements(coalesce(p_milestones, '[]'::jsonb)) WITH ORDINALITY LOOP
    v_errors := ARRAY[]::text[];
    v_warnings := ARRAY[]::text[];
    v_owner_match := NULL;
    v_ref := nullif(btrim(coalesce(v_row->>'projectReferenceId', '')), '');
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_ms_owner := nullif(btrim(coalesce(v_row->>'owner', '')), '');
    v_status_raw := nullif(btrim(coalesce(v_row->>'status', '')), '');

    IF v_ref IS NULL THEN v_errors := array_append(v_errors, 'Project Reference ID is required'); END IF;
    IF v_name IS NULL THEN v_errors := array_append(v_errors, 'Milestone Name is required'); END IF;
    IF v_status_raw IS NULL THEN v_errors := array_append(v_errors, 'Status is required'); END IF;

    IF v_ref IS NOT NULL AND NOT (v_ref = ANY(v_valid_card_refs) OR EXISTS (SELECT 1 FROM public.strata_project_cards WHERE reference_id = v_ref)) THEN
      v_errors := array_append(v_errors, format('Project Reference ID "%s" was not found — check the Project Cards sheet', v_ref));
    END IF;

    IF v_ref IS NOT NULL AND v_name IS NOT NULL THEN
      IF (v_ref || '::' || lower(v_name)) = ANY(v_seen) THEN
        v_errors := array_append(v_errors, format('Duplicate Milestone "%s" for Project Reference ID "%s" within this file', v_name, v_ref));
      ELSE
        v_seen := array_append(v_seen, v_ref || '::' || lower(v_name));
      END IF;
    END IF;

    v_bs := public.strata_safe_date(v_row->>'baselineStart');
    v_be := public.strata_safe_date(v_row->>'baselineEnd');
    IF nullif(btrim(coalesce(v_row->>'baselineStart','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline Start Date is required');
    ELSIF v_bs IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline Start Date "%s" is not a valid date', v_row->>'baselineStart'));
    END IF;
    IF nullif(btrim(coalesce(v_row->>'baselineEnd','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline End Date is required');
    ELSIF v_be IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline End Date "%s" is not a valid date', v_row->>'baselineEnd'));
    END IF;
    -- Forecast/Actual End Date: optional (D-017) — a milestone may not yet have either.
    v_ms_fe := public.strata_safe_date(v_row->>'forecastEnd');
    IF nullif(btrim(coalesce(v_row->>'forecastEnd','')),'') IS NOT NULL AND v_ms_fe IS NULL THEN
      v_errors := array_append(v_errors, format('Forecast End Date "%s" is not a valid date', v_row->>'forecastEnd'));
    END IF;
    v_ms_ae := public.strata_safe_date(v_row->>'actualEnd');
    IF nullif(btrim(coalesce(v_row->>'actualEnd','')),'') IS NOT NULL AND v_ms_ae IS NULL THEN
      v_errors := array_append(v_errors, format('Actual End Date "%s" is not a valid date', v_row->>'actualEnd'));
    END IF;

    v_status := NULL;
    IF v_status_raw IS NOT NULL THEN
      v_status := public.strata_resolve_picklist_value('milestone_status', v_status_raw);
      IF v_status IS NULL THEN
        v_errors := array_append(v_errors, format('Status "%s" is not a configured milestone status', v_status_raw));
      END IF;
    END IF;

    v_ms_progress := public.strata_safe_numeric(v_row->>'progress');
    IF nullif(btrim(coalesce(v_row->>'progress','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Progress % is required');
    ELSIF v_ms_progress IS NULL OR v_ms_progress < 0 OR v_ms_progress > 100 THEN
      v_errors := array_append(v_errors, format('Progress %% "%s" must be a number between 0 and 100', v_row->>'progress'));
    END IF;

    v_ms_weight := public.strata_safe_numeric(v_row->>'weight');
    IF nullif(btrim(coalesce(v_row->>'weight','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Weight is required');
    ELSIF v_ms_weight IS NULL OR v_ms_weight <= 0 THEN
      v_errors := array_append(v_errors, format('Weight "%s" must be a number greater than 0', v_row->>'weight'));
    END IF;

    IF v_ms_owner IS NOT NULL THEN
      SELECT * INTO v_owner_match FROM public.strata_resolve_profile_by_name(v_ms_owner);
      IF v_owner_match.match_count = 0 THEN
        v_warnings := array_append(v_warnings, format('Milestone Owner "%s" did not match any user — left blank', v_ms_owner));
      ELSIF v_owner_match.match_count > 1 THEN
        v_errors := array_append(v_errors, format('Milestone Owner "%s" matches %s users — ambiguous', v_ms_owner, v_owner_match.match_count));
      END IF;
    END IF;

    IF array_length(v_errors, 1) > 0 THEN
      v_ms_rejected := v_ms_rejected + 1;
      v_milestone_results := v_milestone_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(v_errors), 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    SELECT id INTO v_project_card_id FROM public.strata_project_cards WHERE reference_id = v_ref;
    SELECT id INTO v_existing_ms FROM public.strata_milestones WHERE project_card_id = v_project_card_id AND lower(name) = lower(v_name);
    v_action := CASE WHEN v_existing_ms IS NULL THEN 'create' ELSE 'update' END;

    IF p_dry_run THEN
      v_ms_created := v_ms_created + CASE WHEN v_action = 'create' THEN 1 ELSE 0 END;
      v_ms_updated := v_ms_updated + CASE WHEN v_action = 'update' THEN 1 ELSE 0 END;
      v_milestone_results := v_milestone_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    BEGIN
      IF v_project_card_id IS NULL THEN
        -- Parent card row itself failed validation this run and was not (re-)resolved above.
        RAISE EXCEPTION 'Project Reference ID "%" has no resolvable Project Card', v_ref;
      END IF;
      IF v_existing_ms IS NULL THEN
        v_ms_id := public.strata_create_milestone(
          p_project := v_project_card_id, p_name := v_name, p_owner := v_owner_match.matched_id,
          p_baseline_start := v_bs, p_baseline_end := v_be, p_forecast_date := v_ms_fe, p_actual_date := v_ms_ae,
          p_status := v_status, p_progress := v_ms_progress, p_weight := v_ms_weight,
          p_source_system := 'upload');
        v_ms_created := v_ms_created + 1;
      ELSE
        PERFORM public.strata_update_milestone(
          p_milestone := v_existing_ms, p_name := v_name, p_owner := v_owner_match.matched_id,
          p_baseline_start := v_bs, p_baseline_end := v_be, p_forecast_date := v_ms_fe, p_actual_date := v_ms_ae,
          p_status := v_status, p_progress := v_ms_progress, p_weight := v_ms_weight,
          p_source_system := 'upload');
        v_ms_id := v_existing_ms;
        v_ms_updated := v_ms_updated + 1;
      END IF;

      INSERT INTO public.strata_lineage_records (entity_table, entity_id, upload_run_id, written_by, config_context)
      VALUES ('strata_milestones', v_ms_id, v_run_id, auth.uid(),
              jsonb_build_object('source_system', 'upload', 'import_method', 'manual_excel', 'row_number', v_idx, 'project_reference_id', v_ref));

      v_milestone_results := v_milestone_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'id', v_ms_id, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
    EXCEPTION WHEN OTHERS THEN
      v_ms_rejected := v_ms_rejected + 1;
      v_milestone_results := v_milestone_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(ARRAY[SQLERRM]), 'warnings', to_jsonb(v_warnings));
    END;
  END LOOP;

  -- =========================================================================
  -- Pass 3 — Delivery Dependencies
  -- =========================================================================
  v_seen := ARRAY[]::text[];
  FOR v_row, v_idx IN SELECT value, ordinality::int FROM jsonb_array_elements(coalesce(p_dependencies, '[]'::jsonb)) WITH ORDINALITY LOOP
    v_errors := ARRAY[]::text[];
    v_warnings := ARRAY[]::text[];
    v_owner_match := NULL;
    v_ref := nullif(btrim(coalesce(v_row->>'projectReferenceId', '')), '');
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_dep_desc := nullif(btrim(coalesce(v_row->>'description', '')), '');
    v_dep_req := nullif(btrim(coalesce(v_row->>'requestingProjectOrTeam', '')), '');
    v_dep_serving := nullif(btrim(coalesce(v_row->>'servingDepartmentOrTeam', '')), '');
    v_status_raw := nullif(btrim(coalesce(v_row->>'status', '')), '');
    v_dep_owner := nullif(btrim(coalesce(v_row->>'owner', '')), '');
    v_dep_impact := nullif(btrim(coalesce(v_row->>'impactNote', '')), '');

    -- Hard-required: identity, dates, status. Description/Requesting/Serving/
    -- Owner/Impact Note/Blocker are optional — real source files frequently
    -- lack them entirely.
    IF v_ref IS NULL THEN v_errors := array_append(v_errors, 'Project Reference ID is required'); END IF;
    IF v_name IS NULL THEN v_errors := array_append(v_errors, 'Dependency Name is required'); END IF;
    IF v_status_raw IS NULL THEN v_errors := array_append(v_errors, 'Status is required'); END IF;

    IF v_ref IS NOT NULL AND NOT (v_ref = ANY(v_valid_card_refs) OR EXISTS (SELECT 1 FROM public.strata_project_cards WHERE reference_id = v_ref)) THEN
      v_errors := array_append(v_errors, format('Project Reference ID "%s" was not found — check the Project Cards sheet', v_ref));
    END IF;

    IF v_ref IS NOT NULL AND v_name IS NOT NULL THEN
      IF (v_ref || '::' || lower(v_name)) = ANY(v_seen) THEN
        v_errors := array_append(v_errors, format('Duplicate Dependency "%s" for Project Reference ID "%s" within this file', v_name, v_ref));
      ELSE
        v_seen := array_append(v_seen, v_ref || '::' || lower(v_name));
      END IF;
    END IF;

    v_bs := public.strata_safe_date(v_row->>'baselineStart');
    v_be := public.strata_safe_date(v_row->>'baselineEnd');
    IF nullif(btrim(coalesce(v_row->>'baselineStart','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline Start Date is required');
    ELSIF v_bs IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline Start Date "%s" is not a valid date', v_row->>'baselineStart'));
    END IF;
    IF nullif(btrim(coalesce(v_row->>'baselineEnd','')),'') IS NULL THEN
      v_errors := array_append(v_errors, 'Baseline End Date is required');
    ELSIF v_be IS NULL THEN
      v_errors := array_append(v_errors, format('Baseline End Date "%s" is not a valid date', v_row->>'baselineEnd'));
    END IF;

    v_status := NULL;
    IF v_status_raw IS NOT NULL THEN
      v_status := public.strata_resolve_picklist_value('dependency_status', v_status_raw);
      IF v_status IS NULL THEN
        v_errors := array_append(v_errors, format('Status "%s" is not a configured dependency status', v_status_raw));
      END IF;
    END IF;

    -- Blocker: optional, defaults to false when blank. Garbage (non-boolean-
    -- looking) input is still a hard error — that is a format problem, not
    -- an absence problem.
    IF nullif(btrim(coalesce(v_row->>'blocker','')),'') IS NULL THEN
      v_dep_blocker := false;
    ELSIF lower(btrim(v_row->>'blocker')) NOT IN ('true','false','yes','no','y','n','1','0') THEN
      v_errors := array_append(v_errors, format('Blocker "%s" must be Yes/No or True/False', v_row->>'blocker'));
      v_dep_blocker := false;
    ELSE
      v_dep_blocker := lower(btrim(v_row->>'blocker')) IN ('true','yes','y','1');
    END IF;

    IF v_dep_owner IS NOT NULL THEN
      SELECT * INTO v_owner_match FROM public.strata_resolve_profile_by_name(v_dep_owner);
      IF v_owner_match.match_count = 0 THEN
        v_warnings := array_append(v_warnings, format('Owner "%s" did not match any user — left blank', v_dep_owner));
      ELSIF v_owner_match.match_count > 1 THEN
        v_errors := array_append(v_errors, format('Owner "%s" matches %s users — ambiguous', v_dep_owner, v_owner_match.match_count));
      END IF;
    END IF;

    IF array_length(v_errors, 1) > 0 THEN
      v_dep_rejected := v_dep_rejected + 1;
      v_dependency_results := v_dependency_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(v_errors), 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    SELECT id INTO v_project_card_id FROM public.strata_project_cards WHERE reference_id = v_ref;
    SELECT id INTO v_existing_dep FROM public.strata_dependencies
     WHERE requesting_type = 'project_card' AND requesting_id = v_project_card_id AND lower(name) = lower(v_name);
    v_action := CASE WHEN v_existing_dep IS NULL THEN 'create' ELSE 'update' END;

    IF p_dry_run THEN
      v_dep_created := v_dep_created + CASE WHEN v_action = 'create' THEN 1 ELSE 0 END;
      v_dep_updated := v_dep_updated + CASE WHEN v_action = 'update' THEN 1 ELSE 0 END;
      v_dependency_results := v_dependency_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
      CONTINUE;
    END IF;

    BEGIN
      IF v_project_card_id IS NULL THEN
        RAISE EXCEPTION 'Project Reference ID "%" has no resolvable Project Card', v_ref;
      END IF;
      IF v_existing_dep IS NULL THEN
        v_dep_id := public.strata_create_dependency(
          p_requesting_type := 'project_card', p_requesting_id := v_project_card_id,
          p_serving_type := 'external', p_serving_label := coalesce(v_dep_serving, 'Unspecified'),
          p_dependency_type := 'delivery', p_status := v_status, p_is_blocker := v_dep_blocker,
          p_impact := v_dep_impact, p_description := v_dep_desc, p_owner := v_owner_match.matched_id,
          p_baseline_start := v_bs, p_baseline_end := v_be, p_source_system := 'upload');
        UPDATE public.strata_dependencies SET name = v_name WHERE id = v_dep_id;
        v_dep_created := v_dep_created + 1;
      ELSE
        PERFORM public.strata_update_dependency(
          p_dependency := v_existing_dep, p_status := v_status, p_is_blocker := v_dep_blocker,
          p_serving_label := v_dep_serving, p_impact := v_dep_impact, p_description := v_dep_desc,
          p_owner := v_owner_match.matched_id, p_baseline_start := v_bs, p_baseline_end := v_be,
          p_source_system := 'upload');
        UPDATE public.strata_dependencies SET name = v_name WHERE id = v_existing_dep;
        v_dep_id := v_existing_dep;
        v_dep_updated := v_dep_updated + 1;
      END IF;

      INSERT INTO public.strata_lineage_records (entity_table, entity_id, upload_run_id, written_by, config_context)
      VALUES ('strata_dependencies', v_dep_id, v_run_id, auth.uid(),
              jsonb_build_object('source_system', 'upload', 'import_method', 'manual_excel', 'row_number', v_idx,
                                  'project_reference_id', v_ref, 'requesting_project_or_team', v_dep_req));

      v_dependency_results := v_dependency_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'valid', 'action', v_action, 'id', v_dep_id, 'errors', '[]'::jsonb, 'warnings', to_jsonb(v_warnings));
    EXCEPTION WHEN OTHERS THEN
      v_dep_rejected := v_dep_rejected + 1;
      v_dependency_results := v_dependency_results || jsonb_build_object(
        'row_number', v_idx, 'project_reference_id', v_ref, 'name', v_name,
        'status', 'error', 'action', NULL, 'errors', to_jsonb(ARRAY[SQLERRM]), 'warnings', to_jsonb(v_warnings));
    END;
  END LOOP;

  IF NOT p_dry_run THEN
    UPDATE public.strata_upload_runs
       SET status = 'completed',
           row_count_valid = (v_cards_created + v_cards_updated + v_ms_created + v_ms_updated + v_dep_created + v_dep_updated),
           row_count_rejected = (v_cards_rejected + v_ms_rejected + v_dep_rejected),
           completed_at = now(), updated_at = now()
     WHERE id = v_run_id;

    INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
    VALUES ('strata_upload_runs', v_run_id, 'RPC:import_execution_batch', auth.uid(),
            format('manual Excel import: cards %s created/%s updated/%s rejected · milestones %s/%s/%s · dependencies %s/%s/%s',
                   v_cards_created, v_cards_updated, v_cards_rejected,
                   v_ms_created, v_ms_updated, v_ms_rejected,
                   v_dep_created, v_dep_updated, v_dep_rejected));
  END IF;

  RETURN jsonb_build_object(
    'run_id', v_run_id, 'dry_run', p_dry_run,
    'project_cards', v_card_results, 'milestones', v_milestone_results, 'dependencies', v_dependency_results,
    'summary', jsonb_build_object(
      'project_cards', jsonb_build_object('total', jsonb_array_length(coalesce(p_project_cards,'[]'::jsonb)), 'created', v_cards_created, 'updated', v_cards_updated, 'rejected', v_cards_rejected),
      'milestones', jsonb_build_object('total', jsonb_array_length(coalesce(p_milestones,'[]'::jsonb)), 'created', v_ms_created, 'updated', v_ms_updated, 'rejected', v_ms_rejected),
      'dependencies', jsonb_build_object('total', jsonb_array_length(coalesce(p_dependencies,'[]'::jsonb)), 'created', v_dep_created, 'updated', v_dep_updated, 'rejected', v_dep_rejected)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.strata_import_execution_batch(jsonb, jsonb, jsonb, boolean, text) IS
  'Manual Excel/CSV import for STRATA Execution (Project Cards / Milestones / Delivery Dependencies), Project Card-centric model. Only Project Reference ID / Name / Status / Baseline dates are hard-required — Strategic Theme, owner fields, and descriptive text are optional to support real-world (Jira-style) exports; owner-name mismatches are warnings, not errors. p_dry_run=true previews validation with zero writes; p_dry_run=false commits via the existing single-row create/update RPCs, writing strata_upload_runs/strata_lineage_records (source_system=upload, import_method=manual_excel)/strata_audit_events. Idempotent: re-running the same file updates existing rows (matched by Project Reference ID / project+milestone-name / project+dependency-name) instead of duplicating them.';
