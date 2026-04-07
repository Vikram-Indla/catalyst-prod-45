CREATE OR REPLACE FUNCTION public.catalyst_notify_trigger()
RETURNS TRIGGER AS $$
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
  v_notif_type   TEXT;
  v_status_color TEXT;
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
      v_icon_type    := COALESCE(LOWER(NEW.issue_type), 'task');
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
      v_actor        := COALESCE(NEW.reporter_id, auth.uid());

    WHEN 'releases' THEN
      v_entity_type  := 'release';
      v_hub_source   := 'ReleaseHub';
      v_icon_type    := 'release';
      v_entity_key   := COALESCE(NEW.release_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.name, 'Release');
      v_new_assignee := NEW.release_manager_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.release_manager_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'planner_tasks' THEN
      v_entity_type  := 'planner_task';
      v_hub_source   := 'PlanHub';
      v_icon_type    := 'task';
      v_entity_key   := COALESCE(NEW.task_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Task');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'subtasks' THEN
      v_entity_type  := 'subtask';
      v_hub_source   := 'ProjectHub';
      v_icon_type    := 'subtask';
      v_entity_key   := COALESCE(NEW.subtask_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Subtask');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 't10_items' THEN
      v_entity_type  := 't10_item';
      v_hub_source   := 'TaskHub';
      v_icon_type    := 'task';
      v_entity_key   := COALESCE(NEW.item_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'T10 Item');
      v_new_assignee := NEW.assignee_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.assignee_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'features' THEN
      v_entity_type  := 'feature';
      v_hub_source   := 'ProductHub';
      v_icon_type    := 'feature';
      v_entity_key   := COALESCE(NEW.feature_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.name, 'Feature');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'products' THEN
      v_entity_type  := 'product';
      v_hub_source   := 'ProductHub';
      v_icon_type    := 'product';
      v_entity_key   := COALESCE(NEW.product_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.name, 'Product');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'objectives' THEN
      v_entity_type  := 'objective';
      v_hub_source   := 'StrategyHub';
      v_icon_type    := 'objective';
      v_entity_key   := COALESCE(NEW.objective_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.title, 'Objective');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'initiatives' THEN
      v_entity_type  := 'initiative';
      v_hub_source   := 'StrategyHub';
      v_icon_type    := 'initiative';
      v_entity_key   := COALESCE(NEW.initiative_key, NEW.id::TEXT);
      v_entity_title := COALESCE(NEW.name, 'Initiative');
      v_new_assignee := NEW.owner_id;
      v_old_assignee := CASE WHEN TG_OP='UPDATE' THEN OLD.owner_id ELSE NULL END;
      v_new_status   := NEW.status;
      v_old_status   := CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END;
      v_actor        := auth.uid();

    WHEN 'tm_plan_approvals' THEN
      v_entity_type  := 'test_plan';
      v_hub_source   := 'TestHub';
      v_icon_type    := 'test_plan';
      SELECT tp.plan_key, tp.name
        INTO v_tc_key, v_tc_title
        FROM tm_test_plans tp
       WHERE tp.id = NEW.plan_id;
      v_entity_key   := COALESCE(v_tc_key, NEW.plan_id::TEXT);
      v_entity_title := COALESCE(v_tc_title, 'Test Plan');
      v_new_assignee := NEW.approver_id;
      v_old_assignee := NULL;
      v_new_status   := NEW.status::TEXT;
      v_old_status   := NULL;
      v_actor        := COALESCE(NEW.requested_by, auth.uid());

    ELSE
      RETURN NEW;
  END CASE;

  -- resolve status colour (case-insensitive)
  v_status_color := CASE LOWER(COALESCE(v_new_status, ''))
    WHEN 'done'        THEN 'green'
    WHEN 'resolved'    THEN 'green'
    WHEN 'fixed'       THEN 'green'
    WHEN 'closed'      THEN 'gray'
    WHEN 'won''t fix'  THEN 'gray'
    WHEN 'duplicate'   THEN 'gray'
    WHEN 'in progress' THEN 'blue'
    WHEN 'in_progress' THEN 'blue'
    WHEN 'in review'   THEN 'blue'
    WHEN 'in_review'   THEN 'blue'
    WHEN 'in qa'       THEN 'blue'
    WHEN 'in_qa'       THEN 'blue'
    WHEN 'active'      THEN 'blue'
    ELSE 'gray'
  END;

  -- ASSIGNMENT CHANGE
  IF v_new_assignee IS DISTINCT FROM v_old_assignee THEN
    IF v_new_assignee IS NOT NULL
       AND v_new_assignee IS DISTINCT FROM v_actor
    THEN
      INSERT INTO public.notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, entity_icon_type, status, status_type, tab
      ) VALUES (
        v_new_assignee, v_actor, 'assigned',
        NEW.id, v_entity_type, v_entity_key, v_entity_title,
        v_hub_source, v_icon_type,
        COALESCE(v_new_status, ''), v_status_color, 'direct'
      );
    END IF;

    IF v_old_assignee IS NOT NULL
       AND v_old_assignee IS DISTINCT FROM v_actor
       AND v_old_assignee IS DISTINCT FROM v_new_assignee
    THEN
      INSERT INTO public.notifications (
        recipient_user_id, actor_user_id, notification_type,
        entity_id, entity_type, entity_key, entity_title,
        hub_source, entity_icon_type, status, status_type, tab
      ) VALUES (
        v_old_assignee, v_actor, 'unassigned',
        NEW.id, v_entity_type, v_entity_key, v_entity_title,
        v_hub_source, v_icon_type,
        COALESCE(v_new_status, ''), v_status_color, 'direct'
      );
    END IF;
  END IF;

  -- STATUS CHANGE
  IF v_old_status IS NOT NULL
     AND v_new_status IS DISTINCT FROM v_old_status
     AND v_new_assignee IS NOT NULL
     AND v_new_assignee IS DISTINCT FROM v_actor
  THEN
    v_notif_type := CASE LOWER(COALESCE(v_new_status, ''))
      WHEN 'done'        THEN 'issue_resolved'
      WHEN 'resolved'    THEN 'issue_resolved'
      WHEN 'fixed'       THEN 'issue_resolved'
      WHEN 'closed'      THEN 'issue_closed'
      WHEN 'won''t fix'  THEN 'issue_closed'
      WHEN 'duplicate'   THEN 'issue_closed'
      ELSE
        CASE WHEN LOWER(COALESCE(v_old_status, '')) IN
               ('done','resolved','fixed','closed','won''t fix','duplicate')
             AND LOWER(COALESCE(v_new_status, '')) NOT IN
               ('done','resolved','fixed','closed','won''t fix','duplicate')
          THEN 'issue_reopened'
          ELSE 'status_changed'
        END
    END;

    INSERT INTO public.notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_id, entity_type, entity_key, entity_title,
      hub_source, entity_icon_type, status, status_type, tab,
      metadata
    ) VALUES (
      v_new_assignee, v_actor, v_notif_type,
      NEW.id, v_entity_type, v_entity_key, v_entity_title,
      v_hub_source, v_icon_type,
      v_new_status, v_status_color, 'direct',
      jsonb_build_object(
        'old_status', v_old_status,
        'new_status', v_new_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;