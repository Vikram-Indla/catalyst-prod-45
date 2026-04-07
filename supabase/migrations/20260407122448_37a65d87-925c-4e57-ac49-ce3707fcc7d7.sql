
-- Enhanced trigger that also handles comments
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
  v_old_comment_count INT;
  v_new_comment_count INT;
  v_comment JSONB;
  v_comment_author TEXT;
  v_comment_body TEXT;
  v_assignee_catalyst_id UUID;
  v_mentioned_name TEXT;
  v_mentioned_id UUID;
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
    IF v_new_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_new_catalyst_id
      FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;
    END IF;
    IF v_old_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_old_catalyst_id
      FROM jira_identity_map WHERE jira_account_id = v_old_assignee_account LIMIT 1;
    END IF;

    IF v_new_catalyst_id IS NOT NULL AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
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
          WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct'
      );
    END IF;

    IF v_old_catalyst_id IS NOT NULL AND v_old_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
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
          WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct'
      );
    END IF;
  END IF;

  -- ── STATUS CHANGE → notify assignee ──
  IF v_old_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_old_status THEN
    IF v_new_catalyst_id IS NULL AND v_new_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_new_catalyst_id
      FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;
    END IF;
    IF v_new_catalyst_id IS NOT NULL AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
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
          WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct'
      );
    END IF;
  END IF;

  -- ── NEW COMMENTS → notify assignee + mentioned users ──
  IF TG_OP = 'UPDATE' THEN
    v_old_comment_count := COALESCE(jsonb_array_length(COALESCE(OLD.comments, '[]'::jsonb)), 0);
    v_new_comment_count := COALESCE(jsonb_array_length(COALESCE(NEW.comments, '[]'::jsonb)), 0);

    IF v_new_comment_count > v_old_comment_count THEN
      -- Resolve assignee for comment notifications
      IF v_new_assignee_account IS NOT NULL THEN
        SELECT catalyst_user_id INTO v_assignee_catalyst_id
        FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;
      END IF;

      -- Process each new comment (they are appended at the end or inserted)
      FOR i IN v_old_comment_count..(v_new_comment_count - 1) LOOP
        v_comment := NEW.comments->i;
        v_comment_author := v_comment->>'author';
        v_comment_body := COALESCE(v_comment->>'body', '');

        -- Resolve comment author to Catalyst user
        v_actor_catalyst_id := NULL;
        IF v_comment_author IS NOT NULL THEN
          SELECT catalyst_user_id INTO v_actor_catalyst_id
          FROM jira_identity_map
          WHERE LOWER(display_name) = LOWER(v_comment_author)
          LIMIT 1;
        END IF;

        -- Notify assignee about new comment (if not self-comment)
        IF v_assignee_catalyst_id IS NOT NULL
           AND v_assignee_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
          INSERT INTO notifications (
            recipient_user_id, actor_user_id, notification_type,
            entity_id, entity_type, entity_key, entity_title,
            hub_source, icon_type, status, status_type, tab,
            metadata
          ) VALUES (
            v_assignee_catalyst_id, v_actor_catalyst_id, 'commented',
            NEW.id, 'issue', NEW.issue_key, NEW.summary,
            'ProjectHub', COALESCE(LOWER(NEW.issue_type), 'task'),
            COALESCE(v_new_status, 'open'), 'gray', 'direct',
            jsonb_build_object('comment_preview', LEFT(v_comment_body, 200))
          );
        END IF;

        -- Detect @mentions in comment body and notify
        FOR v_mentioned_name IN
          SELECT (regexp_matches(v_comment_body, '@([A-Za-z][A-Za-z ]+[A-Za-z])', 'g'))[1]
        LOOP
          SELECT catalyst_user_id INTO v_mentioned_id
          FROM jira_identity_map
          WHERE LOWER(display_name) = LOWER(TRIM(v_mentioned_name))
          LIMIT 1;

          IF v_mentioned_id IS NOT NULL
             AND v_mentioned_id IS DISTINCT FROM v_actor_catalyst_id
             AND v_mentioned_id IS DISTINCT FROM v_assignee_catalyst_id THEN
            INSERT INTO notifications (
              recipient_user_id, actor_user_id, notification_type,
              entity_id, entity_type, entity_key, entity_title,
              hub_source, icon_type, status, status_type, tab,
              metadata
            ) VALUES (
              v_mentioned_id, v_actor_catalyst_id, 'mentioned_in_comment',
              NEW.id, 'issue', NEW.issue_key, NEW.summary,
              'ProjectHub', COALESCE(LOWER(NEW.issue_type), 'task'),
              COALESCE(v_new_status, 'open'), 'gray', 'direct',
              jsonb_build_object('comment_preview', LEFT(v_comment_body, 200))
            );
          END IF;
        END LOOP;

      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
