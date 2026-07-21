-- CAT-STRATA-EXECMODEL-20260721-001 — Stage 1b (S17): Objective-owned readiness/health repair.
-- Finding #31: strata_element_okr_readiness / strata_element_health_from_kr claimed an
-- Objective->OKR->KR basis but queried `WHERE theme_id = p_element`, so they could never serve a
-- Strategic Objective (the theme-ownership trigger blocks an Objective as theme_id). Repaired to
-- traverse the authoritative objective_id (S16): an Objective element matches directly; a Theme
-- element rolls up its child Objectives. Signatures + return shape unchanged (no consumer break).
-- Applied to staging (cyijbdeuehohvhnsywig) as version 20260721104529; ledger 1:1 with this file.

CREATE OR REPLACE FUNCTION public.strata_element_okr_readiness(p_element uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE okr record; n_okrs int:=0; n_active int:=0; n_reportable_krs int:=0; n_total_krs int:=0; kr record; rep jsonb;
BEGIN
  FOR okr IN
    SELECT o.* FROM public.strata_okrs o
    WHERE o.objective_id = p_element
       OR o.objective_id IN (SELECT c.id FROM public.strata_strategy_elements c
                             WHERE c.parent_id = p_element AND c.element_type='objective')
  LOOP
    n_okrs := n_okrs + 1;
    IF okr.status = 'active' THEN n_active := n_active + 1;
      FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id = okr.id AND COALESCE(lifecycle,'active')<>'retired' LOOP
        n_total_krs := n_total_krs + 1;
        rep := public.strata_kr_reportability(kr.id, p_as_of);
        IF (rep->>'reportable')::boolean THEN n_reportable_krs := n_reportable_krs + 1; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('element_id', p_element, 'okrs', n_okrs, 'active_okrs', n_active,
    'total_krs', n_total_krs, 'reportable_krs', n_reportable_krs,
    'ready', (n_active > 0 AND n_reportable_krs > 0),
    'readiness_basis', 'Objective-owned OKR -> reportable KR (STRATA-KPI-041; S16 objective_id, EXECMODEL S17)');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_element_okr_readiness(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_element_health_from_kr(p_element uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE okr record; sum_p numeric:=0; cnt int:=0; worst text:='on_track'; prog jsonb; health text;
BEGIN
  FOR okr IN
    SELECT o.* FROM public.strata_okrs o
    WHERE o.status='active' AND (
      o.objective_id = p_element
      OR o.objective_id IN (SELECT c.id FROM public.strata_strategy_elements c
                            WHERE c.parent_id = p_element AND c.element_type='objective'))
  LOOP
    prog := public.strata_okr_official_progress_v2(okr.id, p_as_of);
    IF (prog->>'official_progress') IS NOT NULL THEN
      sum_p := sum_p + (prog->>'official_progress')::numeric; cnt := cnt + 1;
      IF prog->>'objective_flag' IN ('critical_kr_failing','all_must_pass_not_met') THEN worst := 'off_track';
      ELSIF prog->>'objective_flag' = 'incomplete_coverage' AND worst <> 'off_track' THEN worst := 'at_risk'; END IF;
    END IF;
  END LOOP;
  health := CASE WHEN cnt=0 THEN 'not_assessed' ELSE worst END;
  RETURN jsonb_build_object('element_id', p_element, 'assessed_okrs', cnt,
    'avg_official_progress', CASE WHEN cnt>0 THEN round(sum_p/cnt,4) ELSE NULL END,
    'outcome_health', health, 'basis', 'Objective-owned approved KR results (STRATA-KPI-042; S16 objective_id, EXECMODEL S17)');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_element_health_from_kr(uuid,date) TO authenticated;
