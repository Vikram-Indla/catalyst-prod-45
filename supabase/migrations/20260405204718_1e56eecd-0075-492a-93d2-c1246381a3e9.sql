CREATE OR REPLACE FUNCTION catalyst_notify_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient    UUID;
  v_actor        UUID;
  v_old_assignee UUID;
  v_new_assignee UUID;
  v_old_status   TEXT;
  v_new_status   TEXT;
  v_entity_key   TEXT;
  v_entity_title TEXT;
  v_entity_type  TEXT;
  v_hub_source   TEXT;
  v_icon_type    TEXT;
  v_tc_key       TEXT;
  v_tc_title     TEXT;
BEGIN
  CASE TG_TABLE_NAME

    WHEN 'tm_test_cases' THEN
      v_entity_type  := 'test_case';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      v_entity_key   := COALESCE(NEW.case_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Test Case');
      v_new_assignee := NEW.assigned_to;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.created_by, auth.uid());

    WHEN 'tm_cycle_scope' THEN
      v_entity_type  := 'test_case';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      SELECT tc.case_key, tc.title
        INTO v_tc_key, v_tc_title
        FROM tm_test_cases tc
       WHERE tc.id = NEW.test_case_id;
      v_entity_key   := COALESCE(v_tc_key, NEW.test_case_id::TEXT);
      v_entity_title := COALESCE(v_tc_title, 'Test Case');
      v_new_assignee := NEW.assigned_to;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assigned_to ELSE NULL END;
      v_new_status   := NEW.current_status::TEXT;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.current_status::TEXT ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'catalyst_issues' THEN
      v_entity_type  := 'issue';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'task';
      v_entity_key   := COALESCE(NEW.issue_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Issue');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.reporter_id, auth.uid());

    WHEN 'stories' THEN
      v_entity_type  := 'story';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'story';
      v_entity_key   := COALESCE(NEW.story_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, NEW.name, 'Story');
      v_new_assignee := COALESCE(NEW.assignee_id, NEW.owner_id);
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN COALESCE(OLD.assignee_id, OLD.owner_id) ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'epics' THEN
      v_entity_type  := 'epic';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'epic';
      v_entity_key   := COALESCE(NEW.epic_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.name, 'Epic');
      v_new_assignee := COALESCE(NEW.assignee_id, NEW.owner_id);
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN COALESCE(OLD.assignee_id, OLD.owner_id) ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.reporter_id, auth.uid());

    WHEN 'defects' THEN
      v_entity_type  := 'defect';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'bug';
      v_entity_key   := COALESCE(NEW.defect_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Defect');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.reporter_id, auth.uid());

    WHEN 'incidents' THEN
      v_entity_type  := 'incident';
      v_hub_source   := 'IncidentHub';
      v_icon_type    := 'incident';
      v_entity_key   := COALESCE(NEW.incident_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Incident');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.updated_by, NEW.created_by, NEW.reporter_id, auth.uid());

    WHEN 'releases' THEN
      v_entity_type  := 'release';
      v_hub_source   := 'ReleaseHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Release');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.created_by, auth.uid());

    WHEN 'planner_tasks' THEN
      v_entity_type  := 'task';
      v_hub_source   := 'PlanHub';
      v_icon_type    := 'task';
      v_entity_key   := COALESCE(NEW.key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Task');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NULL;
      v_old_status   := NULL;
      v_actor        := COALESCE(NEW.created_by, NEW.reporter_id, auth.uid());

    WHEN 'subtasks' THEN
      v_entity_type  := 'subtask';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Subtask');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 't10_items' THEN
      v_entity_type  := 'item';
      v_hub_source   := 'TaskHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.title, 'Item');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.created_by, auth.uid());

    WHEN 'features' THEN
      v_entity_type  := 'feature';
      v_hub_source   := 'ProductHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Feature');
      v_new_assignee := COALESCE(NEW.assignee_id, NEW.owner_id);
      v_old_assignee := CASE WHEN TG_OP='UPDATE'
                         THEN COALESCE(OLD.assignee_id, OLD.owner_id)
                         ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE'
                         THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'products' THEN
      v_entity_type  := 'product';
      v_hub_source   := 'ProductHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Product');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE'
                         THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NULL;
      v_old_status   := NULL;
      v_actor        := COALESCE(NEW.updated_by, NEW.created_by, auth.uid());

    WHEN 'objectives' THEN
      v_entity_type  := 'objective';
      v_hub_source   := 'StrategyHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Objective');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE'
                         THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE'
                         THEN OLD.status ELSE NULL END;
      v_actor        := COALESCE(NEW.updated_by, NEW.created_by, auth.uid());

    WHEN 'initiatives' THEN
      v_entity_type  := 'initiative';
      v_hub_source   := 'StrategyHub';
      v_icon_type    := 'task';
      v_entity_key   := NEW.id::TEXT;
      v_entity_title := COALESCE(NEW.name, 'Initiative');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE'
                         THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NULL;
      v_old_status   := NULL;
      v_actor        := auth.uid();

    ELSE
      RETURN NEW;
  END CASE;

  -- SCENARIO 1: Assignment changed (new assignee gets notified)
  IF v_new_assignee IS NOT NULL
     AND (v_old_assignee IS NULL OR v_old_assignee IS DISTINCT FROM v_new_assignee)
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_type, entity_id, entity_title, entity_key,
      entity_icon_type, hub_source, tab,
      status, status_type, metadata, is_dismissed, delivered_at
    ) VALUES (
      v_new_assignee, v_actor, 'assigned',
      v_entity_type, NEW.id, v_entity_title, v_entity_key,
      v_icon_type, v_hub_source, 'direct',
      v_new_status,
      CASE v_new_status
        WHEN 'done' THEN 'green'
        WHEN 'in_progress' THEN 'blue'
        WHEN 'in_review' THEN 'blue'
        ELSE 'gray'
      END,
      '{}'::jsonb, false, NOW()
    );
  END IF;

  -- SCENARIO 2: Status changed
  IF TG_OP = 'UPDATE'
     AND v_new_status IS DISTINCT FROM v_old_status
     AND v_new_status IS NOT NULL
     AND v_new_assignee IS NOT NULL
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_type, entity_id, entity_title, entity_key,
      entity_icon_type, hub_source, tab,
      status, status_type, metadata, is_dismissed, delivered_at
    ) VALUES (
      v_new_assignee, v_actor, 'status_changed',
      v_entity_type, NEW.id, v_entity_title, v_entity_key,
      v_icon_type, v_hub_source, 'watching',
      v_new_status,
      CASE v_new_status
        WHEN 'done' THEN 'green'
        WHEN 'in_progress' THEN 'blue'
        WHEN 'in_review' THEN 'blue'
        ELSE 'gray'
      END,
      jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status),
      false, NOW()
    );
  END IF;

  -- SCENARIO 3: Unassignment — notify the OLD assignee they were removed
  IF TG_OP = 'UPDATE'
     AND v_old_assignee IS NOT NULL
     AND v_new_assignee IS NULL
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_type, entity_id, entity_title, entity_key,
      entity_icon_type, hub_source, tab,
      status, status_type, metadata, is_dismissed, delivered_at
    ) VALUES (
      v_old_assignee, v_actor, 'unassigned',
      v_entity_type, NEW.id, v_entity_title, v_entity_key,
      v_icon_type, v_hub_source, 'direct',
      v_new_status, 'gray',
      '{}'::jsonb, false, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;