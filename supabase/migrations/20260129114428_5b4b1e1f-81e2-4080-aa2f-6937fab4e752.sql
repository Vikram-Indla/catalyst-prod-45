-- Fix upsert(onConflict: 'workstream_id,user_id') by ensuring a non-partial unique index exists.
-- Postgres cannot use a partial unique index for ON CONFLICT inference unless the conflict target includes a WHERE clause.

-- Remove redundant partial indexes (safe no-ops if missing)
DROP INDEX IF EXISTS public.idx_workstream_member_user_unique;
DROP INDEX IF EXISTS public.idx_workstream_members_user_unique;

-- Create a full unique index for workstream_id + user_id (NULL user_id rows are allowed to repeat in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS workstream_members_workstream_id_user_id_key
  ON public.workstream_members (workstream_id, user_id);
