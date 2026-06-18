-- =====================================================================
-- Catalyst Chat — Later tab state machine on chat_bookmarks
-- =====================================================================
-- Extends chat_bookmarks with:
--   state         : 'in_progress' | 'archived' | 'completed'
--   remind_at     : when reminder fires (NULL if no reminder)
--   reminder_text : description for standalone reminders ("+ Remind me to…")
--   kind          : 'saved_message' | 'reminder'
--   completed_at, archived_at : transition timestamps
-- message_id becomes nullable so standalone reminders can exist without a message.
-- =====================================================================

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'in_progress'
    CHECK (state IN ('in_progress', 'archived', 'completed'));

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS remind_at timestamptz;

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS reminder_text text;

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'saved_message'
    CHECK (kind IN ('saved_message', 'reminder'));

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.chat_bookmarks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.chat_bookmarks
  ALTER COLUMN message_id DROP NOT NULL;

ALTER TABLE public.chat_bookmarks
  ALTER COLUMN conversation_id DROP NOT NULL;

-- Drop the old (user_id, message_id) UNIQUE so message_id NULL rows can coexist.
ALTER TABLE public.chat_bookmarks
  DROP CONSTRAINT IF EXISTS chat_bookmarks_user_id_message_id_key;

-- Partial unique: only enforced when message_id is present (saved_message kind).
CREATE UNIQUE INDEX IF NOT EXISTS chat_bookmarks_user_message_uidx
  ON public.chat_bookmarks (user_id, message_id)
  WHERE message_id IS NOT NULL;

-- Standalone reminder kind requires reminder_text and remind_at.
ALTER TABLE public.chat_bookmarks
  DROP CONSTRAINT IF EXISTS chat_bookmarks_reminder_shape_chk;
ALTER TABLE public.chat_bookmarks
  ADD CONSTRAINT chat_bookmarks_reminder_shape_chk
  CHECK (
    (kind = 'saved_message' AND message_id IS NOT NULL AND conversation_id IS NOT NULL)
    OR (kind = 'reminder' AND reminder_text IS NOT NULL AND remind_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS chat_bookmarks_state_idx
  ON public.chat_bookmarks (user_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_bookmarks_remind_at_idx
  ON public.chat_bookmarks (user_id, remind_at)
  WHERE remind_at IS NOT NULL AND state = 'in_progress';

-- ---------------------------------------------------------------------
-- RPC: clear all Completed for current user (wipe icon on Completed tab).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_clear_completed_bookmarks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH del AS (
    DELETE FROM public.chat_bookmarks
    WHERE user_id = auth.uid() AND state = 'completed'
    RETURNING 1
  )
  SELECT count(*) INTO removed_count FROM del;

  RETURN removed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_clear_completed_bookmarks() TO authenticated;
