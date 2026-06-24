-- ph_release_approvers — approvers attached to a release on /release-hub/releases-management/:releaseId.
--
-- Each row is one approver on one release with a pending/approved/rejected status
-- and an optional free-text description (set by the approver or the release owner).
--
-- RLS:
--   SELECT: any authenticated user (release context, non-PII workflow metadata)
--   INSERT: any authenticated user (release owners add approvers)
--   UPDATE: any authenticated user (approvers update their own status/description)
--   DELETE: any authenticated user (release owners or the approver themselves remove)

CREATE TABLE IF NOT EXISTS public.ph_release_approvers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  uuid NOT NULL REFERENCES public.ph_releases(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected')),
  description text,
  added_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ph_release_approvers_release ON public.ph_release_approvers(release_id);
CREATE INDEX IF NOT EXISTS idx_ph_release_approvers_user    ON public.ph_release_approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_ph_release_approvers_status  ON public.ph_release_approvers(status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ph_release_approvers_updated_at ON public.ph_release_approvers;
CREATE TRIGGER trg_ph_release_approvers_updated_at
  BEFORE UPDATE ON public.ph_release_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.moddatetime(updated_at);

ALTER TABLE public.ph_release_approvers ENABLE ROW LEVEL SECURITY;

-- Grants — PostgREST needs explicit table-level grants on top of RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ph_release_approvers TO authenticated;

DO $$
BEGIN
  -- SELECT: any authenticated user can read release approvers
  DROP POLICY IF EXISTS ph_release_approvers_select ON public.ph_release_approvers;
  CREATE POLICY ph_release_approvers_select ON public.ph_release_approvers
    FOR SELECT TO authenticated
    USING (true);

  -- INSERT: any authenticated user can add an approver
  DROP POLICY IF EXISTS ph_release_approvers_insert ON public.ph_release_approvers;
  CREATE POLICY ph_release_approvers_insert ON public.ph_release_approvers
    FOR INSERT TO authenticated
    WITH CHECK (true);

  -- UPDATE: any authenticated user can update status/description
  DROP POLICY IF EXISTS ph_release_approvers_update ON public.ph_release_approvers;
  CREATE POLICY ph_release_approvers_update ON public.ph_release_approvers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

  -- DELETE: any authenticated user can remove an approver
  DROP POLICY IF EXISTS ph_release_approvers_delete ON public.ph_release_approvers;
  CREATE POLICY ph_release_approvers_delete ON public.ph_release_approvers
    FOR DELETE TO authenticated
    USING (true);
END $$;

-- Force PostgREST to reload its schema cache so the new table is exposed
-- immediately without waiting for the periodic refresh.
NOTIFY pgrst, 'reload schema';
