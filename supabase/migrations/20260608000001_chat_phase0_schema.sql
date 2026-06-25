-- =====================================================================
-- Catalyst Chat Phase 0 — schema unblock for DM, group DM, channel privacy
-- =====================================================================
-- Idempotent. Safe to re-run.
-- Decisions locked: Q1 group DM included now · Q2 channels restricted to
-- ph_project_members · Q3 Supabase Storage for attachments · Q4 reuse
-- notifications table for mentions · Q5 RLS-filtered search.
-- =====================================================================

-- 1) kind CHECK expanded to include dm, group_dm
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_kind_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_kind_check
  CHECK (kind IN ('ticket','channel','dm','group_dm'));

-- 2) dm_pair_hash — deterministic hash of sorted member-uuid list.
--    Used for fast get-or-create of DMs and group DMs.
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS dm_pair_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_one_dm_per_pair
  ON public.chat_conversations (dm_pair_hash)
  WHERE kind IN ('dm','group_dm') AND dm_pair_hash IS NOT NULL;

-- 3) is_private — channels are restricted to project members by default (Q2).
--    DMs and group DMs are always private. Ticket threads inherit ticket RLS.
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;

-- 4) Helper — canonical hash for any set of user IDs (sorted, lowercased).
CREATE OR REPLACE FUNCTION public.chat_compute_pair_hash(p_user_ids uuid[])
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT encode(
    digest(
      array_to_string(
        ARRAY(SELECT unnest(p_user_ids)::text ORDER BY 1),
        '|'
      ),
      'sha256'
    ),
    'hex'
  );
$fn$;

COMMENT ON FUNCTION public.chat_compute_pair_hash(uuid[]) IS
  'Deterministic SHA-256 of sorted lowercase uuid list. Used to dedupe DMs and group DMs.';

-- 5) Ensure pgcrypto for digest() — already enabled in this project but guard anyway.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;
