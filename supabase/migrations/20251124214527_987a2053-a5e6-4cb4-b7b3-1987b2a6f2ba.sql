-- =====================================================
-- PHASE 1: SECURITY HARDENING
-- Add RLS policies and default role assignment
-- =====================================================

-- 1. Create helper functions for RLS (using existing has_role function)
-- Add function to check if user is in a specific team
CREATE OR REPLACE FUNCTION public.user_in_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For now, check if user has team_lead or higher role
  -- In future, add team_members table for explicit membership
  SELECT has_role(_user_id, 'team_lead')
     OR has_role(_user_id, 'program_manager')
     OR has_role(_user_id, 'admin');
$$;

-- Add function to check if user is in a specific program
CREATE OR REPLACE FUNCTION public.user_in_program(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'program_manager')
     OR has_role(_user_id, 'admin');
$$;

-- Add function to check if user is in a specific portfolio
CREATE OR REPLACE FUNCTION public.user_in_portfolio(_user_id uuid, _portfolio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin');
$$;

-- 2. Add default role assignment trigger
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign 'user' role to new users by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (runs after user creation)
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- 3. RLS POLICIES FOR STRATEGIC_THEMES
-- Admins and program managers can do everything
-- Team leads and users can only view
CREATE POLICY "Admins can manage themes"
  ON public.strategic_themes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage themes"
  ON public.strategic_themes
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view themes"
  ON public.strategic_themes
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view themes"
  ON public.strategic_themes
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 4. RLS POLICIES FOR INITIATIVES
CREATE POLICY "Admins can manage initiatives"
  ON public.initiatives
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage initiatives"
  ON public.initiatives
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage initiatives"
  ON public.initiatives
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view initiatives"
  ON public.initiatives
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 5. RLS POLICIES FOR BUSINESS_REQUESTS
CREATE POLICY "Admins can manage business requests"
  ON public.business_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage business requests"
  ON public.business_requests
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view business requests"
  ON public.business_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view business requests"
  ON public.business_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 6. RLS POLICIES FOR EPICS
CREATE POLICY "Admins can manage epics"
  ON public.epics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage epics"
  ON public.epics
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view epics"
  ON public.epics
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view epics"
  ON public.epics
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 7. RLS POLICIES FOR FEATURES
CREATE POLICY "Admins can manage features"
  ON public.features
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage features in their program"
  ON public.features
  FOR ALL
  USING (
    has_role(auth.uid(), 'program_manager')
    AND user_in_program(auth.uid(), program_id)
  );

CREATE POLICY "Team leads can manage features"
  ON public.features
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view features"
  ON public.features
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 8. RLS POLICIES FOR STORIES
CREATE POLICY "Admins can manage stories"
  ON public.stories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage stories"
  ON public.stories
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage stories"
  ON public.stories
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view all stories"
  ON public.stories
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

CREATE POLICY "Users can update assigned stories"
  ON public.stories
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'user')
    AND assignee_id = auth.uid()
  );

-- 9. RLS POLICIES FOR SUBTASKS
CREATE POLICY "Admins can manage subtasks"
  ON public.subtasks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage subtasks"
  ON public.subtasks
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage subtasks"
  ON public.subtasks
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view all subtasks"
  ON public.subtasks
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

CREATE POLICY "Users can manage assigned subtasks"
  ON public.subtasks
  FOR ALL
  USING (
    has_role(auth.uid(), 'user')
    AND assignee_id = auth.uid()
  );

-- 10. RLS POLICIES FOR ITERATIONS (SPRINTS)
CREATE POLICY "Admins can manage iterations"
  ON public.iterations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage iterations"
  ON public.iterations
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage iterations"
  ON public.iterations
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view iterations"
  ON public.iterations
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 11. RLS POLICIES FOR PROGRAM_INCREMENTS
CREATE POLICY "Admins can manage PIs"
  ON public.program_increments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage PIs"
  ON public.program_increments
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view PIs"
  ON public.program_increments
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view PIs"
  ON public.program_increments
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 12. RLS POLICIES FOR RELEASES
CREATE POLICY "Admins can manage releases"
  ON public.releases
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage releases"
  ON public.releases
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage releases"
  ON public.releases
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view releases"
  ON public.releases
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 13. RLS POLICIES FOR RELEASE_VEHICLES
CREATE POLICY "Admins can manage release vehicles"
  ON public.release_vehicles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage release vehicles"
  ON public.release_vehicles
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view release vehicles"
  ON public.release_vehicles
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view release vehicles"
  ON public.release_vehicles
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 14. RLS POLICIES FOR DEPENDENCIES
CREATE POLICY "Admins can manage dependencies"
  ON public.dependencies
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage dependencies"
  ON public.dependencies
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage dependencies"
  ON public.dependencies
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view dependencies"
  ON public.dependencies
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 15. RLS POLICIES FOR RISKS
CREATE POLICY "Admins can manage risks"
  ON public.risks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage risks"
  ON public.risks
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view risks"
  ON public.risks
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view risks"
  ON public.risks
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 16. RLS POLICIES FOR PORTFOLIOS
CREATE POLICY "Admins can manage portfolios"
  ON public.portfolios
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can view portfolios"
  ON public.portfolios
  FOR SELECT
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view portfolios"
  ON public.portfolios
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view portfolios"
  ON public.portfolios
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 17. RLS POLICIES FOR PROGRAMS
CREATE POLICY "Admins can manage programs"
  ON public.programs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage programs"
  ON public.programs
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view programs"
  ON public.programs
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view programs"
  ON public.programs
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 18. RLS POLICIES FOR TEAMS
CREATE POLICY "Admins can manage teams"
  ON public.teams
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage teams"
  ON public.teams
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view teams"
  ON public.teams
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view teams"
  ON public.teams
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 19. RLS POLICIES FOR OBJECTIVES
CREATE POLICY "Admins can manage objectives"
  ON public.objectives
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage objectives"
  ON public.objectives
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view objectives"
  ON public.objectives
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view objectives"
  ON public.objectives
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 20. RLS POLICIES FOR KEY_RESULTS
CREATE POLICY "Admins can manage key results"
  ON public.key_results
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage key results"
  ON public.key_results
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can view key results"
  ON public.key_results
  FOR SELECT
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view key results"
  ON public.key_results
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));

-- 21. RLS POLICIES FOR CAPACITY_ALLOCATIONS
CREATE POLICY "Admins can manage capacity allocations"
  ON public.capacity_allocations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Program managers can manage capacity allocations"
  ON public.capacity_allocations
  FOR ALL
  USING (has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Team leads can manage capacity allocations"
  ON public.capacity_allocations
  FOR ALL
  USING (has_role(auth.uid(), 'team_lead'));

CREATE POLICY "Users can view capacity allocations"
  ON public.capacity_allocations
  FOR SELECT
  USING (has_role(auth.uid(), 'user'));