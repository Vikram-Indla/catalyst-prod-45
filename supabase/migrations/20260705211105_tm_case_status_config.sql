-- CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001 · S6b
-- Additive per-project status workflow config. Layers presentational label,
-- ADS lozenge category, order, and allowed transitions on top of the FIXED
-- tm_case_status enum values (draft/ready/approved/deprecated). The enum is
-- NOT changed — this table is a governance/presentation layer, so existing
-- status writes across the app are untouched (zero regression). When a project
-- has no rows, callers fall back to the hardcoded defaults.

CREATE TABLE IF NOT EXISTS public.tm_case_status_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL,
  status_key    text NOT NULL,                       -- draft | ready | approved | deprecated
  display_label text NOT NULL,
  category      text NOT NULL DEFAULT 'default',      -- default | inprogress | success | removed (ADS lozenge appearance)
  sort_order    integer NOT NULL DEFAULT 0,
  allowed_next  text[] NOT NULL DEFAULT '{}',         -- status_keys reachable from this one
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tm_case_status_config_project_status_key UNIQUE (project_id, status_key),
  CONSTRAINT tm_case_status_config_category_chk CHECK (category IN ('default','inprogress','success','removed'))
);

CREATE INDEX IF NOT EXISTS idx_tm_case_status_config_project ON public.tm_case_status_config (project_id);

ALTER TABLE public.tm_case_status_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_case_status_config_select ON public.tm_case_status_config;
CREATE POLICY tm_case_status_config_select ON public.tm_case_status_config
  FOR SELECT USING ((project_id IS NULL) OR tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_case_status_config_insert ON public.tm_case_status_config;
CREATE POLICY tm_case_status_config_insert ON public.tm_case_status_config
  FOR INSERT WITH CHECK ((project_id IS NULL) OR tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_case_status_config_update ON public.tm_case_status_config;
CREATE POLICY tm_case_status_config_update ON public.tm_case_status_config
  FOR UPDATE USING ((project_id IS NULL) OR tm_user_has_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tm_case_status_config_delete ON public.tm_case_status_config;
CREATE POLICY tm_case_status_config_delete ON public.tm_case_status_config
  FOR DELETE USING ((project_id IS NULL) OR tm_user_has_access(auth.uid(), project_id));

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tm_case_status_config_touch() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_tm_case_status_config_touch ON public.tm_case_status_config;
CREATE TRIGGER trg_tm_case_status_config_touch
  BEFORE UPDATE ON public.tm_case_status_config
  FOR EACH ROW EXECUTE FUNCTION public.tm_case_status_config_touch();
