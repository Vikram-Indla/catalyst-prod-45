-- 20260628100000_chat_message_huddle_event.sql
-- Adds an event-message channel to chat_messages so a huddle can post a
-- "A huddle happened" summary row into the conversation thread.
-- Normal messages leave both columns NULL (no behavior change).

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_meta jsonb;

COMMENT ON COLUMN public.chat_messages.event_type IS
  'NULL = normal message. Non-null = system/event row (e.g. huddle_summary).';
COMMENT ON COLUMN public.chat_messages.event_meta IS
  'Event payload, e.g. { huddle_id, duration_seconds, with_name } for huddle_summary.';

-- One huddle_summary per huddle: both peers may race to insert on leave; the
-- partial unique index makes the second insert fail (caught + ignored client-side).
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_huddle_summary_uniq
  ON public.chat_messages ((event_meta->>'huddle_id'))
  WHERE event_type = 'huddle_summary';
