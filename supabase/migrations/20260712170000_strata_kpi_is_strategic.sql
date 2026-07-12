-- CAT-STRATA-V6QA-20260712-001 — STRATA-E2E-010 (decision D-4)
--
-- Adds an is_strategic marker to KPIs and enforces governed strategy associations
-- for Strategic KPIs, without breaking operational KPIs.
--
-- Problem: a KPI could be created and approved with zero strategy/perspective
-- association, and the schema had no way to distinguish a Strategic KPI (which
-- MUST carry cycle/theme/objective/perspective) from an operational one (which
-- legitimately may not). Also a chicken-and-egg: strata_link_element_kpi required
-- the KPI to be 'approved' before linking, while approval should require a link.
--
-- Design (D-4, recommended options):
--  1. is_strategic boolean NOT NULL DEFAULT false. Existing rows become false
--     (operational) — zero-assumption, no retroactive inference from existing links.
--  2. strata_approve_kpi: a Strategic KPI must have >=1 strata_element_kpis link
--     (one link to a theme/objective row transitively provides cycle_id +
--     element_type + perspective_id — all four required associations).
--  3. strata_link_element_kpi: relaxed so a STRATEGIC KPI can be linked while
--     draft/pending_approval (breaks the chicken-and-egg); operational KPIs keep
--     the approved-only rule.
--  4. is_strategic settable at create and edit (fixable if miscategorised).
--
-- create_kpi/update_kpi change signature (new param) → DROP + CREATE. approve/link
-- are body-only → CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

ALTER TABLE public.strata_kpis
  ADD COLUMN IF NOT EXISTS is_strategic boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.strata_kpis.is_strategic IS
  'Strategic KPI (vs operational). When true, strata_approve_kpi requires at least one strata_element_kpis link (governed cycle/theme/objective/perspective association). STRATA-E2E-010.';

-- 1. create_kpi (+ p_is_strategic) --------------------------------------------
DROP FUNCTION IF EXISTS public.strata_create_kpi(text, text, text, text, text);

CREATE FUNCTION public.strata_create_kpi(
  p_name text,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT 'higher_better',
  p_frequency text DEFAULT 'quarterly',
  p_entry_method text DEFAULT 'upload',
  p_is_strategic boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'creating a KPI requires strategy_office, kpi_owner or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'KPI name is required'; END IF;
  IF p_direction NOT IN ('higher_better','lower_better','band','manual') THEN
    RAISE EXCEPTION 'direction must be higher_better | lower_better | band | manual';
  END IF;
  IF p_frequency NOT IN ('weekly','monthly','quarterly','half_yearly','yearly') THEN
    RAISE EXCEPTION 'frequency must be weekly | monthly | quarterly | half_yearly | yearly';
  END IF;
  IF p_entry_method NOT IN ('upload','manual','connector') THEN
    RAISE EXCEPTION 'entry_method must be upload | manual | connector';
  END IF;

  INSERT INTO public.strata_kpis (name, unit, direction, frequency, entry_method, is_strategic, status, created_by)
  VALUES (btrim(p_name), p_unit, p_direction, p_frequency, p_entry_method, COALESCE(p_is_strategic, false), 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', new_id, 'RPC:create_kpi', auth.uid(),
          CASE WHEN COALESCE(p_is_strategic, false) THEN 'draft strategic KPI created' ELSE 'draft KPI created' END);
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_kpi(text, text, text, text, text, boolean) IS
  'Creates a DRAFT KPI. p_is_strategic marks it Strategic — approval then requires a governed strategy association (STRATA-E2E-010).';

-- 2. update_kpi (+ p_is_strategic) --------------------------------------------
-- NOTE: the live strata_update_kpi carries clear-flags (p_clear_validator/
-- data_source/escalation_owner) from 20260705190000's later revision, so the DROP
-- targets that 17-arg signature and the CREATE re-adds those flags alongside
-- p_is_strategic (18 args). One overload only — no PGRST ambiguity.
DROP FUNCTION IF EXISTS public.strata_update_kpi(
  uuid, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid,
  boolean, boolean, boolean
);

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
  p_clear_escalation_owner boolean DEFAULT false,
  p_is_strategic boolean DEFAULT NULL
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
         is_strategic = COALESCE(p_is_strategic, is_strategic),
         updated_at = now()
   WHERE id = p_kpi;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', p_kpi, 'RPC:update_kpi', auth.uid(), 'KPI governance metadata updated');
END;
$$;

-- 3. approve_kpi (+ strategic-association gate) -------------------------------
CREATE OR REPLACE FUNCTION public.strata_approve_kpi(p_kpi uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; formula_ok int; target_ok int;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.accountable_owner_id IS NULL THEN RAISE EXCEPTION 'approval blocked: KPI has no accountable owner'; END IF;
  IF k.validator_id IS NULL THEN RAISE EXCEPTION 'approval blocked: KPI has no validator'; END IF;
  IF k.validator_id = k.accountable_owner_id THEN
    RAISE EXCEPTION 'approval blocked: validator must differ from accountable owner (segregation of duties)';
  END IF;
  IF k.entry_method = 'upload' AND k.data_source_id IS NULL THEN
    RAISE EXCEPTION 'approval blocked: upload-fed KPI requires a registered data source';
  END IF;
  SELECT count(*) INTO formula_ok FROM public.strata_kpi_formula_versions
    WHERE kpi_id = p_kpi AND status = 'approved';
  IF formula_ok = 0 AND k.entry_method <> 'manual' THEN
    RAISE EXCEPTION 'approval blocked: KPI requires an approved formula version';
  END IF;
  SELECT count(*) INTO target_ok FROM public.strata_kpi_targets WHERE kpi_id = p_kpi AND status = 'approved';
  IF target_ok = 0 THEN RAISE EXCEPTION 'approval blocked: KPI requires at least one approved target'; END IF;
  -- STRATA-E2E-010: a Strategic KPI must carry a governed strategy association.
  IF k.is_strategic AND NOT EXISTS (
    SELECT 1 FROM public.strata_element_kpis WHERE kpi_id = p_kpi
  ) THEN
    RAISE EXCEPTION 'approval blocked: a Strategic KPI must be linked to at least one strategy element (cycle / theme / objective / perspective) before approval';
  END IF;
  PERFORM public.strata_approve_record('strata_kpis', p_kpi, p_note);
END;
$$;

-- 4. link_element_kpi (relaxed for strategic KPIs) ----------------------------
CREATE OR REPLACE FUNCTION public.strata_link_element_kpi(
  p_element uuid,
  p_kpi uuid,
  p_weight numeric DEFAULT NULL,
  p_contribution text DEFAULT 'direct'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; kpi_status text; kpi_is_strategic boolean;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'linking KPIs requires strategy_office or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element AND status <> 'retired') THEN
    RAISE EXCEPTION 'element not found or retired';
  END IF;
  SELECT status, is_strategic INTO kpi_status, kpi_is_strategic FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi_status IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  -- STRATA-E2E-010: approved KPIs may always be linked; a Strategic KPI may also be
  -- linked while draft/pending so it can satisfy the approval gate (chicken-and-egg).
  IF kpi_status <> 'approved'
     AND NOT (COALESCE(kpi_is_strategic, false) AND kpi_status IN ('draft','pending_approval')) THEN
    RAISE EXCEPTION 'only approved KPIs can be linked (strategic KPIs may also link while draft/pending); KPI status: %', kpi_status;
  END IF;
  IF p_contribution NOT IN ('direct','supporting') THEN
    RAISE EXCEPTION 'contribution must be direct | supporting';
  END IF;
  IF p_weight IS NOT NULL AND (p_weight < 0 OR p_weight > 100) THEN
    RAISE EXCEPTION 'weight must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_element_kpis WHERE element_id = p_element AND kpi_id = p_kpi) THEN
    RAISE EXCEPTION 'this KPI is already linked to the element';
  END IF;

  INSERT INTO public.strata_element_kpis (element_id, kpi_id, weight, contribution_type)
  VALUES (p_element, p_kpi, p_weight, p_contribution)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_element_kpis', new_id, 'RPC:link_element_kpi', auth.uid(),
          format('%s ← %s (%s)', public.strata_entity_name('element', p_element),
                 public.strata_entity_name('kpi', p_kpi), p_contribution));
  RETURN new_id;
END;
$$;
