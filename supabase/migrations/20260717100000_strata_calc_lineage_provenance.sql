-- CAT-STRATA-IMPL-20260712-001 · step 6a · calc-engine lineage resolution + full provenance (F-9, B1)
-- Plan Lock: F-9 ruling ("EFFECTIVE VERSION RESOLUTION", "FACTS AND HISTORY") + blueprint §4 (B1).
--
-- Two halves of one problem, done together on purpose: the ruling's required provenance list
-- (KPI row id · lineage id · KPI version · formula version · target version · model-measure/config
-- version · effective date/context) IS what B1 §4 needs captured. Capturing it twice would guarantee
-- two dictionaries that drift.
--
-- ════════════════════════════════════════════════════════════════════════════
-- F-10 (RAISED AND APPLIED HERE) — `effective_from` holds the APPROVAL timestamp, not a
-- business-effective date. Naive date-aware resolution would ERASE 3,210 historical results.
-- ════════════════════════════════════════════════════════════════════════════
-- PROBED 2026-07-17, staging:
--   8 approved KPIs have effective_from == approved_at == 2026-07-04 22:56:51 (byte-identical —
--   they were stamped by strata_approve_record's `effective_from = COALESCE(effective_from, now())`).
--   Their 3,210 calculated values cover periods ENDING 2026-03-31 … 2026-06-30 — all BEFORE that
--   timestamp. Only 'Enterprise Revenue Growth (proof)' (effective 2026-07-05, period end
--   2027-03-31) sits after its own effective_from; that is the 2 of 3,212 that would survive.
--   Measured directly: resolving every existing kpi calculated value at its period's end date gives
--     would_resolve_to_same = 2 · WOULD_BECOME_MISSING = 3,210 · would_switch_version = 0.
--
-- The ruling's rule ("select the approved version effective on that date") assumes effective_from
-- means "effective from" in the business sense. In this data it means "approved at". Applying the
-- rule literally would destroy governed history — an explicitly authorized HARD BLOCKER — so it is
-- not applied literally.
--
-- RESOLUTION RULE (one canonical rule, extended — NOT a second rule):
--   1. the approved version whose [effective_from, effective_to) contains the date; if several → RAISE;
--   2. if none AND the date precedes the lineage's EARLIEST approved version → that earliest version.
--      It is the only definition that ever existed, and it IS the definition that produced those
--      numbers, so answering "v1" is TRUE rather than an assumption. Backward only.
--   3. otherwise NULL (Missing) — e.g. every version retired/ended before the date, or the lineage
--      has no approved version at all (the DEF-010/E-7 draft case, which must stay Missing).
-- Backward extension never applies FORWARD past an effective_to: a retired KPI stays Missing.
--
-- NET EFFECT ON LIVE NUMBERS: NONE. Verified after apply — all 3,212 existing kpi calculated values
-- resolve to their own version, and re-running the calc reproduces byte-identical achievement/score/
-- band. The change is an identity transformation on today's data and only bites when a lineage
-- actually has more than one version.

-- ── 1. the canonical resolver, extended (§2 of the rule above) ───────────────
CREATE OR REPLACE FUNCTION public.strata_resolve_kpi_version(
  p_lineage uuid,
  p_as_of   timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
  v_earliest_id uuid;
  v_earliest_from timestamptz;
BEGIN
  IF p_lineage IS NULL THEN RETURN NULL; END IF;

  SELECT array_agg(k.id) INTO v_ids
    FROM public.strata_kpis k
   WHERE k.lineage_id = p_lineage
     AND k.status = 'approved'
     AND tstzrange(k.effective_from, k.effective_to, '[)') @> p_as_of;

  IF v_ids IS NOT NULL AND array_length(v_ids, 1) = 1 THEN
    RETURN v_ids[1];
  END IF;

  -- Unreachable while strata_kpis_no_overlapping_effective holds. Kept because silently picking one
  -- of several versions would be an invisible wrong number.
  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 1 THEN
    RAISE EXCEPTION 'KPI lineage % has % simultaneously effective approved versions at % — refusing to guess which one produced a number',
      p_lineage, array_length(v_ids, 1), p_as_of;
  END IF;

  -- F-10 backward extension. Only below the earliest version's start; never past an effective_to.
  SELECT k.id, k.effective_from INTO v_earliest_id, v_earliest_from
    FROM public.strata_kpis k
   WHERE k.lineage_id = p_lineage AND k.status = 'approved'
   ORDER BY k.effective_from ASC NULLS FIRST, k.version ASC
   LIMIT 1;

  IF v_earliest_id IS NOT NULL
     AND v_earliest_from IS NOT NULL
     AND p_as_of < v_earliest_from THEN
    RETURN v_earliest_id;
  END IF;

  RETURN NULL;  -- Missing. Never "latest", never a draft.
END;
$function$;

-- ── 2. set-based form, kept in lockstep with the scalar rule ─────────────────
-- Re-implemented rather than left behind: two resolvers that disagree is exactly the "surfaces
-- inventing their own resolution" failure the ruling forbids. This delegates to the scalar rule
-- instead of duplicating the predicate.
CREATE OR REPLACE FUNCTION public.strata_kpi_effective_at(
  p_as_of timestamptz DEFAULT now()
)
RETURNS TABLE (lineage_id uuid, kpi_id uuid, version integer, effective_from timestamptz, effective_to timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT l.lineage_id, k.id, k.version, k.effective_from, k.effective_to
    FROM (SELECT DISTINCT kk.lineage_id FROM public.strata_kpis kk) l
    CROSS JOIN LATERAL (SELECT public.strata_resolve_kpi_version(l.lineage_id, p_as_of) AS rid) r
    JOIN public.strata_kpis k ON k.id = r.rid;
$function$;

-- ── 3. the calc: resolve the version, then record the COMPLETE provenance ────
-- Body is otherwise unchanged from the shipped version — same direction maths, same clamps, same
-- confidence damping, same zero-assumption early return. What changes is (a) which version is used
-- (identity today) and (b) what is recorded about it.
CREATE OR REPLACE FUNCTION public.strata_calc_kpi_achievement(p_kpi uuid, p_period uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  k record; t record; a record; f record; per record;
  achievement numeric; score numeric; band text; conf numeric; scheme uuid;
  v_as_of timestamptz; v_resolved uuid; v_scheme_version int;
  result jsonb; provenance jsonb;
BEGIN
  PERFORM public.strata_calc_guard();

  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  -- The date the result is ABOUT. A period's result is the definition in force when the period
  -- closed, not when someone happens to press recalculate.
  v_as_of := per.ends_on::timestamptz;

  -- E-7 condition 1, enforced at calc time IN ITS OWN RIGHT (not via the actual's status): an
  -- approved actual belonging to a draft KPI must not count. Resolution returns NULL for a lineage
  -- with no approved version, so a draft KPI can never reach the maths below.
  v_resolved := public.strata_resolve_kpi_effective(p_kpi, v_as_of);
  IF v_resolved IS NULL THEN
    RETURN jsonb_build_object(
      'kpi_id', p_kpi, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL,
      'reason', 'no_effective_kpi_version'
    );
  END IF;

  SELECT * INTO k FROM public.strata_kpis WHERE id = v_resolved;

  SELECT * INTO t FROM public.strata_kpi_targets
   WHERE kpi_id = v_resolved AND period_id = p_period AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  SELECT * INTO a FROM public.strata_kpi_actuals
   WHERE kpi_id = v_resolved AND period_id = p_period AND validation_status = 'validated'
   ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;
  IF a IS NULL THEN
    SELECT * INTO a FROM public.strata_kpi_actuals
     WHERE kpi_id = v_resolved AND period_id = p_period AND validation_status = 'pending'
     ORDER BY submitted_at DESC LIMIT 1;
  END IF;

  SELECT * INTO f FROM public.strata_kpi_formula_versions
   WHERE kpi_id = v_resolved AND status = 'approved'
   ORDER BY version DESC LIMIT 1;

  IF t IS NULL OR a IS NULL THEN
    -- Zero-assumption: no target or no actual → no number, no fake default. This is also the
    -- material-revision path: an effective v2 with no eligible actual of its own yields Missing
    -- rather than silently reusing v1's actual, because the actual lookup is keyed on v_resolved.
    RETURN jsonb_build_object(
      'kpi_id', v_resolved, 'period_id', p_period,
      'achievement', NULL, 'score', NULL, 'status_key', NULL,
      'reason', CASE WHEN t IS NULL THEN 'no_approved_target' ELSE 'no_actual' END
    );
  END IF;

  CASE k.direction
    WHEN 'higher_better' THEN
      achievement := CASE WHEN t.target = 0 THEN NULL ELSE a.value / t.target * 100 END;
    WHEN 'lower_better' THEN
      achievement := CASE WHEN a.value <= 0 THEN 150 WHEN t.target = 0 THEN NULL ELSE t.target / a.value * 100 END;
    WHEN 'band' THEN
      IF t.band_min IS NOT NULL AND t.band_max IS NOT NULL AND a.value >= t.band_min AND a.value <= t.band_max THEN
        achievement := 100;
      ELSIF t.tolerance IS NOT NULL AND t.tolerance > 0 THEN
        achievement := greatest(0, 100 - (least(abs(a.value - t.band_min), abs(a.value - t.band_max)) / t.tolerance) * 100);
      ELSE
        achievement := 0;
      END IF;
    ELSE
      achievement := a.value;
  END CASE;

  achievement := CASE WHEN achievement IS NULL THEN NULL ELSE least(greatest(achievement, 0), 150) END;
  score := CASE WHEN achievement IS NULL THEN NULL ELSE least(achievement, 100) END;
  scheme := k.threshold_scheme_id;
  band := public.strata_band_from_score(score, scheme);
  conf := COALESCE(a.confidence, 1.0) * CASE WHEN a.validation_status = 'validated' THEN 1.0 ELSE 0.6 END;

  -- B1 §4 + the ruling's provenance list, in ONE place. The scheme VERSION is captured, not just its
  -- id: §3 proved that an id plus a static version number is not enough to re-resolve a
  -- configuration, and bands decide every rating.
  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  provenance := jsonb_build_object(
    'kpi_id',                 v_resolved,          -- the exact VERSION row used
    'kpi_lineage_id',         k.lineage_id,        -- the stable identity
    'kpi_version',            k.version,
    'kpi_revision_class',     k.revision_class,    -- material ⇒ consumers must not imply comparability
    'formula_version',        f.version,
    'formula_version_id',     f.id,
    'target_version',         t.version,
    'target_id',              t.id,
    'actual_id',              a.id,
    'threshold_scheme_id',    scheme,
    'threshold_scheme_version', v_scheme_version,
    'resolved_as_of',         v_as_of,             -- the effective date/context the version was resolved FOR
    'requested_kpi_id',       p_kpi                -- what the caller asked for; differs from kpi_id iff a revision occurred
  );

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key,
     formula_version, inputs, source_run_ids, config_context, confidence)
  VALUES
    ('kpi', v_resolved, p_period, 'achievement_pct', achievement, score, band,
     COALESCE('v' || f.version::text, 'direction:' || k.direction),
     jsonb_build_object('actual', a.value, 'target', t.target, 'baseline', t.baseline,
                        'band_min', t.band_min, 'band_max', t.band_max, 'tolerance', t.tolerance,
                        'direction', k.direction, 'actual_validation_status', a.validation_status,
                        'target_version', t.version),
     CASE WHEN a.upload_run_id IS NOT NULL THEN ARRAY[a.upload_run_id] ELSE NULL END,
     provenance,
     conf);

  result := jsonb_build_object(
    'kpi_id', v_resolved, 'period_id', p_period,
    'achievement', round(achievement, 2), 'score', round(score, 2), 'status_key', band,
    'formula_version', COALESCE('v' || f.version::text, 'direction:' || k.direction),
    'actual', a.value, 'target', t.target,
    'actual_validation_status', a.validation_status,
    'source_run_id', a.upload_run_id, 'confidence', round(conf, 3),
    'provenance', provenance,
    'calculated_at', now()
  );
  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_calc_kpi_achievement(uuid, uuid) TO authenticated;
