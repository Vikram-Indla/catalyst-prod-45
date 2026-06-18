-- =====================================================================
-- Catalyst Chat — schedule send
-- =====================================================================
-- Adds two columns to chat_messages:
--   scheduled_for  — when the message should become visible to non-authors
--   delivered_at   — when it actually became visible (set by cron job)
-- A trigger on INSERT auto-delivers non-scheduled messages immediately.
-- The SELECT policy is updated so members only see delivered_at IS NOT NULL
-- rows (authors continue to see their own pending scheduled messages).
-- A pg_cron job flips delivered_at for due-scheduled rows every minute.
-- =====================================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at  timestamptz;

COMMENT ON COLUMN public.chat_messages.scheduled_for IS
  'When this message should be delivered to non-authors. NULL = send immediately.';
COMMENT ON COLUMN public.chat_messages.delivered_at IS
  'When the message actually became visible to non-authors. NULL = pending.';

-- Backfill: every existing row counts as delivered at the time it was created.
UPDATE public.chat_messages
SET delivered_at = created_at
WHERE delivered_at IS NULL AND scheduled_for IS NULL;

-- Index supports the cron sweep and member-visible filter.
CREATE INDEX IF NOT EXISTS chat_messages_pending_idx
  ON public.chat_messages (scheduled_for)
  WHERE delivered_at IS NULL;

-- BEFORE INSERT trigger — non-scheduled rows deliver immediately.
CREATE OR REPLACE FUNCTION public.chat_messages_set_delivered_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivered_at IS NULL AND NEW.scheduled_for IS NULL THEN
    NEW.delivered_at := COALESCE(NEW.created_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_set_delivered_at_trg ON public.chat_messages;
CREATE TRIGGER chat_messages_set_delivered_at_trg
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_messages_set_delivered_at();

-- Update SELECT policy — members only see delivered rows; author still sees own.
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR (
      public.chat_is_member(conversation_id, auth.uid())
      AND delivered_at IS NOT NULL
    )
  );

-- Delivery worker — runs once a minute. Idempotent. Set-based UPDATE keeps
-- it cheap even with thousands of pending rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule any prior job with the same name (re-run safety).
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'chat-deliver-scheduled-messages';

    PERFORM cron.schedule(
      'chat-deliver-scheduled-messages',
      '* * * * *',
      $cron$
        UPDATE public.chat_messages
        SET delivered_at = now()
        WHERE delivered_at IS NULL
          AND scheduled_for IS NOT NULL
          AND scheduled_for <= now()
      $cron$
    );
  END IF;
END$$;
