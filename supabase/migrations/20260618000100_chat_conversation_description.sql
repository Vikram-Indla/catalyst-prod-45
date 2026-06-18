-- =====================================================================
-- Catalyst Chat — add description column to chat_conversations.
-- =====================================================================
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS description text;
