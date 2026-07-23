-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S20 — enterprise governed rollup read model.
-- Forward-only, additive. Executive Reporting/Command Center read model: one set-based query
-- (no per-card N+1) returning, per Strategic KPI Assignment, the aggregating vs non-aggregating
-- project contributions using the EXACT S19 rule (approved, currently-effective direct_component
-- only). Registry reuse / driver / supporting_evidence / none / draft / retired / future / expired
-- are all non-aggregating. No governed row, snapshot or issued report is rewritten.
-- Applied to staging (cyijbdeuehohvhnsywig) as version 20260722110000; ledger 1:1 with this file.

CREATE OR REPLACE FUNCTION public.strata_executive_governed_rollup(p_cycle uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH agg AS (
    SELECT pa.id AS strategic_assignment_id, pa.kpi_id, pa.element_id AS strategic_objective_id,
      cm.id AS mapping_id, ka.project_card_id,
      (cm.relationship_type='direct_component' AND cm.status='approved'
        AND COALESCE(cm.effective_from, now())<=now()
        AND (cm.effective_to IS NULL OR cm.effective_to > now())) AS aggregates
    FROM public.strata_kpi_assignments pa
    JOIN public.strata_kpi_contribution_mappings cm ON cm.parent_assignment_id = pa.id
    JOIN public.strata_kpi_assignments ka ON ka.id = cm.child_assignment_id
    WHERE pa.scope_type = 'strategic'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'strategic_assignment_id', s.strategic_assignment_id,
    'strategic_kpi_id', s.kpi_id,
    'strategic_objective_id', s.strategic_objective_id,
    'aggregating_contributions', s.agg_count,
    'non_aggregating_contributions', s.non_agg_count,
    'contributing_project_cards', s.cards,
    'linked_key_results', (SELECT COALESCE(jsonb_agg(kr.id), '[]'::jsonb)
                             FROM public.strata_key_results kr WHERE kr.strategic_assignment_id = s.strategic_assignment_id)
  ) ORDER BY s.strategic_assignment_id), '[]'::jsonb)
  FROM (
    SELECT strategic_assignment_id, kpi_id, strategic_objective_id,
      count(*) FILTER (WHERE aggregates) AS agg_count,
      count(*) FILTER (WHERE NOT aggregates) AS non_agg_count,
      COALESCE(jsonb_agg(DISTINCT project_card_id) FILTER (WHERE aggregates), '[]'::jsonb) AS cards
    FROM agg GROUP BY strategic_assignment_id, kpi_id, strategic_objective_id
  ) s;
$function$;
COMMENT ON FUNCTION public.strata_executive_governed_rollup(uuid) IS
  'Enterprise governed rollup read model (S20). One set-based query for Executive Reporting/Command Center: per Strategic KPI Assignment, aggregating vs non-aggregating project contributions using the S19 rule (approved, currently-effective direct_component only). No per-card N+1.';
GRANT EXECUTE ON FUNCTION public.strata_executive_governed_rollup(uuid) TO authenticated;
