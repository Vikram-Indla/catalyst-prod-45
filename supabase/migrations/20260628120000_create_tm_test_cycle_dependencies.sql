-- Test Cycle Dependencies — Catalyst Test Hub
-- Stores explicit dependency relationships between test cycles (cycle → cycle).
-- 2026-06-28
--
-- Mirrors ph_issue_dependencies (Vikram "project jaisa") with two deliberate
-- differences for the Test Hub:
-- 1. Test Hub is GLOBAL (aggregates cycles across all projects), and
--    tm_test_cycles.cycle_key (CY-001) is unique only WITHIN a project. So we
--    reference cycles by their UUID id (globally unique), NOT by cycle_key.
-- 2. project_key TEXT is retained (nullable, no FK) only for the diagram's
--    "Space" filter — it is the source cycle's project key, informational.
--
-- RLS verbatim from ph_issue_dependencies (2026-06-24 Vikram decision):
-- permissive SELECT for authenticated, INSERT own rows, UPDATE/DELETE by
-- creator or admin. Membership gating omitted (would dead-on-arrival the
-- feature — CLAUDE.md silent-empty-state lessons). Soft delete via deleted_at.

CREATE TABLE IF NOT EXISTS public.tm_test_cycle_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key TEXT,
  source_cycle_id UUID NOT NULL REFERENCES public.tm_test_cycles(id) ON DELETE CASCADE,
  target_cycle_id UUID NOT NULL REFERENCES public.tm_test_cycles(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocks', 'is_blocked_by')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT tcd_source_not_target CHECK (source_cycle_id != target_cycle_id)
);

-- Partial unique index — prevents duplicate live dependencies while allowing the
-- same triple to be re-created after a soft delete.
CREATE UNIQUE INDEX tm_test_cycle_deps_unique_live
  ON public.tm_test_cycle_dependencies (source_cycle_id, target_cycle_id, dependency_type)
  WHERE deleted_at IS NULL;

-- Query-path indexes
CREATE INDEX idx_tm_test_cycle_deps_project ON public.tm_test_cycle_dependencies(project_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_tm_test_cycle_deps_source ON public.tm_test_cycle_dependencies(source_cycle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tm_test_cycle_deps_target ON public.tm_test_cycle_dependencies(target_cycle_id) WHERE deleted_at IS NULL;

ALTER TABLE public.tm_test_cycle_dependencies ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (non-PII cycle metadata; UI scopes by project_key)
CREATE POLICY "authenticated_select_tm_cycle_dependencies"
  ON public.tm_test_cycle_dependencies FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: any authenticated user, may only insert rows they authored
CREATE POLICY "authenticated_insert_own_tm_cycle_dependencies"
  ON public.tm_test_cycle_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: creator or admin
CREATE POLICY "creator_or_admin_update_tm_cycle_dependencies"
  ON public.tm_test_cycle_dependencies FOR UPDATE
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
CREATE POLICY "creator_or_admin_delete_tm_cycle_dependencies"
  ON public.tm_test_cycle_dependencies FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tm_test_cycle_dependencies TO authenticated;

COMMENT ON TABLE public.tm_test_cycle_dependencies IS 'Test cycle dependency graph (blocks / is_blocked_by). Cycles referenced by UUID (global Test Hub). Created 2026-06-28.';
