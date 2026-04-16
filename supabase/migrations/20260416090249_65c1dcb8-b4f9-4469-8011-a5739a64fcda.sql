
-- 1. Add jira_last_modified_at to catalyst_issues for conflict detection
ALTER TABLE public.catalyst_issues
ADD COLUMN IF NOT EXISTS jira_last_modified_at TIMESTAMPTZ;

-- 2. Trigger function: capture outbound changes from catalyst_issues
CREATE OR REPLACE FUNCTION public.fn_capture_outbound_sync_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_fields jsonb := '{}';
  v_change_type text := 'field_update';
  v_summary text := '';
  v_has_changes boolean := false;
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('status', jsonb_build_object('from', COALESCE(OLD.status, ''), 'to', COALESCE(NEW.status, '')));
    v_change_type := 'status_change';
    v_summary := format('Status changed from %s to %s', COALESCE(OLD.status, 'none'), COALESCE(NEW.status, 'none'));
    v_has_changes := true;
  END IF;

  -- Track priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('priority', jsonb_build_object('from', COALESCE(OLD.priority, ''), 'to', COALESCE(NEW.priority, '')));
    v_summary := CASE WHEN v_summary = '' THEN format('Priority changed to %s', COALESCE(NEW.priority, 'none')) ELSE v_summary || ', priority changed' END;
    v_has_changes := true;
  END IF;

  -- Track assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('assignee_id', jsonb_build_object('from', COALESCE(OLD.assignee_id::text, ''), 'to', COALESCE(NEW.assignee_id::text, '')));
    v_summary := CASE WHEN v_summary = '' THEN 'Assignee changed' ELSE v_summary || ', assignee changed' END;
    v_has_changes := true;
  END IF;

  -- Track story points changes
  IF OLD.story_points IS DISTINCT FROM NEW.story_points THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('story_points', jsonb_build_object('from', COALESCE(OLD.story_points::text, ''), 'to', COALESCE(NEW.story_points::text, '')));
    v_summary := CASE WHEN v_summary = '' THEN format('Story points changed from %s to %s', COALESCE(OLD.story_points::text, '0'), COALESCE(NEW.story_points::text, '0')) ELSE v_summary || ', story points changed' END;
    v_has_changes := true;
  END IF;

  -- Track title changes
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('title', jsonb_build_object('from', LEFT(OLD.title, 100), 'to', LEFT(NEW.title, 100)));
    v_summary := CASE WHEN v_summary = '' THEN 'Title updated' ELSE v_summary || ', title updated' END;
    v_has_changes := true;
  END IF;

  -- Track description changes
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('description', jsonb_build_object('from', 'changed', 'to', 'updated'));
    v_summary := CASE WHEN v_summary = '' THEN 'Description updated' ELSE v_summary || ', description updated' END;
    v_has_changes := true;
  END IF;

  -- Only insert if something actually changed AND the change came from Catalyst (not from Jira sync)
  IF v_has_changes AND NEW.last_modified_by_system = 'catalyst' THEN
    INSERT INTO public.jira_sync_activity (
      direction, work_item_id, work_item_key, work_item_type,
      work_item_title, change_type, change_summary, changed_fields,
      catalyst_changed_at, sync_status, sync_source, attempt_count,
      project_key
    ) VALUES (
      'outbound', NEW.id, NEW.issue_key, NEW.issue_type,
      NEW.title, v_change_type, v_summary, v_changed_fields,
      now(), 'pending', 'realtime', 0,
      (SELECT p.key FROM projects p WHERE p.id = NEW.project_id LIMIT 1)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to catalyst_issues
DROP TRIGGER IF EXISTS trg_capture_outbound_sync ON public.catalyst_issues;
CREATE TRIGGER trg_capture_outbound_sync
  AFTER UPDATE ON public.catalyst_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_capture_outbound_sync_activity();

-- 4. Enable pg_cron extension for scheduled purge
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 5. Schedule daily purge at 02:00 UTC
SELECT cron.schedule(
  'purge-old-sync-activity',
  '0 2 * * *',
  $$SELECT public.purge_old_sync_activity()$$
);
