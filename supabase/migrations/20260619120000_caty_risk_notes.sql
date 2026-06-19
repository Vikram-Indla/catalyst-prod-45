-- CATY release-risk saved notes (overview-level, not tied to a single release).
-- Backs the "Save as note" action on the Release Operations overview CATY panel.
-- rh_release_notes is release-scoped (release_id NOT NULL) and cannot hold a
-- hub-level risk summary, so this is a dedicated table.

CREATE TABLE IF NOT EXISTS public.rh_caty_risk_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_md      text,
  risk_index      integer,
  posture         text,
  payload         jsonb,
  generated_by_ai boolean DEFAULT true,
  created_by      uuid DEFAULT auth.uid(),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_caty_risk_notes_created_by
  ON public.rh_caty_risk_notes (created_by);
CREATE INDEX IF NOT EXISTS idx_rh_caty_risk_notes_created_at
  ON public.rh_caty_risk_notes (created_at DESC);

ALTER TABLE public.rh_caty_risk_notes ENABLE ROW LEVEL SECURITY;

-- Non-PII governance metadata: any authenticated user can read saved notes.
CREATE POLICY rh_caty_risk_notes_sel ON public.rh_caty_risk_notes
  FOR SELECT TO authenticated USING (true);

-- Ownership writes: a user can only save/remove notes under their own id.
CREATE POLICY rh_caty_risk_notes_ins ON public.rh_caty_risk_notes
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY rh_caty_risk_notes_del ON public.rh_caty_risk_notes
  FOR DELETE TO authenticated USING (created_by = auth.uid());
