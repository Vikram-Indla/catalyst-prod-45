
-- =====================================================
-- MODULE 4B-4: REQUIREMENT LINKING
-- Links test cases to requirements/stories for traceability
-- =====================================================

-- Create requirement links table
CREATE TABLE IF NOT EXISTS tm_requirement_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('story', 'epic', 'feature', 'business_request', 'external')),
  requirement_id UUID, -- Internal reference
  external_key TEXT, -- External system key (e.g., JIRA-123)
  external_url TEXT,
  external_title TEXT,
  link_type TEXT DEFAULT 'verifies' CHECK (link_type IN ('verifies', 'tests', 'derives_from', 'related_to')),
  coverage_status TEXT DEFAULT 'pending' CHECK (coverage_status IN ('pending', 'partial', 'full', 'blocked')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_case_id, requirement_type, requirement_id),
  UNIQUE(test_case_id, requirement_type, external_key)
);

-- Enable RLS
ALTER TABLE tm_requirement_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view requirement links in their projects"
  ON tm_requirement_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_requirement_links.test_case_id
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage requirement links in their projects"
  ON tm_requirement_links FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tm_test_cases tc
    JOIN project_members pm ON pm.project_id = tc.project_id
    WHERE tc.id = tm_requirement_links.test_case_id
    AND pm.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_req_links_case ON tm_requirement_links(test_case_id);
CREATE INDEX IF NOT EXISTS idx_req_links_requirement ON tm_requirement_links(requirement_type, requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_links_external ON tm_requirement_links(external_key) WHERE external_key IS NOT NULL;

-- Function to get requirement links for a test case
CREATE OR REPLACE FUNCTION tm_get_case_requirements(p_case_id UUID)
RETURNS TABLE (
  id UUID,
  test_case_id UUID,
  requirement_type TEXT,
  requirement_id UUID,
  external_key TEXT,
  external_url TEXT,
  external_title TEXT,
  link_type TEXT,
  coverage_status TEXT,
  notes TEXT,
  requirement_title TEXT,
  requirement_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.id,
    rl.test_case_id,
    rl.requirement_type,
    rl.requirement_id,
    rl.external_key,
    rl.external_url,
    rl.external_title,
    rl.link_type,
    rl.coverage_status,
    rl.notes,
    CASE 
      WHEN rl.requirement_type = 'story' THEN s.title
      WHEN rl.requirement_type = 'epic' THEN e.name
      WHEN rl.requirement_type = 'feature' THEN f.name
      WHEN rl.requirement_type = 'business_request' THEN br.title
      ELSE rl.external_title
    END as requirement_title,
    CASE 
      WHEN rl.requirement_type = 'story' THEN s.status
      WHEN rl.requirement_type = 'epic' THEN e.status
      WHEN rl.requirement_type = 'feature' THEN f.status
      WHEN rl.requirement_type = 'business_request' THEN br.process_step
      ELSE NULL
    END as requirement_status,
    rl.created_at
  FROM tm_requirement_links rl
  LEFT JOIN stories s ON rl.requirement_type = 'story' AND rl.requirement_id = s.id
  LEFT JOIN epics e ON rl.requirement_type = 'epic' AND rl.requirement_id = e.id
  LEFT JOIN features f ON rl.requirement_type = 'feature' AND rl.requirement_id = f.id
  LEFT JOIN business_requests br ON rl.requirement_type = 'business_request' AND rl.requirement_id = br.id
  WHERE rl.test_case_id = p_case_id
  ORDER BY rl.created_at DESC;
END;
$$;

-- Function to get test cases for a requirement
CREATE OR REPLACE FUNCTION tm_get_requirement_test_cases(
  p_requirement_type TEXT,
  p_requirement_id UUID
)
RETURNS TABLE (
  link_id UUID,
  test_case_id UUID,
  test_case_key TEXT,
  test_case_title TEXT,
  test_case_status TEXT,
  test_case_priority TEXT,
  link_type TEXT,
  coverage_status TEXT,
  last_execution_status TEXT,
  last_execution_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.id as link_id,
    tc.id as test_case_id,
    tc.key as test_case_key,
    tc.title as test_case_title,
    tc.status as test_case_status,
    tc.priority as test_case_priority,
    rl.link_type,
    rl.coverage_status,
    (
      SELECT te.status 
      FROM tm_test_executions te 
      WHERE te.test_case_id = tc.id 
      ORDER BY te.executed_at DESC NULLS LAST, te.created_at DESC 
      LIMIT 1
    ) as last_execution_status,
    (
      SELECT te.executed_at 
      FROM tm_test_executions te 
      WHERE te.test_case_id = tc.id 
      ORDER BY te.executed_at DESC NULLS LAST, te.created_at DESC 
      LIMIT 1
    ) as last_execution_date
  FROM tm_requirement_links rl
  JOIN tm_test_cases tc ON tc.id = rl.test_case_id
  WHERE rl.requirement_type = p_requirement_type
    AND rl.requirement_id = p_requirement_id
  ORDER BY tc.key;
END;
$$;

-- Function to link requirement to test case
CREATE OR REPLACE FUNCTION tm_link_requirement(
  p_case_id UUID,
  p_requirement_type TEXT,
  p_requirement_id UUID DEFAULT NULL,
  p_external_key TEXT DEFAULT NULL,
  p_external_url TEXT DEFAULT NULL,
  p_external_title TEXT DEFAULT NULL,
  p_link_type TEXT DEFAULT 'verifies',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
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
  ) VALUES (
    p_case_id,
    p_requirement_type,
    p_requirement_id,
    p_external_key,
    p_external_url,
    p_external_title,
    p_link_type,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to update coverage status
CREATE OR REPLACE FUNCTION tm_update_coverage_status(
  p_link_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tm_requirement_links
  SET coverage_status = p_status, updated_at = now()
  WHERE id = p_link_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get traceability matrix
CREATE OR REPLACE FUNCTION tm_get_traceability_matrix(p_project_id UUID)
RETURNS TABLE (
  requirement_type TEXT,
  requirement_id UUID,
  requirement_title TEXT,
  requirement_status TEXT,
  total_test_cases BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  blocked_count BIGINT,
  not_run_count BIGINT,
  coverage_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH linked_cases AS (
    SELECT 
      rl.requirement_type,
      rl.requirement_id,
      rl.test_case_id,
      (
        SELECT te.status 
        FROM tm_test_executions te 
        WHERE te.test_case_id = rl.test_case_id 
        ORDER BY te.executed_at DESC NULLS LAST 
        LIMIT 1
      ) as last_status
    FROM tm_requirement_links rl
    JOIN tm_test_cases tc ON tc.id = rl.test_case_id
    WHERE tc.project_id = p_project_id
      AND rl.requirement_id IS NOT NULL
  ),
  req_stats AS (
    SELECT 
      lc.requirement_type,
      lc.requirement_id,
      COUNT(DISTINCT lc.test_case_id) as total_cases,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'passed') as passed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'failed') as failed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'blocked') as blocked,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status IS NULL OR lc.last_status = 'not_run') as not_run
    FROM linked_cases lc
    GROUP BY lc.requirement_type, lc.requirement_id
  )
  SELECT 
    rs.requirement_type,
    rs.requirement_id,
    CASE 
      WHEN rs.requirement_type = 'story' THEN s.title
      WHEN rs.requirement_type = 'epic' THEN e.name
      WHEN rs.requirement_type = 'feature' THEN f.name
      WHEN rs.requirement_type = 'business_request' THEN br.title
    END as requirement_title,
    CASE 
      WHEN rs.requirement_type = 'story' THEN s.status
      WHEN rs.requirement_type = 'epic' THEN e.status
      WHEN rs.requirement_type = 'feature' THEN f.status
      WHEN rs.requirement_type = 'business_request' THEN br.process_step
    END as requirement_status,
    rs.total_cases as total_test_cases,
    rs.passed as passed_count,
    rs.failed as failed_count,
    rs.blocked as blocked_count,
    rs.not_run as not_run_count,
    CASE WHEN rs.total_cases > 0 
      THEN ROUND((rs.passed::numeric / rs.total_cases) * 100, 1)
      ELSE 0 
    END as coverage_pct
  FROM req_stats rs
  LEFT JOIN stories s ON rs.requirement_type = 'story' AND rs.requirement_id = s.id
  LEFT JOIN epics e ON rs.requirement_type = 'epic' AND rs.requirement_id = e.id
  LEFT JOIN features f ON rs.requirement_type = 'feature' AND rs.requirement_id = f.id
  LEFT JOIN business_requests br ON rs.requirement_type = 'business_request' AND rs.requirement_id = br.id
  ORDER BY rs.requirement_type, requirement_title;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION tm_get_case_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION tm_get_requirement_test_cases TO authenticated;
GRANT EXECUTE ON FUNCTION tm_link_requirement TO authenticated;
GRANT EXECUTE ON FUNCTION tm_update_coverage_status TO authenticated;
GRANT EXECUTE ON FUNCTION tm_get_traceability_matrix TO authenticated;
