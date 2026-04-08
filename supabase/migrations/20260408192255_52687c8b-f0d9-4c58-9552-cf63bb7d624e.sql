
-- 1. Update trigger to store actor_display_name + actor_avatar_url in metadata
CREATE OR REPLACE FUNCTION ph_issues_notify_trigger()
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
  v_icon TEXT;
  v_is_new_issue BOOLEAN;
  v_actor_display_name TEXT;
  v_actor_avatar_url TEXT;
  v_meta JSONB;
BEGIN
  v_new_assignee_account := NEW.assignee_account_id;
  v_old_assignee_account := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_account_id ELSE NULL END;
  v_new_status := NEW.status;
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_icon := COALESCE(LOWER(NEW.issue_type), 'task');
  v_is_new_issue := (TG_OP = 'INSERT');

  -- Resolve actor from reporter
  IF NEW.reporter_account_id IS NOT NULL THEN
    SELECT catalyst_user_id, display_name, avatar_url
    INTO v_actor_catalyst_id, v_actor_display_name, v_actor_avatar_url
    FROM jira_identity_map WHERE jira_account_id = NEW.reporter_account_id LIMIT 1;
  END IF;

  -- If no catalyst_user_id but we have reporter info, fall back to display name from ph_issues
  IF v_actor_display_name IS NULL THEN
    v_actor_display_name := NEW.reporter_display_name;
  END IF;

  -- Build metadata with actor info when actor_user_id will be NULL
  v_meta := CASE
    WHEN v_actor_catalyst_id IS NULL AND v_actor_display_name IS NOT NULL
    THEN jsonb_build_object('actor_display_name', v_actor_display_name, 'actor_avatar_url', COALESCE(v_actor_avatar_url, ''))
    ELSE '{}'::jsonb
  END;

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
        hub_source, entity_icon_type, status, status_type, tab, metadata
      ) VALUES (
        v_new_catalyst_id, v_actor_catalyst_id, 'assigned',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', v_icon,
        COALESCE(v_new_status, 'assigned'),
        CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct', v_meta
      );
    END IF;

    IF v_old_catalyst_id IS NOT NULL AND v_old_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, entity_icon_type, status, status_type, tab, metadata
      ) VALUES (
        v_old_catalyst_id, v_actor_catalyst_id, 'unassigned',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', v_icon,
        COALESCE(v_new_status, 'unassigned'),
        CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct', v_meta
      );
    END IF;

  -- ── FIRST-TIME SYNC ──
  ELSIF v_is_new_issue AND v_new_assignee_account IS NOT NULL THEN
    SELECT catalyst_user_id INTO v_new_catalyst_id
    FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;

    IF v_new_catalyst_id IS NOT NULL AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, entity_icon_type, status, status_type, tab, metadata
      )
      SELECT
        v_new_catalyst_id, v_actor_catalyst_id, 'assigned',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', v_icon,
        COALESCE(v_new_status, 'assigned'),
        CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct', v_meta
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_id = NEW.id AND n.notification_type = 'assigned'
          AND n.recipient_user_id = v_new_catalyst_id
      );
    END IF;
  END IF;

  -- ── STATUS CHANGE ──
  IF v_old_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_old_status THEN
    IF v_new_catalyst_id IS NULL AND v_new_assignee_account IS NOT NULL THEN
      SELECT catalyst_user_id INTO v_new_catalyst_id
      FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;
    END IF;
    IF v_new_catalyst_id IS NOT NULL AND v_new_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
      INSERT INTO notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, entity_icon_type, status, status_type, tab, metadata
      ) VALUES (
        v_new_catalyst_id, v_actor_catalyst_id, 'status_changed',
        NEW.id, 'issue', NEW.issue_key, NEW.summary,
        'ProjectHub', v_icon, v_new_status,
        CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
        'direct', v_meta
      );
    END IF;
  END IF;

  -- ── NEW COMMENTS ──
  IF TG_OP = 'UPDATE' THEN
    v_old_comment_count := COALESCE(jsonb_array_length(COALESCE(OLD.comments, '[]'::jsonb)), 0);
    v_new_comment_count := COALESCE(jsonb_array_length(COALESCE(NEW.comments, '[]'::jsonb)), 0);

    IF v_new_comment_count > v_old_comment_count THEN
      IF v_new_assignee_account IS NOT NULL THEN
        SELECT catalyst_user_id INTO v_assignee_catalyst_id
        FROM jira_identity_map WHERE jira_account_id = v_new_assignee_account LIMIT 1;
      END IF;

      FOR i IN v_old_comment_count..(v_new_comment_count - 1) LOOP
        v_comment := NEW.comments->i;
        v_comment_author := v_comment->>'author';
        v_comment_body := COALESCE(v_comment->>'body', '');

        v_actor_catalyst_id := NULL;
        v_actor_display_name := v_comment_author;
        v_actor_avatar_url := NULL;
        IF v_comment_author IS NOT NULL THEN
          SELECT catalyst_user_id, avatar_url INTO v_actor_catalyst_id, v_actor_avatar_url
          FROM jira_identity_map WHERE LOWER(display_name) = LOWER(v_comment_author) LIMIT 1;
        END IF;

        -- Rebuild metadata for comment actor
        v_meta := jsonb_build_object('comment_preview', LEFT(v_comment_body, 200));
        IF v_actor_catalyst_id IS NULL AND v_actor_display_name IS NOT NULL THEN
          v_meta := v_meta || jsonb_build_object('actor_display_name', v_actor_display_name, 'actor_avatar_url', COALESCE(v_actor_avatar_url, ''));
        END IF;

        IF v_assignee_catalyst_id IS NOT NULL AND v_assignee_catalyst_id IS DISTINCT FROM v_actor_catalyst_id THEN
          INSERT INTO notifications (
            recipient_user_id, actor_user_id, notification_type,
            entity_id, entity_type, entity_key, entity_title,
            hub_source, entity_icon_type, status, status_type, tab, metadata
          ) VALUES (
            v_assignee_catalyst_id, v_actor_catalyst_id, 'commented',
            NEW.id, 'issue', NEW.issue_key, NEW.summary,
            'ProjectHub', v_icon,
            COALESCE(v_new_status, 'open'),
            CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
            'direct', v_meta
          );
        END IF;

        -- @mentions
        FOR v_mentioned_name IN
          SELECT regexp_matches(v_comment_body, '@([A-Za-z]+ [A-Za-z]+)', 'g')
        LOOP
          SELECT catalyst_user_id INTO v_mentioned_id
          FROM jira_identity_map WHERE LOWER(display_name) = LOWER(TRIM(v_mentioned_name)) LIMIT 1;

          IF v_mentioned_id IS NOT NULL AND v_mentioned_id IS DISTINCT FROM v_actor_catalyst_id THEN
            INSERT INTO notifications (
              recipient_user_id, actor_user_id, notification_type,
              entity_id, entity_type, entity_key, entity_title,
              hub_source, entity_icon_type, status, status_type, tab, metadata
            ) VALUES (
              v_mentioned_id, v_actor_catalyst_id, 'mentioned_in_comment',
              NEW.id, 'issue', NEW.issue_key, NEW.summary,
              'ProjectHub', v_icon,
              COALESCE(v_new_status, 'open'),
              CASE COALESCE(LOWER(NEW.status_category), '') WHEN 'done' THEN 'green' WHEN 'in progress' THEN 'blue' ELSE 'gray' END,
              'direct', v_meta
            );
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Backfill existing notifications with NULL actor_user_id
UPDATE notifications n
SET metadata = COALESCE(n.metadata, '{}'::jsonb) || jsonb_build_object(
  'actor_display_name', COALESCE(jim.display_name, phi.reporter_display_name),
  'actor_avatar_url', COALESCE(jim.avatar_url, '')
)
FROM ph_issues phi
LEFT JOIN jira_identity_map jim ON jim.jira_account_id = phi.reporter_account_id
WHERE n.actor_user_id IS NULL
  AND n.entity_id = phi.id
  AND n.entity_type = 'issue'
  AND (jim.display_name IS NOT NULL OR phi.reporter_display_name IS NOT NULL)
  AND (n.metadata->>'actor_display_name') IS NULL;
