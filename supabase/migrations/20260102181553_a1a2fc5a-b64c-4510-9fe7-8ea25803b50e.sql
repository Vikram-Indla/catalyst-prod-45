-- Add project_id column to test_cases table
ALTER TABLE public.test_cases
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id column to test_cycles table
ALTER TABLE public.test_cycles
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id column to test_sets table
ALTER TABLE public.test_sets
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create indexes for project_id queries
CREATE INDEX idx_test_cases_project_id ON public.test_cases(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_test_cycles_project_id ON public.test_cycles(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_test_sets_project_id ON public.test_sets(project_id) WHERE project_id IS NOT NULL;

-- Enable RLS on test tables if not already enabled
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cycle_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_cases - approved users can view, project members can CRUD
CREATE POLICY "Approved users can view test cases"
ON public.test_cases FOR SELECT
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Users can create test cases in their projects"
ON public.test_cases FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can update test cases in their projects"
ON public.test_cases FOR UPDATE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can delete test cases in their projects"
ON public.test_cases FOR DELETE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

-- RLS policies for test_cycles
CREATE POLICY "Approved users can view test cycles"
ON public.test_cycles FOR SELECT
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Users can create test cycles in their projects"
ON public.test_cycles FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can update test cycles in their projects"
ON public.test_cycles FOR UPDATE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can delete test cycles in their projects"
ON public.test_cycles FOR DELETE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

-- RLS policies for test_sets
CREATE POLICY "Approved users can view test sets"
ON public.test_sets FOR SELECT
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Users can create test sets in their projects"
ON public.test_sets FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can update test sets in their projects"
ON public.test_sets FOR UPDATE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

CREATE POLICY "Users can delete test sets in their projects"
ON public.test_sets FOR DELETE
TO authenticated
USING (
  public.current_user_is_approved() AND
  (project_id IS NULL OR public.user_in_project(auth.uid(), project_id))
);

-- RLS policies for test_cycle_executions
CREATE POLICY "Approved users can view test executions"
ON public.test_cycle_executions FOR SELECT
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Approved users can create test executions"
ON public.test_cycle_executions FOR INSERT
TO authenticated
WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update test executions"
ON public.test_cycle_executions FOR UPDATE
TO authenticated
USING (public.current_user_is_approved());

-- RLS policies for test_case_steps
CREATE POLICY "Approved users can view test steps"
ON public.test_case_steps FOR SELECT
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Approved users can create test steps"
ON public.test_case_steps FOR INSERT
TO authenticated
WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Approved users can update test steps"
ON public.test_case_steps FOR UPDATE
TO authenticated
USING (public.current_user_is_approved());

CREATE POLICY "Approved users can delete test steps"
ON public.test_case_steps FOR DELETE
TO authenticated
USING (public.current_user_is_approved());