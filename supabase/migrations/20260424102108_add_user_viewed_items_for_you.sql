-- ═══════════════════════════════════════════════════════════════════════════
-- For You — Viewed tab + Recommended mentions
-- Author: Catalyst team (TurnQy) · April 2026
--
-- Adds the minimum schema needed to power the new /for-you page that mirrors
-- Jira's "For You" surface:
--
--   1. public.user_viewed_items — per-user recently-viewed work items.
--      Drives the "Viewed" tab (Today / Yesterday sections). One row per
--      (user, item, type). `last_viewed_at` is updated on re-view via upsert.
--
-- Parallels `public.user_starred_items` in shape and RLS style so the
-- client hook can use the same Supabase patterns already in useForYouData.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── user_viewed_items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_viewed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type = ANY (ARRAY[
    'epic'::text,
    'feature'::text,
    'story'::text,
    'task'::text,
    'incident'::text,
    'defect'::text,
    'ph_issue'::text,
    'project'::text
  ])),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, item_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_user_viewed_items_user_id
  ON public.user_viewed_items(user_id);

CREATE INDEX IF NOT EXISTS idx_user_viewed_items_recent
  ON public.user_viewed_items(user_id, last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_viewed_items_item
  ON public.user_viewed_items(item_id, item_type);

ALTER TABLE public.user_viewed_items ENABLE ROW LEVEL SECURITY;

-- Users see only their own views
DROP POLICY IF EXISTS "Users can view their own viewed items"
  ON public.user_viewed_items;
CREATE POLICY "Users can view their own viewed items"
  ON public.user_viewed_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users insert views for themselves
DROP POLICY IF EXISTS "Users can record their own views"
  ON public.user_viewed_items;
CREATE POLICY "Users can record their own views"
  ON public.user_viewed_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users update their own view rows (for re-views via upsert)
DROP POLICY IF EXISTS "Users can update their own views"
  ON public.user_viewed_items;
CREATE POLICY "Users can update their own views"
  ON public.user_viewed_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can clear their own history
DROP POLICY IF EXISTS "Users can delete their own views"
  ON public.user_viewed_items;
CREATE POLICY "Users can delete their own views"
  ON public.user_viewed_items
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_viewed_items IS
  'Per-user recently-viewed work items, drives the Viewed tab on /for-you. '
  'Upsert on view with last_viewed_at=now() and view_count=view_count+1.';
