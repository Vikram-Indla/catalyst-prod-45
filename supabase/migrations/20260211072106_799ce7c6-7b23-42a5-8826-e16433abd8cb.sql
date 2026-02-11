
-- ============================================
-- G9-01: TEST ENVIRONMENTS - DATABASE SETUP
-- ============================================

-- 1. Create sequence for environment keys
CREATE SEQUENCE IF NOT EXISTS th_environment_key_seq START WITH 1;

-- 2. Create environments table
CREATE TABLE IF NOT EXISTS th_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  env_key TEXT UNIQUE NOT NULL DEFAULT '',
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30) DEFAULT 'testing',
  status VARCHAR(20) DEFAULT 'active',
  url VARCHAR(500),
  api_url VARCHAR(500),
  database_info TEXT,
  credentials_note TEXT,
  owner_id UUID REFERENCES profiles(id),
  config JSONB DEFAULT '{}',
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20) DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create environment variables table
CREATE TABLE IF NOT EXISTS th_environment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES th_environments(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(environment_id, key)
);

-- 4. Create environment history table
CREATE TABLE IF NOT EXISTS th_environment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES th_environments(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Link cycles to environments
ALTER TABLE th_test_cycles 
ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES th_environments(id);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_environments_status ON th_environments(status);
CREATE INDEX IF NOT EXISTS idx_environments_type ON th_environments(type);
CREATE INDEX IF NOT EXISTS idx_environments_owner ON th_environments(owner_id);
CREATE INDEX IF NOT EXISTS idx_env_variables_env ON th_environment_variables(environment_id);
CREATE INDEX IF NOT EXISTS idx_env_history_env ON th_environment_history(environment_id);
CREATE INDEX IF NOT EXISTS idx_cycles_environment ON th_test_cycles(environment_id);

-- 7. Create function to generate environment key
CREATE OR REPLACE FUNCTION generate_environment_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.env_key IS NULL OR NEW.env_key = '' THEN
    NEW.env_key := 'ENV-' || LPAD(nextval('th_environment_key_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for auto-generating environment key
DROP TRIGGER IF EXISTS trg_generate_environment_key ON th_environments;
CREATE TRIGGER trg_generate_environment_key
BEFORE INSERT ON th_environments
FOR EACH ROW EXECUTE FUNCTION generate_environment_key();

-- 9. Create function to log environment changes
CREATE OR REPLACE FUNCTION log_environment_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO th_environment_history (environment_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_change', 'status', OLD.status, NEW.status, auth.uid());
    END IF;
    IF OLD.health_status IS DISTINCT FROM NEW.health_status THEN
      INSERT INTO th_environment_history (environment_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'health_change', 'health_status', OLD.health_status, NEW.health_status, auth.uid());
    END IF;
    IF OLD.url IS DISTINCT FROM NEW.url THEN
      INSERT INTO th_environment_history (environment_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'config_change', 'url', OLD.url, NEW.url, auth.uid());
    END IF;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for logging history
DROP TRIGGER IF EXISTS trg_log_environment_history ON th_environments;
CREATE TRIGGER trg_log_environment_history
BEFORE UPDATE ON th_environments
FOR EACH ROW EXECUTE FUNCTION log_environment_history();

-- 11. Create function to get environment summary
CREATE OR REPLACE FUNCTION get_environment_summary()
RETURNS TABLE (
  total_environments BIGINT,
  active_count BIGINT,
  maintenance_count BIGINT,
  healthy_count BIGINT,
  degraded_count BIGINT,
  down_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE e.status = 'active')::BIGINT,
    COUNT(*) FILTER (WHERE e.status = 'maintenance')::BIGINT,
    COUNT(*) FILTER (WHERE e.health_status = 'healthy')::BIGINT,
    COUNT(*) FILTER (WHERE e.health_status = 'degraded')::BIGINT,
    COUNT(*) FILTER (WHERE e.health_status = 'down')::BIGINT
  FROM th_environments e
  WHERE e.status != 'deprecated';
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get cycles using an environment
CREATE OR REPLACE FUNCTION get_environment_cycles(p_environment_id UUID)
RETURNS TABLE (
  cycle_id UUID,
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
    c.status,
    c.total_cases,
    c.progress_percent
  FROM th_test_cycles c
  WHERE c.environment_id = p_environment_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 13. Enable RLS
ALTER TABLE th_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_environment_history ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON th_environments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON th_environment_variables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON th_environment_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. Insert default environments
INSERT INTO th_environments (name, type, status, health_status, description) VALUES
  ('Development', 'development', 'active', 'healthy', 'Local development environment'),
  ('QA', 'testing', 'active', 'healthy', 'Quality assurance testing environment'),
  ('Staging', 'staging', 'active', 'healthy', 'Pre-production staging environment'),
  ('UAT', 'uat', 'active', 'unknown', 'User acceptance testing environment'),
  ('Production', 'production', 'active', 'healthy', 'Live production environment')
ON CONFLICT DO NOTHING;
