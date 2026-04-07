
-- Function to generate notifications from ph_issues changes (Jira sync)
CREATE OR REPLACE FUNCTION public.ph_issues_notify_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_catalyst_id UUID;
  v_old_catalyst_id UUID;
  v_actor_catalyst_id UUID;
  v_old_assignee_account TEXT;
  v_new_assignee_account TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Extract assignee and status
  v_new_assignee_account := NEW.assignee_account_id;
  v_old_assignee_account := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_account_id ELSE NULL END;
  v_new_status := NEW.status;
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;

  -- Resolve actor (reporter) to Catalyst user
  IF NEW.reporter_account_id IS NOT NULL THEN
    SELECT catalyst_user_id INTO v_actor_catalyst_id
    FROM jira_identity_map
    WHERE jira_account_id = NEW.reporter_account_id
    LIMIT 1;
  END IF;

  -- ── ASSIGNMENT CHANGE ──
  IF v_new_assignee_account IS DISTINCT FROM v_old_assignee_account THEN

    -- Resolve new assignee
    IF v_new_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_new_catalyst_id
      FROM jira_identity_map
      WHERE jira_account_id = v_new_assignee_account
      LIMIT 1;
    END IF;

    -- Resolve old assignee
    IF v_old_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_old_catalyst_id
      FROM jira_identity_map
      WHERE jira_account_id = v_old_assignee_account
      LIMIT 1;
    END IF;

    -- Notify newly assigned user (skip self-assignment)
    IF v_new_catalyst_id IS NOT NULL
       AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, icon_type, status, status_type, tab
      ) VALUES (
        v_new_catalyst_id, v_actor_catalyst_id, 'assigned',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', COALESCE(LOWER(NEW.issue_type), 'task'),
        COALESCE(v_new_status, 'assigned'),
        CASE COALESCE(LOWER(NEW.status_category), '')
          WHEN 'done' THEN 'green'
          WHEN 'in progress' THEN 'blue'
          ELSE 'gray'
        END,
        'direct'
      );
    END IF;

    -- Notify previously assigned user (unassigned)
    IF v_old_catalyst_id IS NOT NULL
       AND v_old_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, icon_type, status, status_type, tab
      ) VALUES (
        v_old_catalyst_id, v_actor_catalyst_id, 'unassigned',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', COALESCE(LOWER(NEW.issue_type), 'task'),
        COALESCE(v_new_status, 'unassigned'),
        CASE COALESCE(LOWER(NEW.status_category), '')
          WHEN 'done' THEN 'green'
          WHEN 'in progress' THEN 'blue'
          ELSE 'gray'
        END,
        'direct'
      );
    END IF;
  END IF;

  -- ── STATUS CHANGE → notify assignee ──
  IF v_old_status IS NOT NULL
     AND v_new_status IS DISTINCT FROM v_old_status
  THEN
    -- Resolve current assignee if not already done
    IF v_new_catalyst_id IS NULL AND v_new_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_new_catalyst_id
      FROM jira_identity_map
      WHERE jira_account_id = v_new_assignee_account
      LIMIT 1;
    END IF;

    IF v_new_catalyst_id IS NOT NULL
       AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id
    THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, icon_type, status, status_type, tab
      ) VALUES (
        v_new_catalyst_id, v_actor_catalyst_id, 'status_changed',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', COALESCE(LOWER(NEW.issue_type), 'task'),
        v_new_status,
        CASE COALESCE(LOWER(NEW.status_category), '')
          WHEN 'done' THEN 'green'
          WHEN 'in progress' THEN 'blue'
          ELSE 'gray'
        END,
        'direct'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on ph_issues
CREATE TRIGGER trg_ph_issues_notify
AFTER INSERT OR UPDATE ON public.ph_issues
FOR EACH ROW
EXECUTE FUNCTION public.ph_issues_notify_trigger();
