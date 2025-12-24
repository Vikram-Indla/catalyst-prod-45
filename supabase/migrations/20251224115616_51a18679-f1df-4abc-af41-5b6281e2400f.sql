-- JOB-007: Feature Flag Infrastructure for Home Migration

-- Add home_v2_enabled feature flag
INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES ('home_v2_enabled', false, 'Enables the new Home V2 architecture with full dynamic data and domain isolation')
ON CONFLICT (flag_key) DO NOTHING;

-- Add home_v2_shadow_mode for shadow validation
INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES ('home_v2_shadow_mode', false, 'Enables shadow queries to compare V1 vs V2 data without rendering V2')
ON CONFLICT (flag_key) DO NOTHING;

-- Create table for migration metrics
CREATE TABLE IF NOT EXISTS public.home_migration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL CHECK (version IN ('v1', 'v2')),
  page_load_ms INTEGER,
  query_count INTEGER,
  error_count INTEGER,
  data_mismatches JSONB DEFAULT '[]'::JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.home_migration_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
  ON public.home_migration_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all metrics
CREATE POLICY "Admins can read all metrics"
  ON public.home_migration_metrics
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_home_migration_metrics_version_recorded
  ON public.home_migration_metrics (version, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_home_migration_metrics_user
  ON public.home_migration_metrics (user_id, recorded_at DESC);