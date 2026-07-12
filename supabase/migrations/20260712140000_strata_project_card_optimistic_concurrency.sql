-- ---------------------------------------------------------------------------
-- CAT-STRATA-V6QA-20260712-001 — Wave 2 · V6-OPEN-033
--
-- Optimistic-concurrency control on strata_update_project_card. Previously the
-- RPC did an unconditional UPDATE ... WHERE id = p_project with no version check,
-- so a second (stale) tab's save silently clobbered the first with no conflict —
-- last-writer-wins, and the loser never knew.
--
-- This adds a trailing param p_expected_updated_at (the row's updated_at captured
-- when the edit form opened). When supplied, a stale write is rejected with a
-- business-facing message; when NULL (system/import callers) behaviour is
-- unchanged. Two layers: an early check off the already-SELECTed row for a clean
-- message, plus a WHERE-clause guard on the UPDATE to close the SELECT→UPDATE race.
--
-- Adding a parameter changes the function signature, so this is DROP + CREATE
-- (not CREATE OR REPLACE, which would leave a second overload and make PostgREST
-- ambiguous). The body is carried forward verbatim from 20260712130000 (the 027/029
-- guards) with only the concurrency additions. Import-path callers
-- (strata_execution_import_*) PERFORM this with the old arg list and default the
-- new param away — non-breaking.
--
-- Unapplied (D-1) — Vikram/release applies. Rollback = re-apply 20260712130000.
--
-- FOLLOW-UP (not in this slice): the same unconditional-UPDATE shape exists on
-- strata_update_milestone and strata_update_risk; acceptance #6 wants the same
-- contract there. Tracked for a fast-follow — the pattern below is the template.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.strata_update_project_card(
  uuid, text, uuid, text, numeric, date, date, date, text, text, text, text,
  boolean, boolean, uuid, text, uuid, text, text, text, text, text, uuid, text,
  text, jsonb, boolean, boolean, boolean
);

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
  p_clear_business_owner boolean DEFAULT false,
  p_expected_updated_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record; nbs date; nbe date; n_theme uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'archived project cards cannot be edited'; END IF;
  -- V6-OPEN-033: reject a stale write up-front with a clean, business-facing message.
  IF p_expected_updated_at IS NOT NULL AND pc.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'This project card was changed by someone else after you opened it. Refresh to load the latest version, then reapply your changes.';
  END IF;
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
  -- V6-OPEN-027: the update must never leave the card without a Strategic Theme.
  n_theme := CASE WHEN p_clear_theme THEN NULL ELSE COALESCE(p_theme, pc.theme_id) END;
  IF n_theme IS NULL THEN
    RAISE EXCEPTION 'a Strategic Theme is required; it cannot be removed from a project card';
  END IF;
  -- V6-OPEN-029: a rename must not collide with another non-archived card in the
  -- same cycle (cycle derived from the resulting Theme).
  IF p_name IS NOT NULL AND btrim(p_name) <> '' THEN
    IF EXISTS (
      SELECT 1
        FROM public.strata_project_cards pc2
        JOIN public.strata_strategy_elements te2 ON te2.id = pc2.theme_id
       WHERE pc2.id <> p_project
         AND pc2.stage <> 'archived'
         AND lower(btrim(pc2.name)) = lower(btrim(p_name))
         AND te2.cycle_id = (SELECT cycle_id FROM public.strata_strategy_elements WHERE id = n_theme)
    ) THEN
      RAISE EXCEPTION 'a project card named "%" already exists in this cycle', btrim(p_name);
    END IF;
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
         theme_id = n_theme,
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
   WHERE id = p_project
     -- Close the SELECT→UPDATE race: if another tx bumped updated_at between our
     -- SELECT and this UPDATE, match 0 rows and raise below.
     AND (p_expected_updated_at IS NULL OR updated_at = p_expected_updated_at);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This project card was changed by someone else after you opened it. Refresh to load the latest version, then reapply your changes.';
  END IF;

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
