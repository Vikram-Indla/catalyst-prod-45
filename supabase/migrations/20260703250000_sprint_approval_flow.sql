-- CAT-SPRINTS-NATIVE-20260702-002 slice S2.2a/S2.3
-- Approval decisions on ph_sprint_approvers (D-004): any/all/quorum policy
-- (ph_jira_sprints.approval_policy, already added S0.1a), every decision
-- timestamped, a single rejection reopens the sprint to active.

ALTER TABLE public.ph_sprint_approvers
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text;

CREATE OR REPLACE FUNCTION public.fn_sprint_check_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint_status text;
  v_policy text;
  v_total int;
  v_approved int;
  v_rejected int;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT status, approval_policy INTO v_sprint_status, v_policy
  FROM public.ph_jira_sprints WHERE id = NEW.sprint_id FOR UPDATE;

  IF NOT FOUND OR v_sprint_status <> 'awaiting_approval' THEN
    RETURN NEW;
  END IF;

  -- A single rejection immediately reopens the sprint — no need to wait on
  -- other approvers (D-004: "rejection returns sprint to active").
  IF NEW.status = 'rejected' THEN
    UPDATE public.ph_jira_sprints SET status = 'active' WHERE id = NEW.sprint_id;
    RETURN NEW;
  END IF;

  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'approved'),
         count(*) FILTER (WHERE status = 'rejected')
    INTO v_total, v_approved, v_rejected
    FROM public.ph_sprint_approvers WHERE sprint_id = NEW.sprint_id;

  IF v_total = 0 OR v_rejected > 0 THEN
    RETURN NEW;
  END IF;

  IF (v_policy = 'any' AND v_approved >= 1)
     OR (v_policy = 'all' AND v_approved = v_total)
     OR (v_policy = 'quorum' AND v_approved * 2 > v_total) THEN
    UPDATE public.ph_jira_sprints SET status = 'completed' WHERE id = NEW.sprint_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprint_check_approval ON public.ph_sprint_approvers;
CREATE TRIGGER trg_sprint_check_approval
  AFTER UPDATE OF status ON public.ph_sprint_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sprint_check_approval();

NOTIFY pgrst, 'reload schema';
