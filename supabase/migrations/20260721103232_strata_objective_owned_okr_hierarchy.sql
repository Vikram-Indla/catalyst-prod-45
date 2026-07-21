-- CAT-STRATA-KPIGOV-ENTRY-20260721-001 — D5 Strategy Room readiness for the Objective-owned OKR
-- hierarchy. DEFERS to CAT-STRATA-EXECMODEL-20260721-001 S16 (migration 20260721102019), which owns
-- the ownership model: the authoritative strata_okrs.objective_id column, the
-- strata_okr_objective_check trigger, strata_create_okr_v3 (Objective-owned create), the updated
-- strata_okr_validate, and the deterministic re-parent provenance map. This migration does NOT
-- redefine any of those — it adds ONLY the readiness coverage function that Strategy Room needs.
--
-- Readiness rule (agreed): an Objective "has a measure" when it has >=1 approved (status='active')
-- OKR whose >=1 KR is reportable — i.e. backed by an approved, KR-eligible Strategic KPI Assignment
-- (via strata_kr_reportability). Grandfathered Theme-owned OKRs (objective_id IS NULL) do NOT count;
-- they are preserved as historical records by S16 and never contribute to Objective readiness.
CREATE OR REPLACE FUNCTION public.strata_objective_measure_coverage(p_cycle uuid)
RETURNS TABLE(objective_id uuid, has_measure boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT e.id,
    EXISTS (
      SELECT 1 FROM public.strata_okrs o
      JOIN public.strata_key_results kr ON kr.okr_id = o.id
      WHERE o.objective_id = e.id
        AND o.status = 'active'
        AND (public.strata_kr_reportability(kr.id, current_date)->>'reportable')::boolean
    )
  FROM public.strata_strategy_elements e
  WHERE e.element_type = 'objective' AND e.context = 'theme'
    AND (p_cycle IS NULL OR e.cycle_id = p_cycle);
$function$;
GRANT EXECUTE ON FUNCTION public.strata_objective_measure_coverage(uuid) TO authenticated;
