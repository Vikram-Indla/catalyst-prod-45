-- ============================================================================
-- STRATA R2 — Governed entity-create RPCs (thin, draft-first, audited)
-- CAT-STRATA-20260705-001 · Blueprint §6, §8, §10 · Flow 2/3
-- All four RPCs insert DRAFT-stage records only; lifecycle progression stays
-- with the existing governance RPCs (strata_submit_record / strata_approve_kpi
-- / strata_promote_element / benefit lifecycle). Slugs are set by the existing
-- trg_<table>_slug BEFORE INSERT triggers (strata_generate_slug — frozen on
-- creation); the RPCs never compute slugs.
-- Role guards mirror each table's INSERT/write RLS policy exactly.
-- NOTE: strata_create_kpi takes NO perspective argument — strata_kpis has no
-- perspective column (perspective attaches via strata_strategy_elements /
-- scorecard model perspectives, not the KPI dictionary).
-- NOT APPLIED ANYWHERE YET — see features/CAT-STRATA-20260705-001/
-- 12_ROLLOUT_RUNBOOK_UPLOADS.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- strata_create_kpi — draft KPI dictionary entry.
-- Guard mirrors strata_kpis_insert RLS: strategy_office | kpi_owner | admin.
-- Enum params are validated up front for friendly errors; the table CHECKs
-- remain the source of truth.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_create_kpi(
  p_name text,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT 'higher_better',
  p_frequency text DEFAULT 'quarterly',
  p_entry_method text DEFAULT 'upload'
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

  INSERT INTO public.strata_kpis (name, unit, direction, frequency, entry_method, status, created_by)
  VALUES (btrim(p_name), p_unit, p_direction, p_frequency, p_entry_method, 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', new_id, 'RPC:create_kpi', auth.uid(), 'draft KPI created');
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_kpi(text, text, text, text, text) IS
  'Creates a DRAFT KPI (blueprint §8). Approval requires strata_approve_kpi (owner/validator/formula/target gates). No perspective param: strata_kpis has no perspective column.';

-- ---------------------------------------------------------------------------
-- strata_create_strategy_element — draft node in the strategy hierarchy.
-- Guard mirrors the strategy-domain RLS write set: strategy_office | admin.
-- Parent (when given) must belong to the same cycle; cycles that are locked
-- or closed do not accept new elements (strata_cycles status machine).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_create_strategy_element(
  p_cycle uuid,
  p_element_type text,
  p_name text,
  p_parent uuid DEFAULT NULL,
  p_perspective uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cyc record; parent_cycle uuid; new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a strategy element requires strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'element name is required'; END IF;
  IF p_element_type IS NULL OR btrim(p_element_type) = '' THEN RAISE EXCEPTION 'element_type is required'; END IF;

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
    (cycle_id, element_type, name, parent_id, perspective_id, stage, status, created_by)
  VALUES
    (p_cycle, btrim(p_element_type), btrim(p_name), p_parent, p_perspective, 'draft', 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', new_id, 'RPC:create_strategy_element', auth.uid(),
          format('draft %s created in cycle %s', btrim(p_element_type), cyc.name));
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_strategy_element(uuid, text, text, uuid, uuid) IS
  'Creates a DRAFT strategy element (blueprint §6). Promotion to active governance requires strata_promote_element (owner/charter/KPI gates).';

-- ---------------------------------------------------------------------------
-- strata_create_okr — draft OKR, optionally anchored to a strategy element.
-- Guard mirrors the strata_okrs RLS write set: strategy_office | kpi_owner | admin.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_create_okr(
  p_name text,
  p_cycle uuid DEFAULT NULL,
  p_objective_element uuid DEFAULT NULL,
  p_period uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'creating an OKR requires strategy_office, kpi_owner or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'OKR name is required'; END IF;
  IF p_cycle IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = p_cycle) THEN
    RAISE EXCEPTION 'cycle not found';
  END IF;
  IF p_objective_element IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_objective_element) THEN
    RAISE EXCEPTION 'objective element not found';
  END IF;
  IF p_period IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period) THEN
    RAISE EXCEPTION 'period not found';
  END IF;

  INSERT INTO public.strata_okrs
    (name, cycle_id, objective_element_id, period_id, owner_id, status, created_by)
  VALUES
    (btrim(p_name), p_cycle, p_objective_element, p_period, p_owner, 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_okrs', new_id, 'RPC:create_okr', auth.uid(), 'draft OKR created');
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_okr(text, uuid, uuid, uuid, uuid) IS
  'Creates a DRAFT OKR (blueprint §8 — OKRs are separate but interoperable with the KPI dictionary).';

-- ---------------------------------------------------------------------------
-- strata_create_benefit — earliest-stage benefit record.
-- Guard mirrors the VMO value-records RLS write set: strategy_office |
-- vmo_validator | admin. strata_benefits has no ''draft'': the lifecycle CHECK
-- starts at ''identified'', so that is the created stage (blueprint §10).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_create_benefit(
  p_portfolio uuid,
  p_name text,
  p_category uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a benefit requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'benefit name is required'; END IF;
  IF p_portfolio IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_portfolios WHERE id = p_portfolio) THEN
    RAISE EXCEPTION 'portfolio not found';
  END IF;
  IF p_category IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;

  INSERT INTO public.strata_benefits
    (name, portfolio_id, category_id, lifecycle_stage, created_by)
  VALUES
    (btrim(p_name), p_portfolio, p_category, 'identified', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefits', new_id, 'RPC:create_benefit', auth.uid(), 'benefit created at lifecycle_stage=identified');
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_benefit(uuid, text, uuid) IS
  'Creates a benefit at lifecycle_stage ''identified'' (blueprint §10 — the earliest stage; the table has no draft stage). Realized value still requires finance validation via strata_validate_benefit_value.';
