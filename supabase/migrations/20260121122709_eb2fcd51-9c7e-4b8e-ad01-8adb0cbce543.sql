-- ============================================================================
-- MODULE 4A-2: Test Cycle Configuration - Database Layer
-- ============================================================================

-- 1. CYCLE MILESTONES TABLE
CREATE TABLE IF NOT EXISTS tm_cycle_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_date DATE NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CYCLE TESTER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS tm_cycle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'tester' CHECK (role IN ('lead', 'tester', 'reviewer')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  UNIQUE(cycle_id, user_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_tm_cycle_milestones_cycle_id ON tm_cycle_milestones(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_milestones_target_date ON tm_cycle_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_assignments_cycle_id ON tm_cycle_assignments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_assignments_user_id ON tm_cycle_assignments(user_id);

-- 4. RLS POLICIES
ALTER TABLE tm_cycle_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_cycle_assignments ENABLE ROW LEVEL SECURITY;

-- Milestones policies (authenticated users can read/write)
CREATE POLICY "Authenticated users can view cycle milestones"
ON tm_cycle_milestones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage cycle milestones"
ON tm_cycle_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Assignments policies
CREATE POLICY "Authenticated users can view cycle assignments"
ON tm_cycle_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage cycle assignments"
ON tm_cycle_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. FUNCTION: Create milestone
CREATE OR REPLACE FUNCTION tm_create_cycle_milestone(
  p_cycle_id UUID,
  p_name TEXT,
  p_target_date DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone_id UUID;
  v_sort_order INTEGER;
BEGIN
  -- Get next sort order
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
  FROM tm_cycle_milestones WHERE cycle_id = p_cycle_id;
  
  -- Insert milestone
  INSERT INTO tm_cycle_milestones (cycle_id, name, target_date, description, sort_order)
  VALUES (p_cycle_id, p_name, p_target_date, p_description, v_sort_order)
  RETURNING id INTO v_milestone_id;
  
  RETURN jsonb_build_object('success', true, 'milestone_id', v_milestone_id);
END;
$$;

-- 6. FUNCTION: Update milestone
CREATE OR REPLACE FUNCTION tm_update_cycle_milestone(
  p_milestone_id UUID,
  p_name TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_completed BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tm_cycle_milestones
  SET
    name = COALESCE(p_name, name),
    target_date = COALESCE(p_target_date, target_date),
    description = COALESCE(p_description, description),
    is_completed = COALESCE(p_is_completed, is_completed),
    completed_at = CASE WHEN p_is_completed = true AND completed_at IS NULL THEN now() ELSE completed_at END,
    completed_by = CASE WHEN p_is_completed = true AND completed_by IS NULL THEN auth.uid() ELSE completed_by END,
    updated_at = now()
  WHERE id = p_milestone_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. FUNCTION: Delete milestone
CREATE OR REPLACE FUNCTION tm_delete_cycle_milestone(p_milestone_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tm_cycle_milestones WHERE id = p_milestone_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. FUNCTION: Assign tester to cycle
CREATE OR REPLACE FUNCTION tm_assign_tester_to_cycle(
  p_cycle_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'tester',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  INSERT INTO tm_cycle_assignments (cycle_id, user_id, role, notes, assigned_by)
  VALUES (p_cycle_id, p_user_id, p_role, p_notes, auth.uid())
  ON CONFLICT (cycle_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role, notes = EXCLUDED.notes
  RETURNING id INTO v_assignment_id;
  
  RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id);
END;
$$;

-- 9. FUNCTION: Remove tester from cycle
CREATE OR REPLACE FUNCTION tm_remove_tester_from_cycle(p_cycle_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tm_cycle_assignments WHERE cycle_id = p_cycle_id AND user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. FUNCTION: Get cycle with full details (milestones, assignments, stats)
CREATE OR REPLACE FUNCTION tm_get_cycle_details(p_cycle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'cycle', jsonb_build_object(
      'id', c.id,
      'project_id', c.project_id,
      'cycle_key', c.cycle_key,
      'name', c.name,
      'description', c.description,
      'status', c.status,
      'planned_start', c.planned_start,
      'planned_end', c.planned_end,
      'actual_start', c.actual_start,
      'actual_end', c.actual_end,
      'test_plan_id', c.test_plan_id,
      'created_at', c.created_at,
      'stats', jsonb_build_object(
        'total', c.total_cases,
        'passed', c.passed_count,
        'failed', c.failed_count,
        'blocked', c.blocked_count,
        'skipped', c.skipped_count,
        'not_run', c.not_run_count
      )
    ),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'target_date', m.target_date,
        'description', m.description,
        'is_completed', m.is_completed,
        'completed_at', m.completed_at
      ) ORDER BY m.target_date, m.sort_order)
      FROM tm_cycle_milestones m WHERE m.cycle_id = c.id
    ), '[]'::JSONB),
    'assignments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'user_name', p.full_name,
        'user_avatar', p.avatar_url,
        'role', a.role,
        'assigned_at', a.assigned_at,
        'workload', (
          SELECT jsonb_build_object(
            'assigned', COUNT(*),
            'completed', COUNT(*) FILTER (WHERE cs.current_status IN ('passed', 'failed', 'blocked', 'skipped')),
            'passed', COUNT(*) FILTER (WHERE cs.current_status = 'passed'),
            'failed', COUNT(*) FILTER (WHERE cs.current_status = 'failed')
          )
          FROM tm_cycle_scope cs WHERE cs.cycle_id = c.id AND cs.assigned_to = a.user_id
        )
      ))
      FROM tm_cycle_assignments a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.cycle_id = c.id
    ), '[]'::JSONB)
  ) INTO v_result
  FROM tm_test_cycles c
  WHERE c.id = p_cycle_id;
  
  RETURN v_result;
END;
$$;

-- 11. FUNCTION: Bulk add test cases to cycle scope
CREATE OR REPLACE FUNCTION tm_bulk_add_cases_to_cycle(
  p_cycle_id UUID,
  p_test_case_ids UUID[],
  p_assigned_to UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id UUID;
  v_order INTEGER;
  v_added INTEGER := 0;
BEGIN
  -- Get current max sort order
  SELECT COALESCE(MAX(sort_order), 0) INTO v_order
  FROM tm_cycle_scope WHERE cycle_id = p_cycle_id;
  
  -- Insert each case
  FOREACH v_case_id IN ARRAY p_test_case_ids
  LOOP
    IF NOT EXISTS (SELECT 1 FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND test_case_id = v_case_id) THEN
      v_order := v_order + 1;
      INSERT INTO tm_cycle_scope (cycle_id, test_case_id, assigned_to, sort_order, current_status)
      VALUES (p_cycle_id, v_case_id, p_assigned_to, v_order, 'not_run');
      v_added := v_added + 1;
    END IF;
  END LOOP;
  
  -- Update cycle totals
  UPDATE tm_test_cycles 
  SET total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id),
      not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'not_run'),
      updated_at = now()
  WHERE id = p_cycle_id;
  
  RETURN jsonb_build_object('success', true, 'added', v_added);
END;
$$;

-- 12. FUNCTION: Remove test case from cycle scope
CREATE OR REPLACE FUNCTION tm_remove_case_from_cycle(p_cycle_id UUID, p_test_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND test_case_id = p_test_case_id;
  
  -- Update cycle totals
  UPDATE tm_test_cycles 
  SET total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id),
      not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'not_run'),
      passed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'passed'),
      failed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'failed'),
      blocked_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'blocked'),
      skipped_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'skipped'),
      updated_at = now()
  WHERE id = p_cycle_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13. FUNCTION: Assign tester to specific scope item
CREATE OR REPLACE FUNCTION tm_assign_scope_item(p_scope_id UUID, p_assigned_to UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tm_cycle_scope SET assigned_to = p_assigned_to WHERE id = p_scope_id;
  RETURN jsonb_build_object('success', true);
END;
$$;