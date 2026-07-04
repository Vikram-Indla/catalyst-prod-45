-- CAT-SPRINTS-NATIVE-20260702-002 slice S2.2a
-- Auto-transition active -> awaiting_approval when every work item in the
-- sprint is at its type's configured Definition of Done status (D-004).
-- Never auto-completes — completion always requires the separate approval
-- gate (Phase 2.2/2.3, not built yet). A type with NO configured DoD row
-- blocks the transition (treated as unsatisfied, not as trivially passing —
-- zero-assumption: absence of a rule is not the same as the rule being met).

CREATE OR REPLACE FUNCTION public.fn_sprint_check_dod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint_id uuid;
  v_sprint_status text;
  v_member_count int;
  v_unsatisfied_count int;
BEGIN
  v_sprint_id := COALESCE(NEW.sprint_id, OLD.sprint_id);
  IF v_sprint_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_sprint_status FROM public.ph_jira_sprints WHERE id = v_sprint_id FOR UPDATE;
  IF NOT FOUND OR v_sprint_status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_member_count FROM public.ph_issues WHERE sprint_id = v_sprint_id;
  IF v_member_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Unsatisfied = item's type has no configured DoD row, OR item's status
  -- doesn't match that type's configured done_status.
  SELECT count(*) INTO v_unsatisfied_count
  FROM public.ph_issues i
  LEFT JOIN public.ph_sprint_dod d
    ON d.sprint_id = v_sprint_id AND d.work_item_type = i.issue_type
  WHERE i.sprint_id = v_sprint_id
    AND (d.done_status IS NULL OR i.status IS DISTINCT FROM d.done_status);

  IF v_unsatisfied_count = 0 THEN
    UPDATE public.ph_jira_sprints SET status = 'awaiting_approval' WHERE id = v_sprint_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprint_check_dod ON public.ph_issues;
CREATE TRIGGER trg_sprint_check_dod
  AFTER UPDATE OF status, sprint_id ON public.ph_issues
  FOR EACH ROW
  WHEN (NEW.sprint_id IS NOT NULL OR OLD.sprint_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_sprint_check_dod();

NOTIFY pgrst, 'reload schema';
