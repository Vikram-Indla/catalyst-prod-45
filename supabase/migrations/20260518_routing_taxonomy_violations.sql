-- Routing taxonomy violations table
-- Stores results from the automated routing scanner cron job
CREATE TABLE IF NOT EXISTS routing_taxonomy_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL,
  rule_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error', 'warning')),
  file text NOT NULL,
  line integer NOT NULL DEFAULT 0,
  path text,
  text text,
  fix text,
  description text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin page queries
CREATE INDEX idx_rtv_severity ON routing_taxonomy_violations (severity, resolved);
CREATE INDEX idx_rtv_scanned_at ON routing_taxonomy_violations (scanned_at DESC);

-- RLS: admin-only read/write
ALTER TABLE routing_taxonomy_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read routing violations"
  ON routing_taxonomy_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'program_manager')
    )
  );

CREATE POLICY "Service role can insert routing violations"
  ON routing_taxonomy_violations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update routing violations"
  ON routing_taxonomy_violations FOR UPDATE
  USING (true);

-- Schedule daily cron job (6 AM UTC) to trigger the routing-taxonomy-scan edge function
-- Uses the same LIFECYCLE_CRON_SECRET pattern as lifecycle-check
SELECT cron.schedule(
  'routing-taxonomy-scan',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/routing-taxonomy-scan',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.lifecycle_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"dry_run": false}'::jsonb
  );
  $$
);
