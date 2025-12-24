-- =============================================================
-- JOB-010: Home Analytics & Telemetry Tables
-- Purpose: Track user behavior, adoption, and value metrics
-- =============================================================

-- Main analytics events table - high-write, low-read (aggregated)
CREATE TABLE IF NOT EXISTS public.home_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  home_mode TEXT NOT NULL CHECK (home_mode IN ('operations', 'delivery', 'planner')),
  event_properties JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.home_analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert their own analytics events"
  ON public.home_analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all events (for dashboards)
CREATE POLICY "Admins can read all analytics events"
  ON public.home_analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =============================================================
-- INDEXES for analytics queries
-- =============================================================

-- Time-based queries (dashboards)
CREATE INDEX idx_home_analytics_created_at 
  ON public.home_analytics_events (created_at DESC);

-- Mode distribution queries
CREATE INDEX idx_home_analytics_mode_event 
  ON public.home_analytics_events (home_mode, event_name, created_at DESC);

-- User adoption queries
CREATE INDEX idx_home_analytics_user_created 
  ON public.home_analytics_events (user_id, created_at DESC);

-- Event type analysis
CREATE INDEX idx_home_analytics_event_name 
  ON public.home_analytics_events (event_name, created_at DESC);

-- =============================================================
-- Aggregation table for daily metrics (computed by scheduled job)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.home_analytics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  home_mode TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, home_mode, metric_name)
);

-- Enable RLS
ALTER TABLE public.home_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read aggregated metrics
CREATE POLICY "Admins can read daily analytics"
  ON public.home_analytics_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Index for dashboard queries
CREATE INDEX idx_home_analytics_daily_lookup
  ON public.home_analytics_daily (date DESC, home_mode, metric_name);

-- =============================================================
-- Alert thresholds configuration
-- =============================================================

CREATE TABLE IF NOT EXISTS public.home_analytics_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_name TEXT NOT NULL UNIQUE,
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT NOT NULL CHECK (threshold_operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  notify_roles TEXT[] NOT NULL DEFAULT ARRAY['admin'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_analytics_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage alerts
CREATE POLICY "Admins can manage analytics alerts"
  ON public.home_analytics_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =============================================================
-- Insert default alert thresholds
-- =============================================================

INSERT INTO public.home_analytics_alerts (alert_name, metric_name, threshold_value, threshold_operator, severity, notify_roles) VALUES
  ('High Load Time P95', 'home_load_time_p95', 2500, 'gt', 'warning', ARRAY['admin', 'program_manager']),
  ('Critical Load Time P95', 'home_load_time_p95', 5000, 'gt', 'critical', ARRAY['admin', 'program_manager']),
  ('High Error Rate', 'error_rate_percent', 2, 'gt', 'warning', ARRAY['admin', 'program_manager']),
  ('Critical Error Rate', 'error_rate_percent', 5, 'gt', 'critical', ARRAY['admin', 'program_manager']),
  ('Low Operations Adoption', 'ops_mode_daily_users', 10, 'lt', 'info', ARRAY['admin']),
  ('Planner Abandonment', 'planner_empty_state_rate', 50, 'gt', 'warning', ARRAY['admin'])
ON CONFLICT (alert_name) DO NOTHING;

-- =============================================================
-- Function to aggregate daily metrics
-- =============================================================

CREATE OR REPLACE FUNCTION public.compute_home_analytics_daily(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mode_rec RECORD;
BEGIN
  -- For each mode, compute key metrics
  FOR mode_rec IN SELECT DISTINCT home_mode FROM public.home_analytics_events 
    WHERE created_at::date = target_date
  LOOP
    -- Total events
    INSERT INTO public.home_analytics_daily (date, home_mode, metric_name, metric_value)
    SELECT 
      target_date,
      mode_rec.home_mode,
      'total_events',
      COUNT(*)
    FROM public.home_analytics_events
    WHERE home_mode = mode_rec.home_mode
      AND created_at::date = target_date
    ON CONFLICT (date, home_mode, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = now();
    
    -- Unique users
    INSERT INTO public.home_analytics_daily (date, home_mode, metric_name, metric_value)
    SELECT 
      target_date,
      mode_rec.home_mode,
      'unique_users',
      COUNT(DISTINCT user_id)
    FROM public.home_analytics_events
    WHERE home_mode = mode_rec.home_mode
      AND created_at::date = target_date
    ON CONFLICT (date, home_mode, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = now();
    
    -- Home views
    INSERT INTO public.home_analytics_daily (date, home_mode, metric_name, metric_value)
    SELECT 
      target_date,
      mode_rec.home_mode,
      'home_views',
      COUNT(*)
    FROM public.home_analytics_events
    WHERE home_mode = mode_rec.home_mode
      AND event_name = 'home_viewed'
      AND created_at::date = target_date
    ON CONFLICT (date, home_mode, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = now();
    
    -- Items opened
    INSERT INTO public.home_analytics_daily (date, home_mode, metric_name, metric_value)
    SELECT 
      target_date,
      mode_rec.home_mode,
      'items_opened',
      COUNT(*)
    FROM public.home_analytics_events
    WHERE home_mode = mode_rec.home_mode
      AND event_name LIKE '%_item_opened'
      AND created_at::date = target_date
    ON CONFLICT (date, home_mode, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = now();
    
    -- Errors
    INSERT INTO public.home_analytics_daily (date, home_mode, metric_name, metric_value)
    SELECT 
      target_date,
      mode_rec.home_mode,
      'error_count',
      COUNT(*)
    FROM public.home_analytics_events
    WHERE home_mode = mode_rec.home_mode
      AND event_name LIKE 'home_%_error'
      AND created_at::date = target_date
    ON CONFLICT (date, home_mode, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value, computed_at = now();
  END LOOP;
END;
$$;