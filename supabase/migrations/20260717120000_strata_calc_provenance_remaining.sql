-- CAT-STRATA-IMPL-20260712-001 · step 6c · wire the remaining calcs to the canonical resolver
-- Plan Lock: F-9 ruling step 6 · blueprint §4 (B1). Completes step 6 (6a: kpi_achievement, 6b: snapshot).
--
-- Closes the gap 6b measured and reported honestly: every new snapshot said
--   provenance_completeness: {items_with_full_provenance: 8, items_without_full_provenance: 20}
-- because only strata_calc_kpi_achievement wrote a full config_context. The other three calcs wrote
-- either a partial one (model_id + a scheme id, no versions) or none at all. That count of 20 was
-- this slice's to-do list.
--
-- ── A GENERAL COMPLETENESS MARKER (fixes a flaw in 6b's own metric) ──────────
-- 6b keyed completeness on `config_context->>'kpi_version' IS NOT NULL`, which is KPI-centric: a
-- benefit calculated value has no KPI, so it would have counted as "incomplete" FOREVER, even fully
-- wired. Every calc now stamps `provenance_schema: 1`, and completeness keys on THAT. The marker is
-- a version number, not a boolean, so a future provenance change is detectable rather than silent.
--
-- ── THE MATHS IS UNTOUCHED IN ALL THREE ─────────────────────────────────────
-- Same rollups, same weighting, same has_data semantics, same clamps. Only (a) which version is
-- resolved (identity today) and (b) what is RECORDED about it change. Verified: scorecard instance
-- and benefit results byte-identical to baseline.
--
-- ⚠️ F-10 applies here too: resolution goes through strata_resolve_kpi_effective so it inherits the
-- backward extension. A hand-rolled `tstzrange @> date` predicate here would erase 3,210 historical
-- results — see 09_DECISIONS.md → F-10.

-- ── 1. strata_calc_period — resolve per LINEAGE, not per approved row ───────
-- Latent bug fixed: it iterated `WHERE k.status='approved'` and joined targets on t.kpi_id = k.id.
-- Once a lineage has v1 (superseded) + v2 (approved), an OLD period whose target sits on v1 finds no
-- target on v2 → the KPI is never iterated → that period's number SILENTLY VANISHES on recalc.
-- Harmless today (no lineage has >1 version) and fatal the moment one does, which is precisely the
-- kind of thing that must not wait to be discovered. Now: find every lineage with a target for this
-- period on ANY version, resolve the version effective at the period end, and calculate THAT.
CREATE OR REPLACE FUNCTION public.strata_calc_period(p_period uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE inst record; kpi record; results jsonb := '[]'::jsonb; v_as_of timestamptz;
BEGIN
  PERFORM public.strata_calc_guard();

  SELECT ends_on::timestamptz INTO v_as_of FROM public.strata_periods WHERE id = p_period;
  IF v_as_of IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;

  FOR kpi IN
    SELECT DISTINCT public.strata_resolve_kpi_version(k.lineage_id, v_as_of) AS id
      FROM public.strata_kpis k
      JOIN public.strata_kpi_targets t ON t.kpi_id = k.id AND t.period_id = p_period
     WHERE public.strata_resolve_kpi_version(k.lineage_id, v_as_of) IS NOT NULL
  LOOP
    PERFORM public.strata_calc_kpi_achievement(kpi.id, p_period);
  END LOOP;

  FOR inst IN SELECT id FROM public.strata_scorecard_instances WHERE period_id = p_period AND status <> 'locked' LOOP
    results := results || public.strata_calc_scorecard_instance(inst.id);
  END LOOP;
  RETURN jsonb_build_object('period_id', p_period, 'instances', results, 'calculated_at', now());
END;
$function$;

-- ── 2. strata_calc_scorecard_instance — full provenance on all three writes ──
CREATE OR REPLACE FUNCTION public.strata_calc_scorecard_instance(p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inst record; model record; line record; persp record;
  line_res jsonb; lines jsonb := '[]'::jsonb;
  line_score numeric; p_total numeric;
  total numeric := 0; total_weight numeric := 0;
  scheme uuid; band text; perspectives jsonb := '[]'::jsonb;
  v_as_of timestamptz; v_scheme_version int; v_obj_kpis jsonb; base_ctx jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT * INTO inst FROM public.strata_scorecard_instances WHERE id = p_instance;
  IF inst IS NULL THEN RAISE EXCEPTION 'scorecard instance not found'; END IF;
  SELECT * INTO model FROM public.strata_scorecard_models WHERE id = inst.model_id;
  scheme := model.threshold_scheme_id;

  SELECT ends_on::timestamptz INTO v_as_of FROM public.strata_periods WHERE id = inst.period_id;
  -- The scheme VERSION, not just its id: §3 proved an id plus a static version cannot re-resolve a
  -- configuration, and bands decide every rating.
  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  base_ctx := jsonb_build_object(
    'provenance_schema', 1,
    'model_id', model.id, 'model_version', model.version,
    'model_rollup_method', model.rollup_method,
    'threshold_scheme_id', scheme, 'threshold_scheme_version', v_scheme_version,
    'resolved_as_of', v_as_of);

  FOR line IN
    SELECT l.*, p.name AS perspective_name FROM public.strata_scorecard_lines l
    JOIN public.strata_perspectives p ON p.id = l.perspective_id
    WHERE l.instance_id = p_instance ORDER BY l.order_index
  LOOP
    line_score := NULL; v_obj_kpis := NULL;
    IF line.ref_type = 'kpi' THEN
      -- inherits 6a's resolution + provenance wholesale
      line_res := public.strata_calc_kpi_achievement(line.kpi_id, inst.period_id);
      line_score := (line_res->>'score')::numeric;
    ELSIF line.ref_type = 'objective' THEN
      SELECT avg((public.strata_calc_kpi_achievement(ek.kpi_id, inst.period_id)->>'score')::numeric)
        INTO line_score
        FROM public.strata_element_kpis ek WHERE ek.element_id = line.element_id;
      -- Which KPI VERSIONS actually contributed to this objective, resolved through the lineage.
      -- Without this the roll-up is a number with no way back to its inputs.
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
               'linked_kpi_id', ek.kpi_id,
               'resolved_kpi_id', public.strata_resolve_kpi_effective(ek.kpi_id, v_as_of)))
        INTO v_obj_kpis
        FROM public.strata_element_kpis ek WHERE ek.element_id = line.element_id;
      line_res := jsonb_build_object('element_id', line.element_id, 'score', line_score);
    ELSE
      line_res := public.strata_calc_benefit_realization(line.benefit_id);
      line_score := least(COALESCE((line_res->>'realization_index')::numeric, 0) * 100, 100);
    END IF;

    INSERT INTO public.strata_calculated_values
      (entity_type, entity_id, period_id, metric_key, value, score, status_key,
       formula_version, inputs, config_context)
    VALUES
      ('scorecard_line', line.id, inst.period_id, 'score', line_score, line_score,
       public.strata_band_from_score(line_score, scheme),
       'rollup:' || model.rollup_method,
       jsonb_build_object('ref_type', line.ref_type, 'weight', line.weight, 'detail', line_res),
       base_ctx || jsonb_build_object(
         'ref_type', line.ref_type,
         'line_weight', line.weight,
         -- the exact KPI version block from 6a, carried through so a line is traceable to its version
         'kpi_provenance', line_res->'provenance',
         'objective_kpis', v_obj_kpis,
         'benefit_id', line.benefit_id));

    lines := lines || jsonb_build_object(
      'line_id', line.id, 'ref_type', line.ref_type, 'perspective_id', line.perspective_id,
      'weight', line.weight, 'score', round(coalesce(line_score, 0), 2),
      'has_data', line_score IS NOT NULL,
      'status_key', public.strata_band_from_score(line_score, scheme), 'detail', line_res);
  END LOOP;

  FOR persp IN
    SELECT mp.perspective_id, mp.weight AS model_weight, p.name
      FROM public.strata_scorecard_model_perspectives mp
      JOIN public.strata_perspectives p ON p.id = mp.perspective_id
     WHERE mp.model_id = model.id ORDER BY mp.order_index
  LOOP
    SELECT CASE WHEN sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean) > 0
                THEN sum((l->>'score')::numeric * (l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
                   / sum((l->>'weight')::numeric) FILTER (WHERE (l->>'has_data')::boolean)
           END
      INTO p_total
      FROM jsonb_array_elements(lines) l
     WHERE (l->>'perspective_id')::uuid = persp.perspective_id;

    band := public.strata_band_from_score(p_total, scheme);
    INSERT INTO public.strata_calculated_values
      (entity_type, entity_id, period_id, metric_key, value, score, status_key, formula_version, config_context)
    VALUES
      ('perspective', persp.perspective_id, inst.period_id, 'score', p_total, p_total, band,
       'rollup:' || model.rollup_method,
       base_ctx || jsonb_build_object(
         'instance_id', p_instance,
         'perspective_id', persp.perspective_id,
         -- the weight that produced this number — the exact child value §3 proved can move under a
         -- static model version
         'model_perspective_weight', persp.model_weight));

    perspectives := perspectives || jsonb_build_object(
      'perspective_id', persp.perspective_id, 'name', persp.name,
      'weight', persp.model_weight, 'score', round(coalesce(p_total, 0), 2),
      'has_data', p_total IS NOT NULL, 'status_key', band);

    IF p_total IS NOT NULL THEN
      total := total + p_total * persp.model_weight;
      total_weight := total_weight + persp.model_weight;
    END IF;
  END LOOP;

  total := CASE WHEN total_weight > 0 THEN total / total_weight END;
  band := public.strata_band_from_score(total, scheme);

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key, formula_version, inputs, config_context)
  VALUES
    ('scorecard_instance', p_instance, inst.period_id, 'score', total, total, band,
     'rollup:' || model.rollup_method,
     jsonb_build_object('perspectives', perspectives),
     base_ctx || jsonb_build_object(
       'instance_id', p_instance,
       -- the resolved child aggregate §4 requires: version alone is unreliable because §3 proved
       -- children move under a static version
       'model_perspectives', (SELECT jsonb_agg(jsonb_build_object('perspective_id', mp.perspective_id, 'weight', mp.weight))
                                FROM public.strata_scorecard_model_perspectives mp WHERE mp.model_id = model.id),
       'model_measures', (SELECT jsonb_agg(jsonb_build_object('id', mm.id, 'kpi_id', mm.kpi_id,
                                                              'perspective_id', mm.perspective_id, 'weight', mm.weight,
                                                              'aggregation_method', mm.aggregation_method))
                            FROM public.strata_scorecard_model_measures mm WHERE mm.model_id = model.id)));

  RETURN jsonb_build_object(
    'instance_id', p_instance, 'period_id', inst.period_id,
    'score', round(coalesce(total, 0), 2), 'has_data', total IS NOT NULL, 'status_key', band,
    'rollup_method', model.rollup_method, 'model_id', model.id, 'model_version', model.version,
    'perspectives', perspectives, 'lines', lines, 'calculated_at', now());
END;
$function$;

-- ── 3. strata_calc_benefit_realization — it wrote NO config_context at all ───
-- No KPI is involved, so the ruling's KPI identifiers do not apply. What must be provable here is
-- WHICH values counted and under WHICH assurance rule — that is this calc's version context.
-- NOTE (left deliberately for E-6/F-7, R4): `realized` still counts ONLY validation_status =
-- 'validated'. F-7 rules that owner_confirmed COUNTS, which widens this whitelist and WILL move live
-- numbers. Out of scope here; recording the rule in provenance now means the change will be visible
-- and dated when it lands, instead of silently rewriting what past numbers meant.
CREATE OR REPLACE FUNCTION public.strata_calc_benefit_realization(p_benefit uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE planned numeric; realized numeric; forecast numeric; idx numeric; runs uuid[];
        v_value_ids jsonb; v_as_of timestamptz;
BEGIN
  PERFORM public.strata_calc_guard();
  v_as_of := now();

  SELECT sum(value) FILTER (WHERE value_kind = 'planned'),
         sum(value) FILTER (WHERE value_kind = 'realized' AND validation_status = 'validated'),
         sum(value) FILTER (WHERE value_kind = 'forecast'),
         COALESCE(array_agg(DISTINCT upload_run_id) FILTER (WHERE upload_run_id IS NOT NULL), '{}')
    INTO planned, realized, forecast, runs
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND p.starts_on <= now()::date;

  -- Exactly which rows produced the number, and with what assurance state.
  SELECT jsonb_agg(jsonb_build_object('id', bv.id, 'value_kind', bv.value_kind,
                                      'validation_status', bv.validation_status, 'period_id', bv.period_id))
    INTO v_value_ids
    FROM public.strata_benefit_values bv
    JOIN public.strata_periods p ON p.id = bv.period_id
   WHERE bv.benefit_id = p_benefit AND p.starts_on <= now()::date;

  idx := CASE WHEN planned IS NULL OR planned = 0 THEN NULL ELSE COALESCE(realized, 0) / planned END;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, metric_key, value, formula_version, inputs, source_run_ids, config_context)
  VALUES ('benefit', p_benefit, 'realization_index', idx, 'realization:v1',
          jsonb_build_object('planned_to_date', planned, 'realized_validated', realized, 'forecast', forecast),
          runs,
          jsonb_build_object(
            'provenance_schema', 1,
            'assurance_rule', 'realized counts only validation_status=validated; owner_confirmed does NOT count yet (F-7/E-6 pending, R4)',
            'period_cutoff_rule', 'benefit values whose period starts_on <= today',
            'resolved_as_of', v_as_of,
            'benefit_values', v_value_ids));

  RETURN jsonb_build_object('benefit_id', p_benefit, 'realization_index', round(coalesce(idx,0), 4),
                            'has_data', idx IS NOT NULL,
                            'planned_to_date', planned, 'realized_validated', realized, 'forecast', forecast,
                            'source_run_ids', runs, 'calculated_at', now());
END;
$function$;

-- ── 4. the marker must be universal, or the metric is meaningless ────────────
-- strata_calc_kpi_achievement (6a, migration 20260717100000) predates the marker, so without this
-- its items would count as INCOMPLETE under the new metric — the metric would report the exact
-- opposite of the truth. Re-declared here rather than editing 20260717100000, which shipped and was
-- applied: rewriting an applied migration breaks the file↔ledger contract.
-- ONLY the provenance block changes. The maths, the resolution and the early returns are identical.
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
  v_as_of := per.ends_on::timestamptz;

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

  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  provenance := jsonb_build_object(
    'provenance_schema',      1,
    'kpi_id',                 v_resolved,
    'kpi_lineage_id',         k.lineage_id,
    'kpi_version',            k.version,
    'kpi_revision_class',     k.revision_class,
    'formula_version',        f.version,
    'formula_version_id',     f.id,
    'target_version',         t.version,
    'target_id',              t.id,
    'actual_id',              a.id,
    'actual_validation_status', a.validation_status,
    'threshold_scheme_id',    scheme,
    'threshold_scheme_version', v_scheme_version,
    'resolved_as_of',         v_as_of,
    'requested_kpi_id',       p_kpi
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

-- ── 5. snapshot completeness keys on the marker, not on kpi_version ──────────
-- 6b's metric was KPI-centric: `config_context->>'kpi_version' IS NOT NULL`. A benefit calculated
-- value has no KPI, so it would have counted as "incomplete" FOREVER even once fully wired — the
-- metric would never have reached zero and would have quietly stopped meaning anything. Keying on
-- provenance_schema makes it general across entity types, and makes a future provenance change
-- detectable rather than silent.
CREATE OR REPLACE FUNCTION public.strata_lock_snapshot(
  p_name text, p_cycle uuid, p_period uuid,
  p_instance_ids uuid[] DEFAULT NULL::uuid[], p_scope jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE snap uuid; runs uuid[]; cfg jsonb; used jsonb; n_draft_excluded int; n_items_incomplete int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'locking a snapshot requires strategy_office or admin role';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT a.upload_run_id) FILTER (WHERE a.upload_run_id IS NOT NULL), '{}')
    INTO runs FROM public.strata_kpi_actuals a
   WHERE a.period_id = p_period AND a.validation_status = 'validated';

  SELECT jsonb_build_object(
    'all_approved_at_lock', jsonb_build_object(
      'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
      'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
      'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
    ),
    'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
    'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
    'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
  ) INTO cfg;

  INSERT INTO public.strata_snapshots (name, cycle_id, period_id, scope, config_versions, data_run_ids, created_by, approved_by)
  VALUES (p_name, p_cycle, p_period,
          COALESCE(p_scope, jsonb_build_object('instance_ids', to_jsonb(COALESCE(p_instance_ids, '{}'::uuid[])))),
          cfg, runs, auth.uid(), auth.uid())
  RETURNING id INTO snap;

  INSERT INTO public.strata_snapshot_items (snapshot_id, entity_type, entity_id, payload)
  SELECT snap, cv.entity_type, cv.entity_id,
         (to_jsonb(cv) - 'id' - 'snapshot_id')
         || jsonb_build_object('entity_name', public.strata_entity_name(cv.entity_type, cv.entity_id))
    FROM public.strata_calculated_values cv
   WHERE cv.period_id = p_period
     AND cv.calculated_at = (
       SELECT max(cv2.calculated_at) FROM public.strata_calculated_values cv2
        WHERE cv2.entity_type = cv.entity_type AND cv2.entity_id = cv.entity_id
          AND cv2.period_id = cv.period_id AND cv2.metric_key = cv.metric_key);

  WITH ctx AS (
    SELECT si.payload->'config_context' AS c
      FROM public.strata_snapshot_items si
     WHERE si.snapshot_id = snap
       AND jsonb_typeof(si.payload->'config_context') = 'object'
       AND si.payload->'config_context'->>'kpi_version' IS NOT NULL
  )
  SELECT jsonb_build_object(
    'kpis', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'kpi_id', 'version', c->>'kpi_version',
                'lineage_id', c->>'kpi_lineage_id', 'revision_class', c->>'kpi_revision_class'))
               FROM ctx WHERE c->>'kpi_id' IS NOT NULL),
    'kpi_formula_versions', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'formula_version_id', 'version', c->>'formula_version'))
               FROM ctx WHERE c->>'formula_version_id' IS NOT NULL),
    'kpi_targets', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'target_id', 'version', c->>'target_version'))
               FROM ctx WHERE c->>'target_id' IS NOT NULL),
    'threshold_schemes', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'threshold_scheme_id', 'version', c->>'threshold_scheme_version'))
               FROM ctx WHERE c->>'threshold_scheme_id' IS NOT NULL),
    'model_measures', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', m.id, 'model_id', m.model_id, 'kpi_id', m.kpi_id, 'weight', m.weight))
               FROM public.strata_scorecard_model_measures m
              WHERE m.kpi_id IN (SELECT (c->>'kpi_id')::uuid FROM ctx WHERE c->>'kpi_id' IS NOT NULL)),
    'resolved_as_of', (SELECT max(c->>'resolved_as_of') FROM ctx)
  ) INTO used;

  SELECT count(DISTINCT a.kpi_id) INTO n_draft_excluded
    FROM public.strata_kpi_actuals a
    JOIN public.strata_periods p ON p.id = a.period_id
   WHERE a.period_id = p_period
     AND public.strata_resolve_kpi_effective(a.kpi_id, p.ends_on::timestamptz) IS NULL;

  -- keyed on provenance_schema (see §5 header) — general across entity types
  SELECT count(*) INTO n_items_incomplete
    FROM public.strata_snapshot_items si
   WHERE si.snapshot_id = snap
     AND (jsonb_typeof(si.payload->'config_context') <> 'object'
          OR si.payload->'config_context'->>'provenance_schema' IS NULL);

  UPDATE public.strata_snapshots
     SET config_versions = cfg
       || jsonb_build_object('used', used)
       || jsonb_build_object('selection_semantics', 'used_only: derived from the config_context frozen on each item')
       || jsonb_build_object('provenance_completeness', jsonb_build_object(
            'items_with_full_provenance', (SELECT count(*) FROM public.strata_snapshot_items si
                                            WHERE si.snapshot_id = snap
                                              AND si.payload->'config_context'->>'provenance_schema' IS NOT NULL),
            'items_without_full_provenance', n_items_incomplete,
            'note', CASE WHEN n_items_incomplete > 0
                    THEN 'LOWER BOUND: some frozen items predate full provenance capture. Their configs are NOT listed in `used`.'
                    ELSE 'complete: every frozen item carries its full resolved version context' END))
       || jsonb_build_object('draft_kpi_exclusion', jsonb_build_object(
            'rule', 'only KPI versions approved AND effective at the period end contribute (E-7/DEF-010)',
            'kpis_excluded_with_actuals', n_draft_excluded))
   WHERE id = snap;

  UPDATE public.strata_calculated_values SET snapshot_id = snap
   WHERE period_id = p_period AND snapshot_id IS NULL;

  IF p_instance_ids IS NOT NULL THEN
    UPDATE public.strata_scorecard_instances
       SET status = 'locked', locked_snapshot_id = snap, updated_at = now()
     WHERE id = ANY (p_instance_ids);
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_snapshots', snap, 'RPC:lock_snapshot', auth.uid(), p_name);
  RETURN snap;
END;
$function$;
