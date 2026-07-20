-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S6 — retirement impact, retire guard, audit
-- Forward-only, additive.
--   STRATA-KPI-047/048 — KPI dependency-impact extended to Assignments, Contribution
--     Mappings, scoped Observations and assignment-backed KRs across the lineage.
--   STRATA-KPI-049     — element retirement now blocks on the NEW spine entities (approved
--     assignments / approved alignments on the element). Scoped to the new entities so it
--     does NOT retroactively change the shipped (check-free) retirement behavior (D-1);
--     broader OKR/KR/card blocking would need its own decision.
--   STRATA-KPI-051     — audit provenance: strata_audit() attached to the new governed tables.
-- ---------------------------------------------------------------------------

-- 1. Dependency impact now includes the new spine (STRATA-KPI-047/048) ----------
CREATE OR REPLACE FUNCTION public.strata_kpi_dependency_impact(p_kpi uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE k record; v_lin uuid; ids uuid[];
  el_cur int; el_hist int; mm_cur int; mm_hist int; sl_cur int; sl_hist int;
  kr_cur int; kr_hist int; ini_cur int;
  as_cur int; as_hist int; cm_cur int; cm_hist int; obs_cnt int; krlink_cur int;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  v_lin := k.lineage_id;
  SELECT array_agg(id) INTO ids FROM public.strata_kpis WHERE lineage_id = v_lin;

  SELECT count(*) FILTER (WHERE e.status <> 'retired'), count(*) FILTER (WHERE e.status = 'retired')
    INTO el_cur, el_hist
    FROM public.strata_element_kpis ek JOIN public.strata_strategy_elements e ON e.id = ek.element_id
   WHERE ek.kpi_id = ANY(ids);
  SELECT count(*) FILTER (WHERE m.status IN ('draft','pending_approval','approved')), count(*) FILTER (WHERE m.status IN ('retired','superseded'))
    INTO mm_cur, mm_hist
    FROM public.strata_scorecard_model_measures mm JOIN public.strata_scorecard_models m ON m.id = mm.model_id
   WHERE mm.kpi_id = ANY(ids);
  SELECT count(*) FILTER (WHERE i.status <> 'locked'), count(*) FILTER (WHERE i.status = 'locked')
    INTO sl_cur, sl_hist
    FROM public.strata_scorecard_lines l JOIN public.strata_scorecard_instances i ON i.id = l.instance_id
   WHERE l.kpi_id = ANY(ids);
  SELECT count(*) FILTER (WHERE o.status <> 'closed'), count(*) FILTER (WHERE o.status = 'closed')
    INTO kr_cur, kr_hist
    FROM public.strata_key_results kr JOIN public.strata_okrs o ON o.id = kr.okr_id
   WHERE kr.kpi_id = ANY(ids);
  SELECT count(*) INTO ini_cur FROM public.strata_initiative_kpis WHERE kpi_id = ANY(ids);

  -- NEW: KPI Assignments (STRATA-KPI-047)
  SELECT count(*) FILTER (WHERE status NOT IN ('retired','superseded')), count(*) FILTER (WHERE status IN ('retired','superseded'))
    INTO as_cur, as_hist FROM public.strata_kpi_assignments WHERE kpi_id = ANY(ids);
  -- NEW: Contribution Mappings whose parent/child assignment uses a lineage KPI (STRATA-KPI-048)
  SELECT count(*) FILTER (WHERE cm.status = 'approved'), count(*) FILTER (WHERE cm.status IN ('retired','rejected'))
    INTO cm_cur, cm_hist
    FROM public.strata_kpi_contribution_mappings cm
    JOIN public.strata_kpi_assignments a ON a.id IN (cm.parent_assignment_id, cm.child_assignment_id)
   WHERE a.kpi_id = ANY(ids);
  -- NEW: scoped observations (facts, historical)
  SELECT count(*) INTO obs_cnt
    FROM public.strata_kpi_assignment_observations o JOIN public.strata_kpi_assignments a ON a.id = o.assignment_id
   WHERE a.kpi_id = ANY(ids);
  -- NEW: assignment-backed KRs
  SELECT count(*) INTO krlink_cur
    FROM public.strata_key_results kr JOIN public.strata_kpi_assignments a ON a.id = kr.strategic_assignment_id
   WHERE a.kpi_id = ANY(ids);

  RETURN jsonb_build_object(
    'kpi_id', p_kpi, 'lineage_id', v_lin, 'versions_in_lineage', coalesce(array_length(ids,1), 0),
    'current', jsonb_build_object(
      'element_links', el_cur, 'model_measures', mm_cur, 'scorecard_lines', sl_cur,
      'key_results', kr_cur, 'initiative_links', ini_cur,
      'kpi_assignments', as_cur, 'contribution_mappings', cm_cur, 'assignment_backed_krs', krlink_cur),
    'historical', jsonb_build_object(
      'element_links', el_hist, 'model_measures', mm_hist, 'scorecard_lines_locked', sl_hist,
      'key_results_closed', kr_hist, 'kpi_assignments', as_hist, 'contribution_mappings', cm_hist,
      'assignment_observations', obs_cnt),
    'active_total', el_cur + mm_cur + sl_cur + kr_cur + ini_cur + as_cur + cm_cur + krlink_cur);
END; $function$;
COMMENT ON FUNCTION public.strata_kpi_dependency_impact(uuid) IS
  'Dependency impact for a KPI across its lineage (KO-DEF-002 + KPI-OPMODEL S6). Now includes KPI Assignments, Contribution Mappings, scoped Observations and assignment-backed KRs (STRATA-KPI-047/048). Read-only; locked/closed/historical rows never block.';
GRANT EXECUTE ON FUNCTION public.strata_kpi_dependency_impact(uuid) TO authenticated;

-- 2. Element retirement guard on the NEW entities (STRATA-KPI-049) --------------
CREATE OR REPLACE FUNCTION public.strata_guard_element_retire()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n_assign int; n_align int;
BEGIN
  IF NEW.status = 'retired' AND OLD.status IS DISTINCT FROM 'retired' THEN
    SELECT count(*) INTO n_assign FROM public.strata_kpi_assignments
     WHERE element_id = NEW.id AND status = 'approved';
    IF n_assign > 0 THEN
      RAISE EXCEPTION 'RETIREMENT_BLOCKED: % approved KPI assignment(s) on this element must be retired first (STRATA-KPI-049)', n_assign; END IF;
    SELECT count(*) INTO n_align FROM public.strata_project_objective_alignments
     WHERE (strategic_objective_id = NEW.id OR project_objective_id = NEW.id) AND status = 'approved';
    IF n_align > 0 THEN
      RAISE EXCEPTION 'RETIREMENT_BLOCKED: % approved objective alignment(s) reference this element (STRATA-KPI-049)', n_align; END IF;
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_guard_element_retire ON public.strata_strategy_elements;
CREATE TRIGGER trg_strata_guard_element_retire BEFORE UPDATE ON public.strata_strategy_elements
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_element_retire();

-- 3. Audit provenance on the new governed tables (STRATA-KPI-051) ---------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_kpi_assignments','strata_kpi_assignment_observations',
    'strata_kpi_contribution_mappings','strata_project_objective_alignments'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = format('trg_%s_audit', t)) THEN
      EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
    END IF;
  END LOOP;
END $$;
