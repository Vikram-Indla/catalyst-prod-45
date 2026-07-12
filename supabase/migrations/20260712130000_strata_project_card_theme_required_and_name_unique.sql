-- ---------------------------------------------------------------------------
-- CAT-STRATA-V6QA-20260712-001 — Wave 1 server enforcement
--
-- V6-OPEN-027 (Critical): every Project Card must belong to a Strategic Theme.
--   Create already validated the theme *type* when supplied but never required
--   one; Update let p_clear_theme / a null COALESCE result orphan the card.
--   Both RPCs now reject a null-theme result with a business-facing error.
--
-- V6-OPEN-029 (High): duplicate Project Card names were accepted within the same
--   cycle (slug auto-deduped, name did not). strata_project_cards has no cycle_id,
--   so "same cycle" is derived through the card's Theme
--   (theme_id -> strata_strategy_elements.cycle_id). Enforced here in the governed
--   write RPCs, normalized (lower + btrim), against non-archived cards only.
--
-- Enforcement lives in the RPCs — NOT a table trigger — deliberately: the health
-- engine (strata_calc_execution_progress) UPDATEs every card including any legacy
-- null-theme row, so a table-level NOT-NULL/theme trigger would break recalculation
-- of pre-existing orphans. The RPCs are the only governed authoring path.
--
-- Signatures are IDENTICAL to 20260706231000 — CREATE OR REPLACE only, no new
-- params, no dropped columns. Idempotent.
--
-- LIMITATIONS (for independent retest):
--  * A hard DB UNIQUE constraint for name-per-cycle is not added because the card
--    table carries no cycle_id; the RPC guard is the enforcement. A denormalized
--    cycle_id + partial unique index is the durable follow-up (tracked separately).
--  * The Excel import path (strata_execution_import_rpc) inserts directly and is
--    NOT covered here — that is STRATA-E2E-015 / Wave 5 scope.
--  * Pre-existing orphan (null-theme) and duplicate-name rows are REPORTED below
--    (RAISE NOTICE) for controlled repair; none are mutated (zero-assumption — we
--    will not guess a Theme or rename a business record).
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
  -- V6-OPEN-027: Strategic Theme is mandatory.
  IF p_theme IS NULL THEN
    RAISE EXCEPTION 'a Strategic Theme is required for every project card';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_strategy_elements WHERE id = p_theme AND element_type = 'theme'
  ) THEN
    RAISE EXCEPTION 'theme not found (must be a strategy element with element_type = theme)';
  END IF;
  -- V6-OPEN-029: normalized name must be unique within the same cycle (derived via
  -- the Theme's cycle) among non-archived cards.
  IF EXISTS (
    SELECT 1
      FROM public.strata_project_cards pc2
      JOIN public.strata_strategy_elements te2 ON te2.id = pc2.theme_id
     WHERE pc2.stage <> 'archived'
       AND lower(btrim(pc2.name)) = lower(btrim(p_name))
       AND te2.cycle_id = (SELECT cycle_id FROM public.strata_strategy_elements WHERE id = p_theme)
  ) THEN
    RAISE EXCEPTION 'a project card named "%" already exists in this cycle', btrim(p_name);
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
DECLARE pc record; nbs date; nbe date; n_theme uuid;
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
-- Reconciliation report (non-destructive). Surfaces pre-existing data that the
-- new guards would reject, for controlled manual repair. No rows are changed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE orphan_cnt int; dup_cnt int;
BEGIN
  SELECT count(*) INTO orphan_cnt
    FROM public.strata_project_cards
   WHERE theme_id IS NULL AND stage <> 'archived';

  SELECT count(*) INTO dup_cnt FROM (
    SELECT te.cycle_id, lower(btrim(pc.name)) AS n
      FROM public.strata_project_cards pc
      JOIN public.strata_strategy_elements te ON te.id = pc.theme_id
     WHERE pc.stage <> 'archived'
     GROUP BY te.cycle_id, lower(btrim(pc.name))
    HAVING count(*) > 1
  ) d;

  RAISE NOTICE 'V6-OPEN-027 reconciliation: % active project card(s) have no Strategic Theme and need controlled re-linking.', orphan_cnt;
  RAISE NOTICE 'V6-OPEN-029 reconciliation: % (cycle, normalized-name) group(s) contain duplicate active cards and need controlled rename/merge.', dup_cnt;
END;
$$;
