-- Phase B (cleanup-sweep, audit #68 #69).
-- Closes two RLS gaps without touching data or schema:
--   (a) public.defects had rls_enabled = false. Table is 0 rows and
--       remains FK-referenced (test_defect_links). Enable RLS + admin
--       policies so it can't be silently read by anonymous keys.
--   (b) public.tm_set_cases has rls_enabled = true but 0 policies →
--       fully denied to everyone, including service operations. Add
--       canonical admin policies via the user_roles lookup (the only
--       supported pattern per CLAUDE.md 2026-05-19).

ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY defects_select_admin ON public.defects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY defects_insert_admin ON public.defects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY defects_update_admin ON public.defects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY defects_delete_admin ON public.defects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY tm_set_cases_select_admin ON public.tm_set_cases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY tm_set_cases_insert_admin ON public.tm_set_cases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY tm_set_cases_update_admin ON public.tm_set_cases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY tm_set_cases_delete_admin ON public.tm_set_cases
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );
