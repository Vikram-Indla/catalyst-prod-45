-- ============================================
-- G13-01: AUDIT TRAIL & HISTORY - DATABASE SETUP
-- ============================================

-- 1. Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS th_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  user_name TEXT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_key TEXT,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  parent_entity_type VARCHAR(50),
  parent_entity_id UUID,
  session_id TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create entity history views table
CREATE TABLE IF NOT EXISTS th_entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  UNIQUE(entity_type, entity_id, version)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON th_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON th_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON th_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON th_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_key ON th_audit_log(entity_key);
CREATE INDEX IF NOT EXISTS idx_history_entity ON th_entity_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_version ON th_entity_history(entity_type, entity_id, version DESC);

-- 4. Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action VARCHAR(50),
  p_entity_type VARCHAR(50),
  p_entity_id UUID DEFAULT NULL,
  p_entity_key TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_parent_type VARCHAR(50) DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_audit_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT email, full_name INTO v_user_email, v_user_name
    FROM profiles WHERE id = v_user_id;
  END IF;

  INSERT INTO th_audit_log (
    user_id, user_email, user_name,
    action, entity_type, entity_id, entity_key, entity_name,
    old_values, new_values, changed_fields,
    parent_entity_type, parent_entity_id, notes
  ) VALUES (
    v_user_id, v_user_email, v_user_name,
    p_action, p_entity_type, p_entity_id, p_entity_key, p_entity_name,
    p_old_values, p_new_values, p_changed_fields,
    p_parent_type, p_parent_id, p_notes
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to save entity snapshot
CREATE OR REPLACE FUNCTION save_entity_snapshot(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_snapshot JSONB,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM th_entity_history
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  INSERT INTO th_entity_history (
    entity_type, entity_id, version, snapshot, changed_by, change_reason
  ) VALUES (
    p_entity_type, p_entity_id, v_version, p_snapshot, auth.uid(), p_change_reason
  );

  RETURN v_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger function for test cases
CREATE OR REPLACE FUNCTION audit_test_case_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'create', 'test_case', NEW.id, NEW.case_key, NEW.title,
      NULL, to_jsonb(NEW), NULL, NULL, NULL, NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN v_changed_fields := array_append(v_changed_fields, 'title'); END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN v_changed_fields := array_append(v_changed_fields, 'description'); END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN v_changed_fields := array_append(v_changed_fields, 'priority'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_changed_fields := array_append(v_changed_fields, 'status'); END IF;
    IF OLD.preconditions IS DISTINCT FROM NEW.preconditions THEN v_changed_fields := array_append(v_changed_fields, 'preconditions'); END IF;
    
    IF array_length(v_changed_fields, 1) > 0 THEN
      PERFORM log_audit_event(
        'update', 'test_case', NEW.id, NEW.case_key, NEW.title,
        to_jsonb(OLD), to_jsonb(NEW), v_changed_fields, NULL, NULL, NULL
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'delete', 'test_case', OLD.id, OLD.case_key, OLD.title,
      to_jsonb(OLD), NULL, NULL, NULL, NULL, NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for test cases
DROP TRIGGER IF EXISTS trg_audit_test_cases ON th_test_cases;
CREATE TRIGGER trg_audit_test_cases
AFTER INSERT OR UPDATE OR DELETE ON th_test_cases
FOR EACH ROW EXECUTE FUNCTION audit_test_case_changes();

-- 8. Create trigger function for defects
CREATE OR REPLACE FUNCTION audit_defect_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'create', 'defect', NEW.id, NEW.defect_key, NEW.title,
      NULL, to_jsonb(NEW), NULL, NULL, NULL, NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN v_changed_fields := array_append(v_changed_fields, 'title'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_changed_fields := array_append(v_changed_fields, 'status'); END IF;
    IF OLD.severity IS DISTINCT FROM NEW.severity THEN v_changed_fields := array_append(v_changed_fields, 'severity'); END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN v_changed_fields := array_append(v_changed_fields, 'priority'); END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN v_changed_fields := array_append(v_changed_fields, 'assignee'); END IF;
    
    IF array_length(v_changed_fields, 1) > 0 THEN
      PERFORM log_audit_event(
        'update', 'defect', NEW.id, NEW.defect_key, NEW.title,
        to_jsonb(OLD), to_jsonb(NEW), v_changed_fields, NULL, NULL, NULL
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'delete', 'defect', OLD.id, OLD.defect_key, OLD.title,
      to_jsonb(OLD), NULL, NULL, NULL, NULL, NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for defects
DROP TRIGGER IF EXISTS trg_audit_defects ON th_defects;
CREATE TRIGGER trg_audit_defects
AFTER INSERT OR UPDATE OR DELETE ON th_defects
FOR EACH ROW EXECUTE FUNCTION audit_defect_changes();

-- 10. Create trigger function for test cycles
CREATE OR REPLACE FUNCTION audit_cycle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'create', 'test_cycle', NEW.id, NEW.cycle_key, NEW.name,
      NULL, to_jsonb(NEW), NULL, NULL, NULL, NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN v_changed_fields := array_append(v_changed_fields, 'name'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_changed_fields := array_append(v_changed_fields, 'status'); END IF;
    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN v_changed_fields := array_append(v_changed_fields, 'start_date'); END IF;
    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN v_changed_fields := array_append(v_changed_fields, 'end_date'); END IF;
    
    IF array_length(v_changed_fields, 1) > 0 THEN
      PERFORM log_audit_event(
        'update', 'test_cycle', NEW.id, NEW.cycle_key, NEW.name,
        to_jsonb(OLD), to_jsonb(NEW), v_changed_fields, NULL, NULL, NULL
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'delete', 'test_cycle', OLD.id, OLD.cycle_key, OLD.name,
      to_jsonb(OLD), NULL, NULL, NULL, NULL, NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger for test cycles
DROP TRIGGER IF EXISTS trg_audit_cycles ON th_test_cycles;
CREATE TRIGGER trg_audit_cycles
AFTER INSERT OR UPDATE OR DELETE ON th_test_cycles
FOR EACH ROW EXECUTE FUNCTION audit_cycle_changes();

-- 12. Create function to get entity audit history
CREATE OR REPLACE FUNCTION get_entity_audit_history(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action VARCHAR(50),
  user_name TEXT,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.action,
    a.user_name,
    a.changed_fields,
    a.old_values,
    a.new_values,
    a.notes,
    a.created_at
  FROM th_audit_log a
  WHERE a.entity_type = p_entity_type AND a.entity_id = p_entity_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to get recent activity
CREATE OR REPLACE FUNCTION get_recent_activity(
  p_user_id UUID DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_key TEXT,
  entity_name TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.action,
    a.entity_type,
    a.entity_key,
    a.entity_name,
    a.user_name,
    a.created_at
  FROM th_audit_log a
  WHERE (p_user_id IS NULL OR a.user_id = p_user_id)
    AND (p_entity_type IS NULL OR a.entity_type = p_entity_type)
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 14. Create function for audit statistics
CREATE OR REPLACE FUNCTION get_audit_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_events BIGINT,
  creates BIGINT,
  updates BIGINT,
  deletes BIGINT,
  active_users BIGINT,
  most_active_entity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE a.action = 'create')::BIGINT,
    COUNT(*) FILTER (WHERE a.action = 'update')::BIGINT,
    COUNT(*) FILTER (WHERE a.action = 'delete')::BIGINT,
    COUNT(DISTINCT a.user_id)::BIGINT,
    (SELECT al.entity_type FROM th_audit_log al
     WHERE al.created_at >= NOW() - (p_days || ' days')::INTERVAL
     GROUP BY al.entity_type ORDER BY COUNT(*) DESC LIMIT 1)::TEXT
  FROM th_audit_log a
  WHERE a.created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 15. Enable RLS
ALTER TABLE th_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_entity_history ENABLE ROW LEVEL SECURITY;

-- 16. Create RLS policies
DROP POLICY IF EXISTS "Allow read for authenticated users" ON th_audit_log;
CREATE POLICY "Allow read for authenticated users" ON th_audit_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert via function" ON th_audit_log;
CREATE POLICY "Allow insert via function" ON th_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_entity_history;
CREATE POLICY "Allow all for authenticated users" ON th_entity_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);