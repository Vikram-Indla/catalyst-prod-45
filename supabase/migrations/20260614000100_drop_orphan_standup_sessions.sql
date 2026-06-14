-- Drop the orphan `standup_sessions` table.
--
-- Discovered 2026-06-14 while applying the Phase 1 standup schema
-- (20260614000000_standup_phase1.sql). The table existed in the prod DB
-- but had:
--   - no creating migration in supabase/migrations
--   - zero code references anywhere in the repo
--   - zero rows
-- It was a denormalised parallel implementation (changes_json + comments_json
-- as JSONB blobs) of what the Phase 1 schema now models normally as
-- standups + standup_events + standup_status_changes. Dropping it keeps
-- the DB and the migration history in sync going forward.
--
-- CASCADE removes the 3 RLS policies that lived on it.

BEGIN;

DROP TABLE IF EXISTS public.standup_sessions CASCADE;

COMMIT;
