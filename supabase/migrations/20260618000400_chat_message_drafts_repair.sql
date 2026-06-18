-- =====================================================================
-- Catalyst Chat — repair chat_message_drafts
-- =====================================================================
-- A prior partial apply of 20260618000300 left the table without its
-- composite primary key, which broke ON CONFLICT upserts from the UI
-- (42P10: "there is no unique or exclusion constraint matching the ON
-- CONFLICT specification"). Drafts carry no durable data, so we drop
-- the broken table and re-create it cleanly with the intended schema.
-- =====================================================================

DROP TABLE IF EXISTS public.chat_message_drafts CASCADE;

CREATE TABLE public.chat_message_drafts (
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid        NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  body_md         text        NOT NULL DEFAULT '',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

COMMENT ON TABLE public.chat_message_drafts IS
  'Per-user, per-conversation composer drafts. One row per (user_id, conversation_id). Empty body_md is treated as no draft by the UI.';
COMMENT ON COLUMN public.chat_message_drafts.body_md IS
  'Draft body as markdown. Empty string means no draft.';

ALTER TABLE public.chat_message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_message_drafts_self ON public.chat_message_drafts;
CREATE POLICY chat_message_drafts_self ON public.chat_message_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS chat_message_drafts_user_updated_idx
  ON public.chat_message_drafts (user_id, updated_at DESC);
