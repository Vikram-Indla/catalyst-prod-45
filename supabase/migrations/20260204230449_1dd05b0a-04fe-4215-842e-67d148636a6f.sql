-- Drop and recreate the trigger function with correct activity types
CREATE OR REPLACE FUNCTION public.log_t10_item_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT: Log 'created' activity
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
    VALUES (
      NEW.id,
      'created',
      NEW.created_by,
      jsonb_build_object('description', 'Created this priority', 'title', NEW.title)
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: Log specific changes
  IF TG_OP = 'UPDATE' THEN
    -- Status change (completed/reopened)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        CASE WHEN NEW.status = 'done' THEN 'completed' ELSE 'reopened' END,
        auth.uid(),
        jsonb_build_object(
          'description', 
          CASE WHEN NEW.status = 'done' THEN 'Marked as completed' ELSE 'Reopened this priority' END,
          'oldStatus', OLD.status,
          'newStatus', NEW.status
        )
      );
    END IF;

    -- Rank change
    IF OLD.rank IS DISTINCT FROM NEW.rank THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        'rank_changed',
        auth.uid(),
        jsonb_build_object(
          'description', 
          'Moved from rank #' || OLD.rank || ' to #' || NEW.rank,
          'oldRank', OLD.rank,
          'newRank', NEW.rank
        )
      );
    END IF;

    -- Assignee change
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        CASE WHEN NEW.assignee_id IS NULL THEN 'unassigned' ELSE 'assigned' END,
        auth.uid(),
        jsonb_build_object(
          'description',
          CASE 
            WHEN NEW.assignee_id IS NULL THEN 'Unassigned'
            ELSE 'Assignee updated'
          END,
          'oldAssigneeId', OLD.assignee_id,
          'newAssigneeId', NEW.assignee_id
        )
      );
    END IF;

    -- Due date change
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        'due_date_changed',
        auth.uid(),
        jsonb_build_object(
          'description',
          CASE 
            WHEN NEW.due_date IS NULL THEN 'Removed due date'
            WHEN OLD.due_date IS NULL THEN 'Set due date to ' || NEW.due_date
            ELSE 'Changed due date from ' || OLD.due_date || ' to ' || NEW.due_date
          END,
          'field', 'due_date',
          'oldValue', OLD.due_date,
          'newValue', NEW.due_date
        )
      );
    END IF;

    -- Title change
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        'title_updated',
        auth.uid(),
        jsonb_build_object(
          'description', 'Updated title',
          'field', 'title',
          'oldValue', OLD.title,
          'newValue', NEW.title
        )
      );
    END IF;

    -- Description change
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        'description_updated',
        auth.uid(),
        jsonb_build_object(
          'description', 'Updated notes',
          'field', 'description'
        )
      );
    END IF;

    -- Carryover count change
    IF OLD.carryover_count IS DISTINCT FROM NEW.carryover_count AND NEW.carryover_count > OLD.carryover_count THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        'carried_over',
        auth.uid(),
        jsonb_build_object(
          'description', 'Carried over to next week',
          'carryoverCount', NEW.carryover_count
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;