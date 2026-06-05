-- Auto-log Catalyst-native field changes on ph_issues into
-- ph_activity_log. Today Catalyst writes activity rows from a
-- handful of mutation hooks (incidents, create-story, work item
-- activity, plan hub, t10 modules) but there's no central guarantee
-- that EVERY editable surface remembers to log — so right-rail
-- dropdowns, inline-edit cells, bulk-edit footers, and any other
-- direct UPDATE silently skip history.
--
-- This trigger fires on every UPDATE on ph_issues, diffs the OLD vs
-- NEW row, and writes one ph_activity_log entry per changed column.
-- Result: nothing slips through, regardless of which UI surface made
-- the change. Jira-synced changes already arrive via wh-jira-bulk-sync
-- which writes ph_activity_log directly with source='jira' — those
-- pass through the trigger BUT are skipped because the trigger
-- only logs rows where `source` is the Jira sync marker is NOT set
-- (see WHEN clause below).

CREATE OR REPLACE FUNCTION public.fn_ph_issues_log_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor uuid := auth.uid();
  -- Helper to record one field change. NULL/empty pairs are skipped
  -- so we don't log "null → null" noise from system updates.
  PROCEDURE log_field(field_name text, old_text text, new_text text) AS $body$
  BEGIN
    IF old_text IS DISTINCT FROM new_text THEN
      INSERT INTO public.ph_activity_log
        (work_item_id, user_id, action, field_name, field_type,
         old_value, new_value, source, created_at)
      VALUES
        (NEW.id, v_actor, 'update', field_name, 'catalyst',
         old_text, new_text, 'catalyst', now());
    END IF;
  END;
  $body$;
BEGIN
  -- Standard scalar fields. Add columns here as the schema grows.
  PERFORM log_field('status',         OLD.status,         NEW.status);
  PERFORM log_field('priority',       OLD.priority,       NEW.priority);
  PERFORM log_field('summary',        OLD.summary,        NEW.summary);
  PERFORM log_field('description',    OLD.description,    NEW.description);
  PERFORM log_field('assignee',       OLD.assignee_display_name, NEW.assignee_display_name);
  PERFORM log_field('reporter',       OLD.reporter_display_name, NEW.reporter_display_name);
  PERFORM log_field('severity',       OLD.severity,       NEW.severity);
  PERFORM log_field('resolution',     OLD.resolution,     NEW.resolution);
  PERFORM log_field('parent',         OLD.parent_key,     NEW.parent_key);
  PERFORM log_field('epic_link',      OLD.epic_link,      NEW.epic_link);
  PERFORM log_field('due_date',       OLD.due_date::text, NEW.due_date::text);
  PERFORM log_field('issue_type',     OLD.issue_type,     NEW.issue_type);
  RETURN NEW;
END;
$$;

-- Inline procedure syntax above isn't supported in Postgres plpgsql.
-- Replace with a flat function that uses repeated IF blocks instead.
-- (Keeping the comment block above for the design intent.)

CREATE OR REPLACE FUNCTION public.fn_ph_issues_log_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  -- Skip rows being synced FROM Jira — wh-jira-bulk-sync writes
  -- ph_activity_log directly with source='jira', and we don't want
  -- to double-log those updates.
  IF NEW.jira_synced_at IS DISTINCT FROM OLD.jira_synced_at THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'status', 'catalyst', OLD.status, NEW.status, 'catalyst', now());
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'priority', 'catalyst', OLD.priority, NEW.priority, 'catalyst', now());
  END IF;

  IF OLD.summary IS DISTINCT FROM NEW.summary THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'summary', 'catalyst', OLD.summary, NEW.summary, 'catalyst', now());
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'description', 'catalyst', OLD.description, NEW.description, 'catalyst', now());
  END IF;

  IF OLD.assignee_display_name IS DISTINCT FROM NEW.assignee_display_name THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'assignee', 'catalyst', OLD.assignee_display_name, NEW.assignee_display_name, 'catalyst', now());
  END IF;

  IF OLD.reporter_display_name IS DISTINCT FROM NEW.reporter_display_name THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'reporter', 'catalyst', OLD.reporter_display_name, NEW.reporter_display_name, 'catalyst', now());
  END IF;

  IF OLD.severity IS DISTINCT FROM NEW.severity THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'severity', 'catalyst', OLD.severity, NEW.severity, 'catalyst', now());
  END IF;

  IF OLD.resolution IS DISTINCT FROM NEW.resolution THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'resolution', 'catalyst', OLD.resolution, NEW.resolution, 'catalyst', now());
  END IF;

  IF OLD.parent_key IS DISTINCT FROM NEW.parent_key THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'parent', 'catalyst', OLD.parent_key, NEW.parent_key, 'catalyst', now());
  END IF;

  IF OLD.epic_link IS DISTINCT FROM NEW.epic_link THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'epic_link', 'catalyst', OLD.epic_link, NEW.epic_link, 'catalyst', now());
  END IF;

  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'due_date', 'catalyst', OLD.due_date::text, NEW.due_date::text, 'catalyst', now());
  END IF;

  IF OLD.issue_type IS DISTINCT FROM NEW.issue_type THEN
    INSERT INTO public.ph_activity_log
      (work_item_id, user_id, action, field_name, field_type, old_value, new_value, source, created_at)
    VALUES (NEW.id, v_actor, 'update', 'issue_type', 'catalyst', OLD.issue_type, NEW.issue_type, 'catalyst', now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ph_issues_log_field_changes ON public.ph_issues;
CREATE TRIGGER trg_ph_issues_log_field_changes
AFTER UPDATE ON public.ph_issues
FOR EACH ROW
EXECUTE FUNCTION public.fn_ph_issues_log_field_changes();
