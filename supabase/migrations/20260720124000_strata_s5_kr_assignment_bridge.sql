-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S5 — additive KR<->Assignment bridge (D-1)
-- Forward-only, ADDITIVE. Reconciles the shipped independent-KR model with the prompt's
-- decisions #10/#14 WITHOUT moving any existing OKR number:
--   * an OPTIONAL strategic_assignment_id makes a KR officially KPI-backed via an approved,
--     KR-eligible Strategic KPI Assignment (STRATA-KPI-014).
--   * standalone-default reportability is now a governed, per-OKR policy flag; EXISTING OKRs
--     are backfilled to 'legacy' (standalone reportable, as shipped) so their numbers are
--     frozen; NEW OKRs default to 'unofficial' per decision #10 (STRATA-KPI-013/016).
--   * assignment-backed KR progress resolves the assignment's eligible observation for its
--     period (STRATA-KPI-015/019) and a manual current_value can NEVER override it
--     (STRATA-KPI-017/018).
-- ---------------------------------------------------------------------------

-- 1. optional KR -> assignment link + governed standalone policy ---------------
ALTER TABLE public.strata_key_results
  ADD COLUMN IF NOT EXISTS strategic_assignment_id uuid REFERENCES public.strata_kpi_assignments(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.strata_key_results.strategic_assignment_id IS
  'Optional: an approved, KR-eligible Strategic KPI Assignment that officially backs this KR (STRATA-KPI-014). When set, official actuals come from the assignment observation, never from manual current_value.';

ALTER TABLE public.strata_okrs
  ADD COLUMN IF NOT EXISTS standalone_kr_policy text NOT NULL DEFAULT 'unofficial'
    CHECK (standalone_kr_policy IN ('legacy','unofficial'));
COMMENT ON COLUMN public.strata_okrs.standalone_kr_policy IS
  'Governed policy for standalone (non-KPI-backed) KRs. legacy = standalone KRs count officially (shipped behavior, frozen for existing OKRs); unofficial = standalone KRs excluded from official progress by default (decision #10). New OKRs default to unofficial.';
-- backfill existing OKRs to legacy so their official numbers do not move (D-1)
UPDATE public.strata_okrs SET standalone_kr_policy = 'legacy' WHERE standalone_kr_policy = 'unofficial' AND created_at < now();

-- 2. link / unlink RPCs (material contract change -> OKR must be draft/rejected) ---
CREATE OR REPLACE FUNCTION public.strata_link_kr_assignment(p_kr uuid, p_assignment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kr record; a record; kpi record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO kr FROM public.strata_key_results WHERE id = p_kr;
  IF kr.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  PERFORM public.strata_kr_assert_editable(p_kr);   -- STRATA-KPI-021: only while OKR draft/rejected
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: only an approved assignment can back a KR (current: %)', a.status; END IF;
  IF NOT a.kr_eligible THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: assignment is not KR-eligible'; END IF;
  SELECT * INTO kpi FROM public.strata_kpis WHERE id = a.kpi_id;
  IF NOT kpi.kr_eligible THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: the KPI Definition is not KR-eligible (STRATA-KPI-005)'; END IF;
  UPDATE public.strata_key_results
     SET strategic_assignment_id = p_assignment, lock_version = lock_version + 1, updated_at = now()
   WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_link_kr_assignment(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_unlink_kr_assignment(p_kr uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  PERFORM public.strata_kr_assert_editable(p_kr);
  UPDATE public.strata_key_results SET strategic_assignment_id = NULL, lock_version = lock_version + 1, updated_at = now() WHERE id = p_kr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_unlink_kr_assignment(uuid) TO authenticated;

-- 3. reportability: assignment-backed / legacy-KPI / standalone-by-policy --------
CREATE OR REPLACE FUNCTION public.strata_kr_reportability(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kr record; kpi record; eff uuid; act record; a record; obs jsonb; okr record;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO kr FROM public.strata_key_results WHERE id = p_kr;
  IF kr.id IS NULL THEN RAISE EXCEPTION 'key result not found'; END IF;

  -- (a) assignment-backed KR (STRATA-KPI-014/015): official via an approved Strategic KPI Assignment
  IF kr.strategic_assignment_id IS NOT NULL THEN
    SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = kr.strategic_assignment_id;
    IF a.id IS NULL OR a.status <> 'approved' THEN
      RETURN jsonb_build_object('reportable', false, 'kind', 'assignment_backed', 'label', 'Non-reportable',
        'qualified', false, 'assignment_id', kr.strategic_assignment_id,
        'reason', format('backing assignment is %s, not approved', coalesce(a.status,'missing')));
    END IF;
    obs := public.strata_resolve_assignment_observation(a.id, a.start_period_id, p_as_of);
    IF NOT (obs->>'resolved')::boolean THEN
      RETURN jsonb_build_object('reportable', false, 'kind', 'assignment_backed', 'label', 'Non-reportable',
        'qualified', false, 'assignment_id', a.id,
        'reason', 'no eligible (validated / accepted-with-exception) observation for the assignment period');
    END IF;
    RETURN jsonb_build_object('reportable', true, 'kind', 'assignment_backed',
      'label', CASE WHEN (obs->>'exception')::boolean THEN 'Reportable (accepted with exception)' ELSE 'Reportable' END,
      'qualified', (obs->>'exception')::boolean, 'assignment_id', a.id, 'observation_id', obs->>'observation_id');
  END IF;

  -- (b) legacy KPI-backed KR (unchanged from shipped behavior)
  IF kr.kpi_id IS NOT NULL THEN
    SELECT * INTO kpi FROM public.strata_kpis WHERE id = kr.kpi_id;
    IF kpi.id IS NULL OR kpi.status <> 'approved' THEN
      RETURN jsonb_build_object('reportable', false, 'kind', 'kpi_backed', 'label', 'Non-reportable', 'qualified', false,
        'kpi_id', kr.kpi_id, 'kpi_name', kpi.name, 'kpi_state', coalesce(kpi.status,'unknown'),
        'reason', format('linked KPI is %s, not approved — authoring only', coalesce(kpi.status,'missing')));
    END IF;
    eff := public.strata_resolve_kpi_effective(kr.kpi_id, p_as_of::timestamptz);
    SELECT * INTO act FROM public.strata_kpi_actuals aa
     WHERE aa.kpi_id = eff AND aa.validation_status IN ('validated','accepted_with_exception')
     ORDER BY aa.submitted_at DESC NULLS LAST LIMIT 1;
    IF act.id IS NULL THEN
      RETURN jsonb_build_object('reportable', false, 'kind', 'kpi_backed', 'label', 'Non-reportable', 'qualified', false,
        'kpi_id', kr.kpi_id, 'resolved_kpi_id', eff, 'kpi_state', 'approved',
        'reason', 'no eligible (validated / accepted-with-exception) actual for the effective KPI version');
    END IF;
    RETURN jsonb_build_object('reportable', true, 'kind', 'kpi_backed',
      'label', CASE WHEN act.validation_status = 'accepted_with_exception' THEN 'Reportable (accepted with exception)' ELSE 'Reportable' END,
      'qualified', act.validation_status = 'accepted_with_exception',
      'kpi_id', kr.kpi_id, 'resolved_kpi_id', eff, 'kpi_state', 'approved',
      'actual_id', act.id, 'actual_status', act.validation_status);
  END IF;

  -- (c) standalone KR — governed by the OKR's standalone_kr_policy (STRATA-KPI-013/016)
  SELECT * INTO okr FROM public.strata_okrs WHERE id = kr.okr_id;
  IF COALESCE(okr.standalone_kr_policy,'legacy') = 'unofficial' THEN
    RETURN jsonb_build_object('reportable', false, 'kind', 'standalone', 'label', 'Standalone (unofficial)',
      'qualified', false, 'kpi_state', null, 'reason', 'STANDALONE_UNOFFICIAL: standalone KRs are excluded from official progress by policy');
  END IF;
  RETURN jsonb_build_object('reportable', true, 'kind', 'standalone',
    'label', 'Standalone measurement', 'qualified', false, 'kpi_state', null);
END; $function$;
COMMENT ON FUNCTION public.strata_kr_reportability(uuid, date) IS
  'Whether a KR counts toward official OKR progress (KO-DEF-003 + KPI-OPMODEL S5). Assignment-backed KRs resolve the assignment observation; legacy KPI-backed unchanged; standalone governed by the OKR standalone_kr_policy (legacy=reportable, unofficial=excluded). Existing OKRs backfilled to legacy — no number moves.';
GRANT EXECUTE ON FUNCTION public.strata_kr_reportability(uuid, date) TO authenticated;

-- 4. progress: assignment observation takes precedence; manual cannot override ----
CREATE OR REPLACE FUNCTION public.strata_kr_progress(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; obs record; a record; aobs jsonb; actual numeric; src text; frac numeric; disp numeric;
  expected numeric; perf text; dq text; conf text; thr jsonb; on_thr numeric; at_thr numeric; ratio numeric;
  v_obs_id uuid;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RETURN jsonb_build_object('error','KR_NOT_FOUND'); END IF;

  -- STRATA-KPI-017/018/019: assignment-backed value comes ONLY from the assignment observation
  -- (period-scoped); a manual current_value can never override it.
  IF k.strategic_assignment_id IS NOT NULL THEN
    SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = k.strategic_assignment_id;
    aobs := public.strata_resolve_assignment_observation(k.strategic_assignment_id, a.start_period_id, p_as_of);
    IF (aobs->>'resolved')::boolean THEN
      actual := (aobs->>'value')::numeric; src := 'assignment_observation';
      dq := CASE WHEN (aobs->>'exception')::boolean THEN 'exception' ELSE 'fresh' END;
      v_obs_id := (aobs->>'observation_id')::uuid;
    ELSE
      actual := NULL; src := 'assignment_pending'; dq := 'missing'; v_obs_id := NULL;
    END IF;
  ELSE
    SELECT * INTO obs FROM public.strata_kr_observations o
     WHERE o.kr_id=p_kr AND o.validation_status IN ('validated','accepted_with_exception') AND o.as_of_date <= p_as_of
     ORDER BY o.as_of_date DESC, o.submitted_at DESC LIMIT 1;
    IF obs.id IS NOT NULL THEN actual := obs.actual_value; src := 'observation'; conf := obs.confidence; dq := 'fresh'; v_obs_id := obs.id;
    ELSIF EXISTS (SELECT 1 FROM public.strata_kr_observations o WHERE o.kr_id=p_kr AND o.validation_status='pending') THEN
      actual := k.current_value; src := 'legacy_current_value'; dq := 'unvalidated';
    ELSE actual := k.current_value; src := CASE WHEN k.current_value IS NULL THEN 'none' ELSE 'legacy_current_value' END;
      dq := CASE WHEN k.current_value IS NULL THEN 'missing' ELSE 'legacy' END;
    END IF;
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

  RETURN jsonb_build_object('kr_id', p_kr, 'source', src, 'as_of', p_as_of, 'observation_id', v_obs_id,
    'actual', actual, 'baseline', k.baseline, 'target', k.target, 'direction', k.direction,
    'progress_raw', frac, 'progress', disp,
    'progress_pct', CASE WHEN disp IS NULL THEN NULL ELSE round(disp*100)::int END,
    'expected_progress', expected, 'performance_status', perf,
    'confidence', COALESCE(conf,'not_set'), 'data_quality', dq);
END; $function$;
COMMENT ON FUNCTION public.strata_kr_progress(uuid,date) IS
  'Direction-safe KR progress (invariant 9 + KPI-OPMODEL S5). An assignment-backed KR sources ONLY the period-scoped assignment observation (source=assignment_observation); a manual current_value can never override it (STRATA-KPI-017/018/019). Legacy/standalone paths unchanged.';
GRANT EXECUTE ON FUNCTION public.strata_kr_progress(uuid,date) TO authenticated;
