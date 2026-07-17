-- CAT-STRATA-SRDEF-20260717-001 — SR-DEF-002 (P2)
--
-- Problem: creating a Strategy Room element wrote TWO identical "Created" rows to
-- strata_audit_events at the same timestamp (History count 2 on a brand-new objective).
--
-- Root cause — a genuine double-write, not a UI or retry artefact:
--   1. trg_strata_strategy_elements_audit (AFTER INSERT → public.strata_audit(),
--      attached to 8 tables by 20260705100100_strata_strategy_scorecard.sql) writes
--      action='INSERT' with actor + full before/after payload.
--   2. strata_create_strategy_element ALSO hand-wrote action='RPC:create_strategy_element'
--      (20260705140100_strata_entity_create_rpcs.sql).
-- Both land inside one transaction, so now() is identical for both rows, and
-- src/modules/strata/components/format.ts maps BOTH actions to the label "Created".
--
-- Fix (D-3): the generic strata_audit() trigger is the sole create-audit writer. The
-- same hand-written pattern exists in all four create RPCs, so all four are corrected
-- together — create_kpi/create_okr/create_benefit reproduce the defect on their own
-- surfaces. Verified on staging before writing this migration: trg_*_audit exists and
-- is ENABLED on all four tables (strata_strategy_elements, strata_kpis, strata_okrs,
-- strata_benefits), so removing the manual INSERT cannot leave a creation unaudited.
--
-- Context preservation: the dropped rows carried a human `note` (e.g. "draft theme
-- created in cycle X"). The surviving trigger row carries `after = to_jsonb(NEW)` —
-- every column of the created row, including cycle_id/element_type/is_strategic — so
-- the same facts remain available as structured metadata rather than prose.
--
-- Historical integrity: existing duplicate rows are NOT rewritten or deleted. This
-- migration changes future writes only.
--
-- Bodies below are copied verbatim from each RPC's CURRENT definition, minus the
-- audit INSERT. Note strata_create_kpi is taken from its LATEST revision
-- (20260712170000_strata_kpi_is_strategic.sql — 6 args incl. p_is_strategic), NOT the
-- original 5-arg version, so this does not regress STRATA-E2E-010.
-- Signatures are unchanged → CREATE OR REPLACE only, no DROP, no PGRST ambiguity.
-- ---------------------------------------------------------------------------

-- 1. strata_create_strategy_element (the defect's reported surface) -----------
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

  -- SR-DEF-002: manual strata_audit_events INSERT removed; trg_strata_strategy_elements_audit
  -- already records this creation exactly once.
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_strategy_element(uuid, text, text, uuid, uuid) IS
  'Creates a DRAFT strategy element (blueprint §6). Promotion to active governance requires strata_promote_element (owner/charter/KPI gates). Audit is written once by trg_strata_strategy_elements_audit (SR-DEF-002).';

-- 2. strata_create_kpi — based on the 20260712170000 (is_strategic) revision ---
CREATE OR REPLACE FUNCTION public.strata_create_kpi(
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

  -- SR-DEF-002: manual audit INSERT removed; trg_strata_kpis_audit covers this.
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_kpi(text, text, text, text, text, boolean) IS
  'Creates a DRAFT KPI. p_is_strategic marks it Strategic — approval then requires a governed strategy association (STRATA-E2E-010). Audit written once by trg_strata_kpis_audit (SR-DEF-002).';

-- 3. strata_create_okr ---------------------------------------------------------
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

  -- SR-DEF-002: manual audit INSERT removed; trg_strata_okrs_audit covers this.
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_okr(text, uuid, uuid, uuid, uuid) IS
  'Creates a DRAFT OKR (blueprint §8 — OKRs are separate but interoperable with the KPI dictionary). Audit written once by trg_strata_okrs_audit (SR-DEF-002).';

-- 4. strata_create_benefit -----------------------------------------------------
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

  -- SR-DEF-002: manual audit INSERT removed; trg_strata_benefits_audit covers this.
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_create_benefit(uuid, text, uuid) IS
  'Creates a benefit at lifecycle_stage ''identified'' (blueprint §10 — the earliest stage; the table has no draft stage). Realized value still requires finance validation via strata_validate_benefit_value. Audit written once by trg_strata_benefits_audit (SR-DEF-002).';
