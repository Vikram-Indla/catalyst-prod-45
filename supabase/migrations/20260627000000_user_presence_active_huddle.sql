-- Global "is this user currently in a huddle" signal, readable across
-- conversations (huddle participant rows are RLS-scoped to conversation members,
-- so they can't power a DM-list call indicator). Set on huddle enter, cleared on
-- leave. user_presence is already globally SELECT-able.
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS active_huddle_id uuid;

NOTIFY pgrst, 'reload schema';
