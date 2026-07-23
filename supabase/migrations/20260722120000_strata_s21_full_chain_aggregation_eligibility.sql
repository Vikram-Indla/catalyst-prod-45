-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S21 — full-chain governed aggregation eligibility.
-- Forward-only. Corrects a real gap Aiden's acceptance found: S19/S20 returned aggregates=true from
-- mapping type/status/effective ONLY, without requiring the approved Project Objective Alignment or
-- approved+effective child/parent assignments. This adds a SINGLE source of truth
-- (strata_contribution_aggregates) and redefines the trace and the rollup to call it — the invariant
-- is defined once, never duplicated. S9, S19 and S20 migration files are NOT edited; this supersedes
-- their function bodies forward-only. No governed row, snapshot or issued report is rewritten.
-- Applied to staging (cyijbdeuehohvhnsywig) as version 20260722120000; ledger 1:1 with this file.

-- Single source of governed aggregation eligibility.
CREATE OR REPLACE FUNCTION public.strata_contribution_aggregates(p_mapping uuid, p_as_of timestamptz DEFAULT now())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.strata_kpi_contribution_mappings cm
    JOIN public.strata_kpi_assignments child  ON child.id  = cm.child_assignment_id
    JOIN public.strata_kpi_assignments parent ON parent.id = cm.parent_assignment_id
    WHERE cm.id = p_mapping
      AND cm.relationship_type = 'direct_component'
      AND cm.status = 'approved'
      AND COALESCE(cm.effective_from, p_as_of) <= p_as_of
      AND (cm.effective_to IS NULL OR cm.effective_to > p_as_of)
      AND child.status = 'approved'
      AND COALESCE(child.effective_from, p_as_of) <= p_as_of
      AND (child.effective_to IS NULL OR child.effective_to > p_as_of)
      AND parent.status = 'approved'
      AND COALESCE(parent.effective_from, p_as_of) <= p_as_of
      AND (parent.effective_to IS NULL OR parent.effective_to > p_as_of)
      AND EXISTS (
        SELECT 1 FROM public.strata_project_objective_alignments al
        WHERE al.status = 'approved'
          AND al.project_objective_id = child.project_objective_id
          AND al.strategic_objective_id = parent.element_id
      )
  );
$function$;
COMMENT ON FUNCTION public.strata_contribution_aggregates(uuid, timestamptz) IS
  'S21 single source of governed aggregation eligibility. aggregates=true requires: approved+effective direct_component mapping; approved+effective child Project Assignment; approved+effective parent Strategic Assignment; AND an approved Project Objective Alignment connecting the child Project Objective to the parent Strategic Objective. Any missing/mismatched/expired/unapproved link => false.';
GRANT EXECUTE ON FUNCTION public.strata_contribution_aggregates(uuid, timestamptz) TO authenticated;

-- Redefine the trace: aggregates now delegates to the single-source helper. Chain/basis otherwise unchanged.
CREATE OR REPLACE FUNCTION public.strata_project_kpi_trace(p_project_card uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE card record; v_as_of timestamptz := now();
BEGIN
  SELECT * INTO card FROM public.strata_project_cards WHERE id = p_project_card;
  IF card.id IS NULL THEN RETURN jsonb_build_object('error','CARD_NOT_FOUND','project_card_id',p_project_card); END IF;
  RETURN jsonb_build_object(
    'project_card_id', p_project_card, 'as_of', v_as_of,
    'card_primary_strategic_objective_id', card.objective_element_id,
    'approved_project_objective_alignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('alignment_id',a.id,'project_objective_id',a.project_objective_id,
        'strategic_objective_id',a.strategic_objective_id,'alignment_type',a.alignment_type,
        'attribution_share',a.attribution_share,'status',a.status,'approved_at',a.approved_at)
        ORDER BY a.project_objective_id,a.alignment_type,a.id),'[]'::jsonb)
      FROM public.strata_project_objective_alignments a
      JOIN public.strata_execution_links el ON el.to_id=a.project_objective_id AND el.to_type='element'
        AND el.from_id=p_project_card AND el.from_type='project_card' AND el.relationship_type='has_objective'
      WHERE a.status='approved'),
    'project_kpi_assignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('assignment_id',ka.id,'assignment_key',ka.assignment_key,
        'kpi_id',ka.kpi_id,'project_objective_id',ka.project_objective_id,'status',ka.status,
        'effective_from',ka.effective_from,'effective_to',ka.effective_to,
        'contribution_mappings',(
          SELECT COALESCE(jsonb_agg(jsonb_build_object('mapping_id',cm.id,'relationship_type',cm.relationship_type,
            'status',cm.status,'effective_from',cm.effective_from,'effective_to',cm.effective_to,
            'parent_strategic_assignment_id',cm.parent_assignment_id,'parent_kpi_id',parent_a.kpi_id,
            'parent_strategic_objective_id',parent_a.element_id,
            'aggregates', public.strata_contribution_aggregates(cm.id, v_as_of),
            'linked_key_results',(
              SELECT COALESCE(jsonb_agg(jsonb_build_object('key_result_id',kr.id,'okr_id',kr.okr_id,
                'okr_objective_id',okr.objective_id,'kr_lifecycle',kr.lifecycle,'okr_status',okr.status) ORDER BY kr.id),'[]'::jsonb)
              FROM public.strata_key_results kr JOIN public.strata_okrs okr ON okr.id=kr.okr_id
              WHERE kr.strategic_assignment_id=cm.parent_assignment_id)
          ) ORDER BY cm.id),'[]'::jsonb)
          FROM public.strata_kpi_contribution_mappings cm
          JOIN public.strata_kpi_assignments parent_a ON parent_a.id=cm.parent_assignment_id
          WHERE cm.child_assignment_id=ka.id)
      ) ORDER BY ka.id),'[]'::jsonb)
      FROM public.strata_kpi_assignments ka WHERE ka.project_card_id=p_project_card),
    'basis', jsonb_build_object(
      'chain','project_card->project_objective->approved_alignment->strategic_objective->project_assignment->typed_contribution_mapping->strategic_assignment->linked_key_result->okr',
      'kr_link','strata_key_results.strategic_assignment_id=parent_assignment_id',
      'aggregation_rule','strata_contribution_aggregates (S21): approved+effective direct_component AND approved+effective child+parent assignments AND approved alignment connecting child project objective to parent strategic objective',
      'registry_reuse_creates_rollup',false,'historical_rows_rewritten',false));
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_project_kpi_trace(uuid) TO authenticated;

-- Redefine the rollup read model to use the same single-source helper (S20 forward-only update; not duplicated).
CREATE OR REPLACE FUNCTION public.strata_executive_governed_rollup(p_cycle uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH agg AS (
    SELECT pa.id AS strategic_assignment_id, pa.kpi_id, pa.element_id AS strategic_objective_id,
      cm.id AS mapping_id, ka.project_card_id,
      public.strata_contribution_aggregates(cm.id, now()) AS aggregates
    FROM public.strata_kpi_assignments pa
    JOIN public.strata_kpi_contribution_mappings cm ON cm.parent_assignment_id=pa.id
    JOIN public.strata_kpi_assignments ka ON ka.id=cm.child_assignment_id
    WHERE pa.scope_type='strategic')
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'strategic_assignment_id',s.strategic_assignment_id,'strategic_kpi_id',s.kpi_id,
    'strategic_objective_id',s.strategic_objective_id,'aggregating_contributions',s.agg_count,
    'non_aggregating_contributions',s.non_agg_count,'contributing_project_cards',s.cards,
    'linked_key_results',(SELECT COALESCE(jsonb_agg(kr.id),'[]'::jsonb) FROM public.strata_key_results kr WHERE kr.strategic_assignment_id=s.strategic_assignment_id)
  ) ORDER BY s.strategic_assignment_id),'[]'::jsonb)
  FROM (SELECT strategic_assignment_id,kpi_id,strategic_objective_id,
    count(*) FILTER (WHERE aggregates) AS agg_count, count(*) FILTER (WHERE NOT aggregates) AS non_agg_count,
    COALESCE(jsonb_agg(DISTINCT project_card_id) FILTER (WHERE aggregates),'[]'::jsonb) AS cards
    FROM agg GROUP BY strategic_assignment_id,kpi_id,strategic_objective_id) s;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_executive_governed_rollup(uuid) TO authenticated;
