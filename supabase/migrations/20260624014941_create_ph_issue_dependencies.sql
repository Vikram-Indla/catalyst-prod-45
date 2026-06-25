-- Recovered from staging migration history (applied 2026-06-24 01:49:41)
-- Migration: create_ph_issue_dependencies
-- This migration creates the ph_issue_dependencies table for tracking issue dependencies (blocks/is_blocked_by)

CREATE TABLE IF NOT EXISTS public.ph_issue_dependencies (
  id BIGSERIAL PRIMARY KEY,
  project_key TEXT NOT NULL,
  source_issue_key TEXT NOT NULL REFERENCES public.ph_issues(issue_key) ON DELETE CASCADE,
  target_issue_key TEXT NOT NULL REFERENCES public.ph_issues(issue_key) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocks', 'is_blocked_by')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT source_not_target CHECK (source_issue_key != target_issue_key)
);

CREATE UNIQUE INDEX ph_issue_deps_unique_live
  ON public.ph_issue_dependencies (source_issue_key, target_issue_key, dependency_type)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ph_issue_deps_project ON public.ph_issue_dependencies(project_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_ph_issue_deps_source ON public.ph_issue_dependencies(source_issue_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_ph_issue_deps_target ON public.ph_issue_dependencies(target_issue_key) WHERE deleted_at IS NULL;

ALTER TABLE public.ph_issue_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_dependencies"
  ON public.ph_issue_dependencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_own_dependencies"
  ON public.ph_issue_dependencies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "creator_or_admin_update_dependencies"
  ON public.ph_issue_dependencies FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "creator_or_admin_delete_dependencies"
  ON public.ph_issue_dependencies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ph_issue_dependencies TO authenticated;

COMMENT ON TABLE public.ph_issue_dependencies IS 'Issue dependency graph (blocks / is_blocked_by) per project. Created 2026-06-24.';

CREATE OR REPLACE VIEW public.vw_ph_issue_dependencies_bidirectional AS
SELECT id, project_key, source_issue_key, target_issue_key, dependency_type, created_by, created_at, updated_at, deleted_at
FROM public.ph_issue_dependencies WHERE deleted_at IS NULL
UNION ALL
SELECT id, project_key, target_issue_key AS source_issue_key, source_issue_key AS target_issue_key,
       CASE dependency_type WHEN 'blocks' THEN 'is_blocked_by' WHEN 'is_blocked_by' THEN 'blocks' ELSE dependency_type END AS dependency_type,
       created_by, created_at, updated_at, deleted_at
FROM public.ph_issue_dependencies WHERE deleted_at IS NULL;

GRANT SELECT ON public.vw_ph_issue_dependencies_bidirectional TO authenticated;
