-- CAT-SPRINTS-NATIVE-20260702-002 slice S0.1b
-- Analytics Gate leg 2 (D-007): today 0 of 2,085 work_item_transitions rows are
-- native (all Jira-changelog-backfilled). This trigger records a transition row
-- whenever a Catalyst-native status change happens on ph_issues, with zero edits
-- to the ~6 status-mutation call sites (workflow-v2, kanban, bulk edit, etc.).
--
-- D-013: transitioned_by is TEXT (display name, e.g. "menna nasser" in existing
-- Jira rows) — NOT a uuid, so it cannot be auth.uid() directly. Resolved via
-- profiles.full_name/avatar_url. When auth.uid() is NULL (service-role/sync
-- writes touching status), the insert is skipped — those aren't genuine
-- user-driven native transitions.

CREATE OR REPLACE FUNCTION public.record_native_work_item_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  actor_avatar text;
  prev_transitioned_at timestamptz;
  dwell_ms bigint;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name, avatar_url INTO actor_name, actor_avatar
  FROM public.profiles WHERE id = auth.uid();

  -- Chain dwell time off the most recent transition row for this item, whether
  -- Jira-backfilled or native, so dwell doesn't reset to NULL the first time an
  -- item transitions natively after a Jira-era history.
  SELECT transitioned_at INTO prev_transitioned_at
  FROM public.work_item_transitions
  WHERE work_item_id = NEW.id
  ORDER BY transitioned_at DESC
  LIMIT 1;

  IF prev_transitioned_at IS NOT NULL THEN
    dwell_ms := EXTRACT(EPOCH FROM (now() - prev_transitioned_at)) * 1000;
  END IF;

  INSERT INTO public.work_item_transitions (
    work_item_id, from_status, to_status, from_status_category, to_status_category,
    transitioned_by, transitioned_by_avatar, transitioned_at, time_in_from_status_ms, jira_changelog_id
  ) VALUES (
    NEW.id, OLD.status, NEW.status, OLD.status_category, NEW.status_category,
    COALESCE(actor_name, 'Unknown'), actor_avatar, now(), dwell_ms, NULL
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_record_native_work_item_transition
  AFTER UPDATE OF status ON public.ph_issues
  FOR EACH ROW EXECUTE FUNCTION public.record_native_work_item_transition();
