-- CAT-STRATA-SCDEF-20260717-001 — SC-DEF-002 (P1) RETEST FIX
--
-- Failed retest: `CEO Scorecard · Q2 FY2026` recalculated 17 Jul 2026 15:18 showed
-- provenance_schema 2 and ordered model perspectives but still displayed `Model measures: —`,
-- while eight KPI lines plainly drove the score.
--
-- Root cause (probed on staging, not inferred): the CEO Enterprise Scorecard model has
-- ZERO strata_scorecard_model_measures rows, and its instance has EIGHT strata_scorecard_lines
-- (all ref_type='kpi'). 20260718003000 sourced provenance solely from model_measures, so its
-- jsonb_agg returned NULL and the field rendered "—". The value was technically accurate about
-- model_measures and completely useless about what actually produced the number: this instance
-- calculates from INSTANCE LINES. The loop over strata_scorecard_lines is the only place that
-- knows the real assignment set.
--
-- Fix: capture the assignment used for EACH contributing line, inside the loop that uses it:
--   * effective_measure_assignments — one entry per line: assignment_id (line id), kpi_id,
--     kpi_lineage_id, kpi_version, resolved_kpi_id, perspective_id, weight, order_index,
--     target_version, formula_version, threshold_scheme_id/version, target_override.
--   * assignment_source — 'instance_line' | 'model_measure', per entry, so the reader is never
--     misled about where the assignment came from.
--   * effective_measure_source — 'instance_lines' | 'model_measures' for the calculation.
--   * model_measures — emitted ONLY when the model genuinely defines measure rows. Omitted
--     entirely otherwise, so an empty field can never again imply "no measures" while measures
--     drove the score (the exact retest symptom).
--
-- NOT FABRICATED: `required`, `aggregation_method` and `target_policy` are model-measure
-- concepts with no instance-line equivalent. They are carried ONLY when a matching
-- model-measure row exists (matched on model + perspective + kpi); otherwise they are null
-- beside assignment_source='instance_line'. A null here means "this model defines no such
-- assignment", which is the truth — inventing a default would be fabricated provenance.
--
-- provenance_schema 2 -> 3. FORWARD-ONLY: no UPDATE, no DELETE, no backfill anywhere in this
-- migration. Locked snapshots, issued artifacts and approved definitions are untouched;
-- strata_calc_period already skips locked instances. The 96.541 result is unchanged — the
-- calculation arithmetic is byte-identical to 20260718003000; only what is RECORDED changed.
--
-- Body is 20260718003000's definition with the assignment capture added; per repo convention an
-- applied migration is never edited in place.

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
  v_assignments jsonb := '[]'::jsonb; v_mm record; v_model_measures jsonb;
BEGIN
  PERFORM public.strata_calc_guard();
  SELECT * INTO inst FROM public.strata_scorecard_instances WHERE id = p_instance;
  IF inst IS NULL THEN RAISE EXCEPTION 'scorecard instance not found'; END IF;
  SELECT * INTO model FROM public.strata_scorecard_models WHERE id = inst.model_id;
  scheme := model.threshold_scheme_id;

  SELECT ends_on::timestamptz INTO v_as_of FROM public.strata_periods WHERE id = inst.period_id;
  SELECT version INTO v_scheme_version FROM public.strata_threshold_schemes WHERE id = scheme;

  base_ctx := jsonb_build_object(
    'provenance_schema', 3,
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
      line_res := public.strata_calc_kpi_achievement(line.kpi_id, inst.period_id);
      line_score := (line_res->>'score')::numeric;
    ELSIF line.ref_type = 'objective' THEN
      SELECT avg((public.strata_calc_kpi_achievement(ek.kpi_id, inst.period_id)->>'score')::numeric)
        INTO line_score
        FROM public.strata_element_kpis ek WHERE ek.element_id = line.element_id;
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

    -- The assignment ACTUALLY USED for this line (SC-DEF-002 retest).
    SELECT mm.id, mm.required, mm.aggregation_method, mm.target_policy, mm.weight
      INTO v_mm
      FROM public.strata_scorecard_model_measures mm
     WHERE mm.model_id = model.id
       AND mm.perspective_id = line.perspective_id
       AND mm.kpi_id IS NOT DISTINCT FROM line.kpi_id
     LIMIT 1;

    v_assignments := v_assignments || jsonb_build_object(
      'assignment_id', line.id,
      'assignment_source', CASE WHEN v_mm.id IS NULL THEN 'instance_line' ELSE 'model_measure' END,
      'model_measure_id', v_mm.id,
      'ref_type', line.ref_type,
      'kpi_id', line.kpi_id,
      'kpi_lineage_id', line_res->'provenance'->'kpi_lineage_id',
      'kpi_version', line_res->'provenance'->'kpi_version',
      'resolved_kpi_id', line_res->'provenance'->'kpi_id',
      'element_id', line.element_id,
      'benefit_id', line.benefit_id,
      'perspective_id', line.perspective_id,
      'weight', line.weight,
      'order_index', line.order_index,
      'required', v_mm.required,
      'aggregation_method', v_mm.aggregation_method,
      'target_policy', COALESCE(v_mm.target_policy, CASE WHEN line.target_override IS NOT NULL THEN 'local' END),
      'target_override', line.target_override,
      'target_version', line_res->'provenance'->'target_version',
      'formula_version', line_res->'provenance'->'formula_version',
      'threshold_scheme_id', line_res->'provenance'->'threshold_scheme_id',
      'threshold_scheme_version', line_res->'provenance'->'threshold_scheme_version');

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

  SELECT jsonb_agg(jsonb_build_object('id', mm.id, 'kpi_id', mm.kpi_id,
                                      'resolved_kpi_id', public.strata_resolve_kpi_effective(mm.kpi_id, v_as_of),
                                      'perspective_id', mm.perspective_id, 'weight', mm.weight,
                                      'order_index', mm.order_index, 'required', mm.required,
                                      'aggregation_method', mm.aggregation_method,
                                      'target_policy', mm.target_policy)
                   ORDER BY mm.perspective_id, mm.order_index)
    INTO v_model_measures
    FROM public.strata_scorecard_model_measures mm WHERE mm.model_id = model.id;

  INSERT INTO public.strata_calculated_values
    (entity_type, entity_id, period_id, metric_key, value, score, status_key, formula_version, inputs, config_context)
  VALUES
    ('scorecard_instance', p_instance, inst.period_id, 'score', total, total, band,
     'rollup:' || model.rollup_method,
     jsonb_build_object('perspectives', perspectives),
     base_ctx
       || jsonb_build_object(
            'instance_id', p_instance,
            'model_perspectives', (SELECT jsonb_agg(jsonb_build_object('perspective_id', mp.perspective_id,
                                                                       'weight', mp.weight,
                                                                       'order_index', mp.order_index)
                                                    ORDER BY mp.order_index)
                                     FROM public.strata_scorecard_model_perspectives mp WHERE mp.model_id = model.id),
            -- The assignments that ACTUALLY produced this score, one per contributing line.
            'effective_measure_assignments', v_assignments,
            'effective_measure_source', CASE WHEN v_model_measures IS NULL THEN 'instance_lines' ELSE 'model_measures' END)
       -- Only present when the model genuinely defines measure rows. Omitted (not "—") otherwise,
       -- so an empty field can never imply "no measures" while measures drove the score.
       || CASE WHEN v_model_measures IS NULL THEN '{}'::jsonb
               ELSE jsonb_build_object('model_measures', v_model_measures) END);

  RETURN jsonb_build_object(
    'instance_id', p_instance, 'period_id', inst.period_id,
    'score', round(coalesce(total, 0), 2), 'has_data', total IS NOT NULL, 'status_key', band,
    'rollup_method', model.rollup_method, 'model_id', model.id, 'model_version', model.version,
    'perspectives', perspectives, 'lines', lines, 'calculated_at', now());
END;
$function$;

COMMENT ON FUNCTION public.strata_calc_scorecard_instance(uuid) IS
  'Calculates a scorecard instance and records the exact measure assignments used (SC-DEF-002). provenance_schema=3: effective_measure_assignments is one row per contributing line with assignment_source instance_line|model_measure; model_measures is present only when the model defines measure rows. Forward-only; no backfill.';
