CREATE TABLE IF NOT EXISTS public.user_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  invited_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  role          app_role NOT NULL DEFAULT 'user',
  module_access JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  resent_at     TIMESTAMPTZ,
  resend_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email  ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token  ON public.user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_invitations_select_admin" ON public.user_invitations;
CREATE POLICY "user_invitations_select_admin" ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "user_invitations_insert_admin" ON public.user_invitations;
CREATE POLICY "user_invitations_insert_admin" ON public.user_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "user_invitations_update_admin" ON public.user_invitations;
CREATE POLICY "user_invitations_update_admin" ON public.user_invitations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::app_role
    )
  );

GRANT ALL    ON public.user_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;