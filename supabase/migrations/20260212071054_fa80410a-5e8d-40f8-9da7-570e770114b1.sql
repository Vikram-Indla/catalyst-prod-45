
-- Create wh_config table for storing sync configuration key-value pairs
CREATE TABLE IF NOT EXISTS public.wh_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wh_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write config
CREATE POLICY "Authenticated users can read wh_config"
  ON public.wh_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert wh_config"
  ON public.wh_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update wh_config"
  ON public.wh_config FOR UPDATE
  TO authenticated
  USING (true);

-- Seed default config values
INSERT INTO public.wh_config (key, value) VALUES
  ('sync_interval_minutes', '60'),
  ('sync_full_time_utc', '"02:00"'),
  ('sync_max_months', '6'),
  ('sync_lookback_months', '3'),
  ('sync_projects', '[]'),
  ('sync_project_config', '{}')
ON CONFLICT (key) DO NOTHING;
