# CATALYST_MAGIC_PROMPT: MODULE 5 - SETTINGS & ADMIN

> **GOD-TIER Build Specification (Target: ≥9.5/10)**
> 
> Platform: Lovable.dev
> Module: Settings & Admin (Team, Permissions, Integrations, Custom Fields, Audit)
> Compliance: 5 Stages | 3 QA Cycles | Full E2E Wiring | APPROVE/REJECT Gates

---

## 🎯 MODULE OBJECTIVE

Build a comprehensive Settings & Administration system that enables:
- **Project settings** management (name, description, preferences)
- **Team member** management (invite, roles, status)
- **Roles & permissions** configuration (RBAC matrix)
- **Custom fields** definition (test cases, defects)
- **Integrations** management (Jira, Slack, GitHub)
- **Notifications** preferences (email, in-app, Slack)
- **Audit log** visibility (who did what when)
- **API & webhooks** configuration
- **Danger zone** actions (archive, delete, transfer)

The system must provide **enterprise-grade administration** suitable for Saudi Arabia's Ministry of Industry.

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting, confirm these exist from previous modules:

| Dependency | Table/Component | Status |
|------------|-----------------|--------|
| Database | `projects`, `profiles` | Required |
| Auth | Supabase Auth + RLS | Required |
| Navigation | App shell with sidebar | Required |
| Design System | Catalyst V5 tokens | Required |

---

## 🏗️ STAGE 1: DATABASE FOUNDATION

### 1.1 Schema Design

Execute these migrations in order:

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 001: Project Settings
-- ══════════════════════════════════════════════════════════════════════════════

-- Extend projects table with settings
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
-- Example settings structure:
-- {
--   "default_test_case_prefix": "TC",
--   "default_defect_prefix": "DEF",
--   "default_cycle_prefix": "CYC",
--   "timezone": "Asia/Riyadh",
--   "date_format": "DD/MM/YYYY",
--   "language": "en",
--   "require_test_case_review": false,
--   "auto_close_defects_on_pass": false,
--   "default_priority": "medium",
--   "default_severity": "major"
-- }

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 002: Enhanced Project Members
-- ══════════════════════════════════════════════════════════════════════════════

-- Check if project_members exists, if not create it
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  -- Values: 'admin', 'lead', 'member', 'viewer'
  
  -- Invitation (for pending members)
  email VARCHAR(255),
  invitation_token UUID DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Values: 'pending', 'active', 'inactive', 'removed'
  
  last_active_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_member UNIQUE (project_id, user_id),
  CONSTRAINT unique_invitation UNIQUE (project_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON public.project_members(status);
CREATE INDEX IF NOT EXISTS idx_project_members_email ON public.project_members(email);

-- RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their project members"
  ON public.project_members FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and leads can manage members"
  ON public.project_members FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead')
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003: Roles & Permissions
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Role definition
  name VARCHAR(50) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#2563eb', -- hex color
  icon VARCHAR(50) DEFAULT '👤',
  
  -- Is this a system role (cannot be deleted)?
  is_system BOOLEAN DEFAULT FALSE,
  
  -- Permissions (JSONB for flexibility)
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example permissions:
  -- {
  --   "project.settings": true,
  --   "project.members.invite": true,
  --   "project.members.remove": false,
  --   "test_cases.create": true,
  --   "test_cases.edit": true,
  --   "test_cases.delete": false,
  --   "test_cases.execute": true,
  --   "cycles.create": true,
  --   "cycles.manage": false,
  --   "defects.create": true,
  --   "defects.resolve": false,
  --   "reports.view": true,
  --   "reports.export": false,
  --   "integrations.manage": false,
  --   "audit_log.view": false
  -- }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_role_name UNIQUE (project_id, name)
);

-- Create default roles function
CREATE OR REPLACE FUNCTION create_default_project_roles(p_project_id UUID)
RETURNS void AS $$
BEGIN
  -- Admin role
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'admin', 'Full access to all project features', '👑', TRUE,
    '{
      "project.settings": true,
      "project.members.invite": true,
      "project.members.remove": true,
      "project.members.edit_role": true,
      "project.delete": true,
      "test_cases.create": true,
      "test_cases.edit": true,
      "test_cases.delete": true,
      "test_cases.execute": true,
      "cycles.create": true,
      "cycles.manage": true,
      "defects.create": true,
      "defects.edit": true,
      "defects.resolve": true,
      "defects.delete": true,
      "reports.view": true,
      "reports.export": true,
      "integrations.manage": true,
      "custom_fields.manage": true,
      "audit_log.view": true
    }'::jsonb
  );
  
  -- Lead role
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'lead', 'Can manage test cycles and team', '⭐', TRUE,
    '{
      "project.settings": false,
      "project.members.invite": true,
      "project.members.remove": false,
      "project.members.edit_role": false,
      "project.delete": false,
      "test_cases.create": true,
      "test_cases.edit": true,
      "test_cases.delete": true,
      "test_cases.execute": true,
      "cycles.create": true,
      "cycles.manage": true,
      "defects.create": true,
      "defects.edit": true,
      "defects.resolve": true,
      "defects.delete": false,
      "reports.view": true,
      "reports.export": true,
      "integrations.manage": false,
      "custom_fields.manage": false,
      "audit_log.view": true
    }'::jsonb
  );
  
  -- Member role
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'member', 'Can create and execute tests', '👤', TRUE,
    '{
      "project.settings": false,
      "project.members.invite": false,
      "project.members.remove": false,
      "project.members.edit_role": false,
      "project.delete": false,
      "test_cases.create": true,
      "test_cases.edit": true,
      "test_cases.delete": false,
      "test_cases.execute": true,
      "cycles.create": false,
      "cycles.manage": false,
      "defects.create": true,
      "defects.edit": true,
      "defects.resolve": false,
      "defects.delete": false,
      "reports.view": true,
      "reports.export": false,
      "integrations.manage": false,
      "custom_fields.manage": false,
      "audit_log.view": false
    }'::jsonb
  );
  
  -- Viewer role
  INSERT INTO public.project_roles (project_id, name, description, icon, is_system, permissions)
  VALUES (
    p_project_id, 'viewer', 'Read-only access', '👁', TRUE,
    '{
      "project.settings": false,
      "project.members.invite": false,
      "project.members.remove": false,
      "project.members.edit_role": false,
      "project.delete": false,
      "test_cases.create": false,
      "test_cases.edit": false,
      "test_cases.delete": false,
      "test_cases.execute": false,
      "cycles.create": false,
      "cycles.manage": false,
      "defects.create": false,
      "defects.edit": false,
      "defects.resolve": false,
      "defects.delete": false,
      "reports.view": true,
      "reports.export": false,
      "integrations.manage": false,
      "custom_fields.manage": false,
      "audit_log.view": false
    }'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Indexes & RLS
CREATE INDEX idx_project_roles_project ON public.project_roles(project_id);

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project roles"
  ON public.project_roles FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage roles"
  ON public.project_roles FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 004: Custom Fields
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE field_type AS ENUM (
  'text',
  'textarea',
  'number',
  'date',
  'datetime',
  'select',
  'multi_select',
  'checkbox',
  'url',
  'email',
  'user'
);

CREATE TYPE field_entity AS ENUM (
  'test_case',
  'test_cycle',
  'defect',
  'test_run'
);

CREATE TABLE public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Field definition
  name VARCHAR(100) NOT NULL,
  field_key VARCHAR(50) NOT NULL, -- machine-readable key
  description TEXT,
  field_type field_type NOT NULL,
  entity_type field_entity NOT NULL,
  
  -- Options (for select/multi_select)
  options JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"value": "opt1", "label": "Option 1", "color": "#2563eb"}]
  
  -- Validation
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  validation_regex VARCHAR(255),
  min_value NUMERIC,
  max_value NUMERIC,
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  show_in_list BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  CONSTRAINT unique_field_key UNIQUE (project_id, entity_type, field_key)
);

-- Indexes
CREATE INDEX idx_custom_fields_project ON public.custom_field_definitions(project_id);
CREATE INDEX idx_custom_fields_entity ON public.custom_field_definitions(entity_type);

-- RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom fields"
  ON public.custom_field_definitions FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage custom fields"
  ON public.custom_field_definitions FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 005: Integrations
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE integration_type AS ENUM (
  'jira',
  'slack',
  'github',
  'azure_devops',
  'jenkins',
  'microsoft_teams',
  'gitlab',
  'bitbucket'
);

CREATE TYPE integration_status AS ENUM (
  'connected',
  'disconnected',
  'error',
  'pending'
);

CREATE TABLE public.project_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Integration info
  integration_type integration_type NOT NULL,
  name VARCHAR(100),
  status integration_status DEFAULT 'disconnected',
  
  -- Credentials (encrypted in practice)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Jira example:
  -- {
  --   "base_url": "https://company.atlassian.net",
  --   "project_key": "PROJ",
  --   "api_token": "encrypted_token",
  --   "email": "user@company.com",
  --   "sync_settings": {
  --     "import_issues": true,
  --     "sync_defects": true,
  --     "link_test_cases": true
  --   }
  -- }
  
  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  last_sync_error TEXT,
  
  -- Timestamps
  connected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_integration UNIQUE (project_id, integration_type)
);

-- Indexes
CREATE INDEX idx_integrations_project ON public.project_integrations(project_id);
CREATE INDEX idx_integrations_type ON public.project_integrations(integration_type);

-- RLS
ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view integrations"
  ON public.project_integrations FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage integrations"
  ON public.project_integrations FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 006: Notification Preferences
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  -- NULL project_id = global preferences
  
  -- Email notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_digest VARCHAR(20) DEFAULT 'instant',
  -- Values: 'instant', 'daily', 'weekly', 'none'
  
  -- In-app notifications
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Slack notifications (if integrated)
  slack_enabled BOOLEAN DEFAULT FALSE,
  slack_dm BOOLEAN DEFAULT FALSE,
  
  -- Notification types (JSONB for flexibility)
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
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_notification_prefs UNIQUE (user_id, project_id)
);

-- Indexes
CREATE INDEX idx_notification_prefs_user ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_prefs_project ON public.notification_preferences(project_id);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 007: Audit Log
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'invite',
  'join',
  'leave',
  'archive',
  'restore',
  'export',
  'import',
  'connect',
  'disconnect'
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Actor
  user_id UUID REFERENCES public.profiles(id),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  
  -- Action
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'test_case', 'cycle', 'member', etc.
  entity_id UUID,
  entity_name VARCHAR(255),
  
  -- Details
  changes JSONB,
  -- Example: {"field": "status", "old": "draft", "new": "active"}
  
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Example: {"ip": "192.168.1.1", "user_agent": "...", "source": "web"}
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- No updates allowed - audit logs are immutable
  CONSTRAINT no_updates CHECK (TRUE)
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_project ON public.audit_logs(project_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and leads can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead')
  ));

-- Insert-only policy for system
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_project_id UUID,
  p_action audit_action,
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
  -- Get current user info
  SELECT id, email, COALESCE(full_name, email) 
  INTO v_user_id, v_user_email, v_user_name
  FROM public.profiles
  WHERE id = auth.uid();
  
  INSERT INTO public.audit_logs (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 008: API Keys & Webhooks
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Key info
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL, -- First 10 chars for identification
  key_hash VARCHAR(255) NOT NULL, -- Hashed full key
  
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read'],
  -- Values: 'read', 'write', 'execute', 'admin'
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Webhook config
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255), -- For signature verification
  
  -- Events to trigger
  events TEXT[] NOT NULL,
  -- Values: 'test_case.created', 'test_case.updated', 'cycle.completed', 
  --         'defect.created', 'defect.resolved', etc.
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_response_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX idx_api_keys_project ON public.api_keys(project_id);
CREATE INDEX idx_webhooks_project ON public.webhooks(project_id);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage webhooks"
  ON public.webhooks FOR ALL
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 009: Update Triggers
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_project_members_timestamp
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_project_roles_timestamp
  BEFORE UPDATE ON public.project_roles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_custom_fields_timestamp
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_integrations_timestamp
  BEFORE UPDATE ON public.project_integrations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_notification_prefs_timestamp
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

### 1.2 Stage 1 QA Gate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1 QA CHECKPOINT                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ □ All 9 migrations executed without errors                                  │
│ □ projects.settings column added                                            │
│ □ project_members table created with invitation fields                      │
│ □ project_roles table created with permissions JSONB                        │
│ □ custom_field_definitions table created                                    │
│ □ project_integrations table created                                        │
│ □ notification_preferences table created                                    │
│ □ audit_logs table created (immutable)                                      │
│ □ api_keys and webhooks tables created                                      │
│ □ create_default_project_roles() function works                             │
│ □ create_audit_log() function works                                         │
│ □ RLS policies verified for all tables                                      │
│ □ All triggers created                                                      │
│                                                                             │
│ APPROVE [ ] / REJECT [ ]                                                    │
│                                                                             │
│ If REJECT, note issues: ____________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ STAGE 2: TYPESCRIPT TYPES & API LAYER

### 2.1 Type Definitions

Create `src/types/settings.ts`:

```typescript
// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS & ADMIN - TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Project Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectSettings {
  default_test_case_prefix: string;
  default_defect_prefix: string;
  default_cycle_prefix: string;
  timezone: string;
  date_format: string;
  language: 'en' | 'ar';
  require_test_case_review: boolean;
  auto_close_defects_on_pass: boolean;
  default_priority: string;
  default_severity: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Members
// ─────────────────────────────────────────────────────────────────────────────

export type MemberRole = 'admin' | 'lead' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'removed';
export type OnlineStatus = 'online' | 'away' | 'offline';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  role: MemberRole;
  email: string | null;
  invitation_token: string | null;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  status: MemberStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  invited_by_profile?: {
    id: string;
    full_name: string | null;
  };
}

export interface MemberInvite {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface MemberUpdate {
  role?: MemberRole;
  status?: MemberStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions
// ─────────────────────────────────────────────────────────────────────────────

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  // Project
  'project.settings': boolean;
  'project.members.invite': boolean;
  'project.members.remove': boolean;
  'project.members.edit_role': boolean;
  'project.delete': boolean;
  
  // Test Cases
  'test_cases.create': boolean;
  'test_cases.edit': boolean;
  'test_cases.delete': boolean;
  'test_cases.execute': boolean;
  
  // Cycles
  'cycles.create': boolean;
  'cycles.manage': boolean;
  
  // Defects
  'defects.create': boolean;
  'defects.edit': boolean;
  'defects.resolve': boolean;
  'defects.delete': boolean;
  
  // Reports
  'reports.view': boolean;
  'reports.export': boolean;
  
  // Admin
  'integrations.manage': boolean;
  'custom_fields.manage': boolean;
  'audit_log.view': boolean;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  permissions: RolePermissions;
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: RolePermissions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Fields
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'user';

export type FieldEntity = 'test_case' | 'test_cycle' | 'defect' | 'test_run';

export interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  field_key: string;
  description: string | null;
  field_type: FieldType;
  entity_type: FieldEntity;
  options: FieldOption[];
  is_required: boolean;
  default_value: string | null;
  validation_regex: string | null;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
  is_visible: boolean;
  show_in_list: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustomFieldCreate {
  name: string;
  field_key: string;
  description?: string;
  field_type: FieldType;
  entity_type: FieldEntity;
  options?: FieldOption[];
  is_required?: boolean;
  default_value?: string;
  validation_regex?: string;
  min_value?: number;
  max_value?: number;
  sort_order?: number;
  is_visible?: boolean;
  show_in_list?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integrations
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationType = 
  | 'jira'
  | 'slack'
  | 'github'
  | 'azure_devops'
  | 'jenkins'
  | 'microsoft_teams'
  | 'gitlab'
  | 'bitbucket';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface JiraConfig {
  base_url: string;
  project_key: string;
  api_token: string;
  email: string;
  sync_settings: {
    import_issues: boolean;
    sync_defects: boolean;
    link_test_cases: boolean;
  };
}

export interface SlackConfig {
  webhook_url: string;
  channel: string;
  notifications: {
    test_failures: boolean;
    cycle_completed: boolean;
    defects_created: boolean;
  };
}

export interface ProjectIntegration {
  id: string;
  project_id: string;
  integration_type: IntegrationType;
  name: string | null;
  status: IntegrationStatus;
  config: JiraConfig | SlackConfig | Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  connected_at: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed
  connected_by_profile?: { id: string; full_name: string };
}

export interface IntegrationMetadata {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type EmailDigest = 'instant' | 'daily' | 'weekly' | 'none';

export interface NotificationTypes {
  test_assigned: boolean;
  test_completed: boolean;
  test_failed: boolean;
  cycle_started: boolean;
  cycle_completed: boolean;
  defect_assigned: boolean;
  defect_resolved: boolean;
  defect_commented: boolean;
  mentioned: boolean;
  member_joined: boolean;
  member_left: boolean;
  weekly_digest: boolean;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  project_id: string | null;
  email_enabled: boolean;
  email_digest: EmailDigest;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  slack_dm: boolean;
  preferences: NotificationTypes;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'invite'
  | 'join'
  | 'leave'
  | 'archive'
  | 'restore'
  | 'export'
  | 'import'
  | 'connect'
  | 'disconnect';

export interface AuditLogChange {
  field: string;
  old: unknown;
  new: unknown;
}

export interface AuditLogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: AuditLogChange[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Keys & Webhooks
// ─────────────────────────────────────────────────────────────────────────────

export type ApiScope = 'read' | 'write' | 'execute' | 'admin';

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiScope[];
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ApiKeyCreate {
  name: string;
  scopes: ApiScope[];
  expires_at?: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // Full key, only returned on creation
}

export type WebhookEvent = 
  | 'test_case.created'
  | 'test_case.updated'
  | 'test_case.deleted'
  | 'cycle.started'
  | 'cycle.completed'
  | 'run.completed'
  | 'defect.created'
  | 'defect.resolved'
  | 'member.joined'
  | 'member.left';

export interface Webhook {
  id: string;
  project_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: WebhookEvent[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_response_code: number | null;
  failure_count: number;
  created_at: string;
  created_by: string | null;
}

export interface WebhookCreate {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
}
```

### 2.2 API Service Layer

Create `src/services/settings.ts`:

```typescript
// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS & ADMIN - API SERVICE
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase';
import type {
  Project,
  ProjectSettings,
  ProjectMember,
  MemberInvite,
  MemberUpdate,
  ProjectRole,
  RoleCreate,
  CustomFieldDefinition,
  CustomFieldCreate,
  ProjectIntegration,
  NotificationPreferences,
  AuditLogEntry,
  AuditLogFilters,
  ApiKey,
  ApiKeyCreate,
  ApiKeyCreated,
  Webhook,
  WebhookCreate,
} from '@/types/settings';

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SETTINGS API
// ─────────────────────────────────────────────────────────────────────────────

export const projectSettingsApi = {
  async get(projectId: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<Project> {
    const { data: current } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();
    
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        settings: { ...current?.settings, ...settings } 
      })
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_project_id: projectId,
      p_action: 'update',
      p_entity_type: 'project_settings',
      p_entity_id: projectId,
      p_changes: { settings }
    });
    
    return data;
  },
  
  async archive(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: new Date().toISOString(),
        archived_by: user?.id
      })
      .eq('id', projectId);
    
    if (error) throw error;
    
    await supabase.rpc('create_audit_log', {
      p_project_id: projectId,
      p_action: 'archive',
      p_entity_type: 'project',
      p_entity_id: projectId
    });
  },
  
  async restore(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: null,
        archived_by: null
      })
      .eq('id', projectId);
    
    if (error) throw error;
    
    await supabase.rpc('create_audit_log', {
      p_project_id: projectId,
      p_action: 'restore',
      p_entity_type: 'project',
      p_entity_id: projectId
    });
  },
  
  async delete(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MEMBERS API
// ─────────────────────────────────────────────────────────────────────────────

export const membersApi = {
  async list(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles(id, full_name, email, avatar_url),
        invited_by_profile:profiles!project_members_invited_by_fkey(id, full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as ProjectMember[];
  },
  
  async invite(projectId: string, invite: MemberInvite): Promise<ProjectMember> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invite.email)
      .single();
    
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: existingUser?.id || null,
        email: invite.email,
        role: invite.role,
        status: existingUser ? 'active' : 'pending',
        invited_by: user?.id,
        accepted_at: existingUser ? new Date().toISOString() : null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_project_id: projectId,
      p_action: 'invite',
      p_entity_type: 'member',
      p_entity_name: invite.email,
      p_metadata: { role: invite.role }
    });
    
    // TODO: Send invitation email
    
    return data;
  },
  
  async update(memberId: string, updates: MemberUpdate): Promise<ProjectMember> {
    const { data, error } = await supabase
      .from('project_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async remove(memberId: string): Promise<void> {
    const { data: member } = await supabase
      .from('project_members')
      .select('project_id, email, profile:profiles(full_name)')
      .eq('id', memberId)
      .single();
    
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
    
    // Create audit log
    if (member) {
      await supabase.rpc('create_audit_log', {
        p_project_id: member.project_id,
        p_action: 'leave',
        p_entity_type: 'member',
        p_entity_name: member.profile?.full_name || member.email
      });
    }
  },
  
  async resendInvitation(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .update({ 
        invitation_token: crypto.randomUUID(),
        invited_at: new Date().toISOString()
      })
      .eq('id', memberId);
    
    if (error) throw error;
    
    // TODO: Resend invitation email
  },
  
  async acceptInvitation(token: string): Promise<ProjectMember> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('project_members')
      .update({
        user_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
        invitation_token: null
      })
      .eq('invitation_token', token)
      .select()
      .single();
    
    if (error) throw error;
    
    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_project_id: data.project_id,
      p_action: 'join',
      p_entity_type: 'member',
      p_entity_id: data.id
    });
    
    return data;
  },
  
  async updateLastActive(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase
      .from('project_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', user.id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLES API
// ─────────────────────────────────────────────────────────────────────────────

export const rolesApi = {
  async list(projectId: string): Promise<ProjectRole[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as ProjectRole[];
  },
  
  async create(projectId: string, role: RoleCreate): Promise<ProjectRole> {
    const { data, error } = await supabase
      .from('project_roles')
      .insert({
        project_id: projectId,
        ...role,
        is_system: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async update(roleId: string, updates: Partial<RoleCreate>): Promise<ProjectRole> {
    const { data, error } = await supabase
      .from('project_roles')
      .update(updates)
      .eq('id', roleId)
      .eq('is_system', false) // Cannot update system roles
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async delete(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('project_roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system', false); // Cannot delete system roles
    
    if (error) throw error;
  },
  
  async initializeDefaultRoles(projectId: string): Promise<void> {
    await supabase.rpc('create_default_project_roles', {
      p_project_id: projectId
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELDS API
// ─────────────────────────────────────────────────────────────────────────────

export const customFieldsApi = {
  async list(projectId: string, entityType?: string): Promise<CustomFieldDefinition[]> {
    let query = supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as CustomFieldDefinition[];
  },
  
  async create(projectId: string, field: CustomFieldCreate): Promise<CustomFieldDefinition> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        project_id: projectId,
        ...field,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async update(fieldId: string, updates: Partial<CustomFieldCreate>): Promise<CustomFieldDefinition> {
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update(updates)
      .eq('id', fieldId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async delete(fieldId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', fieldId);
    
    if (error) throw error;
  },
  
  async reorder(fields: { id: string; sort_order: number }[]): Promise<void> {
    const updates = fields.map(f => 
      supabase
        .from('custom_field_definitions')
        .update({ sort_order: f.sort_order })
        .eq('id', f.id)
    );
    
    await Promise.all(updates);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS API
// ─────────────────────────────────────────────────────────────────────────────

export const integrationsApi = {
  async list(projectId: string): Promise<ProjectIntegration[]> {
    const { data, error } = await supabase
      .from('project_integrations')
      .select(`
        *,
        connected_by_profile:profiles(id, full_name)
      `)
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data as ProjectIntegration[];
  },
  
  async connect(
    projectId: string, 
    integrationType: string, 
    config: Record<string, unknown>
  ): Promise<ProjectIntegration> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        integration_type: integrationType,
        config,
        status: 'connected',
        connected_at: new Date().toISOString(),
        connected_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_project_id: projectId,
      p_action: 'connect',
      p_entity_type: 'integration',
      p_entity_name: integrationType
    });
    
    return data;
  },
  
  async disconnect(integrationId: string): Promise<void> {
    const { data: integration } = await supabase
      .from('project_integrations')
      .select('project_id, integration_type')
      .eq('id', integrationId)
      .single();
    
    const { error } = await supabase
      .from('project_integrations')
      .update({ 
        status: 'disconnected',
        config: {}
      })
      .eq('id', integrationId);
    
    if (error) throw error;
    
    if (integration) {
      await supabase.rpc('create_audit_log', {
        p_project_id: integration.project_id,
        p_action: 'disconnect',
        p_entity_type: 'integration',
        p_entity_name: integration.integration_type
      });
    }
  },
  
  async testConnection(integrationId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement actual connection test
    return { success: true };
  },
  
  async sync(integrationId: string): Promise<void> {
    await supabase
      .from('project_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success'
      })
      .eq('id', integrationId);
    
    // TODO: Implement actual sync logic
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  async getPreferences(projectId?: string): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    } else {
      query = query.is('project_id', null);
    }
    
    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async updatePreferences(
    preferences: Partial<NotificationPreferences>,
    projectId?: string
  ): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        project_id: projectId || null,
        ...preferences
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG API
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogApi = {
  async list(
    projectId: string,
    filters?: AuditLogFilters,
    limit = 50,
    offset = 0
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { entries: data as AuditLogEntry[], total: count || 0 };
  },
  
  async export(projectId: string, filters?: AuditLogFilters): Promise<Blob> {
    const { entries } = await this.list(projectId, filters, 10000, 0);
    
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Changes'].join(','),
      ...entries.map(e => [
        e.created_at,
        e.user_name || e.user_email || 'System',
        e.action,
        e.entity_type,
        e.entity_name || '',
        JSON.stringify(e.changes || {})
      ].join(','))
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS API
// ─────────────────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  async list(projectId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as ApiKey[];
  },
  
  async create(projectId: string, apiKey: ApiKeyCreate): Promise<ApiKeyCreated> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate key
    const fullKey = `ctm_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyPrefix = fullKey.substring(0, 10);
    const keyHash = await hashKey(fullKey);
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: projectId,
        ...apiKey,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { ...data, key: fullKey } as ApiKeyCreated;
  },
  
  async revoke(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);
    
    if (error) throw error;
  },
  
  async delete(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);
    
    if (error) throw error;
  },
};

// Helper function (implement with proper crypto)
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS API
// ─────────────────────────────────────────────────────────────────────────────

export const webhooksApi = {
  async list(projectId: string): Promise<Webhook[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Webhook[];
  },
  
  async create(projectId: string, webhook: WebhookCreate): Promise<Webhook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        project_id: projectId,
        ...webhook,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async update(webhookId: string, updates: Partial<WebhookCreate>): Promise<Webhook> {
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async delete(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);
    
    if (error) throw error;
  },
  
  async test(webhookId: string): Promise<{ success: boolean; response_code: number }> {
    // TODO: Implement actual webhook test
    return { success: true, response_code: 200 };
  },
};
```

### 2.3 React Query Hooks

Create `src/hooks/use-settings.ts`:

```typescript
// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS & ADMIN - REACT QUERY HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectSettingsApi,
  membersApi,
  rolesApi,
  customFieldsApi,
  integrationsApi,
  notificationsApi,
  auditLogApi,
  apiKeysApi,
  webhooksApi,
} from '@/services/settings';
import type {
  ProjectSettings,
  MemberInvite,
  MemberUpdate,
  RoleCreate,
  CustomFieldCreate,
  AuditLogFilters,
  ApiKeyCreate,
  WebhookCreate,
} from '@/types/settings';
import { toast } from 'sonner';

// Query Keys
export const settingsKeys = {
  all: ['settings'] as const,
  project: (id: string) => [...settingsKeys.all, 'project', id] as const,
  members: (projectId: string) => [...settingsKeys.all, 'members', projectId] as const,
  roles: (projectId: string) => [...settingsKeys.all, 'roles', projectId] as const,
  customFields: (projectId: string, entity?: string) => 
    [...settingsKeys.all, 'custom-fields', projectId, entity] as const,
  integrations: (projectId: string) => [...settingsKeys.all, 'integrations', projectId] as const,
  notifications: (projectId?: string) => [...settingsKeys.all, 'notifications', projectId] as const,
  auditLog: (projectId: string, filters?: AuditLogFilters) => 
    [...settingsKeys.all, 'audit-log', projectId, filters] as const,
  apiKeys: (projectId: string) => [...settingsKeys.all, 'api-keys', projectId] as const,
  webhooks: (projectId: string) => [...settingsKeys.all, 'webhooks', projectId] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SETTINGS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProject(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.project(projectId),
    queryFn: () => projectSettingsApi.get(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProjectSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, settings }: { projectId: string; settings: Partial<ProjectSettings> }) =>
      projectSettingsApi.updateSettings(projectId, settings),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.project(data.id) });
      toast.success('Settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.archive(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.project(projectId) });
      toast.success('Project archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive project: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.delete(projectId),
    onSuccess: () => {
      toast.success('Project deleted');
      // Redirect to projects list
      window.location.href = '/projects';
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MEMBERS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.members(projectId),
    queryFn: () => membersApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, invite }: { projectId: string; invite: MemberInvite }) =>
      membersApi.invite(projectId, invite),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: MemberUpdate; projectId: string }) =>
      membersApi.update(memberId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Member updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update member: ${error.message}`);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, projectId }: { memberId: string; projectId: string }) =>
      membersApi.remove(memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (memberId: string) => membersApi.resendInvitation(memberId),
    onSuccess: () => {
      toast.success('Invitation resent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend invitation: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLES HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectRoles(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.roles(projectId),
    queryFn: () => rolesApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, role }: { projectId: string; role: RoleCreate }) =>
      rolesApi.create(projectId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(projectId) });
      toast.success('Role created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELDS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useCustomFields(projectId: string, entityType?: string) {
  return useQuery({
    queryKey: settingsKeys.customFields(projectId, entityType),
    queryFn: () => customFieldsApi.list(projectId, entityType),
    enabled: !!projectId,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, field }: { projectId: string; field: CustomFieldCreate }) =>
      customFieldsApi.create(projectId, field),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customFields(projectId) });
      toast.success('Custom field created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create field: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useIntegrations(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.integrations(projectId),
    queryFn: () => integrationsApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      projectId, 
      integrationType, 
      config 
    }: { 
      projectId: string; 
      integrationType: string; 
      config: Record<string, unknown>;
    }) => integrationsApi.connect(projectId, integrationType, config),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.integrations(projectId) });
      toast.success('Integration connected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect integration: ${error.message}`);
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ integrationId, projectId }: { integrationId: string; projectId: string }) =>
      integrationsApi.disconnect(integrationId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.integrations(projectId) });
      toast.success('Integration disconnected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useNotificationPreferences(projectId?: string) {
  return useQuery({
    queryKey: settingsKeys.notifications(projectId),
    queryFn: () => notificationsApi.getPreferences(projectId),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      preferences, 
      projectId 
    }: { 
      preferences: Record<string, unknown>; 
      projectId?: string;
    }) => notificationsApi.updatePreferences(preferences, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications(projectId) });
      toast.success('Preferences saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditLog(projectId: string, filters?: AuditLogFilters, limit = 50, offset = 0) {
  return useQuery({
    queryKey: settingsKeys.auditLog(projectId, filters),
    queryFn: () => auditLogApi.list(projectId, filters, limit, offset),
    enabled: !!projectId,
  });
}

export function useExportAuditLog() {
  return useMutation({
    mutationFn: ({ projectId, filters }: { projectId: string; filters?: AuditLogFilters }) =>
      auditLogApi.export(projectId, filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.csv`;
      a.click();
      toast.success('Audit log exported');
    },
    onError: (error: Error) => {
      toast.error(`Failed to export: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useApiKeys(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.apiKeys(projectId),
    queryFn: () => apiKeysApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, apiKey }: { projectId: string; apiKey: ApiKeyCreate }) =>
      apiKeysApi.create(projectId, apiKey),
    onSuccess: (data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys(projectId) });
      // Return the full key to display once
      return data;
    },
    onError: (error: Error) => {
      toast.error(`Failed to create API key: ${error.message}`);
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ keyId, projectId }: { keyId: string; projectId: string }) =>
      apiKeysApi.revoke(keyId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys(projectId) });
      toast.success('API key revoked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke key: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useWebhooks(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.webhooks(projectId),
    queryFn: () => webhooksApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, webhook }: { projectId: string; webhook: WebhookCreate }) =>
      webhooksApi.create(projectId, webhook),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(projectId) });
      toast.success('Webhook created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function usePermissions(projectId: string) {
  const { data: members } = useProjectMembers(projectId);
  const { data: roles } = useProjectRoles(projectId);
  
  const currentUser = members?.find(m => m.user_id === 'current-user-id'); // Replace with actual auth
  const currentRole = roles?.find(r => r.name === currentUser?.role);
  
  return {
    can: (permission: string) => currentRole?.permissions[permission] ?? false,
    role: currentUser?.role,
    isAdmin: currentUser?.role === 'admin',
    isLead: currentUser?.role === 'lead',
  };
}
```

### 2.4 Stage 2 QA Gate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2 QA CHECKPOINT                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ □ All TypeScript types compile without errors                               │
│ □ Project settings API works (get, update)                                  │
│ □ Members API works (list, invite, update, remove)                          │
│ □ Roles API works (list, create, update)                                    │
│ □ Custom fields API works (list, create, reorder)                           │
│ □ Integrations API works (list, connect, disconnect)                        │
│ □ Notifications API works (get, update preferences)                         │
│ □ Audit log API works (list, export)                                        │
│ □ API keys API works (list, create, revoke)                                 │
│ □ Webhooks API works (list, create, delete)                                 │
│ □ React Query hooks have proper cache invalidation                          │
│ □ Toast notifications show on success/error                                 │
│ □ usePermissions hook checks permissions correctly                          │
│                                                                             │
│ APPROVE [ ] / REJECT [ ]                                                    │
│                                                                             │
│ If REJECT, note issues: ____________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ STAGE 3: UI COMPONENTS

### 3.1 Component Architecture

```
src/components/settings/
├── index.ts                          # Barrel exports
├── SettingsLayout.tsx                # Settings page layout with sidebar
├── SettingsSidebar.tsx               # Settings navigation
├── SettingsHeader.tsx                # Page header with title
├── general/
│   ├── GeneralSettingsPage.tsx       # Project settings form
│   └── ProjectSettingsForm.tsx       # Settings fields
├── team/
│   ├── TeamMembersPage.tsx           # Main team page
│   ├── MembersTable.tsx              # Members list table
│   ├── MemberRow.tsx                 # Individual member row
│   ├── MemberAvatar.tsx              # Avatar with initials fallback
│   ├── RoleBadge.tsx                 # Role badge component
│   ├── StatusIndicator.tsx           # Online/offline status
│   ├── InviteMemberDialog.tsx        # Invite modal
│   └── PendingInvitations.tsx        # Pending invites list
├── roles/
│   ├── RolesPermissionsPage.tsx      # Roles & permissions
│   ├── PermissionsMatrix.tsx         # Permissions grid
│   ├── CreateRoleDialog.tsx          # Create custom role
│   └── PermissionCell.tsx            # Check/X/partial cell
├── custom-fields/
│   ├── CustomFieldsPage.tsx          # Custom fields list
│   ├── CustomFieldItem.tsx           # Draggable field item
│   ├── CreateFieldDialog.tsx         # Create field modal
│   ├── FieldTypeIcon.tsx             # Icon per field type
│   └── FieldOptionsEditor.tsx        # Select options editor
├── integrations/
│   ├── IntegrationsPage.tsx          # Integrations list
│   ├── IntegrationCard.tsx           # Individual integration
│   ├── IntegrationLogo.tsx           # Logo by type
│   ├── JiraConfigDialog.tsx          # Jira setup
│   ├── SlackConfigDialog.tsx         # Slack setup
│   └── GitHubConfigDialog.tsx        # GitHub setup
├── notifications/
│   ├── NotificationsPage.tsx         # Notification settings
│   ├── NotificationChannels.tsx      # Email/In-app/Slack tabs
│   ├── NotificationGroup.tsx         # Group of related settings
│   └── NotificationToggle.tsx        # Individual toggle
├── audit/
│   ├── AuditLogPage.tsx              # Audit log viewer
│   ├── AuditLogItem.tsx              # Individual log entry
│   ├── AuditLogFilters.tsx           # Filter controls
│   └── AuditActionIcon.tsx           # Icon per action type
├── api/
│   ├── ApiWebhooksPage.tsx           # API keys & webhooks
│   ├── ApiKeysSection.tsx            # API keys list
│   ├── ApiKeyRow.tsx                 # Individual key
│   ├── CreateApiKeyDialog.tsx        # Create key modal
│   ├── WebhooksSection.tsx           # Webhooks list
│   ├── WebhookRow.tsx                # Individual webhook
│   └── CreateWebhookDialog.tsx       # Create webhook modal
├── danger/
│   ├── DangerZone.tsx                # Danger zone section
│   ├── ArchiveProjectDialog.tsx      # Confirm archive
│   ├── DeleteProjectDialog.tsx       # Confirm delete
│   └── TransferOwnershipDialog.tsx   # Transfer ownership
└── shared/
    ├── ToggleSwitch.tsx              # Toggle component
    ├── FormField.tsx                 # Form field wrapper
    ├── SectionCard.tsx               # Settings section card
    └── SettingsEmptyState.tsx        # Empty state
```

### 3.2 Key Components

See HTML demo for visual reference. Implementation patterns:

**SettingsLayout.tsx:**
```tsx
export function SettingsLayout() {
  return (
    <div className="flex min-h-screen">
      <SettingsSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
```

**MembersTable.tsx:**
```tsx
export function MembersTable({ members }: { members: ProjectMember[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Member</th>
          <th>Role</th>
          <th>Status</th>
          <th>Last Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {members.map(member => (
          <MemberRow key={member.id} member={member} />
        ))}
      </tbody>
    </table>
  );
}
```

**PermissionsMatrix.tsx:**
```tsx
export function PermissionsMatrix({ roles }: { roles: ProjectRole[] }) {
  const permissions = getPermissionsList();
  
  return (
    <div className="grid" style={{ gridTemplateColumns: `200px repeat(${roles.length}, 1fr)` }}>
      <div className="header">Permission</div>
      {roles.map(role => (
        <div key={role.id} className="header">{role.name}</div>
      ))}
      
      {permissions.map(perm => (
        <React.Fragment key={perm.key}>
          <div className="cell">{perm.label}</div>
          {roles.map(role => (
            <PermissionCell
              key={`${role.id}-${perm.key}`}
              value={role.permissions[perm.key]}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### 3.3 Stage 3 QA Gate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3 QA CHECKPOINT                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ □ Settings sidebar navigation works                                         │
│ □ Team members table renders correctly                                      │
│ □ Role badges display correct colors/icons                                  │
│ □ Status indicators show online/away/offline                                │
│ □ Invite member dialog opens and submits                                    │
│ □ Pending invitations section works                                         │
│ □ Permissions matrix renders correctly                                      │
│ □ Custom fields list with drag-and-drop                                     │
│ □ Integration cards show connected/disconnected                             │
│ □ Notification toggles work                                                 │
│ □ Audit log displays entries                                                │
│ □ Danger zone buttons show confirmation dialogs                             │
│ □ All loading/error states handled                                          │
│                                                                             │
│ APPROVE [ ] / REJECT [ ]                                                    │
│                                                                             │
│ If REJECT, note issues: ____________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ STAGE 4: PAGE INTEGRATION & ROUTING

### 4.1 Route Configuration

```tsx
// Add to router config

import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { GeneralSettingsPage } from '@/components/settings/general/GeneralSettingsPage';
import { TeamMembersPage } from '@/components/settings/team/TeamMembersPage';
import { RolesPermissionsPage } from '@/components/settings/roles/RolesPermissionsPage';
import { CustomFieldsPage } from '@/components/settings/custom-fields/CustomFieldsPage';
import { IntegrationsPage } from '@/components/settings/integrations/IntegrationsPage';
import { NotificationsPage } from '@/components/settings/notifications/NotificationsPage';
import { AuditLogPage } from '@/components/settings/audit/AuditLogPage';
import { ApiWebhooksPage } from '@/components/settings/api/ApiWebhooksPage';

// Routes:
{
  path: 'settings',
  element: <SettingsLayout />,
  children: [
    { index: true, element: <Navigate to="general" replace /> },
    { path: 'general', element: <GeneralSettingsPage /> },
    { path: 'team', element: <TeamMembersPage /> },
    { path: 'roles', element: <RolesPermissionsPage /> },
    { path: 'security', element: <SecurityPage /> },
    { path: 'custom-fields', element: <CustomFieldsPage /> },
    { path: 'workflows', element: <WorkflowsPage /> },
    { path: 'templates', element: <TemplatesPage /> },
    { path: 'integrations', element: <IntegrationsPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'api', element: <ApiWebhooksPage /> },
    { path: 'audit-log', element: <AuditLogPage /> },
    { path: 'billing', element: <BillingPage /> },
  ],
},
```

### 4.2 Navigation Integration

```tsx
// Update main sidebar

const navItems = [
  // ... existing items
  {
    name: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
  },
];
```

### 4.3 Stage 4 QA Gate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4 QA CHECKPOINT                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ □ /settings redirects to /settings/general                                  │
│ □ All settings routes load correctly                                        │
│ □ Settings sidebar highlights active section                                │
│ □ Navigation between settings pages works                                   │
│ □ Back to main app navigation works                                         │
│ □ Deep linking works (refresh on any settings page)                         │
│ □ Permission-gated pages show appropriate message                           │
│                                                                             │
│ APPROVE [ ] / REJECT [ ]                                                    │
│                                                                             │
│ If REJECT, note issues: ____________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ STAGE 5: POLISH & FINALIZATION

### 5.1 Animation Specifications

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Sidebar nav item | Highlight slide | 0.15s | ease |
| Modal open | Fade + scale | 0.2s | ease-out |
| Toggle switch | Slide | 0.2s | ease |
| Table row hover | Background | 0.1s | ease |
| Status dot | Pulse (online) | 2s | infinite |
| Danger button hover | Shake | 0.3s | ease |

### 5.2 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close dialogs |
| `Enter` | Submit forms |
| `Ctrl/Cmd + S` | Save settings |

### 5.3 Final Visual QA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5 QA CHECKPOINT - FINAL REVIEW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ VISUAL DESIGN                                                               │
│ □ Catalyst V5 colors throughout                                             │
│ □ Settings sidebar matches HTML demo                                        │
│ □ Role badges use correct colors (admin=purple, lead=blue, etc.)           │
│ □ Status indicators pulse correctly                                         │
│ □ Permissions matrix is readable                                            │
│ □ Danger zone has proper warning styling                                    │
│                                                                             │
│ FUNCTIONALITY                                                               │
│ □ Invite member flow works end-to-end                                       │
│ □ Role change updates immediately                                           │
│ □ Custom field drag-and-drop reorders                                       │
│ □ Integration connect/disconnect works                                      │
│ □ Notification toggles persist                                              │
│ □ Audit log filters work                                                    │
│ □ API key shows once then hides                                             │
│ □ Webhook test sends request                                                │
│ □ Archive/delete show confirmation                                          │
│                                                                             │
│ SECURITY                                                                    │
│ □ Non-admins cannot access admin-only pages                                 │
│ □ API keys are hashed in database                                           │
│ □ Audit log captures all actions                                            │
│ □ RLS policies working correctly                                            │
│                                                                             │
│ APPROVE [ ] / REJECT [ ]                                                    │
│                                                                             │
│ If REJECT, note issues: ____________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 3 QA CYCLES

### QA CYCLE 1: Developer Review
- Run after Stage 3 completion
- Focus: API calls, TypeScript, permissions
- Owner: Developer

### QA CYCLE 2: Design Review
- Run after Stage 5 completion
- Focus: Visual design, interactions
- Owner: Designer / PM

### QA CYCLE 3: Security Review
- Run after all stages complete
- Focus: Permissions, RLS, audit logging
- Owner: QA Lead

---

## ✅ FINAL APPROVAL GATE

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                                                                             ║
║  MODULE 5: SETTINGS & ADMIN - FINAL APPROVAL                                ║
║                                                                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Stage 1 (Database): APPROVED [ ] / REJECTED [ ]                            ║
║  Stage 2 (Types/API): APPROVED [ ] / REJECTED [ ]                           ║
║  Stage 3 (Components): APPROVED [ ] / REJECTED [ ]                          ║
║  Stage 4 (Integration): APPROVED [ ] / REJECTED [ ]                         ║
║  Stage 5 (Polish): APPROVED [ ] / REJECTED [ ]                              ║
║                                                                             ║
║  QA Cycle 1 (Dev): PASSED [ ] / FAILED [ ]                                  ║
║  QA Cycle 2 (Design): PASSED [ ] / FAILED [ ]                               ║
║  QA Cycle 3 (Security): PASSED [ ] / FAILED [ ]                             ║
║                                                                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  FINAL RATING: _____ / 10                                                   ║
║                                                                             ║
║  Target: ≥9.5/10 (GOD-TIER)                                                ║
║                                                                             ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                     │   ║
║  │  [ ] APPROVED FOR PRODUCTION                                        │   ║
║  │                                                                     │   ║
║  │  [ ] REJECTED - REVISIONS REQUIRED                                  │   ║
║  │                                                                     │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                                                             ║
║  Signed: _________________________ Date: _____________                      ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

---

## 📎 ATTACHMENTS

### A. HTML Demo Reference
- File: `settings-admin-demo.html`
- Use as pixel-perfect reference for Team Members page

### B. Settings Sidebar Navigation Structure

| Section | Items |
|---------|-------|
| **Project** | General, Team Members, Roles & Permissions, Security |
| **Customization** | Custom Fields, Workflows, Templates |
| **Integrations** | Connected Apps, Notifications, API & Webhooks |
| **System** | Audit Log, Usage & Billing |

### C. Default Role Permissions

| Permission | Admin | Lead | Member | Viewer |
|------------|-------|------|--------|--------|
| project.settings | ✓ | – | – | – |
| project.members.invite | ✓ | ✓ | – | – |
| test_cases.create | ✓ | ✓ | ✓ | – |
| test_cases.execute | ✓ | ✓ | ✓ | – |
| cycles.manage | ✓ | ✓ | – | – |
| defects.resolve | ✓ | ✓ | – | – |
| reports.view | ✓ | ✓ | ✓ | ✓ |
| reports.export | ✓ | ✓ | – | – |
| integrations.manage | ✓ | – | – | – |
| audit_log.view | ✓ | ✓ | – | – |

---

**END OF CATALYST_MAGIC_PROMPT: MODULE 5 - SETTINGS & ADMIN**
