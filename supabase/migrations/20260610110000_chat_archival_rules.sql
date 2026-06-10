-- Chat archival rules (Vikram directive 2026-06-10):
-- 1) DMs / group DMs / ticket conversations inactive for 60 days are auto-archived
--    by a nightly sweep. Project channels are NOT swept — they archive only with
--    their project (or ticket-done trigger for ticket conversations).
-- 2) Sending a new message to an archived dm/group_dm reopens it (Slack parity:
--    DMs are never dead-ends). Channels and ticket conversations stay archived
--    until explicitly unarchived.

-- Nightly sweep at 02:30 UTC.
SELECT cron.schedule(
  'chat-archive-inactive-conversations',
  '30 2 * * *',
  $$
  UPDATE public.chat_conversations
     SET is_archived = true,
         archived_at = now(),
         updated_at  = now()
   WHERE is_archived = false
     AND kind IN ('dm','group_dm','ticket')
     AND COALESCE(last_message_at, created_at) < now() - interval '60 days'
  $$
);

-- Reopen archived dm/group_dm on new message.
CREATE OR REPLACE FUNCTION public.chat_reopen_dm_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
     SET is_archived = false,
         archived_at = NULL,
         updated_at  = now()
   WHERE id = NEW.conversation_id
     AND is_archived = true
     AND kind IN ('dm','group_dm');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_reopen_dm ON public.chat_messages;
CREATE TRIGGER chat_messages_reopen_dm
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_reopen_dm_on_message();
