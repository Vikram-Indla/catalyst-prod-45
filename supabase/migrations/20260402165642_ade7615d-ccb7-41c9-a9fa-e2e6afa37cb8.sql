-- =============================================
-- TASK 1: INBOUND EVENT PROCESSOR
-- =============================================
CREATE OR REPLACE FUNCTION process_sync_events(batch_size INTEGER DEFAULT 25)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt RECORD;
  jira_issue JSONB;
  mapped_status TEXT;
  mapped_lozenge TEXT;
  mapped_user_id UUID;
  mapped_reporter_id UUID;
  catalyst_proj_id UUID;
  existing_issue_id UUID;
  new_key TEXT;
  processed_count INTEGER := 0;
  failed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  FOR evt IN
    SELECT * FROM sync_events
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE sync_events SET status = 'processing' WHERE id = evt.id;

      IF evt.entity_type != 'issue' THEN
        UPDATE sync_events SET status = 'processed', processed_at = now() WHERE id = evt.id;
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      jira_issue := evt.payload->'issue';
      IF jira_issue IS NULL THEN
        UPDATE sync_events SET status = 'failed', error_message = 'No issue in payload' WHERE id = evt.id;
        failed_count := failed_count + 1;
        CONTINUE;
      END IF;

      SELECT sc.project_id INTO catalyst_proj_id
      FROM sync_connections sc
      WHERE sc.jira_project_key = jira_issue->'fields'->'project'->>'key'
        AND sc.is_active = true
      LIMIT 1;

      IF catalyst_proj_id IS NULL THEN
        UPDATE sync_events SET status = 'failed', error_message = 'No matching project connection' WHERE id = evt.id;
        failed_count := failed_count + 1;
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM sync_cooldowns
        WHERE entity_key = 'issue:' || (jira_issue->>'id')
          AND expires_at > now()
      ) THEN
        UPDATE sync_events SET status = 'processed', processed_at = now(),
          error_message = 'Skipped: cooldown active (echo prevention)' WHERE id = evt.id;
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      SELECT ssm.catalyst_status, ssm.catalyst_lozenge_color
      INTO mapped_status, mapped_lozenge
      FROM sync_status_map ssm
      WHERE ssm.project_id = catalyst_proj_id
        AND ssm.jira_status_name = jira_issue->'fields'->'status'->>'name'
      LIMIT 1;

      IF mapped_status IS NULL THEN
        mapped_status := CASE (jira_issue->'fields'->'status'->>'statusCategory')
          WHEN 'new' THEN 'To Do'
          WHEN 'indeterminate' THEN 'In Progress'
          WHEN 'done' THEN 'Done'
          ELSE 'To Do'
        END;
      END IF;

      SELECT sum.catalyst_user_id INTO mapped_user_id
      FROM sync_user_map sum
      WHERE sum.jira_account_id = jira_issue->'fields'->'assignee'->>'accountId'
        AND sum.is_active = true
      LIMIT 1;

      SELECT sum.catalyst_user_id INTO mapped_reporter_id
      FROM sync_user_map sum
      WHERE sum.jira_account_id = jira_issue->'fields'->'reporter'->>'accountId'
        AND sum.is_active = true
      LIMIT 1;

      SELECT sem.catalyst_entity_id INTO existing_issue_id
      FROM sync_entity_map sem
      WHERE sem.jira_entity_type = 'issue'
        AND sem.jira_entity_id = jira_issue->>'id';

      IF evt.event_type = 'jira:issue_deleted' THEN
        IF existing_issue_id IS NOT NULL THEN
          UPDATE catalyst_issues SET sync_enabled = false, updated_at = now()
          WHERE id = existing_issue_id;
        END IF;
      ELSIF existing_issue_id IS NOT NULL THEN
        UPDATE catalyst_issues SET
          title = COALESCE(jira_issue->'fields'->>'summary', title),
          description = COALESCE(
            jira_issue->'fields'->'description'->>'text',
            jira_issue->'fields'->>'description',
            description
          ),
          description_adf_raw = CASE
            WHEN jsonb_typeof(jira_issue->'fields'->'description') = 'object'
            THEN jira_issue->'fields'->'description'
            ELSE description_adf_raw
          END,
          status = COALESCE(mapped_status, status),
          priority = COALESCE(jira_issue->'fields'->'priority'->>'name', priority),
          assignee_id = mapped_user_id,
          reporter_id = COALESCE(mapped_reporter_id, reporter_id),
          issue_type = COALESCE(jira_issue->'fields'->'issuetype'->>'name', issue_type),
          sprint_name = jira_issue->'fields'->'sprint'->>'name',
          story_points = (jira_issue->'fields'->>'customfield_10016')::NUMERIC,
          last_modified_by_system = 'jira',
          updated_at = now()
        WHERE id = existing_issue_id;

        UPDATE sync_entity_map SET
          last_synced_at = now(),
          last_sync_status = 'synced',
          sync_version = sync_version + 1
        WHERE catalyst_entity_type = 'issue'
          AND catalyst_entity_id = existing_issue_id;
      ELSE
        new_key := next_issue_key(catalyst_proj_id);

        INSERT INTO catalyst_issues (
          project_id, issue_key, title, description, description_adf_raw,
          issue_type, status, priority, assignee_id, reporter_id,
          story_points, sprint_name, last_modified_by_system
        ) VALUES (
          catalyst_proj_id,
          new_key,
          COALESCE(jira_issue->'fields'->>'summary', 'Untitled'),
          COALESCE(jira_issue->'fields'->'description'->>'text', jira_issue->'fields'->>'description'),
          CASE WHEN jsonb_typeof(jira_issue->'fields'->'description') = 'object'
            THEN jira_issue->'fields'->'description' ELSE NULL END,
          COALESCE(jira_issue->'fields'->'issuetype'->>'name', 'Task'),
          COALESCE(mapped_status, 'To Do'),
          COALESCE(jira_issue->'fields'->'priority'->>'name', 'Medium'),
          mapped_user_id,
          mapped_reporter_id,
          (jira_issue->'fields'->>'customfield_10016')::NUMERIC,
          jira_issue->'fields'->'sprint'->>'name',
          'jira'
        )
        RETURNING id INTO existing_issue_id;

        INSERT INTO sync_entity_map (
          catalyst_entity_type, catalyst_entity_id,
          jira_entity_type, jira_entity_id, jira_entity_key,
          jira_self_url, sync_direction,
          last_synced_at, last_sync_status
        ) VALUES (
          'issue', existing_issue_id,
          'issue', jira_issue->>'id', jira_issue->>'key',
          jira_issue->>'self', 'bi',
          now(), 'synced'
        );
      END IF;

      INSERT INTO sync_cooldowns (entity_key, expires_at)
      VALUES ('issue:' || (jira_issue->>'id'), now() + interval '5 seconds')
      ON CONFLICT (entity_key) DO UPDATE SET expires_at = now() + interval '5 seconds';

      UPDATE sync_events SET status = 'processed', processed_at = now() WHERE id = evt.id;
      processed_count := processed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE sync_events SET
        status = CASE WHEN evt.retry_count >= 3 THEN 'dead' ELSE 'failed' END,
        retry_count = evt.retry_count + 1,
        error_message = SQLERRM
      WHERE id = evt.id;

      IF evt.retry_count >= 3 THEN
        INSERT INTO sync_dead_letter (original_event_id, payload, error_message)
        VALUES (evt.id, evt.payload, SQLERRM);
      END IF;

      failed_count := failed_count + 1;
    END;
  END LOOP;

  DELETE FROM sync_cooldowns WHERE expires_at < now();

  INSERT INTO sync_health (project_id, check_type, status, events_received, events_processed, events_failed, checked_at)
  SELECT DISTINCT
    sc.project_id,
    'queue_processing',
    CASE WHEN failed_count > 0 THEN 'degraded' ELSE 'healthy' END,
    processed_count + failed_count + skipped_count,
    processed_count,
    failed_count,
    now()
  FROM sync_connections sc WHERE sc.is_active = true
  LIMIT 1;

  RETURN jsonb_build_object(
    'processed', processed_count,
    'failed', failed_count,
    'skipped', skipped_count
  );
END;
$$;

-- =============================================
-- TASK 2: RETRY FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION retry_failed_sync_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retried INTEGER;
BEGIN
  UPDATE sync_events
  SET status = 'pending'
  WHERE status = 'failed'
    AND retry_count < 3
    AND created_at > now() - interval '24 hours';
  GET DIAGNOSTICS retried = ROW_COUNT;
  RETURN retried;
END;
$$;

-- =============================================
-- TASK 4: OUTBOUND ECHO PREVENTION TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION notify_catalyst_issue_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_modified_by_system = 'catalyst' AND NEW.sync_enabled = true THEN
    IF EXISTS (
      SELECT 1 FROM sync_entity_map sem
      JOIN sync_connections sc ON sc.project_id = NEW.project_id
      WHERE sem.catalyst_entity_type = 'issue'
        AND sem.catalyst_entity_id = NEW.id
        AND sc.is_active = true
        AND sc.sync_direction IN ('bi', 'catalyst_to_jira')
    ) THEN
      INSERT INTO sync_events (
        direction, origin_system, event_type, entity_type,
        entity_id, idempotency_key, payload, status
      ) VALUES (
        'outbound',
        'catalyst',
        CASE WHEN TG_OP = 'INSERT' THEN 'catalyst:issue_created'
             WHEN TG_OP = 'UPDATE' THEN 'catalyst:issue_updated'
             ELSE 'catalyst:issue_deleted' END,
        'issue',
        NEW.id::TEXT,
        'catalyst:issue:' || NEW.id::TEXT || ':' || extract(epoch from now())::TEXT,
        jsonb_build_object(
          'issue_id', NEW.id,
          'project_id', NEW.project_id,
          'title', NEW.title,
          'description', NEW.description,
          'status', NEW.status,
          'priority', NEW.priority,
          'assignee_id', NEW.assignee_id,
          'issue_type', NEW.issue_type,
          'story_points', NEW.story_points,
          'operation', TG_OP
        ),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalyst_issue_change ON catalyst_issues;
CREATE TRIGGER trg_catalyst_issue_change
  AFTER INSERT OR UPDATE ON catalyst_issues
  FOR EACH ROW
  EXECUTE FUNCTION notify_catalyst_issue_change();