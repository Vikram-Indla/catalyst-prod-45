-- =====================================================
-- INCIDENT ROOM MODULE - COMPLETE DATABASE SCHEMA
-- =====================================================

-- 1. ENUM TYPES
CREATE TYPE incident_status AS ENUM (
  'open',
  'triage',
  'to_committee',
  'in_progress',
  'resolved',
  'converted',
  'closed'
);

CREATE TYPE severity_level AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');
CREATE TYPE support_level AS ENUM ('L1', 'L2', 'L3');
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE impact_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE urgency_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE delivery_stage AS ENUM ('stage', 'qa', 'beta', 'prod');
CREATE TYPE comment_type AS ENUM ('update', 'investigation', 'mitigation', 'handover', 'decision', 'rca', 'system');
CREATE TYPE committee_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE vote_status AS ENUM ('pending', 'approved', 'rejected', 'vetoed');

-- 2. WORKGROUPS TABLE
CREATE TABLE workgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  support_level_default TEXT CHECK (support_level_default IN ('L1', 'L2', 'L3')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Seed workgroups
INSERT INTO workgroups (name, code, support_level_default) VALUES
  ('Operations', 'operations', 'L1'),
  ('Delivery', 'delivery', 'L3');

-- 3. INCIDENT_USER_PROFILES TABLE (extends profiles for incident-specific fields)
CREATE TABLE incident_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_initials TEXT,
  workgroup_id UUID REFERENCES workgroups(id),
  incident_role TEXT DEFAULT 'user' CHECK (incident_role IN ('user', 'committee_member', 'admin')),
  has_veto_power BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. RELEASE_VERSIONS TABLE (reference table for incidents)
CREATE TABLE release_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  name TEXT,
  release_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'released')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed some release versions
INSERT INTO release_versions (version, name, status) VALUES
  ('v2.5.0', 'Version 2.5.0', 'released'),
  ('v2.5.1', 'Version 2.5.1', 'released'),
  ('v2.6.0', 'Version 2.6.0', 'active'),
  ('v2.6.1', 'Version 2.6.1', 'planned');

-- 5. INCIDENT LABELS
CREATE TABLE incident_label_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#E1E4E8',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed some labels
INSERT INTO incident_label_defs (name, color) VALUES
  ('production', '#EF4444'),
  ('database', '#3B82F6'),
  ('connection-pool', '#8B5CF6'),
  ('api', '#10B981'),
  ('performance', '#F59E0B');

-- 6. SLA CONFIGS TABLE
CREATE TABLE sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity severity_level NOT NULL UNIQUE,
  response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed SLA configs
INSERT INTO sla_configs (severity, response_minutes, resolution_minutes) VALUES
  ('SEV1', 15, 60),
  ('SEV2', 30, 240),
  ('SEV3', 120, 1440),
  ('SEV4', 480, 4320);

-- 7. COMMITTEES TABLE (created before incidents for FK)
CREATE TABLE incident_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status committee_status DEFAULT 'pending' NOT NULL,
  required_approvals INTEGER DEFAULT 2,
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 8. INCIDENTS TABLE
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status incident_status DEFAULT 'open' NOT NULL,
  severity severity_level NOT NULL,
  support_level support_level,
  priority priority_level,
  impact impact_level DEFAULT 'medium',
  urgency urgency_level DEFAULT 'medium',
  is_major_incident BOOLEAN DEFAULT FALSE,
  release_version_id UUID REFERENCES release_versions(id),
  delivery_stage delivery_stage,
  reporter_id UUID REFERENCES incident_user_profiles(id),
  reporter_name TEXT,
  assignee_id UUID REFERENCES incident_user_profiles(id),
  assignee_workgroup_id UUID REFERENCES workgroups(id),
  target_date DATE,
  resolved_at TIMESTAMPTZ,
  requires_committee BOOLEAN DEFAULT FALSE,
  committee_id UUID REFERENCES incident_committees(id),
  converted_to_type TEXT CHECK (converted_to_type IN ('business_request', 'epic', 'feature', 'story')),
  converted_to_id UUID,
  converted_at TIMESTAMPTZ,
  conversion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Add incident_id FK to committees
ALTER TABLE incident_committees ADD COLUMN incident_id UUID REFERENCES incidents(id);

-- 9. INCIDENT COMMENTS
CREATE TABLE incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  author_id UUID REFERENCES incident_user_profiles(id),
  author_name TEXT,
  content TEXT NOT NULL,
  comment_type comment_type DEFAULT 'update',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- 10. INCIDENT ATTACHMENTS
CREATE TABLE incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES incident_user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- 11. INCIDENT LABELS JUNCTION
CREATE TABLE incident_labels (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES incident_label_defs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (incident_id, label_id)
);

-- 12. INCIDENT HISTORY
CREATE TABLE incident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES incident_user_profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. COMMITTEE MEMBERS
CREATE TABLE committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES incident_committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES incident_user_profiles(id),
  role TEXT,
  has_veto BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (committee_id, user_id)
);

-- 14. COMMITTEE VOTES
CREATE TABLE committee_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES incident_committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  vote vote_status DEFAULT 'pending' NOT NULL,
  comment TEXT,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (committee_id, member_id)
);

-- 15. SLA RECORDS
CREATE TABLE sla_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  response_due_at TIMESTAMPTZ NOT NULL,
  response_met_at TIMESTAMPTZ,
  response_breached BOOLEAN DEFAULT FALSE,
  resolution_due_at TIMESTAMPTZ NOT NULL,
  resolution_met_at TIMESTAMPTZ,
  resolution_breached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_severity ON incidents(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_assignee ON incidents(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_incident_key ON incidents(incident_key);
CREATE INDEX idx_incident_comments_incident ON incident_comments(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_comments_created_at ON incident_comments(created_at DESC);
CREATE INDEX idx_incident_history_incident ON incident_history(incident_id);
CREATE INDEX idx_incident_history_changed_at ON incident_history(changed_at DESC);
CREATE INDEX idx_incident_committees_status ON incident_committees(status);
CREATE INDEX idx_committee_votes_committee ON committee_votes(committee_id);
CREATE INDEX idx_sla_records_incident ON sla_records(incident_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE workgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_label_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can read reference tables
CREATE POLICY "Authenticated users can view workgroups" ON workgroups FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can view user profiles" ON incident_user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view release versions" ON release_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view labels" ON incident_label_defs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view SLA configs" ON sla_configs FOR SELECT TO authenticated USING (true);

-- RLS Policies - Incidents
CREATE POLICY "Users can view all incidents" ON incidents FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can create incidents" ON incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update incidents" ON incidents FOR UPDATE TO authenticated USING (true);

-- RLS Policies - Comments
CREATE POLICY "Users can view comments" ON incident_comments FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can create comments" ON incident_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own comments" ON incident_comments FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- RLS Policies - Attachments
CREATE POLICY "Users can view attachments" ON incident_attachments FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can create attachments" ON incident_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete own attachments" ON incident_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- RLS Policies - Labels
CREATE POLICY "Users can view incident labels" ON incident_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage incident labels" ON incident_labels FOR ALL TO authenticated USING (true);

-- RLS Policies - History
CREATE POLICY "Users can view history" ON incident_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert history" ON incident_history FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies - Committees
CREATE POLICY "Users can view committees" ON incident_committees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create committees" ON incident_committees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update committees" ON incident_committees FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view committee members" ON committee_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage committee members" ON committee_members FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view votes" ON committee_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can vote" ON committee_votes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM committee_members WHERE committee_members.id = committee_votes.member_id AND committee_members.user_id = auth.uid())
);
CREATE POLICY "System can create votes" ON committee_votes FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies - SLA Records
CREATE POLICY "Users can view SLA records" ON sla_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can manage SLA records" ON sla_records FOR ALL TO authenticated USING (true);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Auto-generate incident key
CREATE OR REPLACE FUNCTION generate_incident_key()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_key FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM incidents;
  
  NEW.incident_key := 'INC-' || next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_generate_incident_key
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_key IS NULL)
  EXECUTE FUNCTION generate_incident_key();

-- Derive priority from impact + urgency
CREATE OR REPLACE FUNCTION derive_incident_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority := CASE
    WHEN NEW.impact = 'high' AND NEW.urgency = 'high' THEN 'P1'
    WHEN NEW.impact = 'high' AND NEW.urgency = 'medium' THEN 'P2'
    WHEN NEW.impact = 'high' AND NEW.urgency = 'low' THEN 'P3'
    WHEN NEW.impact = 'medium' AND NEW.urgency = 'high' THEN 'P2'
    WHEN NEW.impact = 'medium' AND NEW.urgency = 'medium' THEN 'P3'
    WHEN NEW.impact = 'medium' AND NEW.urgency = 'low' THEN 'P4'
    WHEN NEW.impact = 'low' AND NEW.urgency = 'high' THEN 'P3'
    WHEN NEW.impact = 'low' AND NEW.urgency = 'medium' THEN 'P4'
    WHEN NEW.impact = 'low' AND NEW.urgency = 'low' THEN 'P4'
    ELSE 'P3'
  END::priority_level;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_derive_incident_priority
  BEFORE INSERT OR UPDATE OF impact, urgency ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION derive_incident_priority();

-- Create SLA record on incident creation
CREATE OR REPLACE FUNCTION create_incident_sla_record()
RETURNS TRIGGER AS $$
DECLARE
  config sla_configs%ROWTYPE;
BEGIN
  SELECT * INTO config FROM sla_configs WHERE severity = NEW.severity;
  
  IF config.id IS NOT NULL THEN
    INSERT INTO sla_records (
      incident_id,
      response_due_at,
      resolution_due_at
    ) VALUES (
      NEW.id,
      NEW.created_at + (config.response_minutes || ' minutes')::INTERVAL,
      NEW.created_at + (config.resolution_minutes || ' minutes')::INTERVAL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_create_incident_sla_record
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION create_incident_sla_record();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

CREATE TRIGGER tr_update_incident_comments_updated_at
  BEFORE UPDATE ON incident_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

CREATE TRIGGER tr_update_incident_committees_updated_at
  BEFORE UPDATE ON incident_committees
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();