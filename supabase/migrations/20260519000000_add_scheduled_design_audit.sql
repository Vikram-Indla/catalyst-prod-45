-- Scheduled Design Audit Cron Job
-- Runs nightly at 2:00 AM UTC to automatically audit all design system modules

-- First, enable the pg_cron extension if not already enabled
-- Note: This is typically already enabled in Supabase projects

-- Create a function that triggers the design audit via HTTP call to the edge function
CREATE OR REPLACE FUNCTION trigger_scheduled_audit()
RETURNS void AS $$
DECLARE
  modules TEXT[] := ARRAY[
    'project-hub',
    'product-hub',
    'incidents',
    'releases',
    'reports',
    'admin',
    'resources'
  ];
  module TEXT;
  audit_id TEXT;
  audit_result JSONB;
BEGIN
  FOREACH module IN ARRAY modules LOOP
    -- Generate unique audit ID
    audit_id := module || '-scheduled-' || to_char(NOW(), 'YYYY-MM-DD-HH24-MI-SS');

    -- Insert audit trail entry for scheduled run
    INSERT INTO module_audit_trails (
      id,
      action,
      surface_id,
      change_summary,
      created_at
    ) VALUES (
      audit_id,
      'audit_scheduled',
      module,
      'Scheduled nightly audit for ' || module,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Scheduled design audit triggered at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every night at 2:00 AM UTC
-- The cron job format is: minute hour day-of-month month day-of-week
-- '0 2 * * *' means 00:02 every day
SELECT cron.schedule(
  'scheduled-design-audit',
  '0 2 * * *',
  'SELECT trigger_scheduled_audit()'
);

-- Note: The actual violation detection happens via the edge function
-- This cron job creates audit trail entries and can be extended to:
-- 1. Call the edge function to detect violations
-- 2. Store results in design_violations table
-- 3. Update compliance scores

-- Optional: Create a table to store scheduled audit configuration
CREATE TABLE IF NOT EXISTS scheduled_audit_config (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  cron_expression TEXT DEFAULT '0 2 * * *',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default scheduled audit configuration
INSERT INTO scheduled_audit_config (id, enabled, cron_expression)
VALUES ('nightly-audit', true, '0 2 * * *')
ON CONFLICT (id) DO NOTHING;
