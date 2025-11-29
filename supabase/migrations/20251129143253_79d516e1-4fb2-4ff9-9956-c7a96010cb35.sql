-- ============================================
-- TEAMS MODULE ENHANCEMENT
-- Add Jira Align-inspired fields to existing teams table
-- ============================================

-- Drop and recreate enum types for teams
DROP TYPE IF EXISTS team_type CASCADE;
CREATE TYPE team_type AS ENUM (
  'AGILE',
  'KANBAN', 
  'COP',
  'PROGRAM',
  'PORTFOLIO',
  'SOLUTION',
  'PROCESS_FLOW'
);

DROP TYPE IF EXISTS track_by_type CASCADE;
CREATE TYPE track_by_type AS ENUM ('POINTS', 'HOURS');

-- Add new columns to existing teams table
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS team_type team_type DEFAULT 'AGILE',
  ADD COLUMN IF NOT EXISTS sprint_prefix TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS parent_portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_solution_id UUID,
  ADD COLUMN IF NOT EXISTS region_id UUID,
  ADD COLUMN IF NOT EXISTS track_by track_by_type DEFAULT 'POINTS',
  ADD COLUMN IF NOT EXISTS burn_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS allow_task_deletion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS kanban_throughput NUMERIC,
  ADD COLUMN IF NOT EXISTS kanban_auto_populate_estimate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kanban_wip_limit INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Make program_id nullable for team types that don't require it
ALTER TABLE public.teams ALTER COLUMN program_id DROP NOT NULL;

-- Add constraint for short_name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_short_name_length'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT chk_short_name_length CHECK (short_name IS NULL OR LENGTH(short_name) <= 5);
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_teams_team_type ON public.teams(team_type);
CREATE INDEX IF NOT EXISTS idx_teams_region_id ON public.teams(region_id);
CREATE INDEX IF NOT EXISTS idx_teams_parent_portfolio_id ON public.teams(parent_portfolio_id);

-- Team subscriptions table
CREATE TABLE IF NOT EXISTS public.team_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_team_subscription UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_subscriptions_team_id ON public.team_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_user_id ON public.team_subscriptions(user_id);

-- Team metrics table for analytics
CREATE TABLE IF NOT EXISTS public.team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  iteration_id UUID,
  metric_date DATE NOT NULL,
  
  -- Sprint metrics
  planned_velocity NUMERIC,
  actual_velocity NUMERIC,
  story_points_committed NUMERIC,
  story_points_completed NUMERIC,
  
  -- Kanban metrics
  throughput NUMERIC,
  cycle_time_avg NUMERIC,
  wip_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_metrics_team_id ON public.team_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_team_metrics_date ON public.team_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_team_metrics_iteration ON public.team_metrics(iteration_id);

-- Add team_id, short_name, goal, sync_date to iterations if they don't exist
ALTER TABLE public.iterations
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS sync_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_iterations_team_id ON public.iterations(team_id);

-- Enable RLS on new tables
ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_subscriptions
CREATE POLICY "Users can manage their own team subscriptions" ON public.team_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for team_metrics  
CREATE POLICY "Admins can manage all team metrics" ON public.team_metrics
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Team members can view their team metrics" ON public.team_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_metrics.team_id
      AND user_id = auth.uid()
    )
  );

-- Update trigger for team_metrics
CREATE OR REPLACE FUNCTION update_team_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_metrics_updated_at_trigger
  BEFORE UPDATE ON public.team_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_team_metrics_timestamp();

-- Update seed data for existing teams
UPDATE public.teams 
SET 
  short_name = COALESCE(short_name, LEFT(UPPER(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g')), 5)),
  team_type = COALESCE(team_type, 'AGILE'),
  track_by = COALESCE(track_by, 'POINTS'),
  is_active = COALESCE(is_active, TRUE)
WHERE short_name IS NULL OR team_type IS NULL;