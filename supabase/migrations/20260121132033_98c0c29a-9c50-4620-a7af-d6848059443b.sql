
-- =====================================================
-- MODULE 4B-2: BDD/GHERKIN SUPPORT
-- Adds Gherkin syntax storage, parsing, and scenario management
-- =====================================================

-- Add BDD/Gherkin fields to test cases
ALTER TABLE tm_test_cases 
ADD COLUMN IF NOT EXISTS gherkin_feature TEXT,
ADD COLUMN IF NOT EXISTS gherkin_scenario TEXT,
ADD COLUMN IF NOT EXISTS test_format TEXT DEFAULT 'classic' CHECK (test_format IN ('classic', 'bdd'));

-- Create table for reusable step definitions
CREATE TABLE IF NOT EXISTS tm_step_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL CHECK (keyword IN ('Given', 'When', 'Then', 'And', 'But')),
  pattern TEXT NOT NULL,
  description TEXT,
  example_data JSONB,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, keyword, pattern)
);

-- Create table for parsed Gherkin steps (linked to test cases)
CREATE TABLE IF NOT EXISTS tm_gherkin_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  keyword TEXT NOT NULL CHECK (keyword IN ('Given', 'When', 'Then', 'And', 'But')),
  step_text TEXT NOT NULL,
  step_definition_id UUID REFERENCES tm_step_definitions(id) ON DELETE SET NULL,
  data_table JSONB,
  doc_string TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tm_step_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_gherkin_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for step definitions
CREATE POLICY "Users can view step definitions in their projects"
  ON tm_step_definitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = tm_step_definitions.project_id 
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage step definitions in their projects"
  ON tm_step_definitions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = tm_step_definitions.project_id 
    AND pm.user_id = auth.uid()
  ));

-- RLS policies for gherkin steps
CREATE POLICY "Users can view gherkin steps"
  ON tm_gherkin_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_gherkin_steps.test_case_id
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage gherkin steps"
  ON tm_gherkin_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_gherkin_steps.test_case_id
    AND pm.user_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gherkin_steps_case ON tm_gherkin_steps(test_case_id, step_number);
CREATE INDEX IF NOT EXISTS idx_step_definitions_project ON tm_step_definitions(project_id);
CREATE INDEX IF NOT EXISTS idx_step_definitions_pattern ON tm_step_definitions(pattern);

-- Function to parse and save Gherkin scenario
CREATE OR REPLACE FUNCTION tm_save_gherkin_scenario(
  p_case_id UUID,
  p_feature TEXT,
  p_scenario TEXT,
  p_steps JSONB -- Array of {keyword, step_text, data_table?, doc_string?}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step JSONB;
  v_step_num INTEGER := 1;
BEGIN
  -- Update test case with Gherkin content
  UPDATE tm_test_cases
  SET 
    gherkin_feature = p_feature,
    gherkin_scenario = p_scenario,
    test_format = 'bdd',
    updated_at = now()
  WHERE id = p_case_id;

  -- Delete existing gherkin steps
  DELETE FROM tm_gherkin_steps WHERE test_case_id = p_case_id;

  -- Insert new steps
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO tm_gherkin_steps (
      test_case_id,
      step_number,
      keyword,
      step_text,
      data_table,
      doc_string
    ) VALUES (
      p_case_id,
      v_step_num,
      v_step->>'keyword',
      v_step->>'step_text',
      v_step->'data_table',
      v_step->>'doc_string'
    );
    v_step_num := v_step_num + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'steps_saved', v_step_num - 1
  );
END;
$$;

-- Function to get Gherkin scenario for a test case
CREATE OR REPLACE FUNCTION tm_get_gherkin_scenario(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps JSONB;
BEGIN
  SELECT gherkin_feature, gherkin_scenario, test_format
  INTO v_case
  FROM tm_test_cases
  WHERE id = p_case_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', gs.id,
      'step_number', gs.step_number,
      'keyword', gs.keyword,
      'step_text', gs.step_text,
      'data_table', gs.data_table,
      'doc_string', gs.doc_string,
      'definition_id', gs.step_definition_id
    ) ORDER BY gs.step_number
  ), '[]'::jsonb)
  INTO v_steps
  FROM tm_gherkin_steps gs
  WHERE gs.test_case_id = p_case_id;

  RETURN jsonb_build_object(
    'feature', v_case.gherkin_feature,
    'scenario', v_case.gherkin_scenario,
    'format', v_case.test_format,
    'steps', v_steps
  );
END;
$$;

-- Function to convert classic steps to BDD format
CREATE OR REPLACE FUNCTION tm_convert_to_bdd(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step RECORD;
  v_keyword TEXT;
  v_step_num INTEGER := 1;
  v_last_keyword TEXT := 'Given';
BEGIN
  -- Delete existing gherkin steps
  DELETE FROM tm_gherkin_steps WHERE test_case_id = p_case_id;

  -- Convert each classic step
  FOR v_step IN 
    SELECT * FROM tm_test_steps 
    WHERE test_case_id = p_case_id 
    ORDER BY step_number
  LOOP
    -- Determine keyword based on step type
    CASE v_step.step_type
      WHEN 'setup' THEN v_keyword := 'Given';
      WHEN 'action' THEN 
        IF v_last_keyword = 'Given' THEN v_keyword := 'When';
        ELSE v_keyword := 'And';
        END IF;
      WHEN 'verification' THEN 
        IF v_last_keyword IN ('Given', 'When') THEN v_keyword := 'Then';
        ELSE v_keyword := 'And';
        END IF;
      WHEN 'teardown' THEN v_keyword := 'And';
      ELSE v_keyword := 'And';
    END CASE;

    INSERT INTO tm_gherkin_steps (
      test_case_id,
      step_number,
      keyword,
      step_text,
      doc_string
    ) VALUES (
      p_case_id,
      v_step_num,
      v_keyword,
      v_step.action,
      v_step.expected_result
    );

    v_last_keyword := v_keyword;
    v_step_num := v_step_num + 1;
  END LOOP;

  -- Update test case format
  UPDATE tm_test_cases
  SET test_format = 'bdd', updated_at = now()
  WHERE id = p_case_id;

  RETURN jsonb_build_object(
    'success', true,
    'steps_converted', v_step_num - 1
  );
END;
$$;

-- Function to get step definition suggestions
CREATE OR REPLACE FUNCTION tm_get_step_suggestions(
  p_project_id UUID,
  p_keyword TEXT,
  p_partial_text TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  keyword TEXT,
  pattern TEXT,
  description TEXT,
  usage_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.id,
    sd.keyword,
    sd.pattern,
    sd.description,
    sd.usage_count
  FROM tm_step_definitions sd
  WHERE sd.project_id = p_project_id
    AND (p_keyword IS NULL OR sd.keyword = p_keyword)
    AND (p_partial_text = '' OR sd.pattern ILIKE '%' || p_partial_text || '%')
  ORDER BY sd.usage_count DESC, sd.pattern
  LIMIT 20;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION tm_save_gherkin_scenario TO authenticated;
GRANT EXECUTE ON FUNCTION tm_get_gherkin_scenario TO authenticated;
GRANT EXECUTE ON FUNCTION tm_convert_to_bdd TO authenticated;
GRANT EXECUTE ON FUNCTION tm_get_step_suggestions TO authenticated;
