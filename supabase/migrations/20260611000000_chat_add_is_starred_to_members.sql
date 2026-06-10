-- Add is_starred column to chat_conversation_members for per-user conversation starring.
ALTER TABLE public.chat_conversation_members ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;
