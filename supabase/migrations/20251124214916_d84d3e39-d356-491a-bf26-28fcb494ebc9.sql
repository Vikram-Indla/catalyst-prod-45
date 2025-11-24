-- ============================================
-- PHASE 2: Activity Logging & Notification Triggers
-- ============================================

-- ============================================
-- PART 1: Activity Logging System
-- ============================================

-- Create function to log activity automatically
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if there's an authenticated user
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    before_json,
    after_json
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN NEW;
END;
$$;

-- Create triggers for all work item tables
CREATE TRIGGER log_strategic_themes_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.strategic_themes
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_initiatives_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_business_requests_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.business_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_epics_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.epics
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_features_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.features
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_stories_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_subtasks_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_risks_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_dependencies_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.dependencies
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_program_increments_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.program_increments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_iterations_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.iterations
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_releases_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_portfolios_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_programs_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_teams_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- ============================================
-- PART 2: Notification System
-- ============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_type,
    p_entity_id
  );
END;
$$;

-- Function to notify on story assignment
CREATE OR REPLACE FUNCTION public.notify_story_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify when story is assigned to a user
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Story Assigned',
      'You have been assigned to story: ' || NEW.name,
      'assignment',
      'stories',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify on subtask assignment
CREATE OR REPLACE FUNCTION public.notify_subtask_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify when subtask is assigned to a user
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Subtask Assigned',
      'You have been assigned to subtask: ' || NEW.name,
      'assignment',
      'subtasks',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify on status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify assignee when status changes to 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.assignee_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Work Item Completed',
      'Your ' || TG_TABLE_NAME || ' "' || NEW.name || '" has been marked as done',
      'status_change',
      TG_TABLE_NAME,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify on risk escalation
CREATE OR REPLACE FUNCTION public.notify_risk_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify owner when risk impact or probability increases
  IF NEW.owner_id IS NOT NULL AND (
    (NEW.impact > OLD.impact) OR 
    (NEW.probability > OLD.probability)
  ) THEN
    PERFORM public.create_notification(
      NEW.owner_id,
      'Risk Escalated',
      'Risk "' || NEW.name || '" has been escalated',
      'alert',
      'risks',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create notification triggers
CREATE TRIGGER notify_on_story_assignment
  AFTER INSERT OR UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.notify_story_assignment();

CREATE TRIGGER notify_on_subtask_assignment
  AFTER INSERT OR UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_subtask_assignment();

CREATE TRIGGER notify_on_story_status_change
  AFTER UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

CREATE TRIGGER notify_on_subtask_status_change
  AFTER UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

CREATE TRIGGER notify_on_risk_escalation
  AFTER UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.notify_risk_escalation();