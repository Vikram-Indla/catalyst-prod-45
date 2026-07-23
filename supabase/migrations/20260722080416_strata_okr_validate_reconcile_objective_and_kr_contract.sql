-- CAT-STRATA-KPI-OPMODEL-20260720-001 · E13 reconciliation (forward-only).
-- Regression fix: S16 (20260721102019_strata_s16_objective_owned_okr.sql) replaced
-- strata_okr_validate to add Objective ownership (MISSING_OBJECTIVE/INVALID_OBJECTIVE)
-- but dropped the approval-stage measurement-contract gate that S0
-- (20260720120000_strata_s0_okr_kr_governance_wiring.sql, STRATA-KPI-010) had added.
-- This validator preserves BOTH: Objective ownership AND the p_stage='approve'
-- per-KR strata_kr_validate_contract gate. Non-destructive: no historical rows touched;
-- draft/submit remain ungated so contracts can be completed before activation.
CREATE OR REPLACE FUNCTION public.strata_okr_validate(p_okr uuid, p_stage text DEFAULT 'submit')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_total int; codes text[] := '{}';
BEGIN
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['OKR_NOT_FOUND']); END IF;
  -- Objective ownership (EXECMODEL S16): Theme derived, Objective authoritative.
  IF o.theme_id IS NULL THEN codes := array_append(codes, 'MISSING_THEME');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.theme_id AND element_type='theme')
    THEN codes := array_append(codes, 'INVALID_THEME'); END IF;
  IF o.objective_id IS NULL THEN codes := array_append(codes, 'MISSING_OBJECTIVE');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.objective_id AND element_type='objective')
    THEN codes := array_append(codes, 'INVALID_OBJECTIVE'); END IF;
  IF coalesce(btrim(o.objective_statement),'') = '' THEN codes := array_append(codes, 'MISSING_OBJECTIVE_STATEMENT'); END IF;
  IF o.owner_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNER'); END IF;
  IF o.owning_org_unit_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNING_ORG'); END IF;
  IF o.cycle_id IS NULL THEN codes := array_append(codes, 'MISSING_CYCLE'); END IF;
  IF coalesce(o.start_period_id, o.period_id) IS NULL THEN codes := array_append(codes, 'MISSING_START_PERIOD'); END IF;
  SELECT count(*) INTO kr_total FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_total = 0 THEN codes := array_append(codes, 'NO_KEY_RESULTS');
  ELSIF kr_total < 2 OR kr_total > 4 THEN codes := array_append(codes, 'KR_COUNT_OUT_OF_BAND');
  END IF;
  -- STRATA-KPI-010 (RECONCILED, preserved from S0): at activation EVERY non-retired KR must
  -- have a valid measurement contract. Enforced at 'approve' only so a draft can be
  -- iterated/submitted while contracts are completed.
  IF p_stage = 'approve' AND kr_total > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.strata_key_results kr
      WHERE kr.okr_id = p_okr
        AND COALESCE(kr.lifecycle,'active') <> 'retired'
        AND NOT (public.strata_kr_validate_contract(kr.id)->>'valid')::boolean
    ) THEN codes := array_append(codes, 'KR_CONTRACT_INVALID');
    END IF;
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'kr_count', kr_total, 'stage', p_stage);
END; $function$;
COMMENT ON FUNCTION public.strata_okr_validate(uuid, text) IS
  'Authoritative OKR validator (EXECMODEL Objective-owned + KPI-OPMODEL S0 reconciled, E13). Requires Objective ownership; at approve stage requires a valid strata_kr_validate_contract for every non-retired KR (STRATA-KPI-010).';
GRANT EXECUTE ON FUNCTION public.strata_okr_validate(uuid, text) TO authenticated;
