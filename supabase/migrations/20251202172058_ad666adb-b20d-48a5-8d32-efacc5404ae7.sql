-- Dashboard tables per Prompt 3.23
CREATE TABLE IF NOT EXISTS test_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID,
  program_id UUID,
  layout JSONB NOT NULL DEFAULT '{"columns": 12}',
  is_default BOOLEAN DEFAULT false,
  visibility VARCHAR(50) DEFAULT 'private',
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_dashboard_gadgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES test_dashboards(id) ON DELETE CASCADE,
  gadget_type VARCHAR(100) NOT NULL,
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 2, "h": 2}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  layout JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES test_dashboards(id) ON DELETE CASCADE,
  shared_with_user_id UUID,
  can_edit BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dashboard_id, shared_with_user_id)
);

-- User settings tables per Prompt 3.24
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email_notifications_enabled BOOLEAN DEFAULT true,
  mention_notifications JSONB DEFAULT '{"enabled": true, "frequency": "immediate", "include_context": true}',
  assignment_notifications JSONB DEFAULT '{"enabled": true, "cases": true, "executions": true, "cycles": true, "frequency": "immediate", "threshold": 0}',
  automation_notifications JSONB DEFAULT '{"enabled": true, "first_only": true, "threshold": 1, "include_logs": true, "frequency": "immediate"}',
  defect_notifications JSONB DEFAULT '{"enabled": true, "created_cases": true, "executions": true, "followed_cases": true, "priority_filter": "all"}',
  cycle_notifications JSONB DEFAULT '{"enabled": true, "started": true, "closed": true, "scope_changes": true}',
  report_notifications JSONB DEFAULT '{"enabled": true, "scheduled": true, "subscriptions": true, "failed": true, "format": "attachment"}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  digest_mode VARCHAR(50) DEFAULT 'immediate',
  digest_time TIME DEFAULT '09:00:00',
  digest_day VARCHAR(20),
  email_template VARCHAR(50) DEFAULT 'html',
  include_logo BOOLEAN DEFAULT true,
  include_summary BOOLEAN DEFAULT true,
  include_links BOOLEAN DEFAULT true,
  signature TEXT,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start_date DATE,
  dnd_end_date DATE,
  dnd_auto_reply TEXT,
  max_emails_per_day INTEGER DEFAULT 20,
  limit_action VARCHAR(50) DEFAULT 'stop',
  unsubscribed_all BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  theme_mode VARCHAR(50) DEFAULT 'light',
  accent_color VARCHAR(7) DEFAULT '#c69c6d',
  font_size VARCHAR(50) DEFAULT 'medium',
  density VARCHAR(50) DEFAULT 'comfortable',
  sidebar_default VARCHAR(50) DEFAULT 'expanded',
  sidebar_auto_collapse BOOLEAN DEFAULT false,
  sidebar_width VARCHAR(50) DEFAULT 'medium',
  animations_enabled BOOLEAN DEFAULT true,
  animation_speed VARCHAR(50) DEFAULT 'normal',
  reduce_motion BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_app_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  default_project_id UUID,
  default_folder_view VARCHAR(50) DEFAULT 'expanded',
  table_rows_per_page INTEGER DEFAULT 25,
  table_default_sort VARCHAR(50) DEFAULT 'newest_first',
  table_show_row_numbers BOOLEAN DEFAULT false,
  table_sticky_headers BOOLEAN DEFAULT true,
  table_zebra_striping BOOLEAN DEFAULT true,
  date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(50) DEFAULT '12-hour',
  time_zone VARCHAR(100) DEFAULT 'UTC',
  grid_default_columns JSONB DEFAULT '["testers"]',
  grid_cell_size VARCHAR(50) DEFAULT 'medium',
  grid_show_evidence BOOLEAN DEFAULT true,
  grid_show_defects BOOLEAN DEFAULT true,
  grid_highlight_failed BOOLEAN DEFAULT true,
  auto_save_enabled BOOLEAN DEFAULT true,
  auto_save_interval INTEGER DEFAULT 60,
  warn_unsaved BOOLEAN DEFAULT true,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
  language VARCHAR(10) DEFAULT 'en-US',
  high_contrast BOOLEAN DEFAULT false,
  screen_reader_optimized BOOLEAN DEFAULT false,
  focus_indicators VARCHAR(50) DEFAULT 'normal',
  keyboard_navigation VARCHAR(50) DEFAULT 'normal',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes per specifications
CREATE INDEX IF NOT EXISTS idx_dashboards_user ON test_dashboards(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_dashboards_visibility ON test_dashboards(visibility, program_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_gadgets ON test_dashboard_gadgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications ON user_notifications(user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE test_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_dashboard_gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_dashboard_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_theme_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dashboards" ON test_dashboards FOR SELECT USING (true);
CREATE POLICY "Users can insert own dashboards" ON test_dashboards FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own dashboards" ON test_dashboards FOR UPDATE USING (true);
CREATE POLICY "Users can delete own dashboards" ON test_dashboards FOR DELETE USING (true);

CREATE POLICY "Users can view dashboard gadgets" ON test_dashboard_gadgets FOR SELECT USING (true);
CREATE POLICY "Users can insert dashboard gadgets" ON test_dashboard_gadgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update dashboard gadgets" ON test_dashboard_gadgets FOR UPDATE USING (true);
CREATE POLICY "Users can delete dashboard gadgets" ON test_dashboard_gadgets FOR DELETE USING (true);

CREATE POLICY "Anyone can view templates" ON test_dashboard_templates FOR SELECT USING (true);
CREATE POLICY "Admins can insert templates" ON test_dashboard_templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view shares" ON test_dashboard_shares FOR SELECT USING (true);
CREATE POLICY "Users can insert shares" ON test_dashboard_shares FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own notification settings" ON user_notification_settings FOR ALL USING (true);
CREATE POLICY "Users can view own email preferences" ON user_email_preferences FOR ALL USING (true);
CREATE POLICY "Users can view own theme preferences" ON user_theme_preferences FOR ALL USING (true);
CREATE POLICY "Users can view own app preferences" ON user_app_preferences FOR ALL USING (true);
CREATE POLICY "Users can view own notifications" ON user_notifications FOR ALL USING (true);

-- Seed dashboard templates per Prompt 3.23
INSERT INTO test_dashboard_templates (name, description, category, layout, is_system) VALUES
('QA Manager', 'Executive overview dashboard', 'manager', '{"gadgets": ["project_overview", "execution_burndown", "defect_summary", "traceability_summary", "top_contributors"]}', true),
('Tester', 'Daily tester dashboard', 'tester', '{"gadgets": ["execution_overview", "execution_distribution", "project_activity"]}', true),
('Admin', 'Administration dashboard', 'admin', '{"gadgets": ["project_overview", "project_activity_advanced", "user_activity"]}', true)
ON CONFLICT DO NOTHING;