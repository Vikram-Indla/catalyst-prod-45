-- Create pi_objectives table for Program Increment objectives
-- Source: https://help.jiraalign.com/hc/en-us/articles/115000169933-Manage-PI-planning-in-the-program-room
CREATE TABLE IF NOT EXISTS public.pi_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  committed BOOLEAN NOT NULL DEFAULT true,
  stretch BOOLEAN NOT NULL DEFAULT false,
  planned_bv INTEGER DEFAULT 0,
  actual_bv INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_pi_objectives_pi_id ON public.pi_objectives(pi_id);
CREATE INDEX idx_pi_objectives_program_id ON public.pi_objectives(program_id);

-- Enable RLS
ALTER TABLE public.pi_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pi_objectives
CREATE POLICY "Admins can manage PI objectives"
  ON public.pi_objectives
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage PI objectives"
  ON public.pi_objectives
  FOR ALL
  USING (
    has_role(auth.uid(), 'program_manager') 
    AND user_in_program(auth.uid(), program_id)
  );

CREATE POLICY "Team leads can view PI objectives"
  ON public.pi_objectives
  FOR SELECT
  USING (
    has_role(auth.uid(), 'team_lead')
    OR user_in_program(auth.uid(), program_id)
  );

CREATE POLICY "Users can view PI objectives"
  ON public.pi_objectives
  FOR SELECT
  USING (
    user_in_program(auth.uid(), program_id)
  );

-- Add updated_at trigger
CREATE TRIGGER update_pi_objectives_updated_at
  BEFORE UPDATE ON public.pi_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance capacity_allocations table with actual_capacity tracking
ALTER TABLE public.capacity_allocations 
  ADD COLUMN IF NOT EXISTS actual_capacity_points NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS velocity_baseline NUMERIC,
  ADD COLUMN IF NOT EXISTS load_factor NUMERIC DEFAULT 1.0;

COMMENT ON COLUMN public.capacity_allocations.capacity_points IS 'Planned capacity for the iteration';
COMMENT ON COLUMN public.capacity_allocations.actual_capacity_points IS 'Actual delivered capacity';
COMMENT ON COLUMN public.capacity_allocations.velocity_baseline IS 'Historical velocity baseline for the team';
COMMENT ON COLUMN public.capacity_allocations.load_factor IS 'Team load factor (0.0-1.0) accounting for leave, meetings, etc';

-- Create shared_services table for capacity planning
-- Source: https://www.cprime.com/resources/blog/blog-optimizing-shared-services-using-jira-align/
CREATE TABLE IF NOT EXISTS public.shared_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  capacity_points NUMERIC DEFAULT 0,
  allocation_type TEXT DEFAULT 'percentage' CHECK (allocation_type IN ('percentage', 'points')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_shared_services_portfolio_id ON public.shared_services(portfolio_id);

ALTER TABLE public.shared_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shared services"
  ON public.shared_services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage shared services"
  ON public.shared_services
  FOR ALL
  USING (
    has_role(auth.uid(), 'program_manager')
    AND (portfolio_id IS NULL OR user_in_portfolio(auth.uid(), portfolio_id))
  );

CREATE POLICY "Users can view shared services"
  ON public.shared_services
  FOR SELECT
  USING (
    portfolio_id IS NULL OR user_in_portfolio(auth.uid(), portfolio_id)
  );

CREATE TRIGGER update_shared_services_updated_at
  BEFORE UPDATE ON public.shared_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create shared_service_allocations junction table
CREATE TABLE IF NOT EXISTS public.shared_service_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_service_id UUID NOT NULL REFERENCES public.shared_services(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  iteration_id UUID NOT NULL REFERENCES public.iterations(id) ON DELETE CASCADE,
  allocated_points NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shared_service_id, team_id, iteration_id)
);

CREATE INDEX idx_shared_service_allocations_team_id ON public.shared_service_allocations(team_id);
CREATE INDEX idx_shared_service_allocations_iteration_id ON public.shared_service_allocations(iteration_id);

ALTER TABLE public.shared_service_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shared service allocations"
  ON public.shared_service_allocations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage shared service allocations"
  ON public.shared_service_allocations
  FOR ALL
  USING (
    has_role(auth.uid(), 'program_manager')
    AND user_in_team(auth.uid(), team_id)
  );

CREATE POLICY "Team leads can manage shared service allocations"
  ON public.shared_service_allocations
  FOR ALL
  USING (
    has_role(auth.uid(), 'team_lead')
    AND user_in_team(auth.uid(), team_id)
  );

CREATE POLICY "Users can view shared service allocations"
  ON public.shared_service_allocations
  FOR SELECT
  USING (user_in_team(auth.uid(), team_id));

CREATE TRIGGER update_shared_service_allocations_updated_at
  BEFORE UPDATE ON public.shared_service_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();