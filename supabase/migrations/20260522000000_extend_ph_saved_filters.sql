-- Extend ph_saved_filters for the Filters module
-- Adds: description, jql_query, viewers/editors config, starring, owner,
--       board usage tracking, hub scope, analytics columns, health status.

ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS jql_query         TEXT,
  ADD COLUMN IF NOT EXISTS viewers_config    JSONB        NOT NULL DEFAULT '{"type":"private"}'::jsonb,
  ADD COLUMN IF NOT EXISTS editors_config    JSONB        NOT NULL DEFAULT '{"type":"owner_only"}'::jsonb,
  ADD COLUMN IF NOT EXISTS starred_by_user_ids UUID[]     NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_id          UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS used_by_board_ids UUID[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hub_scope         TEXT         NOT NULL DEFAULT 'project'
                                             CHECK (hub_scope IN ('project', 'product', 'both')),
  ADD COLUMN IF NOT EXISTS last_used_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS use_count         INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_status     TEXT         NOT NULL DEFAULT 'healthy'
                                             CHECK (health_status IN ('healthy', 'stale', 'broken'));

-- Index for fast per-user and shared filter lookups
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_user_id      ON public.ph_saved_filters (user_id);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_hub_scope    ON public.ph_saved_filters (hub_scope);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_health       ON public.ph_saved_filters (health_status);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_last_used    ON public.ph_saved_filters (last_used_at DESC NULLS LAST);

-- Drop stale/overly-broad policies before recreating clean ones
DROP POLICY IF EXISTS "Users can view their saved filters"   ON public.ph_saved_filters;
DROP POLICY IF EXISTS "Users can create saved filters"       ON public.ph_saved_filters;
DROP POLICY IF EXISTS "Users can update their saved filters" ON public.ph_saved_filters;
DROP POLICY IF EXISTS "Users can delete their saved filters" ON public.ph_saved_filters;

-- READ: own filters + any filter explicitly shared with the org
CREATE POLICY "ph_saved_filters_select" ON public.ph_saved_filters
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_shared = true
    OR owner_id = auth.uid()
  );

-- INSERT: authenticated users create their own filters
CREATE POLICY "ph_saved_filters_insert" ON public.ph_saved_filters
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only the owner or the assigned owner may update
CREATE POLICY "ph_saved_filters_update" ON public.ph_saved_filters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());

-- DELETE: only the owner may delete
CREATE POLICY "ph_saved_filters_delete" ON public.ph_saved_filters
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());
