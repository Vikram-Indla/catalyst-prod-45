-- Release-level sign-offs.
--
-- rh_change_signoffs is change-scoped (no release_id), so the Backlog "Sign-off"
-- column and the Release detail Sign-offs tab had no honest backing. This adds a
-- sibling table for release approvals that MIRRORS rh_change_signoffs exactly
-- (same columns, same RLS via rh_is_manager / rh_is_approver) — chosen over
-- generalising into a polymorphic signoffs table so the proven change-signoff
-- path (ApprovalWindow, useApproveSignoff) needs zero changes.

CREATE TABLE IF NOT EXISTS public.rh_release_signoffs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id      uuid NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  stage           text NOT NULL,
  signoff_role    text NOT NULL,                       -- qa | uat | product_owner | project_manager | release_manager
  assigned_to     uuid REFERENCES public.profiles(id),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','auto_approved','bypassed')),
  actioned_at     timestamptz,
  actioned_by     uuid REFERENCES public.profiles(id),
  wait_started_at timestamptz DEFAULT now(),
  comment         text,
  requested_by    uuid REFERENCES public.profiles(id), -- spec data-contract fields (nullable, optional)
  due_date        timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_release_signoffs_release ON public.rh_release_signoffs(release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_signoffs_status  ON public.rh_release_signoffs(status);

ALTER TABLE public.rh_release_signoffs ENABLE ROW LEVEL SECURITY;

-- Policies mirror rh_change_signoffs 1:1.
DROP POLICY IF EXISTS "rh_release_signoffs_select" ON public.rh_release_signoffs;
CREATE POLICY "rh_release_signoffs_select" ON public.rh_release_signoffs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rh_release_signoffs_insert" ON public.rh_release_signoffs;
CREATE POLICY "rh_release_signoffs_insert" ON public.rh_release_signoffs
  FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));

DROP POLICY IF EXISTS "rh_release_signoffs_update" ON public.rh_release_signoffs;
CREATE POLICY "rh_release_signoffs_update" ON public.rh_release_signoffs
  FOR UPDATE TO authenticated
  USING (public.rh_is_approver(auth.uid()) OR assigned_to = auth.uid())
  WITH CHECK (public.rh_is_approver(auth.uid()) OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "rh_release_signoffs_delete" ON public.rh_release_signoffs;
CREATE POLICY "rh_release_signoffs_delete" ON public.rh_release_signoffs
  FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));
