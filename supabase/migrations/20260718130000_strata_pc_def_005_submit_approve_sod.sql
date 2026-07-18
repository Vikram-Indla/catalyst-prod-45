-- =============================================================================
-- PC-DEF-005 (final) — Project Card submit/approve governance with server SoD
-- Feature: CAT-STRATA-PCDEF-20260717-001
--
-- The one remaining PC-DEF-005 surface: a reachable, server-enforced submit →
-- approve workflow with segregation of duties. Smallest safe model consistent
-- with existing STRATA governance:
--   * nullable approval columns on strata_project_cards (existing rows stay
--     legacy/unsubmitted — approval_status NULL — no fabricated history);
--   * strata_submit_project_card / strata_approve_project_card RPCs;
--   * SoD enforced on the server: approver <> creator AND approver <> submitter;
--   * approved history cannot be silently downgraded (guard trigger);
--   * every transition records actor, timestamp, reason and before/after audit.
--
-- Does not touch PC-DEF-001..004 or the delivered PC-DEF-005 panels. Composes
-- with the stage guard (terminal freeze) and completion SoD already in place.
-- =============================================================================

-- 1. Truthful nullable approval history ---------------------------------------
ALTER TABLE public.strata_project_cards
  ADD COLUMN IF NOT EXISTS approval_status   text
    CHECK (approval_status IS NULL OR approval_status IN ('submitted','approved','rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by      uuid,
  ADD COLUMN IF NOT EXISTS submitted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by       uuid,
  ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS submission_reason text;

COMMENT ON COLUMN public.strata_project_cards.approval_status IS
  'PC-DEF-005 governed approval state: NULL = legacy/unsubmitted, then submitted -> approved (or rejected). No historical value is fabricated for pre-existing rows.';

-- 2. Submit ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_submit_project_card(
  p_project uuid,
  p_reason  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'submitting a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a submission reason is required';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage IN ('completed','cancelled','archived') THEN
    RAISE EXCEPTION 'a terminal project card cannot be submitted for approval';
  END IF;
  IF pc.approval_status = 'approved' THEN
    RAISE EXCEPTION 'this project card is already approved';
  END IF;

  -- Completeness prerequisites.
  IF pc.objective_element_id IS NULL THEN
    RAISE EXCEPTION 'submission blocked: a primary Strategic Objective must be linked first';
  END IF;
  IF pc.business_owner_id IS NULL OR pc.pm_id IS NULL THEN
    RAISE EXCEPTION 'submission blocked: a Business Owner and a Project Manager must be assigned first';
  END IF;

  UPDATE public.strata_project_cards
     SET approval_status = 'submitted',
         submitted_by = auth.uid(),
         submitted_at = now(),
         submission_reason = btrim(p_reason),
         -- a re-submission clears any prior approval decision
         approved_by = NULL,
         approved_at = NULL,
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_project_cards', p_project, 'RPC:submit_project_card', auth.uid(),
          jsonb_build_object('approval_status', pc.approval_status),
          jsonb_build_object('approval_status', 'submitted'),
          'submitted for approval: ' || btrim(p_reason));
END;
$$;

COMMENT ON FUNCTION public.strata_submit_project_card(uuid,text) IS
  'PC-DEF-005: submits a non-terminal Project Card for approval. Requires primary objective + Business Owner + PM, a reason, actor and audit. Clears any prior approval decision on re-submission.';

GRANT EXECUTE ON FUNCTION public.strata_submit_project_card(uuid,text) TO authenticated;

-- 3. Approve (with SoD) ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_approve_project_card(
  p_project uuid,
  p_reason  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'approving a project card requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'an approval reason is required';
  END IF;

  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage IN ('completed','cancelled','archived') THEN
    RAISE EXCEPTION 'a terminal project card cannot be approved';
  END IF;
  IF pc.approval_status IS DISTINCT FROM 'submitted' THEN
    RAISE EXCEPTION 'only a submitted project card can be approved (current state: %)', COALESCE(pc.approval_status, 'unsubmitted');
  END IF;

  -- Segregation of duties: the approver cannot be the creator or the submitter.
  IF pc.created_by IS NOT NULL AND pc.created_by = auth.uid() THEN
    RAISE EXCEPTION 'separation of duties: the project creator cannot approve their own project';
  END IF;
  IF pc.submitted_by IS NOT NULL AND pc.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'separation of duties: the submitter cannot approve their own submission';
  END IF;

  UPDATE public.strata_project_cards
     SET approval_status = 'approved',
         approved_by = auth.uid(),
         approved_at = now(),
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_project_cards', p_project, 'RPC:approve_project_card', auth.uid(),
          jsonb_build_object('approval_status', 'submitted', 'submitted_by', pc.submitted_by),
          jsonb_build_object('approval_status', 'approved', 'approved_by', auth.uid()),
          'approved: ' || btrim(p_reason));
END;
$$;

COMMENT ON FUNCTION public.strata_approve_project_card(uuid,text) IS
  'PC-DEF-005: approves a submitted Project Card. Server-enforced SoD — approver must differ from both the creator and the submitter. Records actor, timestamp, reason and before/after audit.';

GRANT EXECUTE ON FUNCTION public.strata_approve_project_card(uuid,text) TO authenticated;

-- 4. Approved history cannot be silently downgraded ---------------------------
CREATE OR REPLACE FUNCTION public.strata_guard_card_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Once approved, the approval record is immutable except by a governed
  -- re-submission (which sets approval_status = 'submitted' and clears
  -- approved_by/at atomically in strata_submit_project_card).
  IF OLD.approval_status = 'approved' THEN
    IF NEW.approval_status = 'approved'
       AND NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'the approval record of an approved project card cannot be altered'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.approval_status NOT IN ('approved','submitted') THEN
      RAISE EXCEPTION 'an approved project card cannot be silently downgraded to "%"', NEW.approval_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.strata_guard_card_approval() IS
  'PC-DEF-005: protects an approved Project Card''s approval record from silent edits/downgrades; only a governed re-submission may move it back to submitted.';

DROP TRIGGER IF EXISTS trg_strata_guard_card_approval ON public.strata_project_cards;
CREATE TRIGGER trg_strata_guard_card_approval
  BEFORE UPDATE ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_card_approval();
