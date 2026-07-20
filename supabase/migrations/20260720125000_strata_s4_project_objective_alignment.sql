-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S4 — governed Project Objective Alignment
-- Forward-only, additive. Replaces implicit cross-context parent_id semantics with an
-- explicit, governed alignment set, rejects card/objective contradictions server-side,
-- supports governed secondary alignments with attribution, and gates project completion.
--
-- Closes gaps: STRATA-KPI-034 / 036 / 037 / 040 (+ formalizes 035/038).
-- Legacy strata_strategy_elements.parent_id is preserved untouched (compat / history).
-- ---------------------------------------------------------------------------

-- 1. Alignment table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_project_objective_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_objective_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  strategic_objective_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT,
  alignment_type text NOT NULL CHECK (alignment_type IN ('primary','secondary')),
  attribution_share numeric(6,3) CHECK (attribution_share IS NULL OR (attribution_share > 0 AND attribution_share <= 1)),
  rationale text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','retired')),
  submitted_by uuid, submitted_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  rejected_by uuid, rejected_at timestamptz, rejection_reason text,
  lock_version int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_poa_no_self CHECK (project_objective_id <> strategic_objective_id)
);
COMMENT ON TABLE public.strata_project_objective_alignments IS
  'Explicit governed alignment of a Project Objective to a Strategic Objective (STRATA-KPI-034). One primary + N secondary (with attribution). Replaces cross-context parent_id semantics; contradictions rejected server-side (STRATA-KPI-036).';
-- at most one non-retired PRIMARY per project objective
CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_poa_primary
  ON public.strata_project_objective_alignments(project_objective_id)
  WHERE alignment_type = 'primary' AND status <> 'retired';
CREATE INDEX IF NOT EXISTS idx_strata_poa_strategic ON public.strata_project_objective_alignments(strategic_objective_id);

ALTER TABLE public.strata_project_objective_alignments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_project_objective_alignments' AND policyname='strata_poa_read') THEN
    CREATE POLICY strata_poa_read ON public.strata_project_objective_alignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_project_objective_alignments' AND policyname='strata_poa_write') THEN
    CREATE POLICY strata_poa_write ON public.strata_project_objective_alignments FOR ALL TO authenticated
      USING (public.strata_has_role(ARRAY['strategy_office','okr_owner']))
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office','okr_owner']));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_strata_poa_touch ON public.strata_project_objective_alignments;
CREATE TRIGGER trg_strata_poa_touch BEFORE UPDATE ON public.strata_project_objective_alignments
  FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();

-- 2. Contradiction validator (STRATA-KPI-036/038) ----------------------------
-- A primary alignment must not contradict the Project Card's own primary Strategic
-- Objective: both must live under the same Theme.
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

  -- STRATA-KPI-036: a primary alignment must agree with the owning Project Card's primary objective's Theme.
  IF al.alignment_type = 'primary' THEN
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
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'alignment_id', p_alignment);
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_alignment_validate(uuid) TO authenticated;

-- 3. Alignment lifecycle RPCs (maker-checker SoD) ----------------------------
CREATE OR REPLACE FUNCTION public.strata_create_objective_alignment(
  p_project_objective uuid, p_strategic_objective uuid, p_alignment_type text DEFAULT 'primary',
  p_attribution numeric DEFAULT NULL, p_rationale text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  IF p_alignment_type NOT IN ('primary','secondary') THEN RAISE EXCEPTION 'INVALID_ALIGNMENT: type must be primary|secondary'; END IF;
  INSERT INTO public.strata_project_objective_alignments
    (project_objective_id, strategic_objective_id, alignment_type, attribution_share, rationale, status)
  VALUES (p_project_objective, p_strategic_objective, p_alignment_type, p_attribution, p_rationale, 'draft')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_objective_alignment(uuid,uuid,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_submit_objective_alignment(p_alignment uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE al record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO al FROM public.strata_project_objective_alignments WHERE id = p_alignment;
  IF al.id IS NULL THEN RAISE EXCEPTION 'Alignment not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> al.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF al.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected alignment can be submitted (current: %)', al.status; END IF;
  v := public.strata_alignment_validate(p_alignment);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_ALIGNMENT: %', (v->>'codes'); END IF;
  UPDATE public.strata_project_objective_alignments
     SET status='submitted', submitted_by=auth.uid(), submitted_at=now(),
         rejected_by=NULL, rejected_at=NULL, rejection_reason=NULL, lock_version=lock_version+1
   WHERE id = p_alignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_objective_alignment(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_approve_objective_alignment(p_alignment uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE al record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO al FROM public.strata_project_objective_alignments WHERE id = p_alignment;
  IF al.id IS NULL THEN RAISE EXCEPTION 'Alignment not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> al.lock_version THEN RAISE EXCEPTION 'STALE_WRITE'; END IF;
  IF al.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted alignment can be approved (current: %)', al.status; END IF;
  IF al.submitted_by IS NOT NULL AND al.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own alignment'; END IF;
  v := public.strata_alignment_validate(p_alignment);
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_ALIGNMENT: %', (v->>'codes'); END IF;
  UPDATE public.strata_project_objective_alignments
     SET status='approved', approved_by=auth.uid(), approved_at=now(), lock_version=lock_version+1
   WHERE id = p_alignment;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_objective_alignment(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_retire_objective_alignment(p_alignment uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  UPDATE public.strata_project_objective_alignments
     SET status='retired', lock_version=lock_version+1 WHERE id = p_alignment AND status <> 'retired';
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_retire_objective_alignment(uuid,text) TO authenticated;

-- 4. STRATA-KPI-040 — completion gate (trigger; no reproduction of the RPC) ----
-- Blocks a card completing while it has approved, non-retired contribution mappings on
-- its project assignments that are still active, or project assignments with no final
-- (validated) observation. No-op for cards without the new spine (no regression).
CREATE OR REPLACE FUNCTION public.strata_guard_card_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n_open_mappings int; n_unobserved int;
BEGIN
  IF NEW.stage = 'completed' AND OLD.stage IS DISTINCT FROM 'completed' THEN
    SELECT count(*) INTO n_open_mappings
      FROM public.strata_kpi_contribution_mappings m
      JOIN public.strata_kpi_assignments a ON a.id = m.child_assignment_id
     WHERE a.project_card_id = NEW.id AND m.status = 'approved'
       AND (m.effective_to IS NULL OR m.effective_to > now());
    IF n_open_mappings > 0 THEN
      RAISE EXCEPTION 'COMPLETION_BLOCKED: % active contribution mapping(s) must be resolved before completion (STRATA-KPI-040)', n_open_mappings;
    END IF;
    SELECT count(*) INTO n_unobserved
      FROM public.strata_kpi_assignments a
     WHERE a.project_card_id = NEW.id AND a.status = 'approved'
       AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_assignment_observations o
                        WHERE o.assignment_id = a.id AND o.status IN ('validated','accepted_with_exception'));
    IF n_unobserved > 0 THEN
      RAISE EXCEPTION 'COMPLETION_BLOCKED: % project KPI assignment(s) have no final observation (STRATA-KPI-040)', n_unobserved;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_strata_guard_card_completion ON public.strata_project_cards;
CREATE TRIGGER trg_strata_guard_card_completion BEFORE UPDATE ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_card_completion();
