-- CAT-STRATA-EXECMODEL-20260721-001 — Stage 2 (S18): KPI assignment repair verb (#14).
-- The merged create form can produce a draft missing owner/period/target(band); the validator then
-- blocks submit (MISSING_OWNER/MISSING_PERIOD/MISSING_TARGET) and there was NO update path — the
-- assignment was permanently stuck. This adds the missing repair verb: a draft/rejected assignment's
-- owner/target/band/period/kr-eligibility/org can be edited before submit. Approved assignments are
-- versioned (not edited) — unchanged. Additive; identity fields (kpi/scope/element) are NOT editable.
-- D-4: assignment kr_eligible may only NARROW the KPI Definition designation, never widen it.
-- Applied to staging (cyijbdeuehohvhnsywig) as version 20260721110814; ledger 1:1 with this file.

CREATE OR REPLACE FUNCTION public.strata_update_kpi_assignment(
  p_assignment uuid,
  p_owner uuid DEFAULT NULL, p_target numeric DEFAULT NULL,
  p_target_band_min numeric DEFAULT NULL, p_target_band_max numeric DEFAULT NULL,
  p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL,
  p_kr_eligible boolean DEFAULT NULL, p_org_unit uuid DEFAULT NULL,
  p_lock_version int DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; kpi record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: editing a KPI assignment requires strategy_office/kpi_owner/okr_owner'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'ASSIGNMENT_NOT_FOUND'; END IF;
  IF a.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected assignment can be edited (current: %) — approved assignments are versioned, not edited', a.status; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> a.lock_version THEN
    RAISE EXCEPTION 'STALE_WRITE: assignment changed since load (expected %, got %)', p_lock_version, a.lock_version; END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = a.kpi_id;
  IF COALESCE(p_kr_eligible, a.kr_eligible) AND NOT kpi.kr_eligible THEN
    RAISE EXCEPTION 'INVALID_KR_ELIGIBLE: the KPI Definition is not KR-eligible (STRATA-KPI-005; assignment may only narrow)'; END IF;
  UPDATE public.strata_kpi_assignments SET
    owner_id        = COALESCE(p_owner, owner_id),
    target          = COALESCE(p_target, target),
    target_band_min = COALESCE(p_target_band_min, target_band_min),
    target_band_max = COALESCE(p_target_band_max, target_band_max),
    start_period_id = COALESCE(p_start_period, start_period_id),
    end_period_id   = COALESCE(p_end_period, end_period_id),
    kr_eligible     = COALESCE(p_kr_eligible, kr_eligible),
    org_unit_id     = COALESCE(p_org_unit, org_unit_id),
    lock_version    = lock_version + 1
  WHERE id = p_assignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_update_kpi_assignment(uuid,uuid,numeric,numeric,numeric,uuid,uuid,boolean,uuid,int) TO authenticated;
