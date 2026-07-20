-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S12 — governed exception, review evidence, notify wiring
-- Forward-only, additive.
--   038 — governed exception path for the Theme/Objective alignment contradiction hard-block.
--   046 — enforce review evidence: retiring an APPROVED contribution mapping requires a review_id.
--   052 — wire notification: approving a KPI assignment notifies the owner.
-- ---------------------------------------------------------------------------

-- 038: governed exception on Project Objective Alignment ------------------------
ALTER TABLE public.strata_project_objective_alignments
  ADD COLUMN IF NOT EXISTS exception_reason text,
  ADD COLUMN IF NOT EXISTS exception_approved_by uuid,
  ADD COLUMN IF NOT EXISTS exception_approved_at timestamptz;
COMMENT ON COLUMN public.strata_project_objective_alignments.exception_reason IS
  'Governed exception (STRATA-KPI-038): when approved, the primary-alignment/theme contradiction check is bypassed with a recorded, audited reason instead of an unconditional hard block.';

CREATE OR REPLACE FUNCTION public.strata_grant_alignment_exception(p_alignment uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: granting an alignment exception requires strategy_office'; END IF;
  IF coalesce(btrim(p_reason),'') = '' THEN RAISE EXCEPTION 'INVALID_EXCEPTION: a reason is required'; END IF;
  UPDATE public.strata_project_objective_alignments
     SET exception_reason = p_reason, exception_approved_by = auth.uid(), exception_approved_at = now(),
         lock_version = lock_version + 1
   WHERE id = p_alignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_grant_alignment_exception(uuid,text) TO authenticated;

-- validator now honours a governed exception (supersedes the S4 definition)
CREATE OR REPLACE FUNCTION public.strata_alignment_validate(p_alignment uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE al record; po record; so record; card record; card_obj record; codes text[] := '{}';
BEGIN
  SELECT * INTO al FROM public.strata_project_objective_alignments WHERE id = p_alignment;
  IF al.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['ALIGNMENT_NOT_FOUND']); END IF;
  SELECT * INTO po FROM public.strata_strategy_elements WHERE id = al.project_objective_id;
  SELECT * INTO so FROM public.strata_strategy_elements WHERE id = al.strategic_objective_id;
  IF po.id IS NULL OR po.context <> 'project' THEN codes := array_append(codes,'NOT_A_PROJECT_OBJECTIVE'); END IF;
  IF so.id IS NULL OR so.context <> 'theme' THEN codes := array_append(codes,'NOT_A_STRATEGIC_OBJECTIVE'); END IF;
  IF al.alignment_type = 'secondary' AND al.attribution_share IS NULL THEN
    codes := array_append(codes,'SECONDARY_NEEDS_ATTRIBUTION'); END IF;
  -- STRATA-KPI-036/038: contradiction is a hard block UNLESS a governed exception is approved.
  IF al.alignment_type = 'primary' AND al.exception_approved_by IS NULL THEN
    SELECT pc.* INTO card FROM public.strata_project_cards pc
     JOIN public.strata_execution_links el ON el.to_id = po.id AND el.to_type='element' AND el.relationship_type='has_objective' AND el.from_type='project_card' AND el.from_id = pc.id
     LIMIT 1;
    IF card.id IS NOT NULL AND card.objective_element_id IS NOT NULL THEN
      SELECT * INTO card_obj FROM public.strata_strategy_elements WHERE id = card.objective_element_id;
      IF coalesce(so.parent_id, so.id) IS DISTINCT FROM coalesce(card_obj.parent_id, card_obj.id)
         AND so.parent_id IS DISTINCT FROM card_obj.parent_id THEN
        codes := array_append(codes,'CONTRADICTS_CARD_PRIMARY_OBJECTIVE');
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'alignment_id', p_alignment,
    'exception_applied', (al.alignment_type='primary' AND al.exception_approved_by IS NOT NULL));
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_alignment_validate(uuid) TO authenticated;

-- 046: retiring an approved contribution mapping requires review evidence -------
CREATE OR REPLACE FUNCTION public.strata_guard_mapping_review_evidence()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.status = 'retired' AND OLD.status = 'approved' AND NEW.review_id IS NULL THEN
    RAISE EXCEPTION 'REVIEW_REQUIRED: retiring an approved contribution mapping requires a review_id (STRATA-KPI-046)';
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_mapping_review_evidence ON public.strata_kpi_contribution_mappings;
CREATE TRIGGER trg_strata_mapping_review_evidence BEFORE UPDATE ON public.strata_kpi_contribution_mappings
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_mapping_review_evidence();

-- retire RPC now accepts + records the review evidence
CREATE OR REPLACE FUNCTION public.strata_retire_contribution_mapping(p_mapping uuid, p_reason text DEFAULT NULL, p_review uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO m FROM public.strata_kpi_contribution_mappings WHERE id = p_mapping;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mapping not found'; END IF;
  IF m.status = 'retired' THEN RAISE EXCEPTION 'INVALID_TRANSITION: mapping already retired'; END IF;
  IF m.status = 'approved' AND p_review IS NULL AND m.review_id IS NULL THEN
    RAISE EXCEPTION 'REVIEW_REQUIRED: retiring an approved contribution mapping requires review evidence (STRATA-KPI-046)'; END IF;
  UPDATE public.strata_kpi_contribution_mappings
     SET status='retired', review_id=COALESCE(p_review, review_id), effective_to=COALESCE(effective_to, now()), lock_version=lock_version+1
   WHERE id = p_mapping;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_retire_contribution_mapping(uuid,text,uuid) TO authenticated;

-- 052: approving a KPI assignment notifies the owner ---------------------------
CREATE OR REPLACE FUNCTION public.strata_approve_kpi_assignment(p_assignment uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: approving an assignment requires kpi_approver or strategy_office'; END IF;
  SELECT * INTO a FROM public.strata_kpi_assignments WHERE id = p_assignment;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> a.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF a.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted assignment can be approved (current: %)', a.status; END IF;
  IF a.submitted_by IS NOT NULL AND a.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own assignment (maker-checker)'; END IF;
  v := public.strata_kpi_assignment_validate(p_assignment);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_ASSIGNMENT: %', (v->>'codes'); END IF;
  UPDATE public.strata_kpi_assignments
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(effective_from, now()), lock_version=lock_version+1
   WHERE id = p_assignment;
  IF a.owner_id IS NOT NULL THEN
    PERFORM public.strata_notify(a.owner_id, 'kpi_assignment_approved', 'strata_kpi_assignments', p_assignment,
      format('Your KPI assignment %s is approved', COALESCE(a.assignment_key, p_assignment::text)), NULL);
  END IF;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_kpi_assignment(uuid,int) TO authenticated;
