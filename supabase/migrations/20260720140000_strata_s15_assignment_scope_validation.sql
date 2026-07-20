-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S15 — assignment scope-target validation
-- Forward-only. Confirmed staging defect: creating a Strategic KPI assignment from
-- /strata/kpi-governance sent scope_type='strategic' with NO element_id, satisfying neither
-- branch of strata_kpi_assignment_scope_ck -> raw check-constraint error surfaced to the user.
-- Fix reconciles all layers WITHOUT weakening validation:
--   * the scope CHECK constraint is unchanged (still the DB backstop);
--   * strata_create_kpi_assignment now validates the scope target explicitly and raises a clear
--     INVALID_SCOPE error BEFORE the insert (strategic requires an element; project requires a
--     card + project objective) — matching the agreed scope model and the constraint;
--   * the UI now collects the scope target (element / card + objective) — see StrataKpiGovernancePage.
-- Supersedes the S2 definition (S2 already applied; not edited).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_kpi_assignment(
  p_kpi uuid, p_scope_type text,
  p_element uuid DEFAULT NULL, p_project_card uuid DEFAULT NULL, p_project_objective uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL, p_target numeric DEFAULT NULL, p_target_band_min numeric DEFAULT NULL,
  p_target_band_max numeric DEFAULT NULL, p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL,
  p_kr_eligible boolean DEFAULT false, p_org_unit uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kpi record; v_id uuid; v_key text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: creating a KPI assignment requires strategy_office/kpi_owner/okr_owner'; END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF kpi.status <> 'approved' THEN
    RAISE EXCEPTION 'INVALID_KPI: only an approved KPI Definition can be assigned (current: %)', kpi.status; END IF;
  IF p_scope_type NOT IN ('strategic','project') THEN RAISE EXCEPTION 'INVALID_SCOPE: scope must be strategic|project'; END IF;

  -- STRATA-KPI-025 scope model: a strategic assignment targets a strategy element; a project
  -- assignment targets a project card + a project objective. Validate the target explicitly so the
  -- caller gets an actionable error instead of the raw scope check-constraint violation.
  IF p_scope_type = 'strategic' AND p_element IS NULL THEN
    RAISE EXCEPTION 'INVALID_SCOPE: a strategic KPI assignment requires a strategy element'; END IF;
  IF p_scope_type = 'strategic' AND p_project_card IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_SCOPE: a strategic KPI assignment must not carry a project card'; END IF;
  IF p_scope_type = 'project' AND (p_project_card IS NULL OR p_project_objective IS NULL) THEN
    RAISE EXCEPTION 'INVALID_SCOPE: a project KPI assignment requires a project card and a project objective'; END IF;
  -- referential sanity for the strategic target
  IF p_scope_type = 'strategic' AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element) THEN
    RAISE EXCEPTION 'INVALID_SCOPE: strategy element not found'; END IF;

  IF p_kr_eligible AND NOT kpi.kr_eligible THEN
    RAISE EXCEPTION 'INVALID_KR_ELIGIBLE: the KPI Definition is not KR-eligible (STRATA-KPI-005)'; END IF;
  INSERT INTO public.strata_kpi_assignments
    (kpi_id, scope_type, element_id, org_unit_id, project_card_id, project_objective_id,
     owner_id, target, target_band_min, target_band_max, direction, start_period_id, end_period_id,
     kr_eligible, status)
  VALUES
    (p_kpi, p_scope_type, p_element, p_org_unit, p_project_card, p_project_objective,
     p_owner, p_target, p_target_band_min, p_target_band_max, kpi.direction, p_start_period, p_end_period,
     p_kr_eligible, 'draft')
  RETURNING id INTO v_id;
  v_key := 'KA-' || upper(substr(replace(v_id::text,'-',''),1,10));
  UPDATE public.strata_kpi_assignments SET assignment_key = v_key WHERE id = v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_kpi_assignment(uuid,text,uuid,uuid,uuid,uuid,numeric,numeric,numeric,uuid,uuid,boolean,uuid) TO authenticated;
