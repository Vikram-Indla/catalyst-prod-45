-- Add is_pinned column to chat_conversation_members for per-user conversation pinning.
-- Mirrors is_starred (2026-06-11). Per-user, not global — pinning is personal.
-- Writable by the row owner via the existing chat_conversation_members_update
-- policy (USING/WITH CHECK user_id = auth.uid()); no new policy required.
ALTER TABLE public.chat_conversation_members ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
