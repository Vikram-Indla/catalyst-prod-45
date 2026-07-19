-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 4: append-only KR observation ledger, the four
-- update channels (manual / upload / integration / composite), maker-checker validation, and
-- the direction-safe calculation engine with separated progress / performance status /
-- confidence / data-quality (invariants 8,9,10,14,15,16,17). Fixes KO-DEF-004 at the source:
-- the calc exposes an authoritative rounded display value, never a raw float, for UI + a11y.
--
-- An observation is append-only evidence (never an in-place current_value edit). Official
-- progress resolves only to eligible (validated / accepted_with_exception) observations.
-- Legacy flat current_value is used only as a fallback for pre-observation migrated KRs.

-- ===========================================================================
-- 1. strata_kr_observations — append-only ledger
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kr_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES public.strata_key_results(id) ON DELETE CASCADE,
  kr_version_id uuid REFERENCES public.strata_kr_versions(id) ON DELETE SET NULL,
  reporting_period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  as_of_date date NOT NULL DEFAULT current_date,
  actual_value numeric,
  numerator numeric, denominator numeric, components jsonb,
  unit text, unit_id uuid REFERENCES public.strata_units_of_measure(id) ON DELETE SET NULL,
  source_channel text NOT NULL CHECK (source_channel IN ('manual','upload','integration','composite')),
  source_event_key text,
  data_source_id uuid REFERENCES public.strata_data_sources(id) ON DELETE SET NULL,
  upload_run_id uuid,
  integration_run_id text,
  submitted_by uuid NOT NULL DEFAULT auth.uid(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('staged','pending','validated','rejected','quarantined','accepted_with_exception','reversed','superseded')),
  validated_by uuid, validated_at timestamptz,
  exception_reason text, exception_authorized_by uuid, exception_authorized_at timestamptz,
  rejection_reason text,
  reversal_reason text, reversed_by_obs_id uuid REFERENCES public.strata_kr_observations(id) ON DELETE SET NULL,
  restatement_of_obs_id uuid REFERENCES public.strata_kr_observations(id) ON DELETE SET NULL,
  formula_id uuid, formula_version int,
  target_version_used uuid, phased_target_used numeric,
  commentary text,
  forecast_value numeric,
  confidence text CHECK (confidence IS NULL OR confidence IN ('high','medium','low','not_set')),
  confidence_rationale text,
  evidence_refs jsonb,
  correlation_id uuid DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_kr_obs_sod CHECK (validated_by IS NULL OR validated_by <> submitted_by),
  CONSTRAINT strata_kr_obs_exception_complete CHECK (
    validation_status <> 'accepted_with_exception'
    OR (exception_reason IS NOT NULL AND exception_authorized_by IS NOT NULL)),
  CONSTRAINT strata_kr_obs_exception_sod CHECK (
    exception_authorized_by IS NULL OR exception_authorized_by <> submitted_by)
);
COMMENT ON TABLE public.strata_kr_observations IS
  'Append-only KR observation ledger (CAT-STRATA-THEMEOKR-20260719-001, invariants 8-10,17). Never edited in place; correction is reversal/restatement. Only validated/accepted_with_exception count officially.';
CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_kr_obs_idem
  ON public.strata_kr_observations(kr_id, source_channel, source_event_key) WHERE source_event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strata_kr_obs_kr ON public.strata_kr_observations(kr_id, as_of_date DESC, submitted_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_kr_observations_audit') THEN
    CREATE TRIGGER trg_strata_kr_observations_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_kr_observations
      FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
END $$;

ALTER TABLE public.strata_kr_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_kr_obs_select ON public.strata_kr_observations FOR SELECT
  USING (public.current_user_is_approved());
-- submitters insert pending/staged rows only; validation fields untouched at insert (maker-checker)
CREATE POLICY strata_kr_obs_insert ON public.strata_kr_observations FOR INSERT
  WITH CHECK (
    public.strata_has_role(ARRAY['kr_reporter','kr_owner','okr_owner','data_steward','strategy_office'])
    AND submitted_by = auth.uid()
    AND validation_status IN ('pending','staged')
    AND validated_by IS NULL);
-- clients edit only their own still-pending rows; validation is RPC-only
CREATE POLICY strata_kr_obs_update ON public.strata_kr_observations FOR UPDATE
  USING (validation_status IN ('pending','staged') AND submitted_by = auth.uid())
  WITH CHECK (validation_status IN ('pending','staged') AND validated_by IS NULL);
CREATE POLICY strata_kr_obs_delete ON public.strata_kr_observations FOR DELETE
  USING (validation_status IN ('pending','staged') AND (submitted_by = auth.uid() OR public.strata_is_admin()));

-- Immutability guard: an eligible/locked observation is append-only (correct via reversal/restatement).
CREATE OR REPLACE FUNCTION public.strata_guard_kr_observation() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.validation_status IN ('validated','accepted_with_exception','reversed','superseded') THEN
      RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: an eligible/locked observation cannot be deleted — reverse or restate'; END IF;
    RETURN OLD;
  END IF;
  -- once eligible, only the reversal/supersession bookkeeping fields may change (done via RPC)
  IF OLD.validation_status IN ('validated','accepted_with_exception')
     AND NEW.validation_status NOT IN ('reversed','superseded')
     AND (NEW.actual_value, NEW.numerator, NEW.denominator, NEW.as_of_date)
         IS DISTINCT FROM (OLD.actual_value, OLD.numerator, OLD.denominator, OLD.as_of_date) THEN
    RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: an eligible observation is immutable — reverse or restate instead';
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_guard_kr_observation ON public.strata_kr_observations;
CREATE TRIGGER trg_strata_guard_kr_observation BEFORE UPDATE OR DELETE ON public.strata_kr_observations
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_kr_observation();

-- ===========================================================================
-- 2. Direction-safe KR calculation — progress / status / confidence / data-quality
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_kr_expected_progress(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; pt numeric; frac numeric;
BEGIN
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL OR k.baseline IS NULL OR k.target IS NULL OR k.baseline=k.target THEN RETURN NULL; END IF;
  -- expected from the latest phased target whose period ends on/before as_of (not mere elapsed time)
  SELECT t.phased_target INTO pt
    FROM public.strata_kr_targets t JOIN public.strata_periods p ON p.id=t.period_id
   WHERE t.kr_id=p_kr AND t.phased_target IS NOT NULL AND COALESCE(p.ends_on, p_as_of) <= p_as_of
   ORDER BY p.ends_on DESC NULLS LAST LIMIT 1;
  IF pt IS NULL THEN RETURN NULL; END IF;
  frac := (pt - k.baseline) / (k.target - k.baseline);
  RETURN round(least(greatest(frac,0),1),4);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_kr_expected_progress(uuid,date) TO authenticated;

-- Latest eligible observation, else legacy current_value fallback. Returns rich, SEPARATED status.
CREATE OR REPLACE FUNCTION public.strata_kr_progress(p_kr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  k record; obs record; actual numeric; src text; frac numeric; disp numeric; expected numeric;
  perf text; dq text; conf text; thr jsonb; on_thr numeric; at_thr numeric; ratio numeric;
BEGIN
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RETURN jsonb_build_object('error','KR_NOT_FOUND'); END IF;

  SELECT * INTO obs FROM public.strata_kr_observations o
   WHERE o.kr_id=p_kr AND o.validation_status IN ('validated','accepted_with_exception')
     AND o.as_of_date <= p_as_of
   ORDER BY o.as_of_date DESC, o.submitted_at DESC LIMIT 1;

  IF obs.id IS NOT NULL THEN actual := obs.actual_value; src := 'observation'; conf := obs.confidence; dq := 'fresh';
  ELSIF EXISTS (SELECT 1 FROM public.strata_kr_observations o WHERE o.kr_id=p_kr AND o.validation_status='pending') THEN
    actual := k.current_value; src := 'legacy_current_value'; dq := 'unvalidated';
  ELSE actual := k.current_value; src := CASE WHEN k.current_value IS NULL THEN 'none' ELSE 'legacy_current_value' END;
    dq := CASE WHEN k.current_value IS NULL THEN 'missing' ELSE 'legacy' END;
  END IF;

  -- direction-safe fraction (baseline-aware; single formula covers higher/lower/custom)
  frac := CASE
    WHEN actual IS NULL THEN NULL
    WHEN k.direction IN ('higher_better','lower_better','custom_curve') AND k.target IS NOT NULL AND k.baseline IS NOT NULL AND k.target<>k.baseline
      THEN (actual - k.baseline)/(k.target - k.baseline)
    WHEN k.direction IN ('within_range','band') AND k.range_min IS NOT NULL AND k.range_max IS NOT NULL
      THEN CASE WHEN actual BETWEEN least(k.range_min,k.range_max) AND greatest(k.range_min,k.range_max) THEN 1 ELSE 0 END
    WHEN k.direction='maintain_above' AND k.target IS NOT NULL
      THEN CASE WHEN actual>=k.target THEN 1 ELSE greatest(actual/nullif(k.target,0),0) END
    WHEN k.direction='maintain_below' AND k.target IS NOT NULL
      THEN CASE WHEN actual<=k.target THEN 1 ELSE 0 END
    WHEN k.direction='exact_target' AND k.target IS NOT NULL
      THEN CASE WHEN actual=k.target THEN 1 ELSE 0 END
    WHEN k.direction='milestone'
      THEN CASE WHEN actual>=COALESCE(k.target,100) THEN 1 ELSE greatest(actual/nullif(COALESCE(k.target,100),0),0) END
    ELSE NULL END;

  disp := CASE WHEN frac IS NULL THEN NULL ELSE round(least(greatest(frac,0),1),4) END;
  expected := public.strata_kr_expected_progress(p_kr, p_as_of);

  -- performance status (SEPARATE from progress, confidence, lifecycle, data-quality)
  thr := k.status_thresholds;
  on_thr := COALESCE((thr->>'on_track')::numeric, 0.7);
  at_thr := COALESCE((thr->>'at_risk')::numeric, 0.4);
  IF disp IS NULL THEN perf := 'not_assessed';
  ELSIF expected IS NOT NULL AND expected > 0 THEN
    ratio := disp/expected;
    perf := CASE WHEN ratio>=0.95 THEN 'on_track' WHEN ratio>=0.8 THEN 'at_risk' ELSE 'off_track' END;
  ELSE
    perf := CASE WHEN disp>=on_thr THEN 'on_track' WHEN disp>=at_thr THEN 'at_risk' ELSE 'off_track' END;
  END IF;

  RETURN jsonb_build_object(
    'kr_id', p_kr, 'source', src, 'as_of', p_as_of, 'observation_id', obs.id,
    'actual', actual, 'baseline', k.baseline, 'target', k.target, 'direction', k.direction,
    'progress_raw', frac,                          -- uncapped, full precision (evidence)
    'progress', disp,                              -- capped [0,1], 4dp (authoritative)
    'progress_pct', CASE WHEN disp IS NULL THEN NULL ELSE round(disp*100)::int END, -- KO-DEF-004: whole-percent display
    'expected_progress', expected,
    'performance_status', perf,                    -- on_track|at_risk|off_track|not_assessed
    'confidence', COALESCE(conf,'not_set'),        -- separate
    'data_quality', dq                             -- fresh|legacy|unvalidated|missing (separate)
  );
END; $function$;
COMMENT ON FUNCTION public.strata_kr_progress(uuid,date) IS
  'Direction-safe KR progress from the latest eligible observation (invariant 9). Returns SEPARATED progress / performance_status / confidence / data_quality. progress_pct is the authoritative rounded display (KO-DEF-004); progress_raw keeps full precision for evidence.';
GRANT EXECUTE ON FUNCTION public.strata_kr_progress(uuid,date) TO authenticated;

-- Objective roll-up: reportable KRs only, critical / all-must-pass / weights, coverage disclosed.
CREATE OR REPLACE FUNCTION public.strata_okr_official_progress_v2(p_okr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  okr record; ver record; kr record; rep jsonb; prg jsonb; disp numeric; w numeric;
  n_reportable int := 0; n_excluded int := 0; n_with_obs int := 0; n_critical_fail int := 0;
  sum_simple numeric := 0; cnt_simple int := 0; sum_w numeric := 0; sum_wp numeric := 0;
  all_weighted boolean := true; all_must_pass boolean := false; obj_flag text;
  official numeric; method text;
BEGIN
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
      n_with_obs := n_with_obs + 1;
      sum_simple := sum_simple + disp; cnt_simple := cnt_simple + 1;
      w := kr.weight;
      IF w IS NULL THEN all_weighted := false; ELSE sum_w := sum_w + w; sum_wp := sum_wp + w*disp; END IF;
      IF kr.is_critical AND disp < COALESCE((kr.status_thresholds->>'on_track')::numeric, 0.7) THEN
        n_critical_fail := n_critical_fail + 1; END IF;
    ELSE
      -- reportable KR with no eligible observation: cannot silently normalise it away
      all_weighted := false;
    END IF;
  END LOOP;

  IF n_with_obs = 0 THEN official := NULL; method := 'none';
  ELSIF all_weighted AND sum_w > 0 THEN official := round(sum_wp/sum_w,4); method := 'weighted';
  ELSE official := round(sum_simple/cnt_simple,4); method := 'average'; END IF;

  -- objective flag never hides a critical failure or an all-must-pass shortfall behind an average
  obj_flag := CASE
    WHEN n_reportable=0 THEN 'no_reportable_krs'
    WHEN n_critical_fail>0 THEN 'critical_kr_failing'
    WHEN all_must_pass AND official IS NOT NULL AND official < 1 THEN 'all_must_pass_not_met'
    WHEN n_with_obs < n_reportable THEN 'incomplete_coverage'
    ELSE 'assessable' END;

  RETURN jsonb_build_object(
    'okr_id', p_okr, 'official_progress', official, 'method', method,
    'weighted_denominator', CASE WHEN method='weighted' THEN sum_w ELSE NULL END,
    'reportable_krs', n_reportable, 'excluded_krs', n_excluded,
    'krs_with_eligible_observation', n_with_obs,
    'coverage', CASE WHEN n_reportable>0 THEN round(n_with_obs::numeric/n_reportable,4) ELSE NULL END,
    'critical_failures', n_critical_fail, 'all_must_pass', all_must_pass,
    'objective_flag', obj_flag);
END; $function$;
COMMENT ON FUNCTION public.strata_okr_official_progress_v2(uuid,date) IS
  'Objective roll-up over REPORTABLE KRs from eligible observations (invariants 9,14). No blind average: exposes coverage, critical failures, all-must-pass, weighting method + denominator; never normalises away a missing/failing required KR.';
GRANT EXECUTE ON FUNCTION public.strata_okr_official_progress_v2(uuid,date) TO authenticated;

-- ===========================================================================
-- 3. Update channels
-- ===========================================================================
-- Manual
CREATE OR REPLACE FUNCTION public.strata_submit_kr_observation(
  p_kr uuid, p_period uuid, p_as_of date, p_value numeric,
  p_numerator numeric DEFAULT NULL, p_denominator numeric DEFAULT NULL,
  p_commentary text DEFAULT NULL, p_forecast numeric DEFAULT NULL,
  p_confidence text DEFAULT NULL, p_confidence_rationale text DEFAULT NULL, p_evidence jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kr_reporter','kr_owner','okr_owner','data_steward','strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: submitting an observation requires a reporter/owner/steward role'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  IF p_confidence IS NOT NULL AND p_confidence NOT IN ('high','medium','low','not_set') THEN
    RAISE EXCEPTION 'INVALID_OKR: confidence must be high|medium|low|not_set'; END IF;
  INSERT INTO public.strata_kr_observations
    (kr_id, kr_version_id, reporting_period_id, as_of_date, actual_value, numerator, denominator, unit_id,
     source_channel, submitted_by, validation_status, formula_id, formula_version, commentary, forecast_value,
     confidence, confidence_rationale, evidence_refs)
  VALUES
    (p_kr, k.current_version_id, p_period, COALESCE(p_as_of,current_date), p_value, p_numerator, p_denominator, k.unit_id,
     'manual', auth.uid(), 'pending', k.formula_id, k.formula_version, p_commentary, p_forecast,
     COALESCE(p_confidence,'not_set'), p_confidence_rationale, p_evidence)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_kr_observation(uuid,uuid,date,numeric,numeric,numeric,text,numeric,text,text,jsonb) TO authenticated;

-- Integration (idempotent on kr_id + source_event_key)
CREATE OR REPLACE FUNCTION public.strata_ingest_kr_observation(
  p_kr uuid, p_source_event_key text, p_value numeric, p_as_of date,
  p_period uuid DEFAULT NULL, p_integration_run text DEFAULT NULL, p_data_source uuid DEFAULT NULL,
  p_numerator numeric DEFAULT NULL, p_denominator numeric DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; v_id uuid; existing uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kr_reporter','kr_owner','data_steward','strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: integration ingestion requires a reporter/steward role'; END IF;
  IF p_source_event_key IS NULL OR btrim(p_source_event_key)='' THEN
    RAISE EXCEPTION 'DUPLICATE_SOURCE_EVENT: a source_event_key is required for idempotent ingestion'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  SELECT id INTO existing FROM public.strata_kr_observations
   WHERE kr_id=p_kr AND source_channel='integration' AND source_event_key=p_source_event_key;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object('observation_id', existing, 'idempotent_replay', true); END IF;
  INSERT INTO public.strata_kr_observations
    (kr_id, kr_version_id, reporting_period_id, as_of_date, actual_value, numerator, denominator, unit_id,
     source_channel, source_event_key, integration_run_id, data_source_id, submitted_by, validation_status)
  VALUES
    (p_kr, k.current_version_id, p_period, COALESCE(p_as_of,current_date), p_value, p_numerator, p_denominator, k.unit_id,
     'integration', p_source_event_key, p_integration_run, COALESCE(p_data_source,k.data_source_id), auth.uid(), 'pending')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('observation_id', v_id, 'idempotent_replay', false);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_ingest_kr_observation(uuid,text,numeric,date,uuid,text,uuid,numeric,numeric) TO authenticated;

-- Upload: stage (no official write) then promote to pending-for-validation
CREATE OR REPLACE FUNCTION public.strata_stage_kr_upload(
  p_kr uuid, p_source_event_key text, p_value numeric, p_as_of date, p_period uuid DEFAULT NULL, p_upload_run uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kr_reporter','kr_owner','data_steward','strategy_office']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  INSERT INTO public.strata_kr_observations
    (kr_id, kr_version_id, reporting_period_id, as_of_date, actual_value, unit_id,
     source_channel, source_event_key, upload_run_id, submitted_by, validation_status)
  VALUES
    (p_kr, k.current_version_id, p_period, COALESCE(p_as_of,current_date), p_value, k.unit_id,
     'upload', p_source_event_key, p_upload_run, auth.uid(), 'staged')  -- staged: never counts officially
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_stage_kr_upload(uuid,text,numeric,date,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_promote_kr_upload(p_upload_run uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: promoting an upload requires a data_steward/strategy_office role'; END IF;
  UPDATE public.strata_kr_observations
     SET validation_status='pending'
   WHERE upload_run_id=p_upload_run AND validation_status='staged';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;  -- promoted rows become pending; they still require maker-checker validation to count
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_promote_kr_upload(uuid) TO authenticated;

-- Composite: KR-owned formula over its own components/certified facts (never KPI business records)
CREATE OR REPLACE FUNCTION public.strata_calc_composite_kr(
  p_kr uuid, p_period uuid, p_numerator numeric, p_denominator numeric, p_as_of date DEFAULT current_date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; v numeric; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kr_owner','data_steward','strategy_office']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO k FROM public.strata_key_results WHERE id=p_kr;
  IF k.id IS NULL THEN RAISE EXCEPTION 'Key Result not found'; END IF;
  IF k.update_method <> 'composite' THEN RAISE EXCEPTION 'INVALID_OKR: KR update method is % not composite', k.update_method; END IF;
  IF p_denominator IS NULL OR p_denominator = 0 THEN RAISE EXCEPTION 'INVALID_FORMULA_UNIT_DIRECTION: composite denominator must be non-zero'; END IF;
  v := p_numerator / p_denominator;
  INSERT INTO public.strata_kr_observations
    (kr_id, kr_version_id, reporting_period_id, as_of_date, actual_value, numerator, denominator,
     source_channel, submitted_by, validation_status, formula_id, formula_version, components)
  VALUES
    (p_kr, k.current_version_id, p_period, p_as_of, v, p_numerator, p_denominator,
     'composite', auth.uid(), 'pending', k.formula_id, k.formula_version, k.component_def)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_calc_composite_kr(uuid,uuid,numeric,numeric,date) TO authenticated;

-- ===========================================================================
-- 4. Observation validation (maker-checker), reversal, restatement
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_validate_observation(
  p_obs uuid, p_verdict text, p_note text DEFAULT NULL, p_exception_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: validating an observation requires a data_steward/approver role'; END IF;
  IF p_verdict NOT IN ('validated','rejected','quarantined','accepted_with_exception') THEN
    RAISE EXCEPTION 'INVALID_OKR: verdict must be validated|rejected|quarantined|accepted_with_exception'; END IF;
  SELECT * INTO o FROM public.strata_kr_observations WHERE id=p_obs;
  IF o.id IS NULL THEN RAISE EXCEPTION 'observation not found'; END IF;
  IF o.validation_status NOT IN ('pending','quarantined') THEN
    RAISE EXCEPTION 'INELIGIBLE_OBSERVATION: only a pending/quarantined observation can be decided (current: %)', o.validation_status; END IF;
  IF o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot validate their own observation (maker-checker)'; END IF;
  IF p_verdict='accepted_with_exception' AND (p_exception_reason IS NULL OR btrim(p_exception_reason)='') THEN
    RAISE EXCEPTION 'INELIGIBLE_OBSERVATION: accept-with-exception requires a reason'; END IF;
  UPDATE public.strata_kr_observations
     SET validation_status = p_verdict, validated_by = auth.uid(), validated_at = now(),
         rejection_reason = CASE WHEN p_verdict='rejected' THEN COALESCE(p_note,'rejected') ELSE rejection_reason END,
         exception_reason = CASE WHEN p_verdict='accepted_with_exception' THEN p_exception_reason ELSE exception_reason END,
         exception_authorized_by = CASE WHEN p_verdict='accepted_with_exception' THEN auth.uid() ELSE exception_authorized_by END,
         exception_authorized_at = CASE WHEN p_verdict='accepted_with_exception' THEN now() ELSE exception_authorized_at END
   WHERE id = p_obs;
END; $function$;
COMMENT ON FUNCTION public.strata_validate_observation(uuid,text,text,text) IS
  'Maker-checker observation decision (invariant 8). Validator must differ from submitter; accept-with-exception needs a reason and a separate authoriser.';
GRANT EXECUTE ON FUNCTION public.strata_validate_observation(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_reverse_observation(p_obs uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','strategy_office']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'INVALID_OKR: a reversal reason is required'; END IF;
  SELECT * INTO o FROM public.strata_kr_observations WHERE id=p_obs;
  IF o.id IS NULL THEN RAISE EXCEPTION 'observation not found'; END IF;
  IF o.validation_status NOT IN ('validated','accepted_with_exception') THEN
    RAISE EXCEPTION 'INELIGIBLE_OBSERVATION: only an eligible observation can be reversed'; END IF;
  -- append a compensating reversing entry (never edit history)
  INSERT INTO public.strata_kr_observations
    (kr_id, kr_version_id, reporting_period_id, as_of_date, actual_value, source_channel,
     submitted_by, validation_status, reversal_reason, restatement_of_obs_id)
  VALUES
    (o.kr_id, o.kr_version_id, o.reporting_period_id, o.as_of_date, o.actual_value, o.source_channel,
     auth.uid(), 'reversed', p_reason, o.id)
  RETURNING id INTO v_id;
  UPDATE public.strata_kr_observations SET validation_status='reversed', reversed_by_obs_id=v_id WHERE id=p_obs;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_reverse_observation(uuid,text) TO authenticated;
