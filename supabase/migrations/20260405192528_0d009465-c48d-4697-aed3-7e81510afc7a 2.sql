
-- ═══════════════════════════════════════════════════════════
-- Universal Notification Trigger Function
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.catalyst_notify_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient     UUID;
  v_actor         UUID;
  v_old_assignee  UUID;
  v_new_assignee  UUID;
  v_old_status    TEXT;
  v_new_status    TEXT;
  v_entity_key    TEXT;
  v_entity_title  TEXT;
  v_entity_type   TEXT;
  v_hub_source    TEXT;
  v_icon_type     TEXT;
BEGIN
  CASE TG_TABLE_NAME

    WHEN 'tm_test_cases' THEN
      v_entity_type  := 'test_case';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      v_entity_key   := COALESCE(NEW.case_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Test Case');
      v_new_assignee := NEW.assigned_to;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NEW.created_by;

    WHEN 'tm_cycle_scope' THEN
      v_entity_type  := 'test_case';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := 'Test Cycle Assignment';
      v_new_assignee := NEW.assigned_to;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to ELSE NULL END;
      v_new_status   := NULL;
      v_old_status   := NULL;
      v_actor        := NULL;

    WHEN 'catalyst_issues' THEN
      v_entity_type  := 'issue';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'task';
      v_entity_key   := COALESCE(NEW.issue_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Issue');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NULL;

    WHEN 'incidents' THEN
      v_entity_type  := 'incident';
      v_hub_source   := 'IncidentHub';
      v_icon_type    := 'incident';
      v_entity_key   := COALESCE(NEW.incident_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Incident');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.updated_by, NEW.created_by);

    WHEN 'releases' THEN
      v_entity_type  := 'release';
      v_hub_source   := 'ReleaseHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Release');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NEW.created_by;

    WHEN 'stories' THEN
      v_entity_type  := 'story';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'story';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.title, NEW.name, 'Story');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NULL;

    WHEN 'epics' THEN
      v_entity_type  := 'epic';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'epic';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Epic');
      v_new_assignee := COALESCE(NEW.assignee_id, NEW.owner_id);
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.assignee_id, OLD.owner_id) ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NULL;

    WHEN 'defects' THEN
      v_entity_type  := 'defect';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      v_entity_key   := COALESCE(NEW.defect_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Defect');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP = 'UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := NULL;

    ELSE
      RETURN NEW;
  END CASE;

  -- ── SCENARIO 1: New Assignment ──────────────────────────────
  IF v_new_assignee IS NOT NULL
     AND (v_old_assignee IS NULL OR v_old_assignee IS DISTINCT FROM v_new_assignee)
     AND (v_actor IS NULL OR v_actor IS DISTINCT FROM v_new_assignee)
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_type, entity_id, entity_title, entity_key,
      entity_icon_type, hub_source, tab, status, status_type,
      metadata, is_dismissed, delivered_at
    ) VALUES (
      v_new_assignee, v_actor, 'assigned',
      v_entity_type, NEW.id, v_entity_title, v_entity_key,
      v_icon_type, v_hub_source, 'direct', v_new_status,
      CASE
        WHEN v_new_status IN ('done','completed','closed') THEN 'green'
        WHEN v_new_status IN ('in_progress','active','in_review') THEN 'blue'
        ELSE 'gray'
      END,
      '{}'::jsonb, false, NOW()
    );
  END IF;

  -- ── SCENARIO 2: Status Changed ──────────────────────────────
  IF TG_OP = 'UPDATE'
     AND v_new_status IS NOT NULL
     AND v_old_status IS DISTINCT FROM v_new_status
     AND v_new_assignee IS NOT NULL
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_type, entity_id, entity_title, entity_key,
      entity_icon_type, hub_source, tab, status, status_type,
      metadata, is_dismissed, delivered_at
    ) VALUES (
      v_new_assignee, v_actor, 'status_changed',
      v_entity_type, NEW.id, v_entity_title, v_entity_key,
      v_icon_type, v_hub_source, 'watching', v_new_status,
      CASE
        WHEN v_new_status IN ('done','completed','closed') THEN 'green'
        WHEN v_new_status IN ('in_progress','active','in_review') THEN 'blue'
        ELSE 'gray'
      END,
      jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status),
      false, NOW()
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'catalyst_notify_trigger error on %: %', TG_TABLE_NAME, SQLERRM;
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Attach triggers to all notifiable tables
-- ═══════════════════════════════════════════════════════════

-- TestHub: tm_test_cases
DROP TRIGGER IF EXISTS trg_catalyst_notify_tm_test_cases ON tm_test_cases;
CREATE TRIGGER trg_catalyst_notify_tm_test_cases
  AFTER INSERT OR UPDATE OF assigned_to, status
  ON tm_test_cases
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- TestHub: tm_cycle_scope (tester assignment to cycle)
DROP TRIGGER IF EXISTS trg_catalyst_notify_tm_cycle_scope ON tm_cycle_scope;
CREATE TRIGGER trg_catalyst_notify_tm_cycle_scope
  AFTER INSERT OR UPDATE OF assigned_to
  ON tm_cycle_scope
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- ProjectHub: catalyst_issues
DROP TRIGGER IF EXISTS trg_catalyst_notify_catalyst_issues ON catalyst_issues;
CREATE TRIGGER trg_catalyst_notify_catalyst_issues
  AFTER INSERT OR UPDATE OF assignee_id, status
  ON catalyst_issues
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- IncidentHub: incidents
DROP TRIGGER IF EXISTS trg_catalyst_notify_incidents ON incidents;
CREATE TRIGGER trg_catalyst_notify_incidents
  AFTER INSERT OR UPDATE OF assignee_id, status
  ON incidents
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- ReleaseHub: releases
DROP TRIGGER IF EXISTS trg_catalyst_notify_releases ON releases;
CREATE TRIGGER trg_catalyst_notify_releases
  AFTER INSERT OR UPDATE OF owner_id, status
  ON releases
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- ProjectHub: stories
DROP TRIGGER IF EXISTS trg_catalyst_notify_stories ON stories;
CREATE TRIGGER trg_catalyst_notify_stories
  AFTER INSERT OR UPDATE OF assignee_id, status
  ON stories
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- ProjectHub: epics
DROP TRIGGER IF EXISTS trg_catalyst_notify_epics ON epics;
CREATE TRIGGER trg_catalyst_notify_epics
  AFTER INSERT OR UPDATE OF assignee_id, owner_id, status
  ON epics
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- TestHub: defects
DROP TRIGGER IF EXISTS trg_catalyst_notify_defects ON defects;
CREATE TRIGGER trg_catalyst_notify_defects
  AFTER INSERT OR UPDATE OF assignee_id, status
  ON defects
  FOR EACH ROW EXECUTE FUNCTION catalyst_notify_trigger();

-- ═══════════════════════════════════════════════════════════
-- RLS policies for notifications (ensure trigger inserts work)
-- ═══════════════════════════════════════════════════════════

-- Users can only read their own
DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Users can update their own (mark read, dismiss)
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Allow authenticated users to insert (for edge function / direct insert)
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
CREATE POLICY "authenticated_insert_notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
