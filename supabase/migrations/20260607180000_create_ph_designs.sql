-- ph_designs — Figma URL attachments rendered by the "Designs" section
-- in every CatalystView* (sits between Child Work Items and Linked Work
-- Items). Each row represents one Figma URL attached to a single work
-- item (ph_issues OR business_requests, same FK-less UUID pattern as
-- ph_web_links).

CREATE TABLE IF NOT EXISTS public.ph_designs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id  UUID NOT NULL,
  url           TEXT NOT NULL CHECK (length(url) > 0 AND length(url) <= 2048),
  created_by    UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_designs_work_item_id
  ON public.ph_designs (work_item_id, created_at DESC);

ALTER TABLE public.ph_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ph_designs_select ON public.ph_designs;
CREATE POLICY ph_designs_select ON public.ph_designs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS ph_designs_insert ON public.ph_designs;
CREATE POLICY ph_designs_insert ON public.ph_designs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS ph_designs_delete ON public.ph_designs;
CREATE POLICY ph_designs_delete ON public.ph_designs
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS ph_designs_update ON public.ph_designs;
CREATE POLICY ph_designs_update ON public.ph_designs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

COMMENT ON TABLE public.ph_designs IS
  'Figma URL attachments rendered by the Designs section in every CatalystView* detail view.';
