-- ─────────────────────────────────────────────────────────────────────────────
-- SC-GOVAPPROVAL P2 — stable semantic validation codes (backward-compatible)
-- CAT-STRATA-SC-GOVAPPROVAL-20260718-001 (20-min implementation pass)
--
-- The validator returned prose strings only, so the client mirrored the
-- classification logic and wording was the de-facto contract. This migration
-- adds AUTHORITATIVE codes + numeric parameters alongside the existing keys:
--
--   coverage: [{code, perspective_id, name, total, delta}] per weighted
--     perspective — NO_MEASURES | MEASURE_WEIGHTS_UNDER_100 |
--     MEASURE_WEIGHTS_OVER_100 | MEASURE_WEIGHTS_VALID
--   perspective_weights: {code, total, delta} — NO_PERSPECTIVES |
--     PERSPECTIVE_WEIGHTS_UNDER_100 | PERSPECTIVE_WEIGHTS_OVER_100 |
--     PERSPECTIVE_WEIGHTS_VALID
--
-- blockers / warnings / passed keep their exact strings — every existing
-- consumer (submit/approve blocker counting, UI checklist, tests) is
-- unchanged. Submit/approve already block on jsonb_array_length(blockers),
-- never on prose. Tolerance stays ±0.01.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.strata_validate_scorecard_model(p_model uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_blockers text[] := '{}';
  v_warnings text[] := '{}';
  v_passed   text[] := '{}';
  v_coverage jsonb := '[]'::jsonb;
  v_pw jsonb;
  v_wsum numeric;
  v_wcount int;
  r RECORD;
BEGIN
  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- Identity / scope / roll-up / granularity (NOT NULL + CHECKed at DDL level).
  IF btrim(coalesce(m.name,'')) = '' THEN
    v_blockers := v_blockers || 'Model name is blank'::text;
  ELSE
    v_passed := v_passed || 'Model identity complete (name, scope, roll-up, granularity)'::text;
  END IF;

  IF m.threshold_scheme_id IS NULL THEN
    v_blockers := v_blockers || 'No threshold scheme assigned — required before approval'::text;
  ELSE
    v_passed := v_passed || 'Threshold scheme assigned'::text;
  END IF;

  SELECT coalesce(sum(weight),0), count(*) INTO v_wsum, v_wcount
    FROM public.strata_scorecard_model_perspectives WHERE model_id = p_model;
  IF v_wcount = 0 THEN
    v_blockers := v_blockers || 'Model has no perspectives'::text;
    v_pw := jsonb_build_object('code','NO_PERSPECTIVES','total',0,'delta',100);
  ELSIF v_wsum < 100 - 0.01 THEN
    v_blockers := v_blockers || format('Perspective weights total %s — assign the remaining %s', v_wsum::text, (100 - v_wsum)::text);
    v_pw := jsonb_build_object('code','PERSPECTIVE_WEIGHTS_UNDER_100','total',v_wsum,'delta',100 - v_wsum);
  ELSIF v_wsum > 100 + 0.01 THEN
    v_blockers := v_blockers || format('Perspective weights total %s — remove %s', v_wsum::text, (v_wsum - 100)::text);
    v_pw := jsonb_build_object('code','PERSPECTIVE_WEIGHTS_OVER_100','total',v_wsum,'delta',v_wsum - 100);
  ELSE
    v_passed := v_passed || 'Perspective weights total 100'::text;
    v_pw := jsonb_build_object('code','PERSPECTIVE_WEIGHTS_VALID','total',v_wsum,'delta',0);
  END IF;

  -- Every weighted perspective needs measures whose weights total 100. The four
  -- coverage states are DISTINCT: an empty perspective is never healthy, and an
  -- underweight one must never be reported as "no measures assigned".
  FOR r IN
    SELECT mp.perspective_id, p.name AS pname,
           coalesce(sum(mm.weight), 0) AS msum,
           count(mm.id) AS mcount
      FROM public.strata_scorecard_model_perspectives mp
      JOIN public.strata_perspectives p ON p.id = mp.perspective_id
      LEFT JOIN public.strata_scorecard_model_measures mm
        ON mm.model_id = mp.model_id AND mm.perspective_id = mp.perspective_id
     WHERE mp.model_id = p_model
     GROUP BY mp.perspective_id, p.name
     ORDER BY p.name
  LOOP
    IF r.mcount = 0 THEN
      v_blockers := v_blockers || format('%s has no measures assigned', r.pname);
      v_coverage := v_coverage || jsonb_build_object('code','NO_MEASURES',
        'perspective_id',r.perspective_id,'name',r.pname,'total',0,'delta',0);
    ELSIF r.msum < 100 - 0.01 THEN
      v_blockers := v_blockers || format('%s measure weights total %s — assign the remaining %s', r.pname, r.msum::text, (100 - r.msum)::text);
      v_coverage := v_coverage || jsonb_build_object('code','MEASURE_WEIGHTS_UNDER_100',
        'perspective_id',r.perspective_id,'name',r.pname,'total',r.msum,'delta',100 - r.msum);
    ELSIF r.msum > 100 + 0.01 THEN
      v_blockers := v_blockers || format('%s measure weights total %s — remove %s', r.pname, r.msum::text, (r.msum - 100)::text);
      v_coverage := v_coverage || jsonb_build_object('code','MEASURE_WEIGHTS_OVER_100',
        'perspective_id',r.perspective_id,'name',r.pname,'total',r.msum,'delta',r.msum - 100);
    ELSE
      v_passed := v_passed || format('%s measure weights total 100', r.pname);
      v_coverage := v_coverage || jsonb_build_object('code','MEASURE_WEIGHTS_VALID',
        'perspective_id',r.perspective_id,'name',r.pname,'total',r.msum,'delta',0);
    END IF;
  END LOOP;

  -- Measure/KPI references: retired KPIs block; not-yet-approved KPIs warn.
  FOR r IN
    SELECT k.name AS kname, k.status AS kstatus
      FROM public.strata_scorecard_model_measures mm
      JOIN public.strata_kpis k ON k.id = mm.kpi_id
     WHERE mm.model_id = p_model AND k.status <> 'approved'
     ORDER BY k.name
  LOOP
    IF r.kstatus = 'retired' THEN
      v_blockers := v_blockers || format('Measure KPI "%s" is retired — replace it', r.kname);
    ELSE
      v_warnings := v_warnings || format('Measure KPI "%s" is %s — not yet an approved KPI', r.kname, r.kstatus);
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_scorecard_model_measures mm
    JOIN public.strata_kpis k ON k.id = mm.kpi_id
    WHERE mm.model_id = p_model AND k.status <> 'approved')
    AND EXISTS (SELECT 1 FROM public.strata_scorecard_model_measures WHERE model_id = p_model)
  THEN
    v_passed := v_passed || 'All measure KPI references are approved'::text;
  END IF;

  -- Duplicate assignment is impossible (UNIQUE (model_id, perspective_id, kpi_id)).
  v_passed := v_passed || 'No duplicate measure assignments (DB-enforced)'::text;

  RETURN jsonb_build_object(
    'blockers', to_jsonb(v_blockers),
    'warnings', to_jsonb(v_warnings),
    'passed',   to_jsonb(v_passed),
    'coverage', v_coverage,
    'perspective_weights', v_pw);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_validate_scorecard_model(uuid) TO authenticated;

COMMENT ON FUNCTION public.strata_validate_scorecard_model(uuid) IS
  'ONE shared scorecard-model validator (submit + approve + UI checklist). blockers/warnings/passed keep human wording; coverage[] and perspective_weights carry the AUTHORITATIVE semantic codes + numeric params (NO_MEASURES / MEASURE_WEIGHTS_UNDER_100 / MEASURE_WEIGHTS_OVER_100 / MEASURE_WEIGHTS_VALID; NO_PERSPECTIVES / PERSPECTIVE_WEIGHTS_*). Tolerance ±0.01. Save of an incomplete draft is allowed — only submit/approve consume the blockers.';
