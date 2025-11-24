-- ============================================
-- Phase 4: Scope-Based Access Control
-- ============================================

-- Create team_members table for actual team membership tracking
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create program_members table for program membership tracking
CREATE TABLE IF NOT EXISTS public.program_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, user_id)
);

-- Create portfolio_members table for portfolio membership tracking
CREATE TABLE IF NOT EXISTS public.portfolio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portfolio_id, user_id)
);

-- Enable RLS on membership tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for membership tables (admins can manage, users can view)
CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage program members"
  ON public.program_members FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view program members"
  ON public.program_members FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage portfolio members"
  ON public.portfolio_members FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view portfolio members"
  ON public.portfolio_members FOR SELECT
  USING (true);

-- ============================================
-- Update scope membership functions to use actual membership tables
-- ============================================

-- Updated user_in_team function - checks actual team membership
CREATE OR REPLACE FUNCTION public.user_in_team(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = _user_id AND team_id = _team_id
    );
$$;

-- Updated user_in_program function - checks actual program membership
CREATE OR REPLACE FUNCTION public.user_in_program(_user_id UUID, _program_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.program_members
      WHERE user_id = _user_id AND program_id = _program_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = _user_id AND t.program_id = _program_id
    );
$$;

-- Updated user_in_portfolio function - checks actual portfolio membership
CREATE OR REPLACE FUNCTION public.user_in_portfolio(_user_id UUID, _portfolio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.portfolio_members
      WHERE user_id = _user_id AND portfolio_id = _portfolio_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.program_members pm
      JOIN public.programs p ON p.id = pm.program_id
      WHERE pm.user_id = _user_id AND p.portfolio_id = _portfolio_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.programs p ON p.id = t.program_id
      WHERE tm.user_id = _user_id AND p.portfolio_id = _portfolio_id
    );
$$;

-- ============================================
-- Update RLS policies to enforce scope-based filtering
-- ============================================

-- Features: Users only see features in their program
DROP POLICY IF EXISTS "Users can view features" ON public.features;
CREATE POLICY "Users can view features"
  ON public.features FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    user_in_program(auth.uid(), program_id)
  );

-- Stories: Users only see stories in their team or assigned to them
DROP POLICY IF EXISTS "Users can view all stories" ON public.stories;
CREATE POLICY "Users can view all stories"
  ON public.stories FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    auth.uid() = assignee_id OR
    (team_id IS NOT NULL AND user_in_team(auth.uid(), team_id)) OR
    EXISTS (
      SELECT 1 FROM public.features f
      WHERE f.id = stories.feature_id AND user_in_program(auth.uid(), f.program_id)
    )
  );

-- Subtasks: Users only see subtasks they own or in accessible stories
DROP POLICY IF EXISTS "Users can view all subtasks" ON public.subtasks;
CREATE POLICY "Users can view all subtasks"
  ON public.subtasks FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    auth.uid() = assignee_id OR
    EXISTS (
      SELECT 1 FROM public.stories s
      LEFT JOIN public.features f ON f.id = s.feature_id
      WHERE s.id = subtasks.story_id
      AND (
        s.assignee_id = auth.uid() OR
        (s.team_id IS NOT NULL AND user_in_team(auth.uid(), s.team_id)) OR
        user_in_program(auth.uid(), f.program_id)
      )
    )
  );

-- Iterations: Users only see iterations in their team
DROP POLICY IF EXISTS "Users can view iterations" ON public.iterations;
CREATE POLICY "Users can view iterations"
  ON public.iterations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    (team_id IS NOT NULL AND user_in_team(auth.uid(), team_id)) OR
    EXISTS (
      SELECT 1 FROM public.program_increments pi
      WHERE pi.id = iterations.pi_id AND user_in_portfolio(auth.uid(), pi.portfolio_id)
    )
  );

-- Risks: Users only see risks in their program
DROP POLICY IF EXISTS "Users can view risks" ON public.risks;
CREATE POLICY "Users can view risks"
  ON public.risks FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    auth.uid() = owner_id OR
    user_in_program(auth.uid(), program_id)
  );

-- Dependencies: Users only see dependencies for features they can access
DROP POLICY IF EXISTS "Users can view dependencies" ON public.dependencies;
CREATE POLICY "Users can view dependencies"
  ON public.dependencies FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    EXISTS (
      SELECT 1 FROM public.features f
      WHERE (f.id = dependencies.from_feature_id OR f.id = dependencies.to_feature_id)
      AND user_in_program(auth.uid(), f.program_id)
    )
  );

-- Teams: Users only see teams they're members of or in accessible programs
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
CREATE POLICY "Users can view teams"
  ON public.teams FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    user_in_team(auth.uid(), id) OR
    user_in_program(auth.uid(), program_id)
  );

-- Programs: Users only see programs they're members of
DROP POLICY IF EXISTS "Users can view programs" ON public.programs;
CREATE POLICY "Users can view programs"
  ON public.programs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    user_in_program(auth.uid(), id) OR
    user_in_portfolio(auth.uid(), portfolio_id)
  );

-- Portfolios: Users only see portfolios they're members of
DROP POLICY IF EXISTS "Users can view portfolios" ON public.portfolios;
CREATE POLICY "Users can view portfolios"
  ON public.portfolios FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    user_in_portfolio(auth.uid(), id)
  );

-- Program Increments: Users only see PIs in accessible portfolios
DROP POLICY IF EXISTS "Users can view PIs" ON public.program_increments;
CREATE POLICY "Users can view PIs"
  ON public.program_increments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    user_in_portfolio(auth.uid(), portfolio_id)
  );

-- Releases: Users only see releases in accessible programs
DROP POLICY IF EXISTS "Users can view releases" ON public.releases;
CREATE POLICY "Users can view releases"
  ON public.releases FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    EXISTS (
      SELECT 1 FROM public.release_vehicles rv
      WHERE rv.id = releases.release_vehicle_id
      AND (
        (rv.program_id IS NOT NULL AND user_in_program(auth.uid(), rv.program_id)) OR
        (rv.portfolio_id IS NOT NULL AND user_in_portfolio(auth.uid(), rv.portfolio_id))
      )
    )
  );

-- Capacity Allocations: Users only see capacity for their teams
DROP POLICY IF EXISTS "Users can view capacity allocations" ON public.capacity_allocations;
CREATE POLICY "Users can view capacity allocations"
  ON public.capacity_allocations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'program_manager') OR
    has_role(auth.uid(), 'team_lead') OR
    user_in_team(auth.uid(), team_id)
  );