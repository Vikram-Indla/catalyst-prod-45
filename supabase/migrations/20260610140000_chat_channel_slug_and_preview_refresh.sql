-- Design-critique fixes (2026-06-10):
-- 1) Channel titles follow the Slack naming convention (lowercase, no
--    spaces/periods, <80 chars — slack.com/help/articles/201402297).
--    Slugify on creation + backfill existing channels.
-- 2) last_message_preview went stale when the latest message was deleted.
--    Recompute preview on message delete / soft-delete.

CREATE OR REPLACE FUNCTION public.chat_channel_slug(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
           regexp_replace(
             regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g'
           ),
           79
         );
$$;

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
           ('channel', NEW.key, public.chat_channel_slug(NEW.name), true, NEW.created_by)
      ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block project creation on chat side-effect.
    NULL;
  END;
  RETURN NEW;
END;
$fn$;

UPDATE public.chat_conversations
   SET title = public.chat_channel_slug(title),
       updated_at = now()
 WHERE kind = 'channel'
   AND title IS DISTINCT FROM public.chat_channel_slug(title);

-- Preview refresh on delete / soft-delete.
CREATE OR REPLACE FUNCTION public.chat_refresh_preview_on_message_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  conv uuid := COALESCE(NEW.conversation_id, OLD.conversation_id);
BEGIN
  UPDATE public.chat_conversations c
     SET last_message_preview = sub.preview,
         last_message_at      = sub.created_at,
         updated_at           = now()
    FROM (
      SELECT left(m.body_text, 140) AS preview, m.created_at
        FROM public.chat_messages m
       WHERE m.conversation_id = conv
         AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT 1
    ) sub
   WHERE c.id = conv;
  -- No messages left → clear the preview.
  IF NOT FOUND THEN
    UPDATE public.chat_conversations
       SET last_message_preview = NULL, updated_at = now()
     WHERE id = conv;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS chat_messages_refresh_preview_on_delete ON public.chat_messages;
CREATE TRIGGER chat_messages_refresh_preview_on_delete
  AFTER DELETE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_refresh_preview_on_message_removal();

DROP TRIGGER IF EXISTS chat_messages_refresh_preview_on_soft_delete ON public.chat_messages;
CREATE TRIGGER chat_messages_refresh_preview_on_soft_delete
  AFTER UPDATE OF deleted_at ON public.chat_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.chat_refresh_preview_on_message_removal();

-- Clear the currently-stale previews (e.g. deleted trigger-test message).
UPDATE public.chat_conversations c
   SET last_message_preview = sub.preview
  FROM (
    SELECT DISTINCT ON (conversation_id)
           conversation_id, left(body_text, 140) AS preview
      FROM public.chat_messages
     WHERE deleted_at IS NULL
     ORDER BY conversation_id, created_at DESC
  ) sub
 WHERE c.id = sub.conversation_id
   AND c.last_message_preview IS DISTINCT FROM sub.preview;

UPDATE public.chat_conversations c
   SET last_message_preview = NULL
 WHERE NOT EXISTS (
   SELECT 1 FROM public.chat_messages m
    WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
 )
   AND c.last_message_preview IS NOT NULL;
