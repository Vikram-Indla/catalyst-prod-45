-- Scoped workflow enforcement config (advisory|blocking) per project+entity+version.
-- Additive. Absence of a blocking row = advisory (safe default). Production untouched.
CREATE TABLE IF NOT EXISTS public.ph_wf_enforcement_config (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  entity_key         text NOT NULL,
  workflow_version_id uuid REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,
  mode               text NOT NULL DEFAULT 'advisory',
  enabled_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  enabled_at         timestamptz NOT NULL DEFAULT now(),
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_enforcement_mode_chk CHECK (mode IN ('advisory','blocking')),
  CONSTRAINT ph_wf_enforcement_uq UNIQUE (project_id, entity_key)
);
COMMENT ON TABLE public.ph_wf_enforcement_config IS 'P-blocking. Scoped enforcement: one row per (project,entity) sets blocking. No row = advisory. Rollback = set mode=advisory or delete row.';
ALTER TABLE public.ph_wf_enforcement_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ph_wf_enforcement_select_auth ON public.ph_wf_enforcement_config;
CREATE POLICY ph_wf_enforcement_select_auth ON public.ph_wf_enforcement_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ph_wf_enforcement_write_admin ON public.ph_wf_enforcement_config;
CREATE POLICY ph_wf_enforcement_write_admin ON public.ph_wf_enforcement_config FOR ALL TO authenticated USING (public.ph_wf_is_admin()) WITH CHECK (public.ph_wf_is_admin());
DROP TRIGGER IF EXISTS ph_wf_enforcement_touch ON public.ph_wf_enforcement_config;
CREATE TRIGGER ph_wf_enforcement_touch BEFORE UPDATE ON public.ph_wf_enforcement_config FOR EACH ROW EXECUTE FUNCTION public.ph_wf_touch_updated_at();

-- Seed: enable BLOCKING for Story on BAU at v1.
INSERT INTO public.ph_wf_enforcement_config (project_id, entity_key, workflow_version_id, mode, reason)
SELECT p.id, 'story', v.id, 'blocking', 'Story blocking pilot — BAU only'
FROM public.ph_projects p
CROSS JOIN LATERAL (SELECT id FROM public.ph_wf_versions WHERE entity_key='story' AND lifecycle='published' ORDER BY version_no DESC LIMIT 1) v
WHERE p.key='BAU'
ON CONFLICT (project_id, entity_key) DO UPDATE SET mode='blocking', workflow_version_id=EXCLUDED.workflow_version_id, updated_at=now();
