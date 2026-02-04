-- Create function to log item activity
CREATE OR REPLACE FUNCTION public.log_t10_item_activity()
RETURNS TRIGGER AS $$
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
    -- Status change (completed/uncompleted)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.t10_activity (item_id, activity_type, performed_by, metadata)
      VALUES (
        NEW.id,
        CASE WHEN NEW.status = 'done' THEN 'completed' ELSE 'updated' END,
        auth.uid(),
        jsonb_build_object(
          'description', 
          CASE WHEN NEW.status = 'done' THEN 'Marked as completed' ELSE 'Marked as incomplete' END,
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
        'ranked',
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
        'assigned',
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
        'updated',
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
        'updated',
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
        'updated',
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
        'carried',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_t10_item_activity ON public.t10_items;

-- Create trigger for activity logging
CREATE TRIGGER trigger_log_t10_item_activity
  AFTER INSERT OR UPDATE ON public.t10_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_t10_item_activity();