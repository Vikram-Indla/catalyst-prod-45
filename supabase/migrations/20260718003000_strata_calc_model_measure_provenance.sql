-- CAT-STRATA-SCDEF-20260717-001 — SC-DEF-002 (P1)
--
-- Problem: a calculated Scorecard's evidence did not record the EXACT model-measure
-- assignments used. strata_calculated_values.config_context (jsonb) is the designed home for
-- this ("config context … UI never computes" — 20260705100400_strata_lineage_governance.sql),
-- and 20260717120000 already began populating `model_measures` — but only with
-- {id, kpi_id, perspective_id, weight, aggregation_method}. Three assignment columns the
-- reviewer must see were omitted: order_index, required, target_policy. Without them the
-- evidence cannot answer "which measures, in what order, which were mandatory, and under
-- whose target policy did this score get produced".
--
-- NO SCHEMA CHANGE: config_context is jsonb and already exists. This widens what the
-- calculation WRITES. Per repo convention an applied migration is never edited in place, so
-- this is a CREATE OR REPLACE of the current definition
-- (20260717120000_strata_calc_provenance_remaining.sql:62-208), byte-identical except:
--   1. provenance_schema 1 -> 2
--   2. the model_measures jsonb_agg gains order_index, required, target_policy and
--      resolved_kpi_id (the lineage-resolved KPI version actually in force at v_as_of, the
--      same resolver the objective roll-up already uses), plus a deterministic ORDER BY.
--
-- FORWARD-ONLY, and deliberately so:
--   * Existing rows are NOT rewritten and NOT backfilled. A historical calculation's real
--     assignment set is not reconstructable after the fact (model children can move under a
--     static model version — the very reason this provenance exists), so inventing one would
--     be fabricated legacy provenance. The brief forbids exactly that.
--   * `provenance_schema` is the honest discriminator: rows written before this migration
--     carry schema 1 and a thin/absent model_measures. The Evidence UI reads that marker and
--     QUALIFIES those records ("not recorded for this calculation") rather than rendering a
--     blank that reads as "no measures".
--   * Locked/snapshotted rows (strata_calculated_values.snapshot_id set, strata_snapshots
--     .locked_at) are untouched — this migration contains no UPDATE or DELETE of any kind.

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
    -- 2 = model_measures carries the complete assignment (weight/order/required/aggregation/
    -- target policy/resolved KPI version). 1 = the thin pre-SC-DEF-002 shape. The Evidence view
    -- keys off this to qualify legacy rows instead of implying absence.
    'provenance_schema', 2,
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
       'model_perspectives', (SELECT jsonb_agg(jsonb_build_object('perspective_id', mp.perspective_id,
                                                                  'weight', mp.weight,
                                                                  'order_index', mp.order_index)
                                               ORDER BY mp.order_index)
                                FROM public.strata_scorecard_model_perspectives mp WHERE mp.model_id = model.id),
       -- SC-DEF-002: the COMPLETE assignment actually used — weight/order/required/aggregation/
       -- target policy, plus the lineage-resolved KPI version in force at v_as_of (same resolver
       -- the objective roll-up uses above). Ordered so two evidence reads never disagree.
       'model_measures', (SELECT jsonb_agg(jsonb_build_object('id', mm.id, 'kpi_id', mm.kpi_id,
                                                              'resolved_kpi_id', public.strata_resolve_kpi_effective(mm.kpi_id, v_as_of),
                                                              'perspective_id', mm.perspective_id,
                                                              'weight', mm.weight,
                                                              'order_index', mm.order_index,
                                                              'required', mm.required,
                                                              'aggregation_method', mm.aggregation_method,
                                                              'target_policy', mm.target_policy)
                                           ORDER BY mm.perspective_id, mm.order_index)
                            FROM public.strata_scorecard_model_measures mm WHERE mm.model_id = model.id)));

  RETURN jsonb_build_object(
    'instance_id', p_instance, 'period_id', inst.period_id,
    'score', round(coalesce(total, 0), 2), 'has_data', total IS NOT NULL, 'status_key', band,
    'rollup_method', model.rollup_method, 'model_id', model.id, 'model_version', model.version,
    'perspectives', perspectives, 'lines', lines, 'calculated_at', now());
END;
$function$;

COMMENT ON FUNCTION public.strata_calc_scorecard_instance(uuid) IS
  'Calculates a scorecard instance and records the exact model-measure assignments used in config_context (SC-DEF-002). provenance_schema=2 marks the complete shape; schema 1 rows predate this and are qualified, never backfilled.';
