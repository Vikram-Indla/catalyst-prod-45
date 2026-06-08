-- =====================================================================
-- Catalyst Chat Phase 2 — lifecycle triggers
-- =====================================================================
-- T1: AFTER INSERT on ph_projects → auto-create project channel
-- T2: AFTER INSERT/DELETE on ph_project_members → reconcile channel membership
-- T3: AFTER INSERT on chat_messages → fan-out @mentions into notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- T1 — auto-create channel on project creation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_create_channel_on_project_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  BEGIN
    INSERT INTO public.chat_conversations
           (kind, project_key, title, is_private, created_by)
         VALUES
           ('channel', NEW.key, NEW.name, true, NEW.created_by)
      ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block project creation on chat side-effect.
    NULL;
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ph_projects_create_chat_channel ON public.ph_projects;
CREATE TRIGGER ph_projects_create_chat_channel
  AFTER INSERT ON public.ph_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_create_channel_on_project_insert();

-- ---------------------------------------------------------------------
-- T2 — reconcile chat channel membership when ph_project_members changes
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_reconcile_channel_member_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  conv_id uuid;
  proj_key text;
BEGIN
  BEGIN
    SELECT key INTO proj_key FROM public.ph_projects WHERE id = NEW.project_id;
    IF proj_key IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id INTO conv_id
      FROM public.chat_conversations
     WHERE kind = 'channel' AND project_key = proj_key
     LIMIT 1;

    IF conv_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
         VALUES (conv_id, NEW.user_id, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.chat_reconcile_channel_member_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  conv_id uuid;
  proj_key text;
BEGIN
  BEGIN
    SELECT key INTO proj_key FROM public.ph_projects WHERE id = OLD.project_id;
    IF proj_key IS NULL THEN
      RETURN OLD;
    END IF;

    SELECT id INTO conv_id
      FROM public.chat_conversations
     WHERE kind = 'channel' AND project_key = proj_key
     LIMIT 1;

    IF conv_id IS NULL THEN
      RETURN OLD;
    END IF;

    DELETE FROM public.chat_conversation_members
     WHERE conversation_id = conv_id AND user_id = OLD.user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS ph_project_members_chat_add ON public.ph_project_members;
CREATE TRIGGER ph_project_members_chat_add
  AFTER INSERT ON public.ph_project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_reconcile_channel_member_insert();

DROP TRIGGER IF EXISTS ph_project_members_chat_remove ON public.ph_project_members;
CREATE TRIGGER ph_project_members_chat_remove
  AFTER DELETE ON public.ph_project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_reconcile_channel_member_delete();

-- ---------------------------------------------------------------------
-- T3 — @mention fan-out: parse body_text for @"Full Name" tokens, insert
-- notifications rows for each matched profile (Q4 decision).
-- Match pattern: @<word><word ...> stops at non-name char.
-- Strategy: extract candidates with regex, resolve via profiles.full_name
-- ILIKE, INSERT into notifications.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_fanout_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  candidates text[];
  cand text;
  recipient_id uuid;
  conv_record record;
BEGIN
  IF NEW.body_text IS NULL OR NEW.body_text = '' THEN
    RETURN NEW;
  END IF;

  -- Extract @Name tokens (up to 3 words).
  candidates := ARRAY(
    SELECT trim(both '@' FROM m[1])
      FROM regexp_matches(
        NEW.body_text,
        '(@[A-Z][A-Za-z'']+(?:\s[A-Z][A-Za-z'']+){0,2})',
        'g'
      ) AS m
  );

  IF array_length(candidates, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT title, kind, ticket_key, project_key INTO conv_record
    FROM public.chat_conversations WHERE id = NEW.conversation_id;

  FOREACH cand IN ARRAY candidates LOOP
    BEGIN
      SELECT id INTO recipient_id
        FROM public.profiles
       WHERE lower(full_name) = lower(cand)
       LIMIT 1;

      IF recipient_id IS NOT NULL AND recipient_id <> NEW.author_id THEN
        INSERT INTO public.notifications (
          recipient_user_id, actor_user_id, notification_type,
          entity_type, entity_id, entity_title, entity_key,
          entity_icon_type, hub_source, status, status_type
        ) VALUES (
          recipient_id, NEW.author_id, 'chat_mention',
          'chat_message', NEW.id,
          left(NEW.body_text, 140),
          COALESCE(conv_record.ticket_key, conv_record.project_key, ''),
          'task', 'ChatHub', 'New', 'blue'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS chat_messages_fanout_mentions ON public.chat_messages;
CREATE TRIGGER chat_messages_fanout_mentions
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_fanout_mentions();
