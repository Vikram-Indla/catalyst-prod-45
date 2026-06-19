-- Phase B (Filters refactor, gap G4 + G5)
-- Fix: ph_saved_filters UPDATE RLS ignored editors_config — named editors got 403.
-- Adds an editor-write helper (qualified params per 2026-06-10 shadowing lesson),
-- rewrites the UPDATE policy to honor specific editors, and adds 4 missing indexes.
-- Non-destructive. DELETE policy is intentionally NOT changed — editors edit, never delete/transfer.

-- ── G4: editor-write helper ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ph_saved_filter_can_edit(p_filter_id uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ph_saved_filters f
    WHERE f.id = p_filter_id
      AND (
        f.user_id = p_user
        OR f.owner_id = p_user
        OR (
          (f.editors_config ->> 'type') = 'specific'
          AND (f.editors_config -> 'user_ids') ? (p_user)::text
        )
      )
  );
$$;

-- ── G4: UPDATE policy honors editors ──────────────────────────────────────────
DROP POLICY IF EXISTS ph_saved_filters_update ON public.ph_saved_filters;
CREATE POLICY ph_saved_filters_update ON public.ph_saved_filters
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR owner_id = auth.uid()
    OR public.ph_saved_filter_can_edit(id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR owner_id = auth.uid()
    OR public.ph_saved_filter_can_edit(id, auth.uid())
  );

-- ── G5: missing indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_owner_id
  ON public.ph_saved_filters (owner_id);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_product_key
  ON public.ph_saved_filters (product_key);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_starred_gin
  ON public.ph_saved_filters USING gin (starred_by_user_ids);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_viewers_gin
  ON public.ph_saved_filters USING gin (viewers_config);
