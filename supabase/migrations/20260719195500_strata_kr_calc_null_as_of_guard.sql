-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 4 fix: defend the KR calc functions against a NULL
-- p_as_of. A caller that passes p_as_of := NULL (e.g. the frontend rpc bridge) overrode the
-- `DEFAULT current_date`, making `as_of_date <= NULL` always false → no eligible observation found
-- → progress/coverage wrongly null. COALESCE(p_as_of, current_date) restores the intended default
-- for every caller. Behaviour is otherwise unchanged (bodies identical to 20260719173520).

CREATE OR REPLACE FUNCTION public.strata_kr_expected_progress(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; pt numeric; frac numeric;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL OR k.baseline IS NULL OR k.target IS NULL OR k.baseline=k.target THEN RETURN NULL; END IF;
  SELECT t.phased_target INTO pt FROM public.strata_kr_targets t JOIN public.strata_periods p ON p.id=t.period_id
   WHERE t.kr_id=p_kr AND t.phased_target IS NOT NULL AND COALESCE(p.ends_on, p_as_of) <= p_as_of
   ORDER BY p.ends_on DESC NULLS LAST LIMIT 1;
  IF pt IS NULL THEN RETURN NULL; END IF;
  frac := (pt - k.baseline) / (k.target - k.baseline);
  RETURN round(least(greatest(frac,0),1),4);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_kr_expected_progress(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_kr_progress(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; obs record; actual numeric; src text; frac numeric; disp numeric; expected numeric;
  perf text; dq text; conf text; thr jsonb; on_thr numeric; at_thr numeric; ratio numeric;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RETURN jsonb_build_object('error','KR_NOT_FOUND'); END IF;
  SELECT * INTO obs FROM public.strata_kr_observations o
   WHERE o.kr_id=p_kr AND o.validation_status IN ('validated','accepted_with_exception') AND o.as_of_date <= p_as_of
   ORDER BY o.as_of_date DESC, o.submitted_at DESC LIMIT 1;
  IF obs.id IS NOT NULL THEN actual := obs.actual_value; src := 'observation'; conf := obs.confidence; dq := 'fresh';
  ELSIF EXISTS (SELECT 1 FROM public.strata_kr_observations o WHERE o.kr_id=p_kr AND o.validation_status='pending') THEN
    actual := k.current_value; src := 'legacy_current_value'; dq := 'unvalidated';
  ELSE actual := k.current_value; src := CASE WHEN k.current_value IS NULL THEN 'none' ELSE 'legacy_current_value' END;
    dq := CASE WHEN k.current_value IS NULL THEN 'missing' ELSE 'legacy' END;
  END IF;
  frac := CASE
    WHEN actual IS NULL THEN NULL
    WHEN k.direction IN ('higher_better','lower_better','custom_curve') AND k.target IS NOT NULL AND k.baseline IS NOT NULL AND k.target<>k.baseline THEN (actual - k.baseline)/(k.target - k.baseline)
    WHEN k.direction IN ('within_range','band') AND k.range_min IS NOT NULL AND k.range_max IS NOT NULL THEN CASE WHEN actual BETWEEN least(k.range_min,k.range_max) AND greatest(k.range_min,k.range_max) THEN 1 ELSE 0 END
    WHEN k.direction='maintain_above' AND k.target IS NOT NULL THEN CASE WHEN actual>=k.target THEN 1 ELSE greatest(actual/nullif(k.target,0),0) END
    WHEN k.direction='maintain_below' AND k.target IS NOT NULL THEN CASE WHEN actual<=k.target THEN 1 ELSE 0 END
    WHEN k.direction='exact_target' AND k.target IS NOT NULL THEN CASE WHEN actual=k.target THEN 1 ELSE 0 END
    WHEN k.direction='milestone' THEN CASE WHEN actual>=COALESCE(k.target,100) THEN 1 ELSE greatest(actual/nullif(COALESCE(k.target,100),0),0) END
    ELSE NULL END;
  disp := CASE WHEN frac IS NULL THEN NULL ELSE round(least(greatest(frac,0),1),4) END;
  expected := public.strata_kr_expected_progress(p_kr, p_as_of);
  thr := k.status_thresholds; on_thr := COALESCE((thr->>'on_track')::numeric, 0.7); at_thr := COALESCE((thr->>'at_risk')::numeric, 0.4);
  IF disp IS NULL THEN perf := 'not_assessed';
  ELSIF expected IS NOT NULL AND expected > 0 THEN ratio := disp/expected;
    perf := CASE WHEN ratio>=0.95 THEN 'on_track' WHEN ratio>=0.8 THEN 'at_risk' ELSE 'off_track' END;
  ELSE perf := CASE WHEN disp>=on_thr THEN 'on_track' WHEN disp>=at_thr THEN 'at_risk' ELSE 'off_track' END;
  END IF;
  RETURN jsonb_build_object('kr_id', p_kr, 'source', src, 'as_of', p_as_of, 'observation_id', obs.id,
    'actual', actual, 'baseline', k.baseline, 'target', k.target, 'direction', k.direction,
    'progress_raw', frac, 'progress', disp,
    'progress_pct', CASE WHEN disp IS NULL THEN NULL ELSE round(disp*100)::int END,
    'expected_progress', expected, 'performance_status', perf,
    'confidence', COALESCE(conf,'not_set'), 'data_quality', dq);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_kr_progress(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_okr_official_progress_v2(p_okr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE okr record; ver record; kr record; rep jsonb; prg jsonb; disp numeric; w numeric;
  n_reportable int := 0; n_excluded int := 0; n_with_obs int := 0; n_critical_fail int := 0;
  sum_simple numeric := 0; cnt_simple int := 0; sum_w numeric := 0; sum_wp numeric := 0;
  all_weighted boolean := true; all_must_pass boolean := false; obj_flag text; official numeric; method text;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO okr FROM public.strata_okrs WHERE id=p_okr;
  IF okr.id IS NULL THEN RETURN jsonb_build_object('error','OKR_NOT_FOUND'); END IF;
  SELECT * INTO ver FROM public.strata_okr_versions WHERE id=okr.current_version_id;
  all_must_pass := COALESCE(ver.all_must_pass,false);
  FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id=p_okr AND COALESCE(lifecycle,'active')<>'retired' LOOP
    rep := public.strata_kr_reportability(kr.id, p_as_of);
    IF NOT (rep->>'reportable')::boolean THEN n_excluded := n_excluded + 1; CONTINUE; END IF;
    n_reportable := n_reportable + 1;
    prg := public.strata_kr_progress(kr.id, p_as_of);
    disp := (prg->>'progress')::numeric;
    IF disp IS NOT NULL THEN
      n_with_obs := n_with_obs + 1; sum_simple := sum_simple + disp; cnt_simple := cnt_simple + 1; w := kr.weight;
      IF w IS NULL THEN all_weighted := false; ELSE sum_w := sum_w + w; sum_wp := sum_wp + w*disp; END IF;
      IF kr.is_critical AND disp < COALESCE((kr.status_thresholds->>'on_track')::numeric, 0.7) THEN n_critical_fail := n_critical_fail + 1; END IF;
    ELSE all_weighted := false;
    END IF;
  END LOOP;
  IF n_with_obs = 0 THEN official := NULL; method := 'none';
  ELSIF all_weighted AND sum_w > 0 THEN official := round(sum_wp/sum_w,4); method := 'weighted';
  ELSE official := round(sum_simple/cnt_simple,4); method := 'average'; END IF;
  obj_flag := CASE
    WHEN n_reportable=0 THEN 'no_reportable_krs'
    WHEN n_critical_fail>0 THEN 'critical_kr_failing'
    WHEN all_must_pass AND official IS NOT NULL AND official < 1 THEN 'all_must_pass_not_met'
    WHEN n_with_obs < n_reportable THEN 'incomplete_coverage'
    ELSE 'assessable' END;
  RETURN jsonb_build_object('okr_id', p_okr, 'official_progress', official, 'method', method,
    'weighted_denominator', CASE WHEN method='weighted' THEN sum_w ELSE NULL END,
    'reportable_krs', n_reportable, 'excluded_krs', n_excluded, 'krs_with_eligible_observation', n_with_obs,
    'coverage', CASE WHEN n_reportable>0 THEN round(n_with_obs::numeric/n_reportable,4) ELSE NULL END,
    'critical_failures', n_critical_fail, 'all_must_pass', all_must_pass, 'objective_flag', obj_flag);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_okr_official_progress_v2(uuid,date) TO authenticated;
