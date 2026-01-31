-- ============================================================
-- TASKHUB ASSIGNMENT NOTIFICATION TRIGGER
-- Automatically notifies users when assigned to a task
-- ============================================================

-- Function to create notification on task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_key TEXT;
  v_task_title TEXT;
  v_actor_name TEXT;
  v_link TEXT;
BEGIN
  -- Only proceed if assignee_id changed and new assignee exists
  IF (TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) THEN
    
    -- Get task details
    v_task_key := COALESCE(NEW.task_key, 'TASK');
    v_task_title := COALESCE(NEW.title, 'Untitled Task');
    
    -- Get actor name (the person who made the assignment)
    SELECT COALESCE(full_name, email, 'Someone') INTO v_actor_name
    FROM profiles
    WHERE id = auth.uid();
    
    -- Build deep link to task
    v_link := '/taskhub/my-tasks?taskId=' || NEW.id::text;
    
    -- Don't notify if user assigned task to themselves
    IF NEW.assignee_id = auth.uid() THEN
      RETURN NEW;
    END IF;
    
    -- Insert notification for the new assignee
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      link,
      entity_type,
      entity_id,
      actor_id,
      severity,
      channel,
      idempotency_key
    ) VALUES (
      NEW.assignee_id,
      'assignment',
      'Task Assigned: ' || v_task_key,
      COALESCE(v_actor_name, 'Someone') || ' assigned you to "' || v_task_title || '"',
      v_link,
      'task',
      NEW.id,
      auth.uid(),
      'info',
      'in_app',
      'task_assign_' || NEW.id::text || '_' || NEW.assignee_id::text || '_' || EXTRACT(EPOCH FROM now())::text
    )
    ON CONFLICT DO NOTHING;
    
    -- If there was an old assignee (reassignment), notify them of unassignment
    IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT NULL AND OLD.assignee_id != auth.uid() THEN
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        link,
        entity_type,
        entity_id,
        actor_id,
        severity,
        channel,
        idempotency_key
      ) VALUES (
        OLD.assignee_id,
        'unassignment',
        'Task Unassigned: ' || v_task_key,
        COALESCE(v_actor_name, 'Someone') || ' removed you from "' || v_task_title || '"',
        v_link,
        'task',
        NEW.id,
        auth.uid(),
        'info',
        'in_app',
        'task_unassign_' || NEW.id::text || '_' || OLD.assignee_id::text || '_' || EXTRACT(EPOCH FROM now())::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on planner_tasks
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON planner_tasks;

CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assignee_id
  ON planner_tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- Add comment for documentation
COMMENT ON FUNCTION notify_task_assignment() IS 'Creates notifications when tasks are assigned or reassigned in Taskhub';