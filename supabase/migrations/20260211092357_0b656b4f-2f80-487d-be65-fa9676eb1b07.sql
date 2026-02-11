-- ============================================
-- G12-01: USER PREFERENCES & SETTINGS - DATABASE SETUP
-- ============================================

-- 1. Create user preferences table
CREATE TABLE IF NOT EXISTS th_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'light',
  density VARCHAR(20) DEFAULT 'comfortable',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  default_landing_page VARCHAR(100) DEFAULT '/testhub/dashboard',
  default_page_size INTEGER DEFAULT 25,
  show_archived BOOLEAN DEFAULT FALSE,
  auto_advance_on_status BOOLEAN DEFAULT TRUE,
  confirm_status_change BOOLEAN DEFAULT TRUE,
  default_cycle_view VARCHAR(20) DEFAULT 'list',
  email_on_assignment BOOLEAN DEFAULT TRUE,
  email_on_cycle_complete BOOLEAN DEFAULT TRUE,
  email_on_defect_update BOOLEAN DEFAULT FALSE,
  email_digest_frequency VARCHAR(20) DEFAULT 'daily',
  date_format VARCHAR(20) DEFAULT 'MMM DD, YYYY',
  time_format VARCHAR(10) DEFAULT '12h',
  timezone VARCHAR(50) DEFAULT 'UTC',
  week_starts_on INTEGER DEFAULT 0,
  recent_cycles UUID[] DEFAULT '{}',
  recent_test_cases UUID[] DEFAULT '{}',
  favorite_filters JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create application settings table
CREATE TABLE IF NOT EXISTS th_app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  value_type VARCHAR(20) DEFAULT 'string',
  category VARCHAR(50),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user activity log table
CREATE TABLE IF NOT EXISTS th_user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create saved filters table
CREATE TABLE IF NOT EXISTS th_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON th_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON th_app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON th_app_settings(category);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON th_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON th_user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON th_saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_type ON th_saved_filters(entity_type);

-- 6. Create function to get or create user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS SETOF th_user_preferences AS $$
DECLARE
  v_prefs th_user_preferences;
BEGIN
  SELECT * INTO v_prefs FROM th_user_preferences WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO th_user_preferences (user_id) VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;
  
  RETURN NEXT v_prefs;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF th_user_preferences AS $$
DECLARE
  v_prefs th_user_preferences;
BEGIN
  PERFORM get_user_preferences(p_user_id);
  
  UPDATE th_user_preferences SET
    theme = COALESCE(p_updates->>'theme', theme),
    density = COALESCE(p_updates->>'density', density),
    sidebar_collapsed = COALESCE((p_updates->>'sidebar_collapsed')::BOOLEAN, sidebar_collapsed),
    default_landing_page = COALESCE(p_updates->>'default_landing_page', default_landing_page),
    default_page_size = COALESCE((p_updates->>'default_page_size')::INTEGER, default_page_size),
    show_archived = COALESCE((p_updates->>'show_archived')::BOOLEAN, show_archived),
    auto_advance_on_status = COALESCE((p_updates->>'auto_advance_on_status')::BOOLEAN, auto_advance_on_status),
    confirm_status_change = COALESCE((p_updates->>'confirm_status_change')::BOOLEAN, confirm_status_change),
    default_cycle_view = COALESCE(p_updates->>'default_cycle_view', default_cycle_view),
    email_on_assignment = COALESCE((p_updates->>'email_on_assignment')::BOOLEAN, email_on_assignment),
    email_on_cycle_complete = COALESCE((p_updates->>'email_on_cycle_complete')::BOOLEAN, email_on_cycle_complete),
    email_on_defect_update = COALESCE((p_updates->>'email_on_defect_update')::BOOLEAN, email_on_defect_update),
    email_digest_frequency = COALESCE(p_updates->>'email_digest_frequency', email_digest_frequency),
    date_format = COALESCE(p_updates->>'date_format', date_format),
    time_format = COALESCE(p_updates->>'time_format', time_format),
    timezone = COALESCE(p_updates->>'timezone', timezone),
    week_starts_on = COALESCE((p_updates->>'week_starts_on')::INTEGER, week_starts_on),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_prefs;
  
  RETURN NEXT v_prefs;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO th_user_activity (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_details)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to get recent activity
CREATE OR REPLACE FUNCTION get_user_recent_activity(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id, a.action, a.entity_type, a.entity_id, a.entity_name, a.details, a.created_at
  FROM th_user_activity a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. Enable RLS
ALTER TABLE th_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_saved_filters ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON th_user_preferences;
CREATE POLICY "Users can manage own preferences" ON th_user_preferences
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public settings readable" ON th_app_settings;
CREATE POLICY "Public settings readable" ON th_app_settings
  FOR SELECT TO authenticated USING (is_public = TRUE);

DROP POLICY IF EXISTS "Users can insert own activity" ON th_user_activity;
CREATE POLICY "Users can insert own activity" ON th_user_activity
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own activity" ON th_user_activity;
CREATE POLICY "Users can view own activity" ON th_user_activity
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own filters" ON th_saved_filters;
CREATE POLICY "Users can manage own filters" ON th_saved_filters
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 12. Insert default app settings
INSERT INTO th_app_settings (key, value, value_type, category, description, is_public) VALUES
  ('app.name', 'TestHub', 'string', 'general', 'Application name', TRUE),
  ('app.version', '1.0.0', 'string', 'general', 'Application version', TRUE),
  ('test_case.auto_key_prefix', 'TC-', 'string', 'test_cases', 'Prefix for test case keys', TRUE),
  ('cycle.auto_key_prefix', 'CYC-', 'string', 'cycles', 'Prefix for cycle keys', TRUE),
  ('defect.auto_key_prefix', 'DEF-', 'string', 'defects', 'Prefix for defect keys', TRUE),
  ('execution.require_comment_on_fail', 'true', 'boolean', 'execution', 'Require comment when marking test as failed', TRUE),
  ('notification.enabled', 'true', 'boolean', 'notifications', 'Enable email notifications', TRUE)
ON CONFLICT (key) DO NOTHING;