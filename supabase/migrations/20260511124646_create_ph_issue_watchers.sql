-- ph_issue_watchers — backs the WatchersChip in CatalystViewBase header.
--
-- Background: this table was originally created via Lovable's SQL editor
-- on 2026-05-03 (per CLAUDE.md 2026-05-08 lesson) but the migration was
-- never committed to the repo. As a result:
--   1. Fresh deploys / environment resets had no watchers table → silent
--      failures on every WatchersChip click.
--   2. Generated supabase types were missing `ph_issue_watchers`, forcing
--      `(supabase as any)` casts in `useCatalystWatchers.ts`.
--
-- 2026-05-11: Vikram re-ran the SQL via Lovable to verify state on the
-- live DB. This migration captures it so future environments reproduce
-- the table + RLS policies automatically.

CREATE TABLE IF NOT EXISTS public.ph_issue_watchers (
  issue_key  TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_key, user_id)
);

-- Speed lookups by issue_key (WatchersChip queries per ph_issue).
CREATE INDEX IF NOT EXISTS ph_issue_watchers_issue_key_idx
  ON public.ph_issue_watchers (issue_key);

-- Speed user-driven lookups (e.g. "what am I watching").
CREATE INDEX IF NOT EXISTS ph_issue_watchers_user_id_idx
  ON public.ph_issue_watchers (user_id);

ALTER TABLE public.ph_issue_watchers ENABLE ROW LEVEL SECURITY;

-- READ: any authenticated user can see who watches an issue.
DROP POLICY IF EXISTS "ph_issue_watchers_select_all_authenticated"
  ON public.ph_issue_watchers;
CREATE POLICY "ph_issue_watchers_select_all_authenticated"
  ON public.ph_issue_watchers
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: a user can only add a watcher row for themselves.
DROP POLICY IF EXISTS "ph_issue_watchers_insert_own"
  ON public.ph_issue_watchers;
CREATE POLICY "ph_issue_watchers_insert_own"
  ON public.ph_issue_watchers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: a user can only remove their own watcher row.
DROP POLICY IF EXISTS "ph_issue_watchers_delete_own"
  ON public.ph_issue_watchers;
CREATE POLICY "ph_issue_watchers_delete_own"
  ON public.ph_issue_watchers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
