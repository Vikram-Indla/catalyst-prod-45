-- =====================================================================
-- Catalyst Chat — per-user, per-conversation composer drafts
-- =====================================================================
-- Stores the draft body for each (user_id, conversation_id) pair. The
-- composer autosaves on type (debounced) and clears on send. One row
-- per pair via composite primary key. Empty body_md is treated as
-- "no draft" by the application.
--
-- RLS: user_id = auth.uid() — direct comparison, no JOIN, no EXISTS,
-- no self-reference. Avoids the 2026-06-03 recursion class.
--
-- Idempotent: every step uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- so a partially-applied previous attempt (e.g. table created without
-- one of the columns) is silently repaired rather than re-erroring.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_message_drafts (
  user_id         uuid        NOT NULL,
  conversation_id uuid        NOT NULL,
  body_md         text        NOT NULL DEFAULT '',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Repair: any column that is missing from a previously-failed apply
-- gets added now. Safe to re-run on a fully-formed table — these are
-- no-ops via IF NOT EXISTS.
ALTER TABLE public.chat_message_drafts
  ADD COLUMN IF NOT EXISTS user_id         uuid        NOT NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid        NOT NULL,
  ADD COLUMN IF NOT EXISTS body_md         text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

-- Composite primary key. Add only if the table has no PK yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.chat_message_drafts'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.chat_message_drafts
      ADD CONSTRAINT chat_message_drafts_pkey PRIMARY KEY (user_id, conversation_id);
  END IF;
END$$;

-- Foreign keys. Add only if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.chat_message_drafts'::regclass
      AND conname = 'chat_message_drafts_user_id_fkey'
  ) THEN
    ALTER TABLE public.chat_message_drafts
      ADD CONSTRAINT chat_message_drafts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.chat_message_drafts'::regclass
      AND conname = 'chat_message_drafts_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.chat_message_drafts
      ADD CONSTRAINT chat_message_drafts_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
  END IF;
END$$;

COMMENT ON TABLE public.chat_message_drafts IS
  'Per-user, per-conversation composer drafts. One row per (user_id, conversation_id). Empty body_md is treated as no draft by the UI.';

ALTER TABLE public.chat_message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_message_drafts_self ON public.chat_message_drafts;
CREATE POLICY chat_message_drafts_self ON public.chat_message_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS chat_message_drafts_user_updated_idx
  ON public.chat_message_drafts (user_id, updated_at DESC);
