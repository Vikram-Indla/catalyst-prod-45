-- Epic Backlog Data Model Enhancement

-- Add ranking and parking lot fields to epics table
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS epic_key TEXT;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS global_rank INTEGER DEFAULT 0;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS portfolio_rank INTEGER DEFAULT 0;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS program_rank INTEGER DEFAULT 0;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS mvp BOOLEAN DEFAULT false;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS process_step_id UUID;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS points_estimate NUMERIC;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS portfolio_id UUID;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS parked_at TIMESTAMP WITH TIME ZONE;

-- Update epic state enum to match Jira Align states
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epic_state') THEN
    CREATE TYPE epic_state AS ENUM ('not_started', 'in_progress', 'accepted');
  END IF;
END $$;

ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS state epic_state DEFAULT 'not_started';

-- Create epic_program_increments join table for multi-PI assignment
CREATE TABLE IF NOT EXISTS public.epic_program_increments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  pi_rank INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(epic_id, pi_id)
);

-- Create capabilities table (child of epics, parent of features)
CREATE TABLE IF NOT EXISTS public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  state epic_state DEFAULT 'not_started',
  rank_within_epic INTEGER DEFAULT 0,
  global_rank INTEGER DEFAULT 0,
  owner_id UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  parked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add rank_within_epic to features
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS rank_within_epic INTEGER DEFAULT 0;
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS capability_id UUID REFERENCES public.capabilities(id) ON DELETE SET NULL;

-- Create process_flows table
CREATE TABLE IF NOT EXISTS public.process_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create process_steps table
CREATE TABLE IF NOT EXISTS public.process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_flow_id UUID NOT NULL REFERENCES public.process_flows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  exit_criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key for process_step_id
ALTER TABLE public.epics ADD CONSTRAINT fk_epics_process_step 
  FOREIGN KEY (process_step_id) REFERENCES public.process_steps(id) ON DELETE SET NULL;

ALTER TABLE public.epics ADD CONSTRAINT fk_epics_portfolio 
  FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- Add LOE points to stories for PI Progress calculation
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS points_loe NUMERIC;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies for new tables
ALTER TABLE public.epic_program_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view epic PI assignments" ON public.epic_program_increments FOR SELECT USING (true);
CREATE POLICY "Allow program managers to manage epic PI assignments" ON public.epic_program_increments FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'program_manager'::app_role)
);

CREATE POLICY "Allow authenticated users to view capabilities" ON public.capabilities FOR SELECT USING (true);
CREATE POLICY "Allow program managers to manage capabilities" ON public.capabilities FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'program_manager'::app_role)
);

CREATE POLICY "Allow authenticated users to view process flows" ON public.process_flows FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage process flows" ON public.process_flows FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'program_manager'::app_role)
);

CREATE POLICY "Allow authenticated users to view process steps" ON public.process_steps FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage process steps" ON public.process_steps FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'program_manager'::app_role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_epics_global_rank ON public.epics(global_rank);
CREATE INDEX IF NOT EXISTS idx_epics_portfolio_rank ON public.epics(portfolio_id, portfolio_rank);
CREATE INDEX IF NOT EXISTS idx_epics_program_rank ON public.epics(primary_program_id, program_rank);
CREATE INDEX IF NOT EXISTS idx_epics_deleted_at ON public.epics(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_epics_parked_at ON public.epics(parked_at);
CREATE INDEX IF NOT EXISTS idx_capabilities_epic_id ON public.capabilities(epic_id);
CREATE INDEX IF NOT EXISTS idx_features_rank_within_epic ON public.features(epic_id, rank_within_epic);