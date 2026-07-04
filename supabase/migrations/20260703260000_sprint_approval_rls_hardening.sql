-- CAT-SPRINTS-NATIVE-20260702-002 — D-015 RLS hardening.
--
-- Verification-gate finding: approve/reject "first-person only" and the
-- block on manually setting awaiting_approval/completed were enforced only
-- in client code (ReleaseSidePanel.tsx), not at the DB layer — a determined
-- authenticated user could bypass both via a direct client call. This
-- migration closes both gaps at the RLS layer, plus extends the same
-- approvers tightening to ph_release_approvers for parity (same shared
-- ApproversCard component, identical pre-existing gap) per explicit
-- go-ahead — see 09_DECISIONS.md D-016.
--
-- ph_jira_sprints.status: fn_sprint_check_dod / fn_sprint_check_approval
-- (both SECURITY DEFINER, owned by the migration-applying role) continue to
-- write awaiting_approval/completed unimpeded — table owners bypass RLS by
-- default in Postgres unless FORCE ROW LEVEL SECURITY is set, which it is
-- not here. Only the `authenticated`-role write path (PostgREST clients) is
-- restricted by this policy change.

BEGIN;

-- ── ph_sprint_approvers: UPDATE self-only, DELETE self-or-adder ──────────
DROP POLICY IF EXISTS ph_sprint_approvers_update ON public.ph_sprint_approvers;
CREATE POLICY ph_sprint_approvers_update ON public.ph_sprint_approvers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ph_sprint_approvers_delete ON public.ph_sprint_approvers;
CREATE POLICY ph_sprint_approvers_delete ON public.ph_sprint_approvers
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = added_by);

-- ── ph_release_approvers: identical tightening, parity fix ───────────────
DROP POLICY IF EXISTS ph_release_approvers_update ON public.ph_release_approvers;
CREATE POLICY ph_release_approvers_update ON public.ph_release_approvers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ph_release_approvers_delete ON public.ph_release_approvers;
CREATE POLICY ph_release_approvers_delete ON public.ph_release_approvers
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = added_by);

-- ── ph_jira_sprints: client can never set the two trigger-only states ────
DROP POLICY IF EXISTS sprints_write_all ON public.ph_jira_sprints;
CREATE POLICY sprints_write_all
  ON public.ph_jira_sprints FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (status <> ALL (ARRAY['awaiting_approval'::text, 'completed'::text]));

-- INSERT and DELETE were previously covered by the combined `sprints_write_all`
-- policy (no USING/command scoping = applies to ALL commands). Splitting
-- UPDATE out above means both need their own explicit policy to preserve
-- existing behavior exactly — this migration only tightens the two states
-- discussed (D-015), not sprint creation or deletion. INSERT: status
-- defaults to 'planning' at insert time, never awaiting_approval/completed,
-- so no CHECK restriction needed. DELETE: useDeleteSprint (useEntities.ts)
-- exists as a hard-delete path (currently unwired to any UI button, but
-- preserving its prior permissive behavior rather than silently narrowing
-- an unrelated permission).
DROP POLICY IF EXISTS sprints_insert_all ON public.ph_jira_sprints;
CREATE POLICY sprints_insert_all
  ON public.ph_jira_sprints FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS sprints_delete_all ON public.ph_jira_sprints;
CREATE POLICY sprints_delete_all
  ON public.ph_jira_sprints FOR DELETE TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
