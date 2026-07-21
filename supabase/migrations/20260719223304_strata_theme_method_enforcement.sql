-- CAT-STRATA-THEMEMETHOD-20260720-001 — Theme measurement-method: governed server-side enforcement.
-- Mutual exclusivity is enforced in the DB/RPC layer (NOT UI-only). Depends on the schema migration
-- 20260720100000_strata_theme_measurement_method.sql (column measurement_method + backfill) applied first.
-- Semantic error codes (message-prefix convention): THEME_MEASUREMENT_METHOD_REQUIRED,
-- THEME_METHOD_DISALLOWS_OBJECTIVE, THEME_METHOD_DISALLOWS_OKR, THEME_METHOD_CHANGE_CONFLICT.

-- ===========================================================================
-- 1. strata_create_strategy_element — require a method for new Themes.
--    DROP+CREATE (adds p_measurement_method) to avoid a PostgREST overload with the old 5-arg signature.
-- ===========================================================================
DROP FUNCTION IF EXISTS public.strata_create_strategy_element(uuid, text, text, uuid, uuid);
CREATE OR REPLACE FUNCTION public.strata_create_strategy_element(
  p_cycle uuid,
  p_element_type text,
  p_name text,
  p_parent uuid DEFAULT NULL,
  p_perspective uuid DEFAULT NULL,
  p_measurement_method text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cyc record; parent_cycle uuid; new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a strategy element requires strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'element name is required'; END IF;
  IF p_element_type IS NULL OR btrim(p_element_type) = '' THEN RAISE EXCEPTION 'element_type is required'; END IF;

  -- Theme measurement method is REQUIRED and governed (CAT-STRATA-THEMEMETHOD-20260720-001).
  IF btrim(p_element_type) = 'theme' THEN
    IF p_measurement_method IS NULL OR btrim(p_measurement_method) NOT IN ('objectives_kpis','okrs') THEN
      RAISE EXCEPTION 'THEME_MEASUREMENT_METHOD_REQUIRED: a Strategic Theme must select a measurement method (objectives_kpis | okrs)';
    END IF;
  END IF;

  SELECT * INTO cyc FROM public.strata_cycles WHERE id = p_cycle;
  IF cyc IS NULL THEN RAISE EXCEPTION 'cycle not found'; END IF;
  IF cyc.status IN ('locked','closed') THEN
    RAISE EXCEPTION 'cycle % is %; new elements are not allowed', cyc.name, cyc.status;
  END IF;

  IF p_parent IS NOT NULL THEN
    SELECT cycle_id INTO parent_cycle FROM public.strata_strategy_elements WHERE id = p_parent;
    IF parent_cycle IS NULL THEN RAISE EXCEPTION 'parent element not found'; END IF;
    IF parent_cycle <> p_cycle THEN RAISE EXCEPTION 'parent element belongs to a different cycle'; END IF;
  END IF;

  IF p_perspective IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_perspectives WHERE id = p_perspective) THEN
    RAISE EXCEPTION 'perspective not found';
  END IF;

  INSERT INTO public.strata_strategy_elements
    (cycle_id, element_type, name, parent_id, perspective_id, stage, status, created_by, measurement_method)
  VALUES
    (p_cycle, btrim(p_element_type), btrim(p_name), p_parent, p_perspective, 'draft', 'draft', auth.uid(),
     CASE WHEN btrim(p_element_type) = 'theme' THEN btrim(p_measurement_method) ELSE NULL END)
  RETURNING id INTO new_id;

  -- SR-DEF-002: audit written once by trg_strata_strategy_elements_audit.
  RETURN new_id;
END;
$$;
COMMENT ON FUNCTION public.strata_create_strategy_element(uuid, text, text, uuid, uuid, text) IS
  'Creates a DRAFT strategy element. A Theme must declare a measurement method (objectives_kpis|okrs) — THEME_MEASUREMENT_METHOD_REQUIRED (CAT-STRATA-THEMEMETHOD-20260720-001). Audit written once by trg_strata_strategy_elements_audit.';
GRANT EXECUTE ON FUNCTION public.strata_create_strategy_element(uuid, text, text, uuid, uuid, text) TO authenticated;

-- ===========================================================================
-- 2. strata_validate_element_parent_type() — block Objective under an OKRs Theme (or unclassified Theme).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_validate_element_parent_type()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE parent_type text; parent_method text;
BEGIN
  IF NEW.context <> 'theme' THEN
    RETURN NEW;
  END IF;

  IF NEW.element_type = 'objective' AND NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'an Objective must be parented to a Theme';
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT element_type, measurement_method INTO parent_type, parent_method
      FROM public.strata_strategy_elements WHERE id = NEW.parent_id;
    IF parent_type IS NULL THEN
      RAISE EXCEPTION 'parent element not found';
    END IF;

    IF NEW.element_type = 'theme' AND parent_type = 'objective' THEN
      RAISE EXCEPTION 'a Theme cannot be parented under an Objective';
    END IF;

    IF NEW.element_type = 'objective' AND parent_type <> 'theme' THEN
      RAISE EXCEPTION 'an Objective must be parented directly to a Theme';
    END IF;

    -- Measurement-method mutual exclusivity: Objectives only under an objectives_kpis Theme.
    IF NEW.element_type = 'objective' AND parent_type = 'theme' THEN
      IF parent_method IS NULL THEN
        RAISE EXCEPTION 'THEME_MEASUREMENT_METHOD_REQUIRED: the parent Theme has no measurement method configured; classify it before adding Strategic Objectives';
      ELSIF parent_method = 'okrs' THEN
        RAISE EXCEPTION 'THEME_METHOD_DISALLOWS_OBJECTIVE: this Theme uses OKRs; Strategic Objectives cannot be created under it';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;
COMMENT ON FUNCTION public.strata_validate_element_parent_type() IS
  'Enforces the 2-tier Theme->Objective hierarchy AND measurement-method mutual exclusivity (Objectives only under an objectives_kpis Theme) for context=theme elements. CAT-STRATA-HIERARCHY-20260706-001 + CAT-STRATA-THEMEMETHOD-20260720-001.';

-- ===========================================================================
-- 3. strata_create_okr_v2 — block Theme-owned OKR under an objectives_kpis Theme (or unclassified Theme).
--    CREATE OR REPLACE (signature unchanged) — preserves all existing validation.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_create_okr_v2(
  p_theme uuid, p_name text, p_objective_statement text,
  p_cycle uuid DEFAULT NULL, p_owner uuid DEFAULT NULL, p_owning_org uuid DEFAULT NULL,
  p_commitment text DEFAULT 'committed', p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_theme record; v_cycle uuid; v_okr uuid; v_ver uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: creating an OKR requires strategy_office, okr_owner or admin'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'MISSING_NAME: OKR name is required'; END IF;
  IF p_objective_statement IS NULL OR btrim(p_objective_statement) = '' THEN
    RAISE EXCEPTION 'MISSING_OBJECTIVE_STATEMENT: a qualitative objective statement is required'; END IF;
  SELECT * INTO v_theme FROM public.strata_strategy_elements WHERE id = p_theme;
  IF v_theme.id IS NULL THEN RAISE EXCEPTION 'MISSING_THEME: theme not found'; END IF;
  IF v_theme.element_type <> 'theme' THEN
    RAISE EXCEPTION 'INVALID_THEME: an OKR must be created under a Strategic Theme, not a % element', v_theme.element_type; END IF;
  -- Measurement-method mutual exclusivity: Theme-owned OKRs only under an okrs Theme.
  IF v_theme.measurement_method IS NULL THEN
    RAISE EXCEPTION 'THEME_MEASUREMENT_METHOD_REQUIRED: the Theme has no measurement method configured; classify it before adding OKRs'; END IF;
  IF v_theme.measurement_method = 'objectives_kpis' THEN
    RAISE EXCEPTION 'THEME_METHOD_DISALLOWS_OKR: this Theme uses Objectives & KPIs; Theme-owned OKRs cannot be created under it'; END IF;
  IF p_commitment IS NOT NULL AND p_commitment NOT IN ('committed','aspirational') THEN
    RAISE EXCEPTION 'INVALID_OKR: commitment must be committed|aspirational'; END IF;
  IF p_owning_org IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_org_units WHERE id = p_owning_org) THEN
    RAISE EXCEPTION 'INVALID_OKR: owning organisation unit not found'; END IF;
  v_cycle := COALESCE(p_cycle, v_theme.cycle_id);
  INSERT INTO public.strata_okrs
    (theme_id, name, objective_statement, cycle_id, owner_id, owning_org_unit_id, commitment,
     start_period_id, period_id, end_period_id, status)
  VALUES
    (p_theme, p_name, p_objective_statement, v_cycle, p_owner, p_owning_org, p_commitment,
     p_start_period, p_start_period, p_end_period, 'draft')
  RETURNING id INTO v_okr;
  INSERT INTO public.strata_okr_versions
    (okr_id, version, status, objective_statement, theme_id, cycle_id, start_period_id, end_period_id,
     commitment, owner_id, owning_org_unit_id)
  VALUES
    (v_okr, 1, 'draft', p_objective_statement, p_theme, v_cycle, p_start_period, p_end_period,
     p_commitment, p_owner, p_owning_org)
  RETURNING id INTO v_ver;
  UPDATE public.strata_okrs SET current_version_id = v_ver WHERE id = v_okr;
  RETURN v_okr;
END; $function$;
COMMENT ON FUNCTION public.strata_create_okr_v2(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) IS
  'Create a Theme-owned OKR under an okrs-method Theme (THEME_METHOD_DISALLOWS_OKR otherwise). Preselects+locks the Theme; no child Strategy Objective/KPI required. CAT-STRATA-THEMEMETHOD-20260720-001.';
GRANT EXECUTE ON FUNCTION public.strata_create_okr_v2(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) TO authenticated;

-- ===========================================================================
-- 4. strata_update_element — governed, NON-DESTRUCTIVE measurement-method change.
--    DROP+CREATE (adds p_measurement_method) to avoid a PostgREST overload with the old 10-arg signature.
-- ===========================================================================
DROP FUNCTION IF EXISTS public.strata_update_element(uuid, text, text, uuid, uuid, uuid, text, int, boolean, boolean);
CREATE OR REPLACE FUNCTION public.strata_update_element(
  p_element uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_perspective uuid DEFAULT NULL,
  p_parent uuid DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_order_index int DEFAULT NULL,
  p_clear_parent boolean DEFAULT false,
  p_clear_owner boolean DEFAULT false,
  p_measurement_method text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE el record; walker uuid; hops int := 0; parent_cycle uuid; v_conflict int; v_method_changed boolean := false;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'updating a strategy element requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot be edited'; END IF;

  IF p_perspective IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_perspectives WHERE id = p_perspective) THEN
    RAISE EXCEPTION 'perspective not found';
  END IF;

  IF p_parent IS NOT NULL THEN
    IF p_parent = p_element THEN RAISE EXCEPTION 'element cannot be its own parent'; END IF;
    SELECT cycle_id INTO parent_cycle FROM public.strata_strategy_elements WHERE id = p_parent;
    IF parent_cycle IS NULL THEN RAISE EXCEPTION 'parent element not found'; END IF;
    IF parent_cycle <> el.cycle_id THEN RAISE EXCEPTION 'parent element belongs to a different cycle'; END IF;
    walker := p_parent;
    WHILE walker IS NOT NULL AND hops < 50 LOOP
      IF walker = p_element THEN RAISE EXCEPTION 'parent change would create a hierarchy loop'; END IF;
      SELECT parent_id INTO walker FROM public.strata_strategy_elements WHERE id = walker;
      hops := hops + 1;
    END LOOP;
  END IF;

  -- Governed measurement-method change (CAT-STRATA-THEMEMETHOD-20260720-001): non-destructive; block on conflict.
  IF p_measurement_method IS NOT NULL THEN
    IF el.element_type <> 'theme' THEN
      RAISE EXCEPTION 'INVALID_MEASUREMENT_METHOD: only a Strategic Theme has a measurement method';
    END IF;
    IF btrim(p_measurement_method) NOT IN ('objectives_kpis','okrs') THEN
      RAISE EXCEPTION 'INVALID_MEASUREMENT_METHOD: measurement method must be objectives_kpis | okrs';
    END IF;
    IF btrim(p_measurement_method) IS DISTINCT FROM el.measurement_method THEN
      v_method_changed := true;
      IF btrim(p_measurement_method) = 'okrs' THEN
        SELECT count(*) INTO v_conflict FROM public.strata_strategy_elements c
          WHERE c.parent_id = el.id AND c.element_type = 'objective'
            AND c.context = 'theme' AND c.status <> 'retired';
        IF v_conflict > 0 THEN
          RAISE EXCEPTION 'THEME_METHOD_CHANGE_CONFLICT: cannot switch to OKRs — % Strategic Objective(s) exist under this Theme; resolve them before changing the method', v_conflict;
        END IF;
      ELSIF btrim(p_measurement_method) = 'objectives_kpis' THEN
        SELECT count(*) INTO v_conflict FROM public.strata_okrs o WHERE o.theme_id = el.id;
        IF v_conflict > 0 THEN
          RAISE EXCEPTION 'THEME_METHOD_CHANGE_CONFLICT: cannot switch to Objectives & KPIs — % Theme-owned OKR(s) exist under this Theme; resolve them before changing the method', v_conflict;
        END IF;
      END IF;
    END IF;
  END IF;

  UPDATE public.strata_strategy_elements
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         perspective_id = COALESCE(p_perspective, perspective_id),
         parent_id = CASE WHEN p_clear_parent THEN NULL ELSE COALESCE(p_parent, parent_id) END,
         stage = COALESCE(p_stage, stage),
         order_index = COALESCE(p_order_index, order_index),
         measurement_method = CASE WHEN v_method_changed THEN btrim(p_measurement_method) ELSE measurement_method END,
         updated_at = now()
   WHERE id = p_element;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:update_element', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_owner IS NOT NULL OR p_clear_owner THEN 'owner changed' END,
            CASE WHEN p_perspective IS NOT NULL THEN 'perspective changed' END,
            CASE WHEN p_parent IS NOT NULL OR p_clear_parent THEN 'parent changed' END,
            CASE WHEN p_name IS NOT NULL THEN 'renamed' END,
            CASE WHEN p_stage IS NOT NULL THEN format('stage -> %s', p_stage) END,
            CASE WHEN v_method_changed THEN format('measurement method -> %s', btrim(p_measurement_method)) END));
END;
$$;
COMMENT ON FUNCTION public.strata_update_element(uuid, text, text, uuid, uuid, uuid, text, int, boolean, boolean, text) IS
  'Patch a strategy element. Measurement-method change is governed + non-destructive: blocked with THEME_METHOD_CHANGE_CONFLICT when conflicting child records exist (never auto-converts). CAT-STRATA-THEMEMETHOD-20260720-001.';
GRANT EXECUTE ON FUNCTION public.strata_update_element(uuid, text, text, uuid, uuid, uuid, text, int, boolean, boolean, text) TO authenticated;
