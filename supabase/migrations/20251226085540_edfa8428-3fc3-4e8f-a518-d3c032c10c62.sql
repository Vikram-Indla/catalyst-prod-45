-- Create seed purge audit log table
CREATE TABLE IF NOT EXISTS public.seed_purge_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_dry_run BOOLEAN NOT NULL DEFAULT true,
  environment TEXT,
  purge_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_text TEXT,
  execution_time_ms INTEGER,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'blocked'))
);

-- Enable RLS
ALTER TABLE public.seed_purge_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view/manage purge logs
CREATE POLICY "Super admins can view purge logs"
  ON public.seed_purge_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can create purge logs"
  ON public.seed_purge_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update purge logs"
  ON public.seed_purge_audit_log
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_seed_purge_audit_log_executed_at ON public.seed_purge_audit_log(executed_at DESC);