-- Filter version history (O9): tracks last N JQL edits per filter
CREATE TABLE IF NOT EXISTS public.ph_filter_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id   UUID        NOT NULL REFERENCES public.ph_saved_filters(id) ON DELETE CASCADE,
  jql_query   TEXT        NOT NULL,
  result_count INTEGER,
  changed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_filter_versions_filter_date
  ON public.ph_filter_versions (filter_id, changed_at DESC);

-- RLS: same visibility rules as ph_saved_filters
ALTER TABLE public.ph_filter_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_filter_versions_select" ON public.ph_filter_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ph_saved_filters f
      WHERE f.id = filter_id
        AND (f.user_id = auth.uid() OR f.is_shared = true OR f.owner_id = auth.uid())
    )
  );

CREATE POLICY "ph_filter_versions_insert" ON public.ph_filter_versions
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Only the filter owner may restore/delete history entries
CREATE POLICY "ph_filter_versions_delete" ON public.ph_filter_versions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ph_saved_filters f
      WHERE f.id = filter_id
        AND (f.user_id = auth.uid() OR f.owner_id = auth.uid())
    )
  );
