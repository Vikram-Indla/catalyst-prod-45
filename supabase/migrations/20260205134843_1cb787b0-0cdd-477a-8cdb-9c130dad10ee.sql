-- ============================================================
-- LEAD NOTES @MENTIONS NOTIFICATION TRIGGER
-- Sends notifications when users are @mentioned in lead notes
-- ============================================================

-- Function to handle @mentions in planner_task_lead_notes
CREATE OR REPLACE FUNCTION public.notify_lead_note_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_match TEXT;
  mentioned_user_id UUID;
  actor_id UUID;
  task_title TEXT;
  notification_content TEXT;
BEGIN
  -- Get the actor
  actor_id := auth.uid();
  
  -- Only process if content changed or is new
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content) THEN
    
    -- Get task title for notification
    SELECT title INTO task_title 
    FROM public.planner_tasks 
    WHERE id = NEW.task_id 
    LIMIT 1;
    
    task_title := COALESCE(task_title, 'Untitled Task');
    
    -- Extract and process @mentions
    FOR mention_match IN 
      SELECT (regexp_matches(COALESCE(NEW.content, ''), '@([a-zA-Z0-9._-]+)', 'g'))[1]
    LOOP
      -- Skip if this mention was already in the old content (for updates)
      IF TG_OP = 'UPDATE' AND COALESCE(OLD.content, '') ~ ('@' || mention_match || '(\s|$)') THEN
        CONTINUE;
      END IF;
      
      -- Try to find user
      SELECT p.id INTO mentioned_user_id
      FROM public.profiles p
      WHERE LOWER(SPLIT_PART(p.email, '@', 1)) = LOWER(mention_match)
         OR LOWER(REPLACE(p.full_name, ' ', '_')) = LOWER(mention_match)
         OR LOWER(p.full_name) = LOWER(REPLACE(mention_match, '_', ' '))
      LIMIT 1;
      
      -- If found, create notification (skip self-mentions)
      IF mentioned_user_id IS NOT NULL AND mentioned_user_id IS DISTINCT FROM actor_id THEN
        notification_content := 'You were mentioned in a note on: ' || task_title;
        
        INSERT INTO public.user_notifications (
          user_id,
          type,
          title,
          content,
          link,
          is_read,
          idempotency_key,
          created_at
        ) VALUES (
          mentioned_user_id,
          'mention',
          'Mentioned in a note',
          notification_content,
          '/taskhub/my-tasks?taskId=' || NEW.task_id,
          false,
          'lead_note_mention_' || NEW.id || '_' || mentioned_user_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
          NOW()
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on planner_task_lead_notes (correct table name)
DROP TRIGGER IF EXISTS trigger_lead_note_notify_mentions ON public.planner_task_lead_notes;
CREATE TRIGGER trigger_lead_note_notify_mentions
  AFTER INSERT OR UPDATE OF content ON public.planner_task_lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_note_mentions();