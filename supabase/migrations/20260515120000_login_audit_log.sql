CREATE TABLE IF NOT EXISTS public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_email ON public.login_audit_log (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_created ON public.login_audit_log (created_at DESC);

ALTER TABLE public.login_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can insert; no user-facing read policy intentionally
DROP POLICY IF EXISTS "Service role only" ON public.login_audit_log;
CREATE POLICY "Service role only" ON public.login_audit_log
  USING (false)
  WITH CHECK (false);
