
-- ============================================
-- G6-01: DEFECT MANAGEMENT - DATABASE SETUP
-- ============================================

-- 1. Create sequence for defect keys
CREATE SEQUENCE IF NOT EXISTS th_defect_key_seq START WITH 1;

-- 2. Create defects table
CREATE TABLE IF NOT EXISTS th_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_key TEXT UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'new',
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  environment VARCHAR(100),
  steps_to_reproduce TEXT,
  expected_result TEXT,
  actual_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
);

-- 3. Create defect links table
CREATE TABLE IF NOT EXISTS th_defect_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES th_defects(id) ON DELETE CASCADE,
  link_type VARCHAR(20) NOT NULL,
  linked_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(defect_id, link_type, linked_id)
);

-- 4. Create defect comments table
CREATE TABLE IF NOT EXISTS th_defect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES th_defects(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create defect history table
CREATE TABLE IF NOT EXISTS th_defect_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES th_defects(id) ON DELETE CASCADE,
  field_changed VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_th_defects_status ON th_defects(status);
CREATE INDEX IF NOT EXISTS idx_th_defects_severity ON th_defects(severity);
CREATE INDEX IF NOT EXISTS idx_th_defects_assigned_to ON th_defects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_th_defects_reported_by ON th_defects(reported_by);
CREATE INDEX IF NOT EXISTS idx_th_defect_links_defect ON th_defect_links(defect_id);
CREATE INDEX IF NOT EXISTS idx_th_defect_links_linked ON th_defect_links(linked_id);
CREATE INDEX IF NOT EXISTS idx_th_defect_comments_defect ON th_defect_comments(defect_id);
CREATE INDEX IF NOT EXISTS idx_th_defect_history_defect ON th_defect_history(defect_id);

-- 7. Create function to generate defect key
CREATE OR REPLACE FUNCTION generate_defect_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.defect_key IS NULL OR NEW.defect_key = '' THEN
    NEW.defect_key := 'DEF-' || LPAD(nextval('th_defect_key_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for auto-generating defect key
DROP TRIGGER IF EXISTS trg_generate_defect_key ON th_defects;
CREATE TRIGGER trg_generate_defect_key
BEFORE INSERT ON th_defects
FOR EACH ROW EXECUTE FUNCTION generate_defect_key();

-- 9. Create function to log defect history
CREATE OR REPLACE FUNCTION log_defect_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO th_defect_history (defect_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.assigned_to);
  END IF;
  IF OLD.severity IS DISTINCT FROM NEW.severity THEN
    INSERT INTO th_defect_history (defect_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'severity', OLD.severity, NEW.severity, NEW.assigned_to);
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO th_defect_history (defect_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'priority', OLD.priority, NEW.priority, NEW.assigned_to);
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO th_defect_history (defect_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, NEW.assigned_to);
  END IF;
  NEW.updated_at := NOW();
  IF NEW.status = 'fixed' AND OLD.status != 'fixed' THEN
    NEW.resolved_at := NOW();
  END IF;
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    NEW.verified_at := NOW();
  END IF;
  IF NEW.status = 'reopened' THEN
    NEW.resolved_at := NULL;
    NEW.verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for defect history
DROP TRIGGER IF EXISTS trg_log_defect_history ON th_defects;
CREATE TRIGGER trg_log_defect_history
BEFORE UPDATE ON th_defects
FOR EACH ROW EXECUTE FUNCTION log_defect_history();

-- 11. Create function to get defect stats
CREATE OR REPLACE FUNCTION get_defect_stats()
RETURNS TABLE (
  total_defects BIGINT,
  open_defects BIGINT,
  in_progress_defects BIGINT,
  fixed_defects BIGINT,
  verified_defects BIGINT,
  closed_defects BIGINT,
  critical_defects BIGINT,
  high_defects BIGINT,
  medium_defects BIGINT,
  low_defects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_defects,
    COUNT(*) FILTER (WHERE th_defects.status IN ('new', 'open', 'reopened'))::BIGINT as open_defects,
    COUNT(*) FILTER (WHERE th_defects.status = 'in_progress')::BIGINT as in_progress_defects,
    COUNT(*) FILTER (WHERE th_defects.status = 'fixed')::BIGINT as fixed_defects,
    COUNT(*) FILTER (WHERE th_defects.status = 'verified')::BIGINT as verified_defects,
    COUNT(*) FILTER (WHERE th_defects.status = 'closed')::BIGINT as closed_defects,
    COUNT(*) FILTER (WHERE th_defects.severity = 'critical' AND th_defects.status NOT IN ('closed', 'verified'))::BIGINT as critical_defects,
    COUNT(*) FILTER (WHERE th_defects.severity = 'high' AND th_defects.status NOT IN ('closed', 'verified'))::BIGINT as high_defects,
    COUNT(*) FILTER (WHERE th_defects.severity = 'medium' AND th_defects.status NOT IN ('closed', 'verified'))::BIGINT as medium_defects,
    COUNT(*) FILTER (WHERE th_defects.severity = 'low' AND th_defects.status NOT IN ('closed', 'verified'))::BIGINT as low_defects
  FROM th_defects;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get linked tests for a defect
CREATE OR REPLACE FUNCTION get_defect_linked_tests(p_defect_id UUID)
RETURNS TABLE (
  link_id UUID,
  link_type TEXT,
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  cycle_key TEXT,
  execution_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dl.id as link_id,
    dl.link_type::TEXT,
    tc.id as test_case_id,
    tc.case_key::TEXT,
    tc.title::TEXT,
    cyc.cycle_key::TEXT,
    ctc.execution_status::TEXT
  FROM th_defect_links dl
  LEFT JOIN th_cycle_test_cases ctc ON dl.link_type = 'cycle_test_case' AND dl.linked_id = ctc.id
  LEFT JOIN th_test_cases tc ON 
    (dl.link_type = 'test_case' AND dl.linked_id = tc.id) OR
    (dl.link_type = 'cycle_test_case' AND ctc.test_case_id = tc.id)
  LEFT JOIN th_test_cycles cyc ON ctc.cycle_id = cyc.id
  WHERE dl.defect_id = p_defect_id
  ORDER BY dl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 13. Enable RLS
ALTER TABLE th_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_defect_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_defect_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_defect_history ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_defects;
CREATE POLICY "Allow all for authenticated users" ON th_defects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_defect_links;
CREATE POLICY "Allow all for authenticated users" ON th_defect_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_defect_comments;
CREATE POLICY "Allow all for authenticated users" ON th_defect_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_defect_history;
CREATE POLICY "Allow all for authenticated users" ON th_defect_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
