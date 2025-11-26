-- Create capacity_plans table to track available capacity per PI/Program/Team
CREATE TABLE IF NOT EXISTS public.capacity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  available_capacity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'points' CHECK (unit IN ('points', 'team_weeks', 'member_weeks')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT capacity_plans_scope_check CHECK (
    (program_id IS NOT NULL AND team_id IS NULL) OR 
    (program_id IS NULL AND team_id IS NOT NULL)
  )
);

-- Create forecast_entries table to store work item forecast estimates
CREATE TABLE IF NOT EXISTS public.forecast_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'capability', 'feature')),
  pi_id UUID NOT NULL REFERENCES public.program_increments(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  estimate NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'points' CHECK (unit IN ('points', 'team_weeks', 'member_weeks')),
  in_scope BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT forecast_entries_scope_check CHECK (
    (program_id IS NOT NULL AND team_id IS NULL) OR 
    (program_id IS NULL AND team_id IS NOT NULL)
  ),
  CONSTRAINT forecast_entries_unique UNIQUE (work_item_id, work_item_type, pi_id, program_id, team_id)
);

-- Create work_item_assignments table to track program/team assignments for work items
CREATE TABLE IF NOT EXISTS public.work_item_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'capability', 'feature')),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT work_item_assignments_check CHECK (
    program_id IS NOT NULL OR team_id IS NOT NULL
  )
);

-- Enable RLS on new tables
ALTER TABLE public.capacity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for capacity_plans
CREATE POLICY "Users can view capacity plans" ON public.capacity_plans
  FOR SELECT USING (true);

CREATE POLICY "Admins and program managers can manage capacity plans" ON public.capacity_plans
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'program_manager'::app_role)
  );

-- RLS policies for forecast_entries  
CREATE POLICY "Users can view forecast entries" ON public.forecast_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can create forecast entries" ON public.forecast_entries
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'program_manager'::app_role) OR
    has_role(auth.uid(), 'team_lead'::app_role)
  );

CREATE POLICY "Users can update forecast entries" ON public.forecast_entries
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'program_manager'::app_role) OR
    has_role(auth.uid(), 'team_lead'::app_role)
  );

-- RLS policies for work_item_assignments
CREATE POLICY "Users can view work item assignments" ON public.work_item_assignments
  FOR SELECT USING (true);

CREATE POLICY "Admins and program managers can manage work item assignments" ON public.work_item_assignments
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'program_manager'::app_role)
  );

-- Create indexes for performance
CREATE INDEX idx_capacity_plans_pi ON public.capacity_plans(pi_id);
CREATE INDEX idx_capacity_plans_program ON public.capacity_plans(program_id);
CREATE INDEX idx_capacity_plans_team ON public.capacity_plans(team_id);

CREATE INDEX idx_forecast_entries_work_item ON public.forecast_entries(work_item_id, work_item_type);
CREATE INDEX idx_forecast_entries_pi ON public.forecast_entries(pi_id);
CREATE INDEX idx_forecast_entries_program ON public.forecast_entries(program_id);
CREATE INDEX idx_forecast_entries_team ON public.forecast_entries(team_id);

CREATE INDEX idx_work_item_assignments_work_item ON public.work_item_assignments(work_item_id, work_item_type);
CREATE INDEX idx_work_item_assignments_program ON public.work_item_assignments(program_id);
CREATE INDEX idx_work_item_assignments_team ON public.work_item_assignments(team_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_capacity_plans_updated_at
  BEFORE UPDATE ON public.capacity_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forecast_entries_updated_at
  BEFORE UPDATE ON public.forecast_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();