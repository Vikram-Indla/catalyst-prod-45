-- Enable RLS on all test tables
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_set_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cycle_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_execution_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_execution_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_shared_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_work_items ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TEST CASES RLS POLICIES
-- ================================================================

-- View: All approved users can view test cases in their program
CREATE POLICY "test_cases_select_policy" ON public.test_cases
  FOR SELECT USING (
    public.current_user_is_approved() AND (
      -- Admin can see all
      public.is_user_admin(auth.uid()) OR
      -- User can see test cases in programs they have access to via program membership or projects
      program_id IN (
        SELECT DISTINCT p.id FROM public.programs p
        LEFT JOIN public.projects proj ON proj.program_id = p.id
        LEFT JOIN public.project_members pm ON pm.project_id = proj.id
        LEFT JOIN public.team_members tm ON tm.user_id = auth.uid()
        LEFT JOIN public.teams t ON t.id = tm.team_id AND t.project_id = proj.id
        WHERE pm.user_id = auth.uid() OR tm.user_id = auth.uid()
      )
    )
  );

-- Insert: Approved users can create test cases (created_by must match)
CREATE POLICY "test_cases_insert_policy" ON public.test_cases
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND 
    created_by = auth.uid()
  );

-- Update: Approved users can update test cases in their scope
CREATE POLICY "test_cases_update_policy" ON public.test_cases
  FOR UPDATE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      created_by = auth.uid() OR
      owner_id = auth.uid()
    )
  );

-- Delete: Only team leads and above can delete (soft delete pattern)
CREATE POLICY "test_cases_delete_policy" ON public.test_cases
  FOR DELETE USING (
    public.is_user_admin(auth.uid())
  );

-- ================================================================
-- TEST CASE STEPS RLS POLICIES
-- ================================================================
CREATE POLICY "test_case_steps_select_policy" ON public.test_case_steps
  FOR SELECT USING (
    public.current_user_is_approved() AND
    case_id IN (SELECT id FROM public.test_cases)
  );

CREATE POLICY "test_case_steps_insert_policy" ON public.test_case_steps
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND
    case_id IN (SELECT id FROM public.test_cases WHERE created_by = auth.uid() OR owner_id = auth.uid() OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "test_case_steps_update_policy" ON public.test_case_steps
  FOR UPDATE USING (
    public.current_user_is_approved() AND
    case_id IN (SELECT id FROM public.test_cases WHERE created_by = auth.uid() OR owner_id = auth.uid() OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "test_case_steps_delete_policy" ON public.test_case_steps
  FOR DELETE USING (
    public.is_user_admin(auth.uid())
  );

-- ================================================================
-- TEST SETS RLS POLICIES
-- ================================================================
CREATE POLICY "test_sets_select_policy" ON public.test_sets
  FOR SELECT USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      program_id IN (
        SELECT DISTINCT p.id FROM public.programs p
        LEFT JOIN public.projects proj ON proj.program_id = p.id
        LEFT JOIN public.project_members pm ON pm.project_id = proj.id
        WHERE pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "test_sets_insert_policy" ON public.test_sets
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND 
    created_by = auth.uid()
  );

CREATE POLICY "test_sets_update_policy" ON public.test_sets
  FOR UPDATE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      created_by = auth.uid() OR
      owner_id = auth.uid()
    )
  );

CREATE POLICY "test_sets_delete_policy" ON public.test_sets
  FOR DELETE USING (
    public.is_user_admin(auth.uid())
  );

-- ================================================================
-- TEST SET CASES (junction table) RLS POLICIES
-- ================================================================
CREATE POLICY "test_set_cases_select_policy" ON public.test_set_cases
  FOR SELECT USING (
    public.current_user_is_approved() AND
    set_id IN (SELECT id FROM public.test_sets)
  );

CREATE POLICY "test_set_cases_insert_policy" ON public.test_set_cases
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND
    added_by = auth.uid()
  );

CREATE POLICY "test_set_cases_update_policy" ON public.test_set_cases
  FOR UPDATE USING (
    public.current_user_is_approved() AND
    set_id IN (SELECT id FROM public.test_sets WHERE created_by = auth.uid() OR owner_id = auth.uid() OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "test_set_cases_delete_policy" ON public.test_set_cases
  FOR DELETE USING (
    public.is_user_admin(auth.uid()) OR
    set_id IN (SELECT id FROM public.test_sets WHERE created_by = auth.uid() OR owner_id = auth.uid())
  );

-- ================================================================
-- TEST CYCLES RLS POLICIES
-- ================================================================
CREATE POLICY "test_cycles_select_policy" ON public.test_cycles
  FOR SELECT USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      program_id IN (
        SELECT DISTINCT p.id FROM public.programs p
        LEFT JOIN public.projects proj ON proj.program_id = p.id
        LEFT JOIN public.project_members pm ON pm.project_id = proj.id
        WHERE pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "test_cycles_insert_policy" ON public.test_cycles
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND 
    created_by = auth.uid()
  );

CREATE POLICY "test_cycles_update_policy" ON public.test_cycles
  FOR UPDATE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      created_by = auth.uid() OR
      owner_id = auth.uid()
    )
  );

CREATE POLICY "test_cycles_delete_policy" ON public.test_cycles
  FOR DELETE USING (
    public.is_user_admin(auth.uid())
  );

-- ================================================================
-- TEST CYCLE EXECUTIONS RLS POLICIES
-- ================================================================
CREATE POLICY "test_cycle_executions_select_policy" ON public.test_cycle_executions
  FOR SELECT USING (
    public.current_user_is_approved() AND
    cycle_id IN (SELECT id FROM public.test_cycles)
  );

CREATE POLICY "test_cycle_executions_insert_policy" ON public.test_cycle_executions
  FOR INSERT WITH CHECK (
    public.current_user_is_approved()
  );

CREATE POLICY "test_cycle_executions_update_policy" ON public.test_cycle_executions
  FOR UPDATE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      assigned_to = auth.uid() OR
      executed_by = auth.uid()
    )
  );

CREATE POLICY "test_cycle_executions_delete_policy" ON public.test_cycle_executions
  FOR DELETE USING (
    public.is_user_admin(auth.uid())
  );

-- ================================================================
-- TEST EXECUTION STEP RESULTS RLS POLICIES
-- ================================================================
CREATE POLICY "test_execution_step_results_select_policy" ON public.test_execution_step_results
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_execution_step_results_insert_policy" ON public.test_execution_step_results
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "test_execution_step_results_update_policy" ON public.test_execution_step_results
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_execution_step_results_delete_policy" ON public.test_execution_step_results
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST EXECUTION DEFECTS RLS POLICIES
-- ================================================================
CREATE POLICY "test_execution_defects_select_policy" ON public.test_execution_defects
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_execution_defects_insert_policy" ON public.test_execution_defects
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "test_execution_defects_update_policy" ON public.test_execution_defects
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_execution_defects_delete_policy" ON public.test_execution_defects
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST EVIDENCE RLS POLICIES
-- ================================================================
CREATE POLICY "test_evidence_select_policy" ON public.test_evidence
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_evidence_insert_policy" ON public.test_evidence
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "test_evidence_update_policy" ON public.test_evidence
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_evidence_delete_policy" ON public.test_evidence
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST FOLDERS RLS POLICIES
-- ================================================================
CREATE POLICY "test_folders_select_policy" ON public.test_folders
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_folders_insert_policy" ON public.test_folders
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "test_folders_update_policy" ON public.test_folders
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_folders_delete_policy" ON public.test_folders
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST ACTIVITY LOG RLS POLICIES
-- ================================================================
CREATE POLICY "test_activity_log_select_policy" ON public.test_activity_log
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_activity_log_insert_policy" ON public.test_activity_log
  FOR INSERT WITH CHECK (public.current_user_is_approved());

-- ================================================================
-- TEST CASE BULK OPERATIONS RLS POLICIES
-- ================================================================
CREATE POLICY "test_case_bulk_operations_select_policy" ON public.test_case_bulk_operations
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_case_bulk_operations_insert_policy" ON public.test_case_bulk_operations
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND
    executed_by = auth.uid()
  );

-- ================================================================
-- SHARED TEST STEPS RLS POLICIES
-- ================================================================
CREATE POLICY "shared_test_steps_select_policy" ON public.shared_test_steps
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "shared_test_steps_insert_policy" ON public.shared_test_steps
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND
    created_by = auth.uid()
  );

CREATE POLICY "shared_test_steps_update_policy" ON public.shared_test_steps
  FOR UPDATE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      created_by = auth.uid()
    )
  );

CREATE POLICY "shared_test_steps_delete_policy" ON public.shared_test_steps
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST CASE SHARED STEPS (junction) RLS POLICIES
-- ================================================================
CREATE POLICY "test_case_shared_steps_select_policy" ON public.test_case_shared_steps
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_case_shared_steps_insert_policy" ON public.test_case_shared_steps
  FOR INSERT WITH CHECK (public.current_user_is_approved());

CREATE POLICY "test_case_shared_steps_update_policy" ON public.test_case_shared_steps
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_case_shared_steps_delete_policy" ON public.test_case_shared_steps
  FOR DELETE USING (public.is_user_admin(auth.uid()));

-- ================================================================
-- TEST CASE WORK ITEMS (links) RLS POLICIES
-- ================================================================
CREATE POLICY "test_case_work_items_select_policy" ON public.test_case_work_items
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "test_case_work_items_insert_policy" ON public.test_case_work_items
  FOR INSERT WITH CHECK (
    public.current_user_is_approved() AND
    created_by = auth.uid()
  );

CREATE POLICY "test_case_work_items_update_policy" ON public.test_case_work_items
  FOR UPDATE USING (public.current_user_is_approved());

CREATE POLICY "test_case_work_items_delete_policy" ON public.test_case_work_items
  FOR DELETE USING (
    public.current_user_is_approved() AND (
      public.is_user_admin(auth.uid()) OR
      created_by = auth.uid()
    )
  );