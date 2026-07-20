-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S14 — null as_of guard on the aggregation path
-- Forward-only. Browser testing revealed the UI calls the roll-up with p_as_of := null (the rpc
-- bridge passes null rather than omitting the arg), which overrides the DEFAULT current_date and
-- makes `as_of_date <= NULL` always false → every observation excluded → included 0. Same class as
-- the shipped 20260719195500 KR-calc guard. COALESCE(p_as_of, current_date) restores the intended
-- default for every caller. Behaviour otherwise unchanged (supersedes the S2/S3 definitions).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_resolve_assignment_observation(p_assignment uuid, p_period uuid DEFAULT NULL, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO o FROM public.strata_kpi_assignment_observations
   WHERE assignment_id = p_assignment
     AND (p_period IS NULL OR period_id = p_period)
     AND as_of_date <= p_as_of
     AND status IN ('validated','accepted_with_exception')
   ORDER BY (status='validated') DESC, as_of_date DESC, submitted_at DESC
   LIMIT 1;
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('resolved', false, 'reason', 'NO_ELIGIBLE_OBSERVATION');
  END IF;
  RETURN jsonb_build_object('resolved', true, 'observation_id', o.id, 'value', o.value,
    'numerator', o.numerator, 'denominator', o.denominator, 'status', o.status,
    'as_of', o.as_of_date, 'period_id', o.period_id,
    'exception', (o.status = 'accepted_with_exception'), 'exception_reason', o.exception_reason);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_resolve_assignment_observation(uuid,uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_calc_assignment_rollup(
  p_parent_assignment uuid, p_period uuid DEFAULT NULL, p_as_of date DEFAULT current_date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  pa record; pk record; m record; ca record; ck record; obs jsonb;
  rule text; included jsonb := '[]'::jsonb; excluded jsonb := '[]'::jsonb; v_overlaps jsonb := '[]'::jsonb;
  seen_scope jsonb := '{}'::jsonb; scope_key text;
  n_incl int := 0; sum_num numeric := 0; sum_den numeric := 0; sum_val numeric := 0;
  sum_w numeric := 0; sum_wv numeric := 0; all_weighted boolean := true; result numeric; method text;
BEGIN
  p_as_of := COALESCE(p_as_of, current_date);
  SELECT * INTO pa FROM public.strata_kpi_assignments WHERE id = p_parent_assignment;
  IF pa.id IS NULL THEN RETURN jsonb_build_object('error','ASSIGNMENT_NOT_FOUND'); END IF;
  SELECT * INTO pk FROM public.strata_kpis WHERE id = pa.kpi_id;
  FOR m IN
    SELECT * FROM public.strata_kpi_contribution_mappings
     WHERE parent_assignment_id = p_parent_assignment
       AND relationship_type = 'direct_component'
       AND status = 'approved'
       AND COALESCE(effective_from, now()) <= now()
       AND (effective_to IS NULL OR effective_to > now())
  LOOP
    SELECT * INTO ca FROM public.strata_kpi_assignments WHERE id = m.child_assignment_id;
    SELECT * INTO ck FROM public.strata_kpis WHERE id = ca.kpi_id;
    rule := COALESCE(m.aggregation_rule, pk.aggregation_policy, 'sum');
    IF coalesce(pk.unit,'') <> coalesce(ck.unit,'') THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','INCOMPATIBLE_UNIT')); CONTINUE; END IF;
    IF coalesce(pk.direction,'') <> coalesce(ck.direction,'') THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','INCOMPATIBLE_DIRECTION')); CONTINUE; END IF;
    obs := public.strata_resolve_assignment_observation(ca.id, p_period, p_as_of);
    IF NOT (obs->>'resolved')::boolean THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','MISSING_OBSERVATION')); CONTINUE; END IF;
    scope_key := coalesce(ca.project_objective_id::text, ca.element_id::text, ca.id::text);
    IF seen_scope ? scope_key THEN
      v_overlaps := v_overlaps || jsonb_build_array(jsonb_build_object('scope', scope_key, 'child', ca.id));
    ELSE
      seen_scope := seen_scope || jsonb_build_object(scope_key, true);
    END IF;
    n_incl := n_incl + 1;
    sum_val := sum_val + COALESCE((obs->>'value')::numeric, 0);
    sum_num := sum_num + COALESCE((obs->>'numerator')::numeric, (obs->>'value')::numeric, 0);
    sum_den := sum_den + COALESCE((obs->>'denominator')::numeric, 0);
    IF m.weight IS NULL THEN all_weighted := false;
    ELSE sum_w := sum_w + m.weight; sum_wv := sum_wv + m.weight * COALESCE((obs->>'value')::numeric,0); END IF;
    included := included || jsonb_build_array(jsonb_build_object(
      'child', ca.id, 'observation_id', obs->>'observation_id', 'value', obs->'value',
      'numerator', obs->'numerator', 'denominator', obs->'denominator', 'weight', m.weight,
      'exception', obs->'exception'));
  END LOOP;
  IF n_incl = 0 THEN result := NULL; method := 'none';
  ELSIF rule = 'weighted_average' AND all_weighted AND sum_w > 0 THEN result := round(sum_wv/sum_w,4); method := 'weighted_average';
  ELSIF rule = 'average' THEN result := round(sum_val/n_incl,4); method := 'average';
  ELSIF rule = 'sum' AND sum_den > 0 THEN result := round(sum_num/sum_den,4); method := 'ratio_sum';
  ELSIF rule = 'sum' THEN result := round(sum_num,4); method := 'sum';
  ELSE result := round(sum_val/n_incl,4); method := 'average'; END IF;
  RETURN jsonb_build_object(
    'parent_assignment_id', p_parent_assignment, 'as_of', p_as_of, 'period_id', p_period,
    'rule', COALESCE(pk.aggregation_policy,'none'), 'method', method, 'result', result,
    'numerator', CASE WHEN method IN ('sum','ratio_sum') THEN sum_num ELSE NULL END,
    'denominator', CASE WHEN method='ratio_sum' THEN sum_den ELSE NULL END,
    'weighted_denominator', CASE WHEN method='weighted_average' THEN sum_w ELSE NULL END,
    'included_count', n_incl, 'included', included, 'excluded', excluded,
    'overlaps', v_overlaps, 'has_overlap', jsonb_array_length(v_overlaps) > 0);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_calc_assignment_rollup(uuid,uuid,date) TO authenticated;
