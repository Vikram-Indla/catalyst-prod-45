-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S0 — governance wiring (no new schema)
-- Forward-only. CREATE OR REPLACE of four shipped functions. Additive per D-1
-- (approved 2026-07-20): no retroactive change to any closed/existing OKR's numbers.
--
-- Closes gaps:
--   STRATA-KPI-010 — OKR activation now requires a VALID measurement contract for every KR
--                    (strata_kr_validate_contract was defined but never invoked).
--   STRATA-KPI-021 — material KR contract edits (source/formula/phasing) blocked once the
--                    parent OKR leaves draft/rejected; change via a new OKR version instead.
--   STRATA-KPI-020 — equal-weighting policy made EXPLICIT + versioned: strata_okr_versions
--                    .weighting_policy is now honored (null => 'auto' == prior behavior, so
--                    existing OKR numbers are unchanged).
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- STRATA-KPI-010 — authoritative OKR validator now enforces per-KR contracts at approve
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_okr_validate(p_okr uuid, p_stage text DEFAULT 'submit')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_total int; codes text[] := '{}';
BEGIN
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['OKR_NOT_FOUND']); END IF;
  IF o.theme_id IS NULL THEN codes := array_append(codes, 'MISSING_THEME');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.theme_id AND element_type='theme')
    THEN codes := array_append(codes, 'INVALID_THEME'); END IF;
  IF coalesce(btrim(o.objective_statement),'') = '' THEN codes := array_append(codes, 'MISSING_OBJECTIVE_STATEMENT'); END IF;
  IF o.owner_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNER'); END IF;
  IF o.owning_org_unit_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNING_ORG'); END IF;
  IF o.cycle_id IS NULL THEN codes := array_append(codes, 'MISSING_CYCLE'); END IF;
  IF coalesce(o.start_period_id, o.period_id) IS NULL THEN codes := array_append(codes, 'MISSING_START_PERIOD'); END IF;
  SELECT count(*) INTO kr_total FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_total = 0 THEN codes := array_append(codes, 'NO_KEY_RESULTS');
  ELSIF kr_total < 2 OR kr_total > 4 THEN
    codes := array_append(codes, 'KR_COUNT_OUT_OF_BAND');
  END IF;
  -- STRATA-KPI-010: at activation, EVERY non-retired KR must have a valid measurement contract.
  -- Enforced at 'approve' only so a draft can be iterated/submitted while contracts are completed.
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
  'Authoritative Theme-owned OKR validator (CAT-STRATA-THEMEOKR-20260719-001 + KPI-OPMODEL S0). At approve stage, requires a valid strata_kr_validate_contract for every non-retired KR (STRATA-KPI-010).';
GRANT EXECUTE ON FUNCTION public.strata_okr_validate(uuid, text) TO authenticated;

-- ===========================================================================
-- STRATA-KPI-021 — restrict material KR contract edits after the OKR leaves draft
-- ===========================================================================
-- Shared guard: raise unless the KR's parent OKR is still draft/rejected.
CREATE OR REPLACE FUNCTION public.strata_kr_assert_editable(p_kr uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.strata_key_results k
    JOIN public.strata_okrs o ON o.id = k.okr_id
    WHERE k.id = p_kr AND o.status NOT IN ('draft','rejected')
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: the parent OKR is submitted/active — change the KR measurement contract through a new OKR version, not a live edit (STRATA-KPI-021)';
  END IF;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_kr_assert_editable(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_source(
  p_kr uuid, p_update_method text, p_data_source_id uuid DEFAULT NULL,
  p_freshness text DEFAULT NULL, p_observation_frequency text DEFAULT NULL, p_due_schedule jsonb DEFAULT NULL,
  p_evidence_policy text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  PERFORM public.strata_kr_assert_editable(p_kr);
  IF p_update_method NOT IN ('manual','upload','integration','composite') THEN
    RAISE EXCEPTION 'INVALID_OKR: update method must be manual|upload|integration|composite'; END IF;
  IF p_data_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_data_sources WHERE id = p_data_source_id) THEN
    RAISE EXCEPTION 'INVALID_OKR: data source not found'; END IF;
  UPDATE public.strata_key_results
     SET update_method = p_update_method, data_source_id = COALESCE(p_data_source_id, data_source_id),
         freshness_expectation = COALESCE(p_freshness, freshness_expectation),
         observation_frequency = COALESCE(p_observation_frequency, observation_frequency),
         due_schedule = COALESCE(p_due_schedule, due_schedule),
         evidence_policy = COALESCE(p_evidence_policy, evidence_policy),
         lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_source(uuid,text,uuid,text,text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_formula(
  p_kr uuid, p_formula_id uuid DEFAULT NULL, p_formula_version int DEFAULT NULL,
  p_numerator text DEFAULT NULL, p_denominator text DEFAULT NULL, p_component jsonb DEFAULT NULL,
  p_inclusion text DEFAULT NULL, p_exclusion text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  PERFORM public.strata_kr_assert_editable(p_kr);
  UPDATE public.strata_key_results
     SET formula_id = COALESCE(p_formula_id, formula_id), formula_version = COALESCE(p_formula_version, formula_version),
         numerator_def = COALESCE(p_numerator, numerator_def), denominator_def = COALESCE(p_denominator, denominator_def),
         component_def = COALESCE(p_component, component_def),
         inclusion_rules = COALESCE(p_inclusion, inclusion_rules), exclusion_rules = COALESCE(p_exclusion, exclusion_rules),
         lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_formula(uuid,uuid,int,text,text,jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_configure_kr_phasing(
  p_kr uuid, p_period uuid, p_phased_target numeric DEFAULT NULL, p_milestone_label text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  PERFORM public.strata_kr_assert_editable(p_kr);
  IF NOT EXISTS (SELECT 1 FROM public.strata_key_results WHERE id = p_kr) THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_periods WHERE id = p_period) THEN RAISE EXCEPTION 'INVALID_OKR: period not found'; END IF;
  INSERT INTO public.strata_kr_targets (kr_id, kr_version_id, period_id, phased_target, milestone_label)
    VALUES (p_kr, (SELECT current_version_id FROM public.strata_key_results WHERE id=p_kr), p_period, p_phased_target, p_milestone_label)
  ON CONFLICT (kr_id, period_id) DO UPDATE
    SET phased_target = EXCLUDED.phased_target, milestone_label = EXCLUDED.milestone_label, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_configure_kr_phasing(uuid,uuid,numeric,text) TO authenticated;

-- ===========================================================================
-- STRATA-KPI-020 — objective roll-up honors the versioned, explicit weighting policy
-- ===========================================================================
-- weighting_policy->>'mode':  NULL/'auto' => prior behavior (weighted iff all reportable
-- observed KRs carry a weight, else equal average) — existing OKRs unchanged;
-- 'equal' => forced equal average; 'weighted' => weighted when weights are complete.
CREATE OR REPLACE FUNCTION public.strata_okr_official_progress_v2(p_okr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  okr record; ver record; kr record; rep jsonb; prg jsonb; disp numeric; w numeric;
  n_reportable int := 0; n_excluded int := 0; n_with_obs int := 0; n_critical_fail int := 0;
  sum_simple numeric := 0; cnt_simple int := 0; sum_w numeric := 0; sum_wp numeric := 0;
  all_weighted boolean := true; all_must_pass boolean := false; obj_flag text;
  official numeric; method text; policy_mode text;
BEGIN
  SELECT * INTO okr FROM public.strata_okrs WHERE id=p_okr;
  IF okr.id IS NULL THEN RETURN jsonb_build_object('error','OKR_NOT_FOUND'); END IF;
  SELECT * INTO ver FROM public.strata_okr_versions WHERE id=okr.current_version_id;
  all_must_pass := COALESCE(ver.all_must_pass,false);
  policy_mode := COALESCE(ver.weighting_policy->>'mode','auto');

  FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id=p_okr AND COALESCE(lifecycle,'active')<>'retired' LOOP
    rep := public.strata_kr_reportability(kr.id, p_as_of);
    IF NOT (rep->>'reportable')::boolean THEN n_excluded := n_excluded + 1; CONTINUE; END IF;
    n_reportable := n_reportable + 1;
    prg := public.strata_kr_progress(kr.id, p_as_of);
    disp := (prg->>'progress')::numeric;
    IF disp IS NOT NULL THEN
      n_with_obs := n_with_obs + 1;
      sum_simple := sum_simple + disp; cnt_simple := cnt_simple + 1;
      w := kr.weight;
      IF w IS NULL THEN all_weighted := false; ELSE sum_w := sum_w + w; sum_wp := sum_wp + w*disp; END IF;
      IF kr.is_critical AND disp < COALESCE((kr.status_thresholds->>'on_track')::numeric, 0.7) THEN
        n_critical_fail := n_critical_fail + 1; END IF;
    ELSE
      all_weighted := false;
    END IF;
  END LOOP;

  IF n_with_obs = 0 THEN official := NULL; method := 'none';
  ELSIF policy_mode = 'equal' THEN
    official := round(sum_simple/cnt_simple,4); method := 'average';
  ELSIF policy_mode IN ('weighted','auto') AND all_weighted AND sum_w > 0 THEN
    official := round(sum_wp/sum_w,4); method := 'weighted';
  ELSE official := round(sum_simple/cnt_simple,4); method := 'average'; END IF;

  obj_flag := CASE
    WHEN n_reportable=0 THEN 'no_reportable_krs'
    WHEN n_critical_fail>0 THEN 'critical_kr_failing'
    WHEN all_must_pass AND official IS NOT NULL AND official < 1 THEN 'all_must_pass_not_met'
    WHEN n_with_obs < n_reportable THEN 'incomplete_coverage'
    ELSE 'assessable' END;

  RETURN jsonb_build_object(
    'okr_id', p_okr, 'official_progress', official, 'method', method,
    'weighting_policy_mode', policy_mode,
    'weighted_denominator', CASE WHEN method='weighted' THEN sum_w ELSE NULL END,
    'reportable_krs', n_reportable, 'excluded_krs', n_excluded,
    'krs_with_eligible_observation', n_with_obs,
    'coverage', CASE WHEN n_reportable>0 THEN round(n_with_obs::numeric/n_reportable,4) ELSE NULL END,
    'critical_failures', n_critical_fail, 'all_must_pass', all_must_pass,
    'objective_flag', obj_flag);
END; $function$;
COMMENT ON FUNCTION public.strata_okr_official_progress_v2(uuid,date) IS
  'Objective roll-up over REPORTABLE KRs (invariants 9,14 + KPI-OPMODEL S0). Weighting method is driven by the versioned weighting_policy (null/auto = prior behavior); exposes weighting_policy_mode.';
GRANT EXECUTE ON FUNCTION public.strata_okr_official_progress_v2(uuid,date) TO authenticated;
