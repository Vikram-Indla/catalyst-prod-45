
-- G8-01: REQUIREMENTS TRACEABILITY - DATABASE SETUP

-- 1. Create sequence for requirement keys
CREATE SEQUENCE IF NOT EXISTS th_requirement_key_seq START WITH 1;

-- 2. Create requirements table
CREATE TABLE IF NOT EXISTS th_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_key TEXT UNIQUE NOT NULL DEFAULT '',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) DEFAULT 'functional',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'draft',
  source VARCHAR(100),
  external_id VARCHAR(100),
  release_version VARCHAR(50),
  owner_id UUID REFERENCES profiles(id),
  total_linked_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  not_run_tests INTEGER DEFAULT 0,
  coverage_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create requirement-test links table
CREATE TABLE IF NOT EXISTS th_requirement_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES th_requirements(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(requirement_id, test_case_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_requirements_status ON th_requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_type ON th_requirements(type);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON th_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_owner ON th_requirements(owner_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tests_req ON th_requirement_tests(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tests_test ON th_requirement_tests(test_case_id);

-- 5. Create function to generate requirement key
CREATE OR REPLACE FUNCTION generate_requirement_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.req_key IS NULL OR NEW.req_key = '' THEN
    NEW.req_key := 'REQ-' || LPAD(nextval('th_requirement_key_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-generating requirement key
DROP TRIGGER IF EXISTS trg_generate_requirement_key ON th_requirements;
CREATE TRIGGER trg_generate_requirement_key
BEFORE INSERT ON th_requirements
FOR EACH ROW EXECUTE FUNCTION generate_requirement_key();

-- 7. Create function to update requirement coverage stats
CREATE OR REPLACE FUNCTION update_requirement_coverage(p_requirement_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_passed INTEGER;
  v_failed INTEGER;
  v_not_run INTEGER;
  v_coverage INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM th_requirement_tests WHERE requirement_id = p_requirement_id;

  SELECT 
    COUNT(*) FILTER (WHERE latest_status = 'passed'),
    COUNT(*) FILTER (WHERE latest_status = 'failed'),
    COUNT(*) FILTER (WHERE latest_status IS NULL OR latest_status = 'not_run')
  INTO v_passed, v_failed, v_not_run
  FROM (
    SELECT DISTINCT ON (rt.test_case_id) 
      rt.test_case_id,
      ctc.execution_status as latest_status
    FROM th_requirement_tests rt
    LEFT JOIN th_cycle_test_cases ctc ON ctc.test_case_id = rt.test_case_id
    WHERE rt.requirement_id = p_requirement_id
    ORDER BY rt.test_case_id, ctc.executed_at DESC NULLS LAST
  ) sub;

  IF v_total > 0 THEN
    v_coverage := ROUND(((v_passed + v_failed)::NUMERIC / v_total) * 100);
  ELSE
    v_coverage := 0;
  END IF;

  UPDATE th_requirements SET
    total_linked_tests = v_total,
    passed_tests = COALESCE(v_passed, 0),
    failed_tests = COALESCE(v_failed, 0),
    not_run_tests = COALESCE(v_not_run, 0),
    coverage_percent = v_coverage,
    updated_at = NOW()
  WHERE id = p_requirement_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update coverage when links change
CREATE OR REPLACE FUNCTION trigger_update_requirement_coverage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_requirement_coverage(OLD.requirement_id);
    RETURN OLD;
  ELSE
    PERFORM update_requirement_coverage(NEW.requirement_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_requirement_tests_coverage ON th_requirement_tests;
CREATE TRIGGER trg_requirement_tests_coverage
AFTER INSERT OR UPDATE OR DELETE ON th_requirement_tests
FOR EACH ROW EXECUTE FUNCTION trigger_update_requirement_coverage();

-- 9. Create function to get coverage summary
CREATE OR REPLACE FUNCTION get_requirements_coverage_summary()
RETURNS TABLE (
  total_requirements BIGINT,
  fully_covered BIGINT,
  partially_covered BIGINT,
  not_covered BIGINT,
  avg_coverage_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE r.coverage_percent = 100)::BIGINT,
    COUNT(*) FILTER (WHERE r.coverage_percent > 0 AND r.coverage_percent < 100)::BIGINT,
    COUNT(*) FILTER (WHERE r.coverage_percent = 0 OR r.total_linked_tests = 0)::BIGINT,
    ROUND(AVG(r.coverage_percent), 1)
  FROM th_requirements r
  WHERE r.status != 'deprecated';
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get tests for a requirement
CREATE OR REPLACE FUNCTION get_requirement_tests(p_requirement_id UUID)
RETURNS TABLE (
  link_id UUID,
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  latest_status TEXT,
  last_executed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as link_id,
    tc.id as test_case_id,
    tc.case_key::TEXT,
    tc.title::TEXT,
    tc.priority::TEXT,
    (
      SELECT ctc.execution_status::TEXT
      FROM th_cycle_test_cases ctc 
      WHERE ctc.test_case_id = tc.id 
      ORDER BY ctc.executed_at DESC NULLS LAST 
      LIMIT 1
    ) as latest_status,
    (
      SELECT ctc.executed_at 
      FROM th_cycle_test_cases ctc 
      WHERE ctc.test_case_id = tc.id 
      ORDER BY ctc.executed_at DESC NULLS LAST 
      LIMIT 1
    ) as last_executed
  FROM th_requirement_tests rt
  JOIN th_test_cases tc ON tc.id = rt.test_case_id
  WHERE rt.requirement_id = p_requirement_id
  ORDER BY tc.case_key;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to get requirements for a test case
CREATE OR REPLACE FUNCTION get_test_requirements(p_test_case_id UUID)
RETURNS TABLE (
  link_id UUID,
  requirement_id UUID,
  req_key TEXT,
  title TEXT,
  type TEXT,
  priority TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as link_id,
    r.id as requirement_id,
    r.req_key::TEXT,
    r.title::TEXT,
    r.type::TEXT,
    r.priority::TEXT,
    r.status::TEXT
  FROM th_requirement_tests rt
  JOIN th_requirements r ON r.id = rt.requirement_id
  WHERE rt.test_case_id = p_test_case_id
  ORDER BY r.req_key;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get unlinked test cases
CREATE OR REPLACE FUNCTION get_unlinked_test_cases()
RETURNS TABLE (
  id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT tc.id, tc.case_key::TEXT, tc.title::TEXT, tc.priority::TEXT
  FROM th_test_cases tc
  WHERE NOT EXISTS (
    SELECT 1 FROM th_requirement_tests rt WHERE rt.test_case_id = tc.id
  )
  ORDER BY tc.case_key;
END;
$$ LANGUAGE plpgsql;

-- 13. Enable RLS
ALTER TABLE th_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_requirement_tests ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_requirements;
CREATE POLICY "Allow all for authenticated users" ON th_requirements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_requirement_tests;
CREATE POLICY "Allow all for authenticated users" ON th_requirement_tests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
