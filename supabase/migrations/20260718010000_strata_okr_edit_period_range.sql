-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-003 Edit Draft OKR: start/end period range.
--
-- strata_okrs carried a single period_id; the governed Edit form requires an explicit start AND
-- end period with range validation. Additive: two nullable columns + an extended
-- strata_update_okr. period_id stays the activation gate (kept = start), so activation, closure
-- and reportability behaviour are unchanged.
--
-- Draft-only, strategy_office-gated, server-validated (objective/periods exist; end period not
-- before start). The 5-arg overload is dropped so the 6-arg call cannot bind past the new range
-- check. No fact repointed; no completed behaviour modified.

ALTER TABLE public.strata_okrs
  ADD COLUMN IF NOT EXISTS start_period_id uuid,
  ADD COLUMN IF NOT EXISTS end_period_id uuid;

DROP FUNCTION IF EXISTS public.strata_update_okr(uuid,uuid,uuid,uuid,uuid);

CREATE OR REPLACE FUNCTION public.strata_update_okr(
  p_okr uuid, p_owner uuid DEFAULT NULL, p_objective uuid DEFAULT NULL,
  p_cycle uuid DEFAULT NULL, p_period_start uuid DEFAULT NULL, p_period_end uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; s_start date; s_end date;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'editing an OKR requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'draft' THEN RAISE EXCEPTION 'only a draft OKR can be edited (current: %)', o.status; END IF;
  IF p_objective IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_objective) THEN
    RAISE EXCEPTION 'strategy objective not found'; END IF;
  IF p_period_start IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period_start) THEN
    RAISE EXCEPTION 'start period not found'; END IF;
  IF p_period_end IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period_end) THEN
    RAISE EXCEPTION 'end period not found'; END IF;
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    SELECT starts_on INTO s_start FROM public.strata_periods WHERE id = p_period_start;
    SELECT ends_on INTO s_end FROM public.strata_periods WHERE id = p_period_end;
    IF s_end < s_start THEN RAISE EXCEPTION 'end period cannot precede start period'; END IF;
  END IF;
  UPDATE public.strata_okrs
     SET owner_id = COALESCE(p_owner, owner_id),
         objective_element_id = COALESCE(p_objective, objective_element_id),
         cycle_id = COALESCE(p_cycle, cycle_id),
         start_period_id = COALESCE(p_period_start, start_period_id),
         end_period_id = COALESCE(p_period_end, end_period_id),
         period_id = COALESCE(p_period_start, period_id),
         updated_at = now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_update_okr(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;
