-- ============================================
-- PHASE 1.1: CREATE MISSING TEST PLANS TABLES
-- (requirements & requirement_test_links already exist)
-- ============================================

-- 1. TEST PLANS TABLE
CREATE TABLE public.test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  objectives TEXT,
  scope_in TEXT,
  scope_out TEXT,
  test_strategy TEXT,
  environment_requirements TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLAN TEST CASES JUNCTION TABLE
CREATE TABLE public.plan_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.test_plans(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.tm_test_cases(id) ON DELETE CASCADE,
  execution_order INT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, test_case_id)
);

-- 3. PLAN TEAM MEMBERS TABLE
CREATE TABLE public.plan_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.test_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'tester' CHECK (role IN ('lead', 'tester', 'reviewer')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, user_id)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_team_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Authenticated users can CRUD
-- ============================================

-- Test plans policies
CREATE POLICY "Authenticated users can view test_plans"
  ON public.test_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create test_plans"
  ON public.test_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update test_plans"
  ON public.test_plans FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete test_plans"
  ON public.test_plans FOR DELETE
  TO authenticated
  USING (true);

-- Plan test cases policies
CREATE POLICY "Authenticated users can view plan_test_cases"
  ON public.plan_test_cases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create plan_test_cases"
  ON public.plan_test_cases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plan_test_cases"
  ON public.plan_test_cases FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete plan_test_cases"
  ON public.plan_test_cases FOR DELETE
  TO authenticated
  USING (true);

-- Plan team members policies
CREATE POLICY "Authenticated users can view plan_team_members"
  ON public.plan_team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create plan_team_members"
  ON public.plan_team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plan_team_members"
  ON public.plan_team_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete plan_team_members"
  ON public.plan_team_members FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_test_plans_status ON public.test_plans(status);
CREATE INDEX idx_test_plans_release ON public.test_plans(release_id);

CREATE INDEX idx_plan_test_cases_plan ON public.plan_test_cases(plan_id);
CREATE INDEX idx_plan_test_cases_test ON public.plan_test_cases(test_case_id);

CREATE INDEX idx_plan_team_members_plan ON public.plan_team_members(plan_id);
CREATE INDEX idx_plan_team_members_user ON public.plan_team_members(user_id);

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================
CREATE TRIGGER update_test_plans_updated_at
  BEFORE UPDATE ON public.test_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();