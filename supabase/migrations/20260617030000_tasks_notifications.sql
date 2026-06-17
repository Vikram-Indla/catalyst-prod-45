-- Tasks Hub notifications (2026-06-17).
--
-- Problem: task assignment + status-change notifications never fired.
--   1. The shared catalyst_notify_trigger() has no WHEN 'tasks' branch (falls
--      to ELSE → no-op), AND it inserts into a non-existent `catalyst_notifications`
--      table (stale landmine from a prior schema rename; the live sink is
--      `public.notifications`).
--   2. The existing `catalyst_notify_planner_tasks` trigger only fires on
--      assignee_id changes, so status changes were invisible regardless.
--
-- Fix is ADDITIVE — a dedicated tasks-only function + trigger that:
--   * targets the LIVE `notifications` table (recipient_user_id, …),
--   * fires on assignee_id AND status_id,
--   * leaves the shared catalyst_notify_trigger() untouched (zero regression
--     risk for the ~15 other tables it serves).

CREATE OR REPLACE FUNCTION public.catalyst_notify_tasks_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor        UUID;
  v_old_assignee UUID;
  v_new_assignee UUID;
  v_old_status   TEXT;
  v_new_status   TEXT;
  v_status_type  TEXT;
  v_entity_key   TEXT;
  v_entity_title TEXT;
BEGIN
  v_entity_key   := COALESCE(NEW.key, NEW.id::TEXT);
  v_entity_title := COALESCE(NEW.title, 'Task');
  v_new_assignee := NEW.assignee_id;
  v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_id ELSE NULL END;
  SELECT name INTO v_new_status FROM task_statuses WHERE id = NEW.status_id;
  IF TG_OP = 'UPDATE' THEN
    SELECT name INTO v_old_status FROM task_statuses WHERE id = OLD.status_id;
  END IF;
  v_actor := COALESCE(NEW.created_by, auth.uid());
  v_status_type := CASE
    WHEN LOWER(COALESCE(v_new_status, '')) IN ('done','completed','approved','resolved','closed') THEN 'green'
    WHEN LOWER(COALESCE(v_new_status, '')) IN ('in_progress','in progress','active','in review','review') THEN 'blue'
    ELSE 'gray'
  END;

  -- Assignment (INSERT with assignee, or UPDATE that changes assignee)
  IF v_new_assignee IS NOT NULL AND v_new_assignee IS DISTINCT FROM v_actor
     AND (TG_OP = 'INSERT' OR v_new_assignee IS DISTINCT FROM v_old_assignee) THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type, entity_type, entity_id,
      entity_title, entity_key, entity_icon_type, hub_source, status, status_type, tab, metadata
    ) VALUES (
      v_new_assignee, v_actor, 'assignment', 'task', NEW.id,
      v_entity_title, v_entity_key, 'task', 'TaskHub',
      COALESCE(v_new_status, 'To Do'), v_status_type, 'direct', '{}'::jsonb
    );
  END IF;

  -- Status change (UPDATE only)
  IF TG_OP = 'UPDATE' AND v_new_status IS DISTINCT FROM v_old_status
     AND v_new_assignee IS NOT NULL AND v_new_assignee IS DISTINCT FROM v_actor THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type, entity_type, entity_id,
      entity_title, entity_key, entity_icon_type, hub_source, status, status_type, tab, metadata
    ) VALUES (
      v_new_assignee, v_actor, 'status_change', 'task', NEW.id,
      v_entity_title, v_entity_key, 'task', 'TaskHub',
      COALESCE(v_new_status, 'unknown'), v_status_type, 'direct',
      jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS catalyst_notify_tasks ON public.tasks;
CREATE TRIGGER catalyst_notify_tasks
  AFTER INSERT OR UPDATE OF assignee_id, status_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.catalyst_notify_tasks_trigger();
