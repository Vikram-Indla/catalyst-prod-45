
-- =====================================================
-- MODULE 4B-5: VERSION HISTORY & CLONING
-- Adds version tracking and cloning for test cases
-- =====================================================

-- Add version column to test cases
ALTER TABLE tm_test_cases
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_case_id UUID REFERENCES tm_test_cases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cloned_from_id UUID REFERENCES tm_test_cases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true;

-- Create version history table
CREATE TABLE IF NOT EXISTS tm_test_case_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_case_id, version_number)
);

-- Enable RLS
ALTER TABLE tm_test_case_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view version history in their projects"
  ON tm_test_case_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_test_case_versions.test_case_id
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Users can create versions in their projects"
  ON tm_test_case_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_test_case_versions.test_case_id
    AND pm.user_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_versions_case ON tm_test_case_versions(test_case_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_case_parent ON tm_test_cases(parent_case_id) WHERE parent_case_id IS NOT NULL;

-- Function to create a version snapshot
CREATE OR REPLACE FUNCTION tm_create_version_snapshot(
  p_case_id UUID,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps JSONB;
  v_snapshot JSONB;
  v_version INTEGER;
BEGIN
  -- Get current case
  SELECT * INTO v_case FROM tm_test_cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test case not found';
  END IF;

  -- Get current steps
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_number', step_number,
      'step_type', step_type,
      'action', action,
      'action_html', action_html,
      'expected_result', expected_result,
      'expected_result_html', expected_result_html,
      'test_data', test_data,
      'notes', notes,
      'is_optional', is_optional,
      'estimated_time_seconds', estimated_time_seconds
    ) ORDER BY step_number
  ), '[]'::jsonb)
  INTO v_steps
  FROM tm_test_steps WHERE test_case_id = p_case_id;

  -- Build snapshot
  v_snapshot := jsonb_build_object(
    'title', v_case.title,
    'description', v_case.description,
    'description_html', v_case.description_html,
    'preconditions', v_case.preconditions,
    'preconditions_html', v_case.preconditions_html,
    'postconditions', v_case.postconditions,
    'postconditions_html', v_case.postconditions_html,
    'status', v_case.status,
    'priority', v_case.priority,
    'type', v_case.type,
    'test_format', v_case.test_format,
    'gherkin_feature', v_case.gherkin_feature,
    'gherkin_scenario', v_case.gherkin_scenario,
    'folder_id', v_case.folder_id,
    'steps', v_steps
  );

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
  FROM tm_test_case_versions WHERE test_case_id = p_case_id;

  -- Insert version
  INSERT INTO tm_test_case_versions (
    test_case_id,
    version_number,
    snapshot,
    change_summary,
    changed_by
  ) VALUES (
    p_case_id,
    v_version,
    v_snapshot,
    p_change_summary,
    auth.uid()
  );

  -- Update case version
  UPDATE tm_test_cases
  SET version = v_version, updated_at = now()
  WHERE id = p_case_id;

  RETURN v_version;
END;
$$;

-- Function to get version history
CREATE OR REPLACE FUNCTION tm_get_version_history(p_case_id UUID)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  change_summary TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ,
  snapshot JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.version_number,
    v.change_summary,
    v.changed_by,
    COALESCE(p.full_name, p.email, 'Unknown') as changed_by_name,
    v.created_at,
    v.snapshot
  FROM tm_test_case_versions v
  LEFT JOIN profiles p ON p.id = v.changed_by
  WHERE v.test_case_id = p_case_id
  ORDER BY v.version_number DESC;
END;
$$;

-- Function to restore a version
CREATE OR REPLACE FUNCTION tm_restore_version(
  p_case_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot JSONB;
  v_step JSONB;
  v_step_num INTEGER := 1;
BEGIN
  -- Get the snapshot
  SELECT snapshot INTO v_snapshot
  FROM tm_test_case_versions
  WHERE test_case_id = p_case_id AND version_number = p_version_number;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Create a new version snapshot before restoring
  PERFORM tm_create_version_snapshot(p_case_id, 'Before restore to v' || p_version_number);

  -- Update test case
  UPDATE tm_test_cases SET
    title = v_snapshot->>'title',
    description = v_snapshot->>'description',
    description_html = v_snapshot->>'description_html',
    preconditions = v_snapshot->>'preconditions',
    preconditions_html = v_snapshot->>'preconditions_html',
    postconditions = v_snapshot->>'postconditions',
    postconditions_html = v_snapshot->>'postconditions_html',
    priority = v_snapshot->>'priority',
    type = v_snapshot->>'type',
    test_format = v_snapshot->>'test_format',
    gherkin_feature = v_snapshot->>'gherkin_feature',
    gherkin_scenario = v_snapshot->>'gherkin_scenario',
    updated_at = now()
  WHERE id = p_case_id;

  -- Delete existing steps
  DELETE FROM tm_test_steps WHERE test_case_id = p_case_id;

  -- Restore steps
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_snapshot->'steps')
  LOOP
    INSERT INTO tm_test_steps (
      test_case_id,
      step_number,
      step_type,
      action,
      action_html,
      expected_result,
      expected_result_html,
      test_data,
      notes,
      is_optional,
      estimated_time_seconds
    ) VALUES (
      p_case_id,
      v_step_num,
      v_step->>'step_type',
      v_step->>'action',
      v_step->>'action_html',
      v_step->>'expected_result',
      v_step->>'expected_result_html',
      v_step->>'test_data',
      v_step->>'notes',
      COALESCE((v_step->>'is_optional')::boolean, false),
      (v_step->>'estimated_time_seconds')::integer
    );
    v_step_num := v_step_num + 1;
  END LOOP;

  -- Create new version for restore
  PERFORM tm_create_version_snapshot(p_case_id, 'Restored from v' || p_version_number);

  RETURN true;
END;
$$;

-- Function to clone a test case
CREATE OR REPLACE FUNCTION tm_clone_test_case(
  p_case_id UUID,
  p_new_title TEXT DEFAULT NULL,
  p_target_folder_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_new_id UUID;
  v_new_key TEXT;
  v_step RECORD;
BEGIN
  -- Get source case
  SELECT * INTO v_case FROM tm_test_cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test case not found';
  END IF;

  -- Generate new key
  SELECT 'TC-' || LPAD((COALESCE(MAX(NULLIF(REGEXP_REPLACE(key, '[^0-9]', '', 'g'), '')::integer), 0) + 1)::text, 5, '0')
  INTO v_new_key
  FROM tm_test_cases
  WHERE project_id = v_case.project_id;

  -- Create new case
  INSERT INTO tm_test_cases (
    project_id,
    folder_id,
    key,
    title,
    description,
    description_html,
    preconditions,
    preconditions_html,
    postconditions,
    postconditions_html,
    status,
    priority,
    type,
    test_format,
    gherkin_feature,
    gherkin_scenario,
    cloned_from_id,
    version,
    created_by
  ) VALUES (
    v_case.project_id,
    COALESCE(p_target_folder_id, v_case.folder_id),
    v_new_key,
    COALESCE(p_new_title, v_case.title || ' (Copy)'),
    v_case.description,
    v_case.description_html,
    v_case.preconditions,
    v_case.preconditions_html,
    v_case.postconditions,
    v_case.postconditions_html,
    'draft',
    v_case.priority,
    v_case.type,
    v_case.test_format,
    v_case.gherkin_feature,
    v_case.gherkin_scenario,
    p_case_id,
    1,
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  -- Clone steps
  FOR v_step IN 
    SELECT * FROM tm_test_steps 
    WHERE test_case_id = p_case_id 
    ORDER BY step_number
  LOOP
    INSERT INTO tm_test_steps (
      test_case_id,
      step_number,
      step_type,
      action,
      action_html,
      expected_result,
      expected_result_html,
      test_data,
      notes,
      is_optional,
      estimated_time_seconds
    ) VALUES (
      v_new_id,
      v_step.step_number,
      v_step.step_type,
      v_step.action,
      v_step.action_html,
      v_step.expected_result,
      v_step.expected_result_html,
      v_step.test_data,
      v_step.notes,
      v_step.is_optional,
      v_step.estimated_time_seconds
    );
  END LOOP;

  -- Clone requirement links
  INSERT INTO tm_requirement_links (
    test_case_id,
    requirement_type,
    requirement_id,
    external_key,
    external_url,
    external_title,
    link_type,
    notes,
    created_by
  )
  SELECT 
    v_new_id,
    requirement_type,
    requirement_id,
    external_key,
    external_url,
    external_title,
    link_type,
    notes,
    auth.uid()
  FROM tm_requirement_links
  WHERE test_case_id = p_case_id;

  RETURN v_new_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION tm_create_version_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION tm_get_version_history TO authenticated;
GRANT EXECUTE ON FUNCTION tm_restore_version TO authenticated;
GRANT EXECUTE ON FUNCTION tm_clone_test_case TO authenticated;
