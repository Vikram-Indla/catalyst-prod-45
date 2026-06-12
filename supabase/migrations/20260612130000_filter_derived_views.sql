-- filter_derived_views — container table for filter-backed derived views
-- (Feature 2: Filter→Roadmap; reused by Feature 3: Dashboard)
--
-- Design decisions:
--   • "live, not copied": stores source_filter_id (FK), never a snapshot of results.
--   • Permissions inherit from the filter: visibility is enforced via the existing
--     user_can_see_filter() SECURITY DEFINER helper (already in prod from Kanban).
--   • shared_default_config (jsonb): stores date_field, lane_by, zoom — per-view
--     config the creator sets at create-time and can edit later.
--   • type discriminator: 'roadmap' for Feature 2, 'dashboard' reserved for Feature 3.
--
-- RLS rules (mirrors ph_saved_filters pattern + CLAUDE.md lessons):
--   SELECT: owner OR filter is visible to user (user_can_see_filter)
--   INSERT: authenticated user creates their own row (owner_id = auth.uid())
--   UPDATE: owner only
--   DELETE: owner only
--
-- CLAUDE.md guardrails applied:
--   • SECURITY DEFINER used for the visibility helper (not inline subquery) to
--     prevent RLS recursion (CLAUDE.md 2026-06-03).
--   • Parameters qualified p_* in helper to prevent column shadowing
--     (CLAUDE.md 2026-06-10).
--   • user_can_see_filter already exists from 20260612120000_boards_filter_visibility.sql
--     — reused, not recreated.

CREATE TABLE IF NOT EXISTS public.filter_derived_views (
  id                   uuid                     DEFAULT gen_random_uuid() NOT NULL,
  source_filter_id     uuid                     NOT NULL
                         REFERENCES public.ph_saved_filters (id) ON DELETE CASCADE,
  type                 text                     NOT NULL
                         CHECK (type IN ('roadmap', 'dashboard')),
  title                text                     NOT NULL,
  owner_id             uuid                     NOT NULL
                         REFERENCES auth.users (id) ON DELETE CASCADE,
  shared_default_config jsonb                   NOT NULL DEFAULT '{}',
  visibility           text                     NOT NULL DEFAULT 'private'
                         CHECK (visibility IN ('private', 'org')),
  created_at           timestamp with time zone DEFAULT now() NOT NULL,
  updated_at           timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT filter_derived_views_pkey PRIMARY KEY (id)
);

-- Index: dedup lookup (owner sees only their own roadmap for a given filter)
CREATE INDEX IF NOT EXISTS idx_fdv_filter_owner
  ON public.filter_derived_views (source_filter_id, owner_id)
  WHERE type = 'roadmap';

-- updated_at trigger (mirrors existing tables)
CREATE OR REPLACE FUNCTION public.fdv_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fdv_updated_at
  BEFORE UPDATE ON public.filter_derived_views
  FOR EACH ROW EXECUTE FUNCTION public.fdv_set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.filter_derived_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_derived_views FORCE ROW LEVEL SECURITY;

-- SELECT: owner always sees their rows; others see rows whose source filter
-- is visible to them (org-shared or explicitly shared filter).
CREATE POLICY fdv_select
  ON public.filter_derived_views
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      visibility = 'org'
      AND public.user_can_see_filter(source_filter_id, auth.uid())
    )
  );

-- INSERT: authenticated user can only create rows they own.
CREATE POLICY fdv_insert
  ON public.filter_derived_views
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner only.
CREATE POLICY fdv_update
  ON public.filter_derived_views
  FOR UPDATE
  TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DELETE: owner only.
CREATE POLICY fdv_delete
  ON public.filter_derived_views
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
