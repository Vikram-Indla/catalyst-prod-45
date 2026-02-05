
-- =========================================
-- Task10 Notification Triggers
-- =========================================

-- 1. ASSIGNMENT NOTIFICATIONS
CREATE OR REPLACE FUNCTION notify_t10_item_assignment()
RETURNS TRIGGER AS $$
DECLARE
  item_title TEXT;
  list_name TEXT;
  list_id UUID;
  actor_name TEXT;
BEGIN
  -- Get item and list details
  SELECT i.title, l.name, l.id INTO item_title, list_name, list_id
  FROM t10_items i
  JOIN t10_weeks w ON w.id = i.week_id
  JOIN t10_lists l ON l.id = w.list_id
  WHERE i.id = NEW.id;

  -- Get actor name
  SELECT COALESCE(p.display_name, p.email, 'Someone') INTO actor_name
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Notify new assignee (if different from actor and not null)
  IF NEW.assignee_id IS NOT NULL 
     AND NEW.assignee_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    
    IF OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id THEN
      INSERT INTO user_notifications (
        user_id, type, title, message, link, entity_type, entity_id, actor_id, channel, severity, idempotency_key
      ) VALUES (
        NEW.assignee_id,
        'task_assigned',
        'New Task10 Assignment',
        format('%s assigned you to "%s" in %s', actor_name, item_title, list_name),
        format('/task10?listId=%s&itemId=%s', list_id, NEW.id),
        't10_item',
        NEW.id,
        auth.uid(),
        'in_app',
        'info',
        format('t10_assign_%s_%s_%s', NEW.id, NEW.assignee_id, NOW()::date)
      );
    END IF;
  END IF;

  -- Notify previous assignee of unassignment
  IF TG_OP = 'UPDATE' 
     AND OLD.assignee_id IS NOT NULL 
     AND OLD.assignee_id != NEW.assignee_id
     AND OLD.assignee_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    
    INSERT INTO user_notifications (
      user_id, type, title, message, link, entity_type, entity_id, actor_id, channel, severity, idempotency_key
    ) VALUES (
      OLD.assignee_id,
      'task_unassigned',
      'Task10 Unassignment',
      format('%s removed you from "%s" in %s', actor_name, item_title, list_name),
      format('/task10?listId=%s', list_id),
      't10_item',
      NEW.id,
      auth.uid(),
      'in_app',
      'info',
      format('t10_unassign_%s_%s_%s', NEW.id, OLD.assignee_id, NOW()::date)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment notifications
DROP TRIGGER IF EXISTS trigger_t10_notify_assignment ON t10_items;
CREATE TRIGGER trigger_t10_notify_assignment
  AFTER INSERT OR UPDATE OF assignee_id
  ON t10_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_t10_item_assignment();


-- 2. MENTION NOTIFICATIONS
CREATE OR REPLACE FUNCTION notify_t10_item_mentions()
RETURNS TRIGGER AS $$
DECLARE
  item_title TEXT;
  list_name TEXT;
  list_id UUID;
  actor_name TEXT;
  mention_match TEXT;
  mentioned_user_id UUID;
  mentioned_users UUID[] := ARRAY[]::UUID[];
  old_mentioned_users UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Only process if description changed
  IF TG_OP = 'UPDATE' AND OLD.description = NEW.description THEN
    RETURN NEW;
  END IF;
  
  -- Get item and list details
  SELECT i.title, l.name, l.id INTO item_title, list_name, list_id
  FROM t10_items i
  JOIN t10_weeks w ON w.id = i.week_id
  JOIN t10_lists l ON l.id = w.list_id
  WHERE i.id = NEW.id;

  -- Get actor name
  SELECT COALESCE(p.display_name, p.email, 'Someone') INTO actor_name
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Extract @mentions from new description
  FOR mention_match IN 
    SELECT (regexp_matches(COALESCE(NEW.description, ''), '@([a-zA-Z0-9._-]+)', 'g'))[1]
  LOOP
    SELECT id INTO mentioned_user_id
    FROM profiles
    WHERE LOWER(display_name) = LOWER(mention_match)
       OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER(mention_match)
    LIMIT 1;
    
    IF mentioned_user_id IS NOT NULL THEN
      mentioned_users := array_append(mentioned_users, mentioned_user_id);
    END IF;
  END LOOP;

  -- Extract mentions from old description to avoid duplicates
  IF TG_OP = 'UPDATE' AND OLD.description IS NOT NULL THEN
    FOR mention_match IN 
      SELECT (regexp_matches(OLD.description, '@([a-zA-Z0-9._-]+)', 'g'))[1]
    LOOP
      SELECT id INTO mentioned_user_id
      FROM profiles
      WHERE LOWER(display_name) = LOWER(mention_match)
         OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER(mention_match)
      LIMIT 1;
      
      IF mentioned_user_id IS NOT NULL THEN
        old_mentioned_users := array_append(old_mentioned_users, mentioned_user_id);
      END IF;
    END LOOP;
  END IF;

  -- Create notifications for newly mentioned users
  FOR mentioned_user_id IN SELECT UNNEST(mentioned_users)
  LOOP
    IF mentioned_user_id = ANY(old_mentioned_users) 
       OR mentioned_user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      CONTINUE;
    END IF;

    INSERT INTO user_notifications (
      user_id, type, title, message, link, entity_type, entity_id, actor_id, channel, severity, idempotency_key
    ) VALUES (
      mentioned_user_id,
      'mention',
      'Mentioned in Task10',
      format('%s mentioned you in "%s"', actor_name, item_title),
      format('/task10?listId=%s&itemId=%s', list_id, NEW.id),
      't10_item',
      NEW.id,
      auth.uid(),
      'in_app',
      'info',
      format('t10_mention_%s_%s_%s', NEW.id, mentioned_user_id, NOW()::timestamp)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for mention notifications
DROP TRIGGER IF EXISTS trigger_t10_notify_mentions ON t10_items;
CREATE TRIGGER trigger_t10_notify_mentions
  AFTER INSERT OR UPDATE OF description
  ON t10_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_t10_item_mentions();
