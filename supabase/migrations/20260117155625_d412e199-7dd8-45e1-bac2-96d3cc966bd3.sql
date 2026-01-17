-- ═══════════════════════════════════════════════════════════════════════════════
-- CATALYST TEST MANAGEMENT — TEST PLANS EXTENSION
-- Adds Test Plans capability to existing tm_* schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM FOR TEST PLAN STATUS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE tm_test_plan_status AS ENUM ('draft', 'active', 'executing', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEQUENCE FOR TEST PLAN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS tm_test_plan_key_seq START 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- TM_TEST_PLANS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tm_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  plan_key VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status tm_test_plan_status DEFAULT 'draft',
  
  -- Schedule
  start_date DATE,
  end_date DATE,
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  
  -- Scope
  objectives TEXT,
  in_scope TEXT,
  out_of_scope TEXT,
  test_strategy TEXT,
  environment_requirements TEXT,
  
  -- Team
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_members UUID[] DEFAULT '{}',
  
  -- Computed Stats (updated by triggers)
  total_tests INT DEFAULT 0,
  passed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  blocked_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  not_run_count INT DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_project ON tm_test_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_status ON tm_test_plans(status);
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_release ON tm_test_plans(release_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_owner ON tm_test_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_key ON tm_test_plans(plan_key);

-- Auto-generate plan_key trigger
CREATE OR REPLACE FUNCTION generate_tm_test_plan_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_key IS NULL OR NEW.plan_key = '' THEN
    NEW.plan_key := 'TP-' || LPAD(nextval('tm_test_plan_key_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_test_plan_key ON tm_test_plans;
CREATE TRIGGER trg_tm_test_plan_key
  BEFORE INSERT ON tm_test_plans
  FOR EACH ROW
  EXECUTE FUNCTION generate_tm_test_plan_key();

-- ─────────────────────────────────────────────────────────────────────────────
-- TM_TEST_PLAN_CASES (Junction Table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tm_test_plan_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_plan_id UUID NOT NULL REFERENCES tm_test_plans(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  UNIQUE(test_plan_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_test_plan_cases_plan ON tm_test_plan_cases(test_plan_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_plan_cases_case ON tm_test_plan_cases(test_case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD test_plan_id TO tm_test_cycles (Link cycles to plans)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_test_cycles' AND column_name = 'test_plan_id') THEN
    ALTER TABLE tm_test_cycles ADD COLUMN test_plan_id UUID REFERENCES tm_test_plans(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tm_test_cycles_plan ON tm_test_cycles(test_plan_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD source columns to tm_defects for traceability
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_defects' AND column_name = 'source_test_run_id') THEN
    ALTER TABLE tm_defects ADD COLUMN source_test_run_id UUID REFERENCES tm_test_runs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_defects' AND column_name = 'source_test_case_id') THEN
    ALTER TABLE tm_defects ADD COLUMN source_test_case_id UUID REFERENCES tm_test_cases(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_defects' AND column_name = 'source_test_plan_id') THEN
    ALTER TABLE tm_defects ADD COLUMN source_test_plan_id UUID REFERENCES tm_test_plans(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_defects' AND column_name = 'auto_created') THEN
    ALTER TABLE tm_defects ADD COLUMN auto_created BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADD auto_created_defect_id to tm_test_runs
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tm_test_runs' AND column_name = 'auto_created_defect_id') THEN
    ALTER TABLE tm_test_runs ADD COLUMN auto_created_defect_id UUID REFERENCES tm_defects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE DEFECT ON TEST FAILURE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION tm_auto_create_defect_on_failure()
RETURNS TRIGGER AS $$
DECLARE
  v_cycle_scope tm_cycle_scope%ROWTYPE;
  v_test_case tm_test_cases%ROWTYPE;
  v_cycle tm_test_cycles%ROWTYPE;
  v_defect_id UUID;
  v_defect_key VARCHAR(20);
  v_severity TEXT;
  v_priority_name TEXT;
BEGIN
  -- Only trigger on status change to 'failed'
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    
    -- Get cycle scope details
    SELECT * INTO v_cycle_scope FROM tm_cycle_scope WHERE id = NEW.cycle_scope_id;
    
    -- Get test case details
    SELECT * INTO v_test_case FROM tm_test_cases WHERE id = v_cycle_scope.test_case_id;
    
    -- Get cycle details
    SELECT * INTO v_cycle FROM tm_test_cycles WHERE id = v_cycle_scope.cycle_id;
    
    -- Get priority name for severity mapping
    SELECT name INTO v_priority_name FROM tm_case_priorities WHERE id = v_test_case.priority_id;
    
    -- Map priority to severity
    v_severity := CASE LOWER(COALESCE(v_priority_name, 'medium'))
      WHEN 'critical' THEN 'blocker'
      WHEN 'high' THEN 'critical'
      WHEN 'medium' THEN 'major'
      WHEN 'low' THEN 'minor'
      ELSE 'major'
    END;
    
    -- Generate defect key
    v_defect_key := 'DEF-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(defect_key FROM 5) AS INTEGER)), 0) + 1 FROM tm_defects)::TEXT, 5, '0');
    
    -- Create defect
    INSERT INTO tm_defects (
      project_id,
      defect_key,
      title,
      description,
      severity,
      status,
      source_test_run_id,
      source_test_case_id,
      source_test_plan_id,
      expected_result,
      actual_result,
      steps_to_reproduce,
      reporter_id,
      auto_created,
      found_during
    ) VALUES (
      v_test_case.project_id,
      v_defect_key,
      'Test Failed: ' || COALESCE(v_test_case.title, 'Unknown Test'),
      COALESCE(NEW.notes, 'Automated defect from failed test execution'),
      v_severity::tm_defect_severity,
      'open',
      NEW.id,
      v_cycle_scope.test_case_id,
      v_cycle.test_plan_id,
      v_test_case.expected_result,
      NEW.notes,
      v_test_case.preconditions,
      NEW.executed_by,
      true,
      'test_execution'
    ) RETURNING id INTO v_defect_id;
    
    -- Update test run with defect reference
    NEW.auto_created_defect_id := v_defect_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_auto_create_defect ON tm_test_runs;
CREATE TRIGGER trg_tm_auto_create_defect
  BEFORE UPDATE ON tm_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION tm_auto_create_defect_on_failure();

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATE PLAN STATS TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION tm_update_plan_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  v_plan_id := COALESCE(NEW.test_plan_id, OLD.test_plan_id);
  
  IF v_plan_id IS NOT NULL THEN
    UPDATE tm_test_plans SET
      total_tests = (SELECT COUNT(*) FROM tm_test_plan_cases WHERE test_plan_id = v_plan_id),
      updated_at = NOW()
    WHERE id = v_plan_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_update_plan_stats ON tm_test_plan_cases;
CREATE TRIGGER trg_tm_update_plan_stats
  AFTER INSERT OR DELETE ON tm_test_plan_cases
  FOR EACH ROW
  EXECUTE FUNCTION tm_update_plan_stats();

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get plan progress stats
CREATE OR REPLACE FUNCTION tm_get_plan_stats(p_test_plan_id UUID)
RETURNS TABLE (
  total_tests BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  skipped BIGINT,
  not_run BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cycle_runs AS (
    SELECT DISTINCT ON (cs.test_case_id) 
      tr.status
    FROM tm_test_cycles c
    JOIN tm_cycle_scope cs ON cs.cycle_id = c.id
    LEFT JOIN tm_test_runs tr ON tr.cycle_scope_id = cs.id
    WHERE c.test_plan_id = p_test_plan_id
    ORDER BY cs.test_case_id, tr.created_at DESC
  )
  SELECT
    (SELECT COUNT(*) FROM tm_test_plan_cases WHERE test_plan_id = p_test_plan_id)::BIGINT AS total_tests,
    COALESCE(COUNT(*) FILTER (WHERE status = 'passed'), 0)::BIGINT AS passed,
    COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0)::BIGINT AS failed,
    COALESCE(COUNT(*) FILTER (WHERE status = 'blocked'), 0)::BIGINT AS blocked,
    COALESCE(COUNT(*) FILTER (WHERE status = 'skipped'), 0)::BIGINT AS skipped,
    COALESCE(COUNT(*) FILTER (WHERE status IS NULL OR status = 'not_run'), 0)::BIGINT AS not_run,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'passed')::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0
    END AS pass_rate
  FROM cycle_runs;
END;
$$ LANGUAGE plpgsql;

-- Get plan burndown data
CREATE OR REPLACE FUNCTION tm_get_plan_burndown(
  p_test_plan_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  passed INTEGER,
  failed INTEGER,
  blocked INTEGER,
  remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  ),
  daily_counts AS (
    SELECT
      d.date,
      COUNT(*) FILTER (WHERE tr.status = 'passed' AND tr.completed_at::DATE <= d.date) AS passed,
      COUNT(*) FILTER (WHERE tr.status = 'failed' AND tr.completed_at::DATE <= d.date) AS failed,
      COUNT(*) FILTER (WHERE tr.status = 'blocked' AND tr.completed_at::DATE <= d.date) AS blocked
    FROM dates d
    CROSS JOIN tm_test_plan_cases tpc
    LEFT JOIN tm_test_cycles c ON c.test_plan_id = tpc.test_plan_id
    LEFT JOIN tm_cycle_scope cs ON cs.cycle_id = c.id AND cs.test_case_id = tpc.test_case_id
    LEFT JOIN tm_test_runs tr ON tr.cycle_scope_id = cs.id
    WHERE tpc.test_plan_id = p_test_plan_id
    GROUP BY d.date
  ),
  total_tests AS (
    SELECT COUNT(*) AS total FROM tm_test_plan_cases WHERE test_plan_id = p_test_plan_id
  )
  SELECT
    dc.date,
    dc.passed::INTEGER,
    dc.failed::INTEGER,
    dc.blocked::INTEGER,
    (tt.total - dc.passed - dc.failed - dc.blocked)::INTEGER AS remaining
  FROM daily_counts dc
  CROSS JOIN total_tests tt
  ORDER BY dc.date;
END;
$$ LANGUAGE plpgsql;

-- Get defect trend for project
CREATE OR REPLACE FUNCTION tm_get_defect_trend(
  p_project_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  opened INTEGER,
  closed INTEGER,
  cumulative_open INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  ),
  daily_stats AS (
    SELECT
      d.date,
      COALESCE(COUNT(*) FILTER (WHERE def.created_at::DATE = d.date), 0)::INTEGER AS opened,
      COALESCE(COUNT(*) FILTER (WHERE def.resolved_at::DATE = d.date), 0)::INTEGER AS closed
    FROM dates d
    LEFT JOIN tm_defects def ON def.project_id = p_project_id
      AND (def.created_at::DATE = d.date OR def.resolved_at::DATE = d.date)
    GROUP BY d.date
  )
  SELECT
    ds.date,
    ds.opened,
    ds.closed,
    SUM(ds.opened - ds.closed) OVER (ORDER BY ds.date)::INTEGER AS cumulative_open
  FROM daily_stats ds
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tm_test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_plan_cases ENABLE ROW LEVEL SECURITY;

-- Policies for tm_test_plans - Authenticated users can access all
CREATE POLICY "authenticated_access_tm_test_plans" ON tm_test_plans
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for tm_test_plan_cases - Authenticated users can access all
CREATE POLICY "authenticated_access_tm_test_plan_cases" ON tm_test_plan_cases
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION tm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tm_test_plans_updated_at ON tm_test_plans;
CREATE TRIGGER update_tm_test_plans_updated_at
  BEFORE UPDATE ON tm_test_plans
  FOR EACH ROW EXECUTE FUNCTION tm_update_updated_at();