-- 2026-06-26: Sprint create modal (and any project picker) needs every
-- authenticated user to see every ph_projects row. Prior SELECT policy
-- gated on is_ph_project_member(auth.uid(), id) — projects with zero
-- members were invisible. ph_projects rows carry no PII (just key + name +
-- metadata) so SELECT can be broad. Write policies (INSERT/UPDATE/DELETE)
-- stay restricted to admins.

DROP POLICY IF EXISTS "Users view their projects" ON public.ph_projects;

CREATE POLICY "Authenticated view all projects"
  ON public.ph_projects FOR SELECT
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
