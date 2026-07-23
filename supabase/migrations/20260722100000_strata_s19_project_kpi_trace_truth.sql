-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S19 — project KPI trace truth
-- Forward-only replacement of the S9 read function. No governed row, calculation,
-- snapshot or issued report is rewritten.
--
-- The S9 response claimed a ProjectObjective->StrategicObjective->KR->Assignment
-- basis without querying strata_key_results. It also reduced contribution governance
-- to parent assignment IDs. This definition returns the actual governed chain and
-- makes arithmetic eligibility explicit. KPI-definition reuse alone is never queried
-- as a contribution and therefore can never imply roll-up.

CREATE OR REPLACE FUNCTION public.strata_project_kpi_trace(p_project_card uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  card record;
  v_as_of timestamptz := now();
BEGIN
  SELECT * INTO card FROM public.strata_project_cards WHERE id = p_project_card;
  IF card.id IS NULL THEN
    RETURN jsonb_build_object('error', 'CARD_NOT_FOUND', 'project_card_id', p_project_card);
  END IF;

  RETURN jsonb_build_object(
    'project_card_id', p_project_card,
    'as_of', v_as_of,
    'card_primary_strategic_objective_id', card.objective_element_id,
    'approved_project_objective_alignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'alignment_id', a.id,
        'project_objective_id', a.project_objective_id,
        'strategic_objective_id', a.strategic_objective_id,
        'alignment_type', a.alignment_type,
        'attribution_share', a.attribution_share,
        'status', a.status,
        'approved_at', a.approved_at
      ) ORDER BY a.project_objective_id, a.alignment_type, a.id), '[]'::jsonb)
      FROM public.strata_project_objective_alignments a
      JOIN public.strata_execution_links el
        ON el.to_id = a.project_objective_id
       AND el.to_type = 'element'
       AND el.from_id = p_project_card
       AND el.from_type = 'project_card'
       AND el.relationship_type = 'has_objective'
      WHERE a.status = 'approved'
    ),
    'project_kpi_assignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'assignment_id', ka.id,
        'assignment_key', ka.assignment_key,
        'kpi_id', ka.kpi_id,
        'project_objective_id', ka.project_objective_id,
        'status', ka.status,
        'effective_from', ka.effective_from,
        'effective_to', ka.effective_to,
        'contribution_mappings', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'mapping_id', cm.id,
            'relationship_type', cm.relationship_type,
            'status', cm.status,
            'effective_from', cm.effective_from,
            'effective_to', cm.effective_to,
            'parent_strategic_assignment_id', cm.parent_assignment_id,
            'parent_kpi_id', parent_a.kpi_id,
            'parent_strategic_objective_id', parent_a.element_id,
            'aggregates', CASE
              WHEN cm.relationship_type = 'direct_component'
               AND cm.status = 'approved'
               AND COALESCE(cm.effective_from, v_as_of) <= v_as_of
               AND (cm.effective_to IS NULL OR cm.effective_to > v_as_of)
              THEN true ELSE false END,
            'linked_key_results', (
              SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'key_result_id', kr.id,
                'okr_id', kr.okr_id,
                'okr_objective_id', okr.objective_id,
                'kr_lifecycle', kr.lifecycle,
                'okr_status', okr.status
              ) ORDER BY kr.id), '[]'::jsonb)
              FROM public.strata_key_results kr
              JOIN public.strata_okrs okr ON okr.id = kr.okr_id
              WHERE kr.strategic_assignment_id = cm.parent_assignment_id
            )
          ) ORDER BY cm.id), '[]'::jsonb)
          FROM public.strata_kpi_contribution_mappings cm
          JOIN public.strata_kpi_assignments parent_a ON parent_a.id = cm.parent_assignment_id
          WHERE cm.child_assignment_id = ka.id
        )
      ) ORDER BY ka.id), '[]'::jsonb)
      FROM public.strata_kpi_assignments ka
      WHERE ka.project_card_id = p_project_card
    ),
    'basis', jsonb_build_object(
      'chain', 'project_card->project_objective->approved_alignment->strategic_objective->project_assignment->typed_contribution_mapping->strategic_assignment->linked_key_result->okr',
      'kr_link', 'strata_key_results.strategic_assignment_id=parent_assignment_id',
      'aggregation_rule', 'approved effective direct_component only',
      'registry_reuse_creates_rollup', false,
      'historical_rows_rewritten', false
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.strata_project_kpi_trace(uuid) IS
  'Governed Project KPI trace (STRATA-KPI-044/S19). Traces approved objective alignment, typed contribution mapping, parent Strategic KPI Assignment and directly linked KR/OKR. aggregates=true only for approved, currently-effective direct_component mappings. KPI registry reuse alone never rolls up.';

GRANT EXECUTE ON FUNCTION public.strata_project_kpi_trace(uuid) TO authenticated;
