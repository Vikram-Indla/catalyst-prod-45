-- =====================================================================
-- Catalyst Chat — add chat_conversations.last_message_preview
-- The data layer (useConversations) selects last_message_preview but the
-- base migration omitted the column, so PostgREST returned 400 and the
-- conversation list silently rendered empty. Add the column, maintain it in
-- the last-message touch trigger, and backfill existing rows. Idempotent.
-- =====================================================================

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS last_message_preview text;

CREATE OR REPLACE FUNCTION public.chat_touch_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.chat_conversations
     SET last_message_at      = NEW.created_at,
         last_message_preview = left(NEW.body_text, 140),
         updated_at           = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$fn$;

-- Backfill preview from each conversation's latest non-deleted message.
UPDATE public.chat_conversations c
   SET last_message_preview = sub.preview
  FROM (
    SELECT DISTINCT ON (conversation_id)
           conversation_id,
           left(body_text, 140) AS preview
      FROM public.chat_messages
     WHERE deleted_at IS NULL
     ORDER BY conversation_id, created_at DESC
  ) sub
 WHERE c.id = sub.conversation_id;
