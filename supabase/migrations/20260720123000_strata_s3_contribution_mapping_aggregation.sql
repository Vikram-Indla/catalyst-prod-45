-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S3 — governed contribution mapping + aggregation
-- Forward-only, additive. A parent KPI Assignment aggregates ONLY over approved,
-- effective `direct_component` child assignments. driver / supporting_evidence /
-- none are explanatory and never enter the arithmetic (STRATA-KPI-030). One
-- authoritative aggregation service exposes numerator/denominator/weights/
-- exclusions/overlaps/provenance (STRATA-KPI-031).
--
-- Closes gaps: STRATA-KPI-028 / 029 / 030 / 031.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Contribution mapping (parent assignment <- child assignment), governed
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_kpi_contribution_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_assignment_id uuid NOT NULL REFERENCES public.strata_kpi_assignments(id) ON DELETE RESTRICT,
  child_assignment_id uuid NOT NULL REFERENCES public.strata_kpi_assignments(id) ON DELETE RESTRICT,
  relationship_type text NOT NULL CHECK (relationship_type IN ('direct_component','driver','supporting_evidence','none')),
  aggregation_rule text CHECK (aggregation_rule IS NULL OR aggregation_rule IN ('sum','average','weighted_average')),
  weight numeric,
  scope text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','retired','superseded')),
  submitted_by uuid, submitted_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  rejected_by uuid, rejected_at timestamptz, rejection_reason text,
  effective_from timestamptz, effective_to timestamptz,
  lock_version int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_contrib_no_self CHECK (parent_assignment_id <> child_assignment_id),
  UNIQUE (parent_assignment_id, child_assignment_id)
);
COMMENT ON TABLE public.strata_kpi_contribution_mappings IS
  'Governed contribution of a child KPI Assignment to a parent (STRATA-KPI-028). Only approved direct_component rows participate in aggregation; driver/supporting_evidence/none are explanatory (STRATA-KPI-030).';
CREATE INDEX IF NOT EXISTS idx_strata_contrib_parent ON public.strata_kpi_contribution_mappings(parent_assignment_id);
CREATE INDEX IF NOT EXISTS idx_strata_contrib_child ON public.strata_kpi_contribution_mappings(child_assignment_id);

ALTER TABLE public.strata_kpi_contribution_mappings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_contribution_mappings' AND policyname='strata_contrib_read') THEN
    CREATE POLICY strata_contrib_read ON public.strata_kpi_contribution_mappings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_kpi_contribution_mappings' AND policyname='strata_contrib_write') THEN
    CREATE POLICY strata_contrib_write ON public.strata_kpi_contribution_mappings FOR ALL TO authenticated
      USING (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']))
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_strata_contrib_touch ON public.strata_kpi_contribution_mappings;
CREATE TRIGGER trg_strata_contrib_touch BEFORE UPDATE ON public.strata_kpi_contribution_mappings
  FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();

-- ===========================================================================
-- 2. Roll-up compatibility validator (STRATA-KPI-029)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_contribution_validate(p_mapping uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m record; pa record; ca record; pk record; ck record; codes text[] := '{}';
BEGIN
  SELECT * INTO m FROM public.strata_kpi_contribution_mappings WHERE id = p_mapping;
  IF m.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['MAPPING_NOT_FOUND']); END IF;
  SELECT * INTO pa FROM public.strata_kpi_assignments WHERE id = m.parent_assignment_id;
  SELECT * INTO ca FROM public.strata_kpi_assignments WHERE id = m.child_assignment_id;
  SELECT * INTO pk FROM public.strata_kpis WHERE id = pa.kpi_id;
  SELECT * INTO ck FROM public.strata_kpis WHERE id = ca.kpi_id;

  IF pa.status <> 'approved' THEN codes := array_append(codes,'PARENT_NOT_APPROVED'); END IF;
  IF ca.status <> 'approved' THEN codes := array_append(codes,'CHILD_NOT_APPROVED'); END IF;
  -- only a direct_component must satisfy full arithmetic compatibility
  IF m.relationship_type = 'direct_component' THEN
    -- unit compatibility
    IF coalesce(pk.unit,'') <> coalesce(ck.unit,'') THEN codes := array_append(codes,'INCOMPATIBLE_UNIT'); END IF;
    -- direction compatibility
    IF coalesce(pk.direction,'') <> coalesce(ck.direction,'') THEN codes := array_append(codes,'INCOMPATIBLE_DIRECTION'); END IF;
    -- aggregation policy present on the parent (or an explicit rule on the mapping)
    IF coalesce(m.aggregation_rule, pk.aggregation_policy) IS NULL
       OR coalesce(m.aggregation_rule, pk.aggregation_policy) = 'none' THEN
      codes := array_append(codes,'NO_AGGREGATION_RULE'); END IF;
    -- weighted_average requires a weight
    IF coalesce(m.aggregation_rule, pk.aggregation_policy) = 'weighted_average' AND m.weight IS NULL THEN
      codes := array_append(codes,'MISSING_WEIGHT'); END IF;
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'mapping_id', p_mapping,
    'relationship_type', m.relationship_type);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_contribution_validate(uuid) TO authenticated;

-- ===========================================================================
-- 3. Mapping lifecycle RPCs (maker-checker SoD)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_create_contribution_mapping(
  p_parent uuid, p_child uuid, p_relationship_type text,
  p_aggregation_rule text DEFAULT NULL, p_weight numeric DEFAULT NULL, p_scope text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_relationship_type NOT IN ('direct_component','driver','supporting_evidence','none') THEN
    RAISE EXCEPTION 'INVALID_RELATIONSHIP: %', p_relationship_type; END IF;
  IF p_parent = p_child THEN RAISE EXCEPTION 'INVALID_MAPPING: an assignment cannot contribute to itself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpi_assignments WHERE id = p_parent) THEN RAISE EXCEPTION 'Parent assignment not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpi_assignments WHERE id = p_child) THEN RAISE EXCEPTION 'Child assignment not found'; END IF;
  INSERT INTO public.strata_kpi_contribution_mappings
    (parent_assignment_id, child_assignment_id, relationship_type, aggregation_rule, weight, scope, status)
  VALUES (p_parent, p_child, p_relationship_type, p_aggregation_rule, p_weight, p_scope, 'draft')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_contribution_mapping(uuid,uuid,text,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_submit_contribution_mapping(p_mapping uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO m FROM public.strata_kpi_contribution_mappings WHERE id = p_mapping;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mapping not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> m.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF m.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected mapping can be submitted (current: %)', m.status; END IF;
  v := public.strata_contribution_validate(p_mapping);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_MAPPING: %', (v->>'codes'); END IF;
  UPDATE public.strata_kpi_contribution_mappings
     SET status='submitted', submitted_by=auth.uid(), submitted_at=now(),
         rejected_by=NULL, rejected_at=NULL, rejection_reason=NULL, lock_version=lock_version+1
   WHERE id = p_mapping;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_contribution_mapping(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_approve_contribution_mapping(p_mapping uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_approver']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO m FROM public.strata_kpi_contribution_mappings WHERE id = p_mapping;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mapping not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> m.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF m.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted mapping can be approved (current: %)', m.status; END IF;
  IF m.submitted_by IS NOT NULL AND m.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own contribution mapping'; END IF;
  v := public.strata_contribution_validate(p_mapping);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_MAPPING: %', (v->>'codes'); END IF;
  UPDATE public.strata_kpi_contribution_mappings
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(effective_from, now()), lock_version=lock_version+1
   WHERE id = p_mapping;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_contribution_mapping(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_retire_contribution_mapping(p_mapping uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO m FROM public.strata_kpi_contribution_mappings WHERE id = p_mapping;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mapping not found'; END IF;
  IF m.status = 'retired' THEN RAISE EXCEPTION 'INVALID_TRANSITION: mapping already retired'; END IF;
  UPDATE public.strata_kpi_contribution_mappings
     SET status='retired', effective_to=COALESCE(effective_to, now()), lock_version=lock_version+1
   WHERE id = p_mapping;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_retire_contribution_mapping(uuid,text) TO authenticated;

-- ===========================================================================
-- 4. Authoritative aggregation service (STRATA-KPI-031)
-- ===========================================================================
-- Aggregates a parent assignment over its APPROVED, EFFECTIVE direct_component
-- children only. Exposes included observations, numerator, denominator, weights,
-- exclusions (with reasons), overlap warnings, missing-data, method + provenance.
CREATE OR REPLACE FUNCTION public.strata_calc_assignment_rollup(
  p_parent_assignment uuid, p_period uuid DEFAULT NULL, p_as_of date DEFAULT current_date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  pa record; pk record; m record; ca record; ck record; obs jsonb;
  rule text; included jsonb := '[]'::jsonb; excluded jsonb := '[]'::jsonb; overlaps jsonb := '[]'::jsonb;
  seen_scope jsonb := '{}'::jsonb; scope_key text;
  n_incl int := 0; sum_num numeric := 0; sum_den numeric := 0; sum_val numeric := 0;
  sum_w numeric := 0; sum_wv numeric := 0; all_weighted boolean := true; result numeric; method text;
BEGIN
  SELECT * INTO pa FROM public.strata_kpi_assignments WHERE id = p_parent_assignment;
  IF pa.id IS NULL THEN RETURN jsonb_build_object('error','ASSIGNMENT_NOT_FOUND'); END IF;
  SELECT * INTO pk FROM public.strata_kpis WHERE id = pa.kpi_id;

  FOR m IN
    SELECT * FROM public.strata_kpi_contribution_mappings
     WHERE parent_assignment_id = p_parent_assignment
       AND relationship_type = 'direct_component'         -- STRATA-KPI-030: only direct_component
       AND status = 'approved'
       AND COALESCE(effective_from, now()) <= now()
       AND (effective_to IS NULL OR effective_to > now())
  LOOP
    SELECT * INTO ca FROM public.strata_kpi_assignments WHERE id = m.child_assignment_id;
    SELECT * INTO ck FROM public.strata_kpis WHERE id = ca.kpi_id;
    rule := COALESCE(m.aggregation_rule, pk.aggregation_policy, 'sum');

    -- compatibility gate (defensive: mapping approval already checks, but effective KPI may have changed)
    IF coalesce(pk.unit,'') <> coalesce(ck.unit,'') THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','INCOMPATIBLE_UNIT')); CONTINUE; END IF;
    IF coalesce(pk.direction,'') <> coalesce(ck.direction,'') THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','INCOMPATIBLE_DIRECTION')); CONTINUE; END IF;

    obs := public.strata_resolve_assignment_observation(ca.id, p_period, p_as_of);
    IF NOT (obs->>'resolved')::boolean THEN
      excluded := excluded || jsonb_build_array(jsonb_build_object('child', ca.id, 'reason','MISSING_OBSERVATION')); CONTINUE; END IF;

    -- overlap / double-count detection: two children on the same scoped population
    scope_key := coalesce(ca.project_objective_id::text, ca.element_id::text, ca.id::text);
    IF seen_scope ? scope_key THEN
      overlaps := overlaps || jsonb_build_array(jsonb_build_object('scope', scope_key, 'child', ca.id));
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

  -- resolve the method + result
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
    'overlaps', overlaps, 'has_overlap', jsonb_array_length(overlaps) > 0);
END; $function$;
COMMENT ON FUNCTION public.strata_calc_assignment_rollup(uuid,uuid,date) IS
  'Authoritative KPI-assignment aggregation (STRATA-KPI-031). Includes only approved, effective direct_component children with an eligible observation; exposes numerator/denominator/weights/exclusions/overlaps/provenance. driver/supporting_evidence/none never enter the arithmetic.';
GRANT EXECUTE ON FUNCTION public.strata_calc_assignment_rollup(uuid,uuid,date) TO authenticated;
