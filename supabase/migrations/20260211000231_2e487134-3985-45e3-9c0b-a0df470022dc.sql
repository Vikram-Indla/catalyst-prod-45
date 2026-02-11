
-- ============================================
-- G7-01: TEST PLANS - DATABASE SETUP
-- ============================================

-- 1. Create sequence for plan keys
CREATE SEQUENCE IF NOT EXISTS th_plan_key_seq START WITH 1;

-- 2. Create test plans table
CREATE TABLE IF NOT EXISTS th_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES profiles(id),
  release_version VARCHAR(50),
  objectives TEXT,
  scope TEXT,
  total_cycles INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  executed_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  not_run_count INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create plan-cycles link table
CREATE TABLE IF NOT EXISTS th_plan_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES th_test_plans(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES th_test_cycles(id) ON DELETE CASCADE,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, cycle_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_status ON th_test_plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_owner ON th_test_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_cycles_plan ON th_plan_cycles(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_cycles_cycle ON th_plan_cycles(cycle_id);

-- 5. Create function to generate plan key
CREATE OR REPLACE FUNCTION generate_plan_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_key IS NULL OR NEW.plan_key = '' THEN
    NEW.plan_key := 'PLAN-' || LPAD(nextval('th_plan_key_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-generating plan key
DROP TRIGGER IF EXISTS trg_generate_plan_key ON th_test_plans;
CREATE TRIGGER trg_generate_plan_key
BEFORE INSERT ON th_test_plans
FOR EACH ROW EXECUTE FUNCTION generate_plan_key();

-- 7. Create function to update plan stats
CREATE OR REPLACE FUNCTION update_plan_stats(p_plan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_cycles INTEGER;
  v_total_cases INTEGER;
  v_executed INTEGER;
  v_passed INTEGER;
  v_failed INTEGER;
  v_blocked INTEGER;
  v_skipped INTEGER;
  v_not_run INTEGER;
  v_progress INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_cycles
  FROM th_plan_cycles WHERE plan_id = p_plan_id;

  SELECT 
    COALESCE(SUM(c.total_cases), 0),
    COALESCE(SUM(c.total_cases - c.not_run_count), 0),
    COALESCE(SUM(c.passed_count), 0),
    COALESCE(SUM(c.failed_count), 0),
    COALESCE(SUM(c.blocked_count), 0),
    COALESCE(SUM(c.skipped_count), 0),
    COALESCE(SUM(c.not_run_count), 0)
  INTO v_total_cases, v_executed, v_passed, v_failed, v_blocked, v_skipped, v_not_run
  FROM th_plan_cycles pc
  JOIN th_test_cycles c ON c.id = pc.cycle_id
  WHERE pc.plan_id = p_plan_id;

  IF v_total_cases > 0 THEN
    v_progress := ROUND((v_executed::NUMERIC / v_total_cases) * 100);
  ELSE
    v_progress := 0;
  END IF;

  UPDATE th_test_plans SET
    total_cycles = v_total_cycles,
    total_test_cases = v_total_cases,
    executed_count = v_executed,
    passed_count = v_passed,
    failed_count = v_failed,
    blocked_count = v_blocked,
    skipped_count = v_skipped,
    not_run_count = v_not_run,
    progress_percent = v_progress,
    updated_at = NOW()
  WHERE id = p_plan_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update plan stats when cycles change
CREATE OR REPLACE FUNCTION trigger_update_plan_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_plan_stats(OLD.plan_id);
    RETURN OLD;
  ELSE
    PERFORM update_plan_stats(NEW.plan_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_cycles_stats ON th_plan_cycles;
CREATE TRIGGER trg_plan_cycles_stats
AFTER INSERT OR UPDATE OR DELETE ON th_plan_cycles
FOR EACH ROW EXECUTE FUNCTION trigger_update_plan_stats();

-- 9. Create function to get plan summary
CREATE OR REPLACE FUNCTION get_plan_stats()
RETURNS TABLE (
  total_plans BIGINT,
  draft_plans BIGINT,
  active_plans BIGINT,
  completed_plans BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT
  FROM th_test_plans
  WHERE status != 'archived';
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get cycles not in any plan
CREATE OR REPLACE FUNCTION get_unassigned_cycles()
RETURNS TABLE (
  id UUID,
  cycle_key TEXT,
  name TEXT,
  status TEXT,
  total_cases INTEGER,
  progress_percent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cycle_key,
    c.name,
    c.status::TEXT,
    c.total_cases,
    c.progress_percent
  FROM th_test_cycles c
  WHERE NOT EXISTS (
    SELECT 1 FROM th_plan_cycles pc WHERE pc.cycle_id = c.id
  )
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Enable RLS
ALTER TABLE th_test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_plan_cycles ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON th_test_plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON th_plan_cycles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
