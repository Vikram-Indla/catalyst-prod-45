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
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_message_drafts (
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
