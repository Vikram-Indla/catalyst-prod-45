-- Module 4C-1: Enhanced Execution Session Manager
-- Adds test case selection, run templates, scheduling, and bulk assignment

-- ============================================================
-- 1. Run Templates Table
-- ============================================================
CREATE TABLE IF NOT EXISTS tm_run_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT DEFAULT 'staging',
  configuration JSONB DEFAULT '{}',
  test_case_filter JSONB DEFAULT '{}', -- Filter criteria for auto-selecting cases
  default_testers UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for run templates
ALTER TABLE tm_run_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view run templates in their projects"
ON tm_run_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_run_templates.project_id
  AND pm.user_id = auth.uid()
));

CREATE POLICY "Users can manage run templates"
ON tm_run_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_run_templates.project_id
  AND pm.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_run_templates.project_id
  AND pm.user_id = auth.uid()
));

-- Index for templates
CREATE INDEX idx_tm_run_templates_project ON tm_run_templates(project_id) WHERE is_active = true;

-- ============================================================
-- 2. Run-Test Case Assignments Table
-- ============================================================
CREATE TABLE IF NOT EXISTS tm_run_case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES test_execution_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  assigned_tester_id UUID REFERENCES profiles(id),
  priority INTEGER DEFAULT 0, -- Execution order
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'blocked', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(run_id, test_case_id)
);

-- RLS for run case assignments
ALTER TABLE tm_run_case_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view run case assignments"
ON tm_run_case_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM test_execution_runs r
  JOIN project_members pm ON pm.project_id = r.project_id
  WHERE r.id = tm_run_case_assignments.run_id
  AND pm.user_id = auth.uid()
));

CREATE POLICY "Users can manage run case assignments"
ON tm_run_case_assignments FOR ALL
USING (EXISTS (
  SELECT 1 FROM test_execution_runs r
  JOIN project_members pm ON pm.project_id = r.project_id
  WHERE r.id = tm_run_case_assignments.run_id
  AND pm.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM test_execution_runs r
  JOIN project_members pm ON pm.project_id = r.project_id
  WHERE r.id = tm_run_case_assignments.run_id
  AND pm.user_id = auth.uid()
));

-- Indexes for run case assignments
CREATE INDEX idx_tm_run_case_assignments_run ON tm_run_case_assignments(run_id);
CREATE INDEX idx_tm_run_case_assignments_case ON tm_run_case_assignments(test_case_id);
CREATE INDEX idx_tm_run_case_assignments_tester ON tm_run_case_assignments(assigned_tester_id) WHERE assigned_tester_id IS NOT NULL;
CREATE INDEX idx_tm_run_case_assignments_status ON tm_run_case_assignments(run_id, status);

-- ============================================================
-- 3. Scheduled Runs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS tm_scheduled_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES tm_run_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  schedule_config JSONB DEFAULT '{}', -- Cron-like config for recurring runs
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_id UUID REFERENCES test_execution_runs(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for scheduled runs
ALTER TABLE tm_scheduled_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled runs"
ON tm_scheduled_runs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_scheduled_runs.project_id
  AND pm.user_id = auth.uid()
));

CREATE POLICY "Users can manage scheduled runs"
ON tm_scheduled_runs FOR ALL
USING (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_scheduled_runs.project_id
  AND pm.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = tm_scheduled_runs.project_id
  AND pm.user_id = auth.uid()
));

-- Index for scheduled runs
CREATE INDEX idx_tm_scheduled_runs_next ON tm_scheduled_runs(next_run_at) WHERE is_active = true;

-- ============================================================
-- 4. RPC: Assign Test Cases to Run
-- ============================================================
CREATE OR REPLACE FUNCTION tm_assign_cases_to_run(
  p_run_id UUID,
  p_case_ids UUID[],
  p_assigned_tester_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_case_id UUID;
  v_priority INTEGER := 0;
  v_assigned_count INTEGER := 0;
BEGIN
  -- Validate run exists
  IF NOT EXISTS (SELECT 1 FROM test_execution_runs WHERE id = p_run_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'Run not found');
  END IF;
  
  -- Get current max priority
  SELECT COALESCE(MAX(priority), 0) INTO v_priority
  FROM tm_run_case_assignments
  WHERE run_id = p_run_id;
  
  -- Insert assignments
  FOREACH v_case_id IN ARRAY p_case_ids
  LOOP
    v_priority := v_priority + 1;
    
    INSERT INTO tm_run_case_assignments (run_id, test_case_id, assigned_tester_id, priority)
    VALUES (p_run_id, v_case_id, p_assigned_tester_id, v_priority)
    ON CONFLICT (run_id, test_case_id) DO NOTHING;
    
    IF FOUND THEN
      v_assigned_count := v_assigned_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'run_id', p_run_id
  );
END;
$$;

-- ============================================================
-- 5. RPC: Remove Cases from Run
-- ============================================================
CREATE OR REPLACE FUNCTION tm_remove_cases_from_run(
  p_run_id UUID,
  p_case_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_removed_count INTEGER;
BEGIN
  DELETE FROM tm_run_case_assignments
  WHERE run_id = p_run_id
  AND test_case_id = ANY(p_case_ids)
  AND status = 'pending'; -- Only remove pending cases
  
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed_count', v_removed_count
  );
END;
$$;

-- ============================================================
-- 6. RPC: Get Run Case Assignments
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_run_assignments(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_assignments JSONB;
  v_summary JSONB;
BEGIN
  -- Get assignments with case details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'test_case_id', a.test_case_id,
      'case_key', tc.case_key,
      'case_title', tc.title,
      'case_priority', tc.priority,
      'assigned_tester_id', a.assigned_tester_id,
      'assigned_tester_name', p.full_name,
      'priority', a.priority,
      'status', a.status,
      'started_at', a.started_at,
      'completed_at', a.completed_at,
      'duration_seconds', a.duration_seconds,
      'notes', a.notes
    ) ORDER BY a.priority
  )
  INTO v_assignments
  FROM tm_run_case_assignments a
  JOIN tm_test_cases tc ON tc.id = a.test_case_id
  LEFT JOIN profiles p ON p.id = a.assigned_tester_id
  WHERE a.run_id = p_run_id;
  
  -- Get summary
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'passed', COUNT(*) FILTER (WHERE status = 'passed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
    'skipped', COUNT(*) FILTER (WHERE status = 'skipped')
  )
  INTO v_summary
  FROM tm_run_case_assignments
  WHERE run_id = p_run_id;
  
  RETURN jsonb_build_object(
    'assignments', COALESCE(v_assignments, '[]'::jsonb),
    'summary', v_summary
  );
END;
$$;

-- ============================================================
-- 7. RPC: Update Case Assignment Status
-- ============================================================
CREATE OR REPLACE FUNCTION tm_update_assignment_status(
  p_assignment_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  SELECT * INTO v_assignment
  FROM tm_run_case_assignments
  WHERE id = p_assignment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;
  
  UPDATE tm_run_case_assignments
  SET 
    status = p_status,
    notes = COALESCE(p_notes, notes),
    started_at = CASE 
      WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
      ELSE started_at
    END,
    completed_at = CASE 
      WHEN p_status IN ('passed', 'failed', 'blocked', 'skipped') THEN now()
      ELSE completed_at
    END,
    duration_seconds = CASE 
      WHEN p_status IN ('passed', 'failed', 'blocked', 'skipped') AND started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (now() - started_at))::INTEGER
      ELSE duration_seconds
    END,
    updated_at = now()
  WHERE id = p_assignment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'new_status', p_status
  );
END;
$$;

-- ============================================================
-- 8. RPC: Create Run from Template
-- ============================================================
CREATE OR REPLACE FUNCTION tm_create_run_from_template(
  p_template_id UUID,
  p_name TEXT DEFAULT NULL,
  p_scheduled_start TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_template RECORD;
  v_run_id UUID;
  v_run_number INTEGER;
  v_case_ids UUID[];
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM tm_run_templates
  WHERE id = p_template_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Template not found');
  END IF;
  
  -- Generate run number
  SELECT COALESCE(MAX(run_number), 0) + 1 INTO v_run_number
  FROM test_execution_runs
  WHERE project_id = v_template.project_id;
  
  -- Create run
  INSERT INTO test_execution_runs (
    project_id, 
    run_number, 
    run_name,
    name,
    description, 
    environment, 
    configuration,
    scheduled_start,
    status,
    created_by
  )
  VALUES (
    v_template.project_id,
    v_run_number,
    COALESCE(p_name, v_template.name || ' #' || v_run_number),
    COALESCE(p_name, v_template.name || ' #' || v_run_number),
    v_template.description,
    v_template.environment,
    v_template.configuration,
    p_scheduled_start,
    'draft',
    auth.uid()
  )
  RETURNING id INTO v_run_id;
  
  -- Apply test case filter if present
  IF v_template.test_case_filter IS NOT NULL AND v_template.test_case_filter != '{}'::jsonb THEN
    -- Get matching case IDs based on filter criteria
    SELECT array_agg(tc.id) INTO v_case_ids
    FROM tm_test_cases tc
    WHERE tc.project_id = v_template.project_id
    AND tc.is_active = true
    AND (
      (v_template.test_case_filter->>'folder_id' IS NULL OR 
       tc.folder_id = (v_template.test_case_filter->>'folder_id')::UUID)
      AND
      (v_template.test_case_filter->>'priority' IS NULL OR 
       tc.priority = v_template.test_case_filter->>'priority')
      AND
      (v_template.test_case_filter->>'type' IS NULL OR 
       tc.type = v_template.test_case_filter->>'type')
    );
    
    -- Assign cases to run
    IF v_case_ids IS NOT NULL AND array_length(v_case_ids, 1) > 0 THEN
      PERFORM tm_assign_cases_to_run(v_run_id, v_case_ids, NULL);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'run_number', v_run_number,
    'cases_assigned', COALESCE(array_length(v_case_ids, 1), 0)
  );
END;
$$;

-- ============================================================
-- 9. RPC: Bulk Update Tester Assignments
-- ============================================================
CREATE OR REPLACE FUNCTION tm_bulk_assign_tester(
  p_run_id UUID,
  p_assignment_ids UUID[],
  p_tester_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE tm_run_case_assignments
  SET 
    assigned_tester_id = p_tester_id,
    updated_at = now()
  WHERE run_id = p_run_id
  AND id = ANY(p_assignment_ids)
  AND status = 'pending';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
END;
$$;

-- Enable realtime for assignments
ALTER PUBLICATION supabase_realtime ADD TABLE tm_run_case_assignments;