-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 5: SETTINGS & ADMIN - DATABASE FOUNDATION
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Extend projects table with settings columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 2. Enhance project_members table with invitation and role fields
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'member';
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for project_members
CREATE INDEX IF NOT EXISTS idx_project_members_status ON public.project_members(status);
CREATE INDEX IF NOT EXISTS idx_project_members_email ON public.project_members(email);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(role);

-- 3. Create project_roles table
CREATE TABLE IF NOT EXISTS public.project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#2563eb',
  icon VARCHAR(50) DEFAULT '👤',
  is_system BOOLEAN DEFAULT FALSE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_role_name UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_roles_project ON public.project_roles(project_id);

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view project roles" ON public.project_roles;
CREATE POLICY "Members can view project roles"
  ON public.project_roles FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.project_roles;
CREATE POLICY "Admins can manage roles"
  ON public.project_roles FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 4. Create field_entity enum if not exists
DO $$ BEGIN
  CREATE TYPE field_entity AS ENUM ('test_case', 'test_cycle', 'defect', 'test_run');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create custom_field_definitions table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_key VARCHAR(50) NOT NULL,
  description TEXT,
  field_type VARCHAR(20) NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  validation_regex VARCHAR(255),
  min_value NUMERIC,
  max_value NUMERIC,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  show_in_list BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  CONSTRAINT unique_field_key UNIQUE (project_id, entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_project ON public.custom_field_definitions(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON public.custom_field_definitions(entity_type);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view custom fields" ON public.custom_field_definitions;
CREATE POLICY "Members can view custom fields"
  ON public.custom_field_definitions FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_field_definitions;
CREATE POLICY "Admins can manage custom fields"
  ON public.custom_field_definitions FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 6. Create integration_status enum if not exists
DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Create project_integrations table
CREATE TABLE IF NOT EXISTS public.project_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'disconnected',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  last_sync_error TEXT,
  connected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_integration UNIQUE (project_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_project ON public.project_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.project_integrations(integration_type);

ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view integrations" ON public.project_integrations;
CREATE POLICY "Members can view integrations"
  ON public.project_integrations FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage integrations" ON public.project_integrations;
CREATE POLICY "Admins can manage integrations"
  ON public.project_integrations FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 8. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_digest VARCHAR(20) DEFAULT 'instant',
  in_app_enabled BOOLEAN DEFAULT TRUE,
  slack_enabled BOOLEAN DEFAULT FALSE,
  slack_dm BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{
    "test_assigned": true,
    "test_completed": true,
    "test_failed": true,
    "cycle_started": true,
    "cycle_completed": true,
    "defect_assigned": true,
    "defect_resolved": true,
    "defect_commented": true,
    "mentioned": true,
    "member_joined": false,
    "member_left": false,
    "weekly_digest": true
  }'::jsonb,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_notification_prefs UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_project ON public.notification_preferences(project_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- 9. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.project_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON public.project_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.project_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.project_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.project_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.project_audit_logs(created_at DESC);

ALTER TABLE public.project_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and leads can view audit logs" ON public.project_audit_logs;
CREATE POLICY "Admins and leads can view audit logs"
  ON public.project_audit_logs FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead')
  ));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.project_audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.project_audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- 10. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read'],
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys(project_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage API keys" ON public.api_keys;
CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 11. Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_response_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_project ON public.webhooks(project_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks"
  ON public.webhooks FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 12. Create audit log helper function
CREATE OR REPLACE FUNCTION create_project_audit_log(
  p_project_id UUID,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name VARCHAR DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email VARCHAR;
  v_user_name VARCHAR;
  v_log_id UUID;
BEGIN
  SELECT id, email, COALESCE(full_name, email) 
  INTO v_user_id, v_user_email, v_user_name
  FROM public.profiles
  WHERE id = auth.uid();
  
  INSERT INTO public.project_audit_logs (
    project_id, user_id, user_email, user_name,
    action, entity_type, entity_id, entity_name,
    changes, metadata
  ) VALUES (
    p_project_id, v_user_id, v_user_email, v_user_name,
    p_action, p_entity_type, p_entity_id, p_entity_name,
    p_changes, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Create default project roles function
CREATE OR REPLACE FUNCTION create_default_project_roles(p_project_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'admin', 'Full access to all project features', '👑', TRUE,
    '{"project.settings": true, "project.members.invite": true, "project.members.remove": true, "project.members.edit_role": true, "project.delete": true, "test_cases.create": true, "test_cases.edit": true, "test_cases.delete": true, "test_cases.execute": true, "cycles.create": true, "cycles.manage": true, "defects.create": true, "defects.edit": true, "defects.resolve": true, "defects.delete": true, "reports.view": true, "reports.export": true, "integrations.manage": true, "custom_fields.manage": true, "audit_log.view": true}'::jsonb
  ) ON CONFLICT (project_id, name) DO NOTHING;
  
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'lead', 'Can manage test cycles and team', '⭐', TRUE,
    '{"project.settings": false, "project.members.invite": true, "project.members.remove": false, "project.members.edit_role": false, "project.delete": false, "test_cases.create": true, "test_cases.edit": true, "test_cases.delete": true, "test_cases.execute": true, "cycles.create": true, "cycles.manage": true, "defects.create": true, "defects.edit": true, "defects.resolve": true, "defects.delete": false, "reports.view": true, "reports.export": true, "integrations.manage": false, "custom_fields.manage": false, "audit_log.view": true}'::jsonb
  ) ON CONFLICT (project_id, name) DO NOTHING;
  
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'member', 'Can create and execute tests', '👤', TRUE,
    '{"project.settings": false, "project.members.invite": false, "project.members.remove": false, "project.members.edit_role": false, "project.delete": false, "test_cases.create": true, "test_cases.edit": true, "test_cases.delete": false, "test_cases.execute": true, "cycles.create": false, "cycles.manage": false, "defects.create": true, "defects.edit": true, "defects.resolve": false, "defects.delete": false, "reports.view": true, "reports.export": false, "integrations.manage": false, "custom_fields.manage": false, "audit_log.view": false}'::jsonb
  ) ON CONFLICT (project_id, name) DO NOTHING;
  
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'viewer', 'Read-only access', '👁', TRUE,
    '{"project.settings": false, "project.members.invite": false, "project.members.remove": false, "project.members.edit_role": false, "project.delete": false, "test_cases.create": false, "test_cases.edit": false, "test_cases.delete": false, "test_cases.execute": false, "cycles.create": false, "cycles.manage": false, "defects.create": false, "defects.edit": false, "defects.resolve": false, "defects.delete": false, "reports.view": true, "reports.export": false, "integrations.manage": false, "custom_fields.manage": false, "audit_log.view": false}'::jsonb
  ) ON CONFLICT (project_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 14. Create update triggers
DROP TRIGGER IF EXISTS update_project_members_timestamp ON public.project_members;
CREATE TRIGGER update_project_members_timestamp
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_project_roles_timestamp ON public.project_roles;
CREATE TRIGGER update_project_roles_timestamp
  BEFORE UPDATE ON public.project_roles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_custom_fields_timestamp ON public.custom_field_definitions;
CREATE TRIGGER update_custom_fields_timestamp
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_integrations_timestamp ON public.project_integrations;
CREATE TRIGGER update_integrations_timestamp
  BEFORE UPDATE ON public.project_integrations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_notification_prefs_timestamp ON public.notification_preferences;
CREATE TRIGGER update_notification_prefs_timestamp
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();