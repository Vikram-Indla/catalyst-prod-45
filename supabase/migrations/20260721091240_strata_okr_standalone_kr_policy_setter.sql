-- CAT-STRATA-KPIGOV-ENTRY-20260721-001 — governed setter for an OKR's standalone-KR policy.
--
-- The standalone_kr_policy column (added by 20260720124000_strata_s5_kr_assignment_bridge.sql)
-- already governs whether standalone (non-assignment-backed) KRs count toward official progress:
-- 'unofficial' excludes them, 'legacy' includes them. New OKRs default to 'unofficial'; existing
-- OKRs were deliberately backfilled to 'legacy' (decision D-1: do not retroactively move numbers).
--
-- The gap Aiden hit: there was NO way to VIEW or CHANGE this per-OKR, so pre-existing OKRs stayed
-- 'legacy' with their standalone KRs still counted "officially" and no owner could opt them into
-- the agreed default. This adds a maker-owned, validated setter so owners can consciously exclude
-- standalone KRs. It does NOT auto-flip existing OKRs — the S5 backfill / D-1 freeze is preserved.
CREATE OR REPLACE FUNCTION public.strata_set_okr_standalone_kr_policy(p_okr uuid, p_policy text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN';
  END IF;
  IF p_policy NOT IN ('legacy','unofficial') THEN
    RAISE EXCEPTION 'INVALID_POLICY: standalone_kr_policy must be legacy or unofficial (got %)', p_policy;
  END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  UPDATE public.strata_okrs SET standalone_kr_policy = p_policy WHERE id = p_okr;
  RETURN p_policy;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_set_okr_standalone_kr_policy(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.strata_set_okr_standalone_kr_policy(uuid, text) IS
  'Governed per-OKR toggle for standalone_kr_policy (legacy|unofficial). strategy_office/okr_owner/kpi_owner only. Standalone KRs are excluded from official progress when unofficial.';
