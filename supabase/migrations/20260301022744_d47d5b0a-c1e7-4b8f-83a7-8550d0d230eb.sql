
-- Create a table to store sync schedule configurations
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_key TEXT UNIQUE NOT NULL,
  schedule_label TEXT NOT NULL,
  cron_expression TEXT NOT NULL DEFAULT '0 23 * * *',
  timezone_label TEXT NOT NULL DEFAULT 'UTC+3 (Saudi)',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  target_function TEXT NOT NULL,
  target_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sync_schedules"
  ON public.sync_schedules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can update sync_schedules"
  ON public.sync_schedules FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sync_schedules"
  ON public.sync_schedules FOR INSERT
  TO authenticated WITH CHECK (true);

-- Insert default schedules
INSERT INTO public.sync_schedules (schedule_key, schedule_label, cron_expression, target_function, target_body, is_enabled) VALUES
  ('kb-daily-sync', 'KB Daily Sync', '0 23 * * *', 'kb-sync', '{"action":"sync_all"}'::jsonb, false),
  ('kb-weekly-cleanup', 'KB Weekly Cleanup', '0 21 * * 6', 'kb-cleanup', '{"action":"purge_expired"}'::jsonb, false),
  ('jira-daily-sync', 'Jira Daily Sync', '0 23 * * *', 'wh-jira-sync', '{"sync_type":"full"}'::jsonb, false)
ON CONFLICT (schedule_key) DO NOTHING;
