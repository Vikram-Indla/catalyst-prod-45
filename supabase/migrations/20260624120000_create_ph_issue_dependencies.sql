-- Issue Dependencies — Catalyst Project Module
-- Stores explicit dependency relationships between issues within a project
-- 2026-06-24
--
-- Design decisions (verified against live DB before authoring):
-- 1. Scope: project_key TEXT (ph_projects.key is varchar; plain text column,
--    no FK — product codes / sentinel keys must not break inserts).
-- 2. Issue references: issue_key TEXT, FK to ph_issues(issue_key) which is
--    UNIQUE (verified). Enforces "both issues must exist" at the DB layer.
-- 3. Direction: store ONE row per relationship; reverse derived by the
--    vw_ph_issue_dependencies_bidirectional view.
-- 4. RLS (Vikram decision 2026-06-24): permissive SELECT for authenticated,
--    INSERT by any authenticated user (own rows), UPDATE/DELETE by creator or
--    admin. ph_project_members is unpopulated, so membership gating would make
--    the feature dead-on-arrival (CLAUDE.md silent-empty-state lessons). Access
--    boundary is the project UI + AdminGuard, matching design_violations.
-- 5. Soft delete via deleted_at.

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

-- Partial unique index (NOT an inline table constraint — Postgres does not
-- allow WHERE on UNIQUE constraints). Prevents duplicate live dependencies
-- while allowing the same triple to be re-created after a soft delete.
CREATE UNIQUE INDEX ph_issue_deps_unique_live
  ON public.ph_issue_dependencies (source_issue_key, target_issue_key, dependency_type)
  WHERE deleted_at IS NULL;

-- Query-path indexes
CREATE INDEX idx_ph_issue_deps_project ON public.ph_issue_dependencies(project_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_ph_issue_deps_source ON public.ph_issue_dependencies(source_issue_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_ph_issue_deps_target ON public.ph_issue_dependencies(target_issue_key) WHERE deleted_at IS NULL;

ALTER TABLE public.ph_issue_dependencies ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (non-PII project metadata; UI scopes by project_key)
CREATE POLICY "authenticated_select_dependencies"
  ON public.ph_issue_dependencies FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: any authenticated user, may only insert rows they authored
CREATE POLICY "authenticated_insert_own_dependencies"
  ON public.ph_issue_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: creator or admin
CREATE POLICY "creator_or_admin_update_dependencies"
  ON public.ph_issue_dependencies FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- DELETE: creator or admin (UI uses soft-delete UPDATE; hard DELETE allowed for admins)
CREATE POLICY "creator_or_admin_delete_dependencies"
  ON public.ph_issue_dependencies FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ph_issue_dependencies TO authenticated;

COMMENT ON TABLE public.ph_issue_dependencies IS 'Issue dependency graph (blocks / is_blocked_by) per project. Created 2026-06-24.';

-- Bidirectional view: "A blocks B" yields both the stored row and its inverse
-- "B is blocked by A" for diagram/query convenience.
CREATE OR REPLACE VIEW public.vw_ph_issue_dependencies_bidirectional AS
SELECT id, project_key, source_issue_key, target_issue_key, dependency_type,
       created_by, created_at, updated_at, deleted_at
FROM public.ph_issue_dependencies
WHERE deleted_at IS NULL
UNION ALL
SELECT id, project_key,
       target_issue_key AS source_issue_key,
       source_issue_key AS target_issue_key,
       CASE dependency_type
         WHEN 'blocks' THEN 'is_blocked_by'
         WHEN 'is_blocked_by' THEN 'blocks'
         ELSE dependency_type
       END AS dependency_type,
       created_by, created_at, updated_at, deleted_at
FROM public.ph_issue_dependencies
WHERE deleted_at IS NULL;

GRANT SELECT ON public.vw_ph_issue_dependencies_bidirectional TO authenticated;
