-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S9 — lifecycle completeness + downstream reads
-- Forward-only, additive.
--   011 — 'changes_requested' OKR state + strata_request_okr_changes; submit accepts it.
--   009 — strata_approve_okr now approves the OKR's current KR versions atomically.
--   012 — strata_okr_version_impact_preview (read-only dry run).
--   023 — assigned KPI approver (usage-class-aware) + approval enforces it.
--   041 — strata_element_okr_readiness (Objective->approved OKR->reportable KR).
--   042 — strata_element_health_from_kr (health from approved KR results).
--   044 — strata_project_kpi_trace (ProjectObjective->StrategicObjective->KR->Assignment).
-- ---------------------------------------------------------------------------

-- 011: add the changes_requested state -----------------------------------------
ALTER TABLE public.strata_okrs DROP CONSTRAINT IF EXISTS strata_okrs_status_check;
ALTER TABLE public.strata_okrs ADD CONSTRAINT strata_okrs_status_check CHECK (
  status = ANY (ARRAY['draft','submitted','changes_requested','active','closing_review','closed','withdrawn','rejected','cancelled']::text[])
);

CREATE OR REPLACE FUNCTION public.strata_request_okr_changes(p_okr uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: requesting changes requires okr_approver or strategy_office'; END IF;
  IF coalesce(btrim(p_reason),'') = '' THEN RAISE EXCEPTION 'INVALID_OKR: a reason is required'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted OKR can be sent back for changes (current: %)', o.status; END IF;
  IF o.submitted_by IS NOT NULL AND o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot decide their own OKR'; END IF;
  UPDATE public.strata_okrs
     SET status='changes_requested', rejection_reason=p_reason, lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_request_okr_changes(uuid,text) TO authenticated;

-- 011: submit now also accepts a changes_requested OKR (resubmit) ---------------
CREATE OR REPLACE FUNCTION public.strata_submit_okr(p_okr uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: submitting an OKR requires strategy_office or okr_owner'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> o.lock_version THEN
    RAISE EXCEPTION 'STALE_WRITE: OKR changed since load (expected %, got %)', p_lock_version, o.lock_version; END IF;
  IF o.status NOT IN ('draft','rejected','changes_requested') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected/changes_requested OKR can be submitted (current: %)', o.status; END IF;
  v := public.strata_okr_validate(p_okr, 'submit');
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_OKR: cannot submit — %', (v->>'codes'); END IF;
  UPDATE public.strata_okrs
     SET status='submitted', submitted_at=now(), submitted_by=auth.uid(),
         rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
         lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_okr(uuid,int) TO authenticated;

-- 009: approving an OKR approves its current KR versions as one boundary --------
CREATE OR REPLACE FUNCTION public.strata_approve_okr(p_okr uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: approving an OKR requires the okr_approver or strategy_office role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> o.lock_version THEN RAISE EXCEPTION 'STALE_WRITE: OKR changed since load'; END IF;
  IF o.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted OKR can be approved (current: %)', o.status; END IF;
  IF o.submitted_by IS NOT NULL AND o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own OKR (maker-checker)'; END IF;
  v := public.strata_okr_validate(p_okr, 'approve');
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_OKR: cannot approve — %', (v->>'codes'); END IF;
  UPDATE public.strata_okrs
     SET status='active', approved_at=now(), approved_by=auth.uid(),
         activated_at=now(), activated_by=auth.uid(), lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
  UPDATE public.strata_okr_versions
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(effective_from, now())
   WHERE id = o.current_version_id AND status='draft';
  -- STRATA-KPI-009: KR versions approved atomically with the OKR (one governed boundary)
  UPDATE public.strata_kr_versions kv
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(kv.effective_from, now())
    FROM public.strata_key_results kr
   WHERE kr.okr_id = p_okr AND kv.id = kr.current_version_id AND kv.status='draft';
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_okr(uuid,int) TO authenticated;

-- 012: OKR version impact preview (read-only dry run) --------------------------
CREATE OR REPLACE FUNCTION public.strata_okr_version_impact_preview(p_okr uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RETURN jsonb_build_object('error','OKR_NOT_FOUND'); END IF;
  RETURN jsonb_build_object(
    'okr_id', p_okr, 'current_status', o.status, 'current_version_id', o.current_version_id,
    'next_version', COALESCE((SELECT max(version) FROM public.strata_okr_versions WHERE okr_id=p_okr),0)+1,
    'key_results', (SELECT count(*) FROM public.strata_key_results WHERE okr_id=p_okr),
    'kr_measurement_contracts', (SELECT count(*) FROM public.strata_key_results kr WHERE kr.okr_id=p_okr AND (kr.kpi_id IS NOT NULL OR kr.strategic_assignment_id IS NOT NULL)),
    'assignment_backed_krs', (SELECT count(*) FROM public.strata_key_results WHERE okr_id=p_okr AND strategic_assignment_id IS NOT NULL),
    'note', 'Creating a new version supersedes the current one prospectively; closed history is never mutated.');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_okr_version_impact_preview(uuid) TO authenticated;

-- 023: usage-class-aware assigned KPI approver --------------------------------
ALTER TABLE public.strata_kpis ADD COLUMN IF NOT EXISTS assigned_approver_id uuid;
COMMENT ON COLUMN public.strata_kpis.assigned_approver_id IS
  'Governed assigned approver for this KPI (STRATA-KPI-023). Required for strategic/KR-eligible usage classes; approval enforces auth.uid() = assigned_approver_id when set.';

CREATE OR REPLACE FUNCTION public.strata_assign_kpi_approver(p_kpi uuid, p_approver uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: assigning a KPI approver requires strategy_office'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN RAISE EXCEPTION 'KPI not found'; END IF;
  UPDATE public.strata_kpis SET assigned_approver_id = p_approver, updated_at = now() WHERE id = p_kpi;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_assign_kpi_approver(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_approve_kpi(p_kpi uuid, p_note text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_blockers text[]; k record;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  -- STRATA-KPI-023: strategic / KR-eligible KPIs need an assigned approver; when set, only they may approve.
  IF (k.usage_class = 'strategic' OR k.kr_eligible) AND k.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'APPROVER_REQUIRED: a strategic/KR-eligible KPI needs an assigned approver before approval (STRATA-KPI-023)';
  END IF;
  IF k.assigned_approver_id IS NOT NULL AND auth.uid() IS NOT NULL AND auth.uid() <> k.assigned_approver_id THEN
    RAISE EXCEPTION 'APPROVER_MISMATCH: only the assigned approver may approve this KPI (STRATA-KPI-023)';
  END IF;
  v_blockers := public.strata_kpi_submission_blockers(p_kpi, NULL);
  IF array_length(v_blockers, 1) > 0 THEN
    RAISE EXCEPTION 'approval blocked — % prerequisite(s) not met: %',
      array_length(v_blockers, 1), array_to_string(v_blockers, '; ');
  END IF;
  PERFORM public.strata_approve_record('strata_kpis', p_kpi, p_note);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_kpi(uuid,text) TO authenticated;

-- 041: element OKR readiness (Objective -> approved OKR -> reportable KR) --------
CREATE OR REPLACE FUNCTION public.strata_element_okr_readiness(p_element uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE okr record; n_okrs int:=0; n_active int:=0; n_reportable_krs int:=0; n_total_krs int:=0; kr record; rep jsonb;
BEGIN
  FOR okr IN SELECT * FROM public.strata_okrs WHERE theme_id = p_element LOOP
    n_okrs := n_okrs + 1;
    IF okr.status = 'active' THEN n_active := n_active + 1;
      FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id = okr.id AND COALESCE(lifecycle,'active')<>'retired' LOOP
        n_total_krs := n_total_krs + 1;
        rep := public.strata_kr_reportability(kr.id, p_as_of);
        IF (rep->>'reportable')::boolean THEN n_reportable_krs := n_reportable_krs + 1; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('element_id', p_element, 'okrs', n_okrs, 'active_okrs', n_active,
    'total_krs', n_total_krs, 'reportable_krs', n_reportable_krs,
    'ready', (n_active > 0 AND n_reportable_krs > 0),
    'readiness_basis', 'objective->approved OKR->reportable KR (STRATA-KPI-041)');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_element_okr_readiness(uuid,date) TO authenticated;

-- 042: element health from approved KR results ---------------------------------
CREATE OR REPLACE FUNCTION public.strata_element_health_from_kr(p_element uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE okr record; sum_p numeric:=0; cnt int:=0; worst text:='on_track'; prog jsonb; health text;
BEGIN
  FOR okr IN SELECT * FROM public.strata_okrs WHERE theme_id = p_element AND status='active' LOOP
    prog := public.strata_okr_official_progress_v2(okr.id, p_as_of);
    IF (prog->>'official_progress') IS NOT NULL THEN
      sum_p := sum_p + (prog->>'official_progress')::numeric; cnt := cnt + 1;
      IF prog->>'objective_flag' IN ('critical_kr_failing','all_must_pass_not_met') THEN worst := 'off_track';
      ELSIF prog->>'objective_flag' = 'incomplete_coverage' AND worst <> 'off_track' THEN worst := 'at_risk'; END IF;
    END IF;
  END LOOP;
  health := CASE WHEN cnt=0 THEN 'not_assessed' ELSE worst END;
  RETURN jsonb_build_object('element_id', p_element, 'assessed_okrs', cnt,
    'avg_official_progress', CASE WHEN cnt>0 THEN round(sum_p/cnt,4) ELSE NULL END,
    'outcome_health', health, 'basis', 'approved KR results only (STRATA-KPI-042; operational KPI indicators shown separately)');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_element_health_from_kr(uuid,date) TO authenticated;

-- 044: Command Center traceability chain ---------------------------------------
CREATE OR REPLACE FUNCTION public.strata_project_kpi_trace(p_project_card uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE card record;
BEGIN
  SELECT * INTO card FROM public.strata_project_cards WHERE id = p_project_card;
  IF card.id IS NULL THEN RETURN jsonb_build_object('error','CARD_NOT_FOUND'); END IF;
  RETURN jsonb_build_object(
    'project_card_id', p_project_card,
    'primary_strategic_objective', card.objective_element_id,
    'project_objective_alignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('project_objective', a.project_objective_id,
             'strategic_objective', a.strategic_objective_id, 'type', a.alignment_type, 'status', a.status)), '[]'::jsonb)
      FROM public.strata_project_objective_alignments a
      JOIN public.strata_execution_links el ON el.to_id = a.project_objective_id AND el.from_id = p_project_card
        AND el.relationship_type='has_objective'),
    'project_kpi_assignments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('assignment', ka.id, 'kpi', ka.kpi_id, 'status', ka.status,
             'contributes_to', (SELECT jsonb_agg(cm.parent_assignment_id) FROM public.strata_kpi_contribution_mappings cm
                                 WHERE cm.child_assignment_id = ka.id AND cm.status='approved'))), '[]'::jsonb)
      FROM public.strata_kpi_assignments ka WHERE ka.project_card_id = p_project_card),
    'basis', 'ProjectObjective->StrategicObjective->KR->Strategic KPI Assignment (STRATA-KPI-044; historical cards not rewritten)');
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_project_kpi_trace(uuid) TO authenticated;
