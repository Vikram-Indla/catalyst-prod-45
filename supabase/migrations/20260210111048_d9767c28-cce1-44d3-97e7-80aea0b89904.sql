
-- Drop old legacy trigger/function if they exist
DROP TRIGGER IF EXISTS set_cycle_key ON test_cycles;
DROP FUNCTION IF EXISTS generate_cycle_key() CASCADE;

-- 1. CREATE TABLES
CREATE TABLE IF NOT EXISTS th_cycle_key_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_number INTEGER DEFAULT 0
);
INSERT INTO th_cycle_key_sequence (id, last_number) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS th_test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_key VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  progress_percent INTEGER DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  not_run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS th_cycle_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES th_test_cycles(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  execution_status VARCHAR(20) DEFAULT 'not_run',
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id),
  execution_time_seconds INTEGER,
  notes TEXT,
  defect_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, test_case_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_th_test_cycles_status ON th_test_cycles(status);
CREATE INDEX IF NOT EXISTS idx_th_cycle_test_cases_cycle ON th_cycle_test_cases(cycle_id);
CREATE INDEX IF NOT EXISTS idx_th_cycle_test_cases_test_case ON th_cycle_test_cases(test_case_id);
CREATE INDEX IF NOT EXISTS idx_th_cycle_test_cases_status ON th_cycle_test_cases(execution_status);

-- 3. FUNCTIONS
CREATE OR REPLACE FUNCTION generate_cycle_key()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
BEGIN
  UPDATE th_cycle_key_sequence SET last_number = last_number + 1 WHERE id = 1 RETURNING last_number INTO next_num;
  RETURN 'CYCLE-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_cycle_stats(p_cycle_id UUID)
RETURNS VOID AS $$
DECLARE v_total INT; v_passed INT; v_failed INT; v_blocked INT; v_skipped INT; v_not_run INT; v_progress INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE execution_status='passed'), COUNT(*) FILTER (WHERE execution_status='failed'),
    COUNT(*) FILTER (WHERE execution_status='blocked'), COUNT(*) FILTER (WHERE execution_status='skipped'),
    COUNT(*) FILTER (WHERE execution_status='not_run')
  INTO v_total, v_passed, v_failed, v_blocked, v_skipped, v_not_run FROM th_cycle_test_cases WHERE cycle_id = p_cycle_id;
  v_progress := CASE WHEN v_total > 0 THEN ((v_passed+v_failed+v_blocked+v_skipped)*100)/v_total ELSE 0 END;
  UPDATE th_test_cycles SET total_cases=v_total, passed_count=v_passed, failed_count=v_failed, blocked_count=v_blocked,
    skipped_count=v_skipped, not_run_count=v_not_run, progress_percent=v_progress, updated_at=NOW() WHERE id=p_cycle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_cycle_stats() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='DELETE' THEN PERFORM update_cycle_stats(OLD.cycle_id); RETURN OLD;
  ELSE PERFORM update_cycle_stats(NEW.cycle_id); RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cycle_test_cases_stats ON th_cycle_test_cases;
CREATE TRIGGER trg_cycle_test_cases_stats AFTER INSERT OR UPDATE OR DELETE ON th_cycle_test_cases
FOR EACH ROW EXECUTE FUNCTION trigger_update_cycle_stats();

-- 4. RLS
ALTER TABLE th_test_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_cycle_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_cycle_key_sequence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all th_test_cycles" ON th_test_cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all th_cycle_test_cases" ON th_cycle_test_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all th_cycle_key_sequence" ON th_cycle_key_sequence FOR ALL USING (true) WITH CHECK (true);

-- 5. SEED DATA
INSERT INTO th_test_cycles (cycle_key, name, description, status, start_date, end_date, total_cases, passed_count, failed_count, blocked_count, skipped_count, not_run_count, progress_percent) VALUES
('CYCLE-001', 'Sprint 24 - User Authentication', 'Testing all auth features.', 'active', '2026-01-15', '2026-01-29', 37, 18, 4, 2, 0, 13, 65),
('CYCLE-002', 'Sprint 25 - Dashboard & Analytics', 'Dashboard widgets testing.', 'draft', '2026-01-29', '2026-02-12', 42, 0, 0, 0, 0, 42, 0),
('CYCLE-003', 'Release 2.0 - Full Regression', 'Full regression suite.', 'completed', '2026-01-01', '2026-01-14', 156, 142, 8, 0, 6, 0, 100),
('CYCLE-004', 'API Integration Testing', 'Third-party API integrations.', 'active', '2026-01-20', '2026-02-03', 28, 12, 2, 1, 0, 13, 54),
('CYCLE-005', 'Mobile Responsive Testing', 'Cross-device testing.', 'draft', '2026-02-05', '2026-02-19', 64, 0, 0, 0, 0, 64, 0),
('CYCLE-006', 'Q4 2025 Regression Archive', 'Archived Q4 regression.', 'archived', '2025-10-01', '2025-10-15', 98, 92, 4, 0, 2, 0, 100)
ON CONFLICT (cycle_key) DO NOTHING;
UPDATE th_cycle_key_sequence SET last_number = 6 WHERE id = 1;

-- 6. LINK TEST CASES
DO $$
DECLARE cid UUID; tc RECORD; i INT := 0;
  sts TEXT[] := ARRAY['passed','passed','passed','failed','blocked','not_run','not_run'];
BEGIN
  SELECT id INTO cid FROM th_test_cycles WHERE cycle_key='CYCLE-001';
  IF cid IS NOT NULL THEN
    FOR tc IN SELECT id FROM th_test_cases ORDER BY created_at LIMIT 15 LOOP
      INSERT INTO th_cycle_test_cases (cycle_id, test_case_id, execution_status)
      VALUES (cid, tc.id, sts[1+(i % array_length(sts,1))]) ON CONFLICT DO NOTHING;
      i := i + 1;
    END LOOP;
    PERFORM update_cycle_stats(cid);
  END IF;
END $$;
