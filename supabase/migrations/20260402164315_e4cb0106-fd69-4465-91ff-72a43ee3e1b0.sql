
-- 1. Issue key sequence generator
CREATE TABLE IF NOT EXISTS project_sequences (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- 2. Native issue storage — ALL UI reads hit this table
CREATE TABLE IF NOT EXISTS catalyst_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  description_adf_raw JSONB,
  issue_type TEXT NOT NULL DEFAULT 'Task',
  status TEXT NOT NULL DEFAULT 'To Do',
  priority TEXT DEFAULT 'Medium',
  assignee_id UUID REFERENCES profiles(id),
  reporter_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES catalyst_issues(id),
  story_points NUMERIC,
  tags TEXT[] DEFAULT '{}',
  release_id UUID,
  sprint_name TEXT,
  last_modified_by_system TEXT NOT NULL DEFAULT 'catalyst',
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, issue_key)
);

ALTER TABLE catalyst_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view issues in their projects"
  ON catalyst_issues FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert issues in their projects"
  ON catalyst_issues FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update issues in their projects"
  ON catalyst_issues FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete issues in their projects"
  ON catalyst_issues FOR DELETE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE INDEX idx_ci_project_status ON catalyst_issues(project_id, status);
CREATE INDEX idx_ci_project_updated ON catalyst_issues(project_id, updated_at DESC);
CREATE INDEX idx_ci_assignee ON catalyst_issues(assignee_id);

-- 3. Bidirectional entity mapping
CREATE TABLE IF NOT EXISTS sync_entity_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalyst_entity_type TEXT NOT NULL,
  catalyst_entity_id UUID NOT NULL,
  jira_entity_type TEXT NOT NULL,
  jira_entity_id TEXT NOT NULL,
  jira_entity_key TEXT,
  jira_self_url TEXT,
  sync_direction TEXT NOT NULL DEFAULT 'bi',
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending',
  sync_version INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(jira_entity_type, jira_entity_id)
);

CREATE INDEX idx_sem_jira ON sync_entity_map(jira_entity_type, jira_entity_id);
CREATE INDEX idx_sem_catalyst ON sync_entity_map(catalyst_entity_type, catalyst_entity_id);

-- 4. Inbound/outbound event queue
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL,
  origin_system TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_se_pending ON sync_events(status, created_at) WHERE status = 'pending';

-- 5. Status mapping per project
CREATE TABLE IF NOT EXISTS sync_status_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_status_id TEXT NOT NULL,
  jira_status_name TEXT NOT NULL,
  jira_status_category TEXT NOT NULL,
  catalyst_status TEXT NOT NULL,
  catalyst_lozenge_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. User identity mapping
CREATE TABLE IF NOT EXISTS sync_user_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalyst_user_id UUID REFERENCES profiles(id),
  jira_account_id TEXT NOT NULL UNIQUE,
  jira_display_name TEXT,
  jira_email TEXT,
  is_active BOOLEAN DEFAULT true,
  mapped_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Conflict tracking
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  catalyst_issue_id UUID REFERENCES catalyst_issues(id),
  field_name TEXT NOT NULL,
  catalyst_value TEXT,
  jira_value TEXT,
  resolution TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sc_unresolved ON sync_conflicts(catalyst_issue_id) WHERE resolution = 'pending';

-- 8. Sync health monitoring
CREATE TABLE IF NOT EXISTS sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  events_received INTEGER DEFAULT 0,
  events_processed INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  details JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Dead letter queue for failed webhooks
CREATE TABLE IF NOT EXISTS sync_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event_id UUID,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Connection registry
CREATE TABLE IF NOT EXISTS sync_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_base_url TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  webhook_id TEXT,
  webhook_secret TEXT,
  webhook_expiry TIMESTAMPTZ,
  sync_direction TEXT NOT NULL DEFAULT 'bi',
  is_active BOOLEAN DEFAULT true,
  initial_sync_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Echo loop cooldowns
CREATE TABLE IF NOT EXISTS sync_cooldowns (
  entity_key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS on all tables for authenticated access
ALTER TABLE project_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_entity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_user_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cooldowns ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can read project_sequences" ON project_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage project_sequences" ON project_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_entity_map" ON sync_entity_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_entity_map" ON sync_entity_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_events" ON sync_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sync_events" ON sync_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_status_map" ON sync_status_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_status_map" ON sync_status_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_user_map" ON sync_user_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_user_map" ON sync_user_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_conflicts" ON sync_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_conflicts" ON sync_conflicts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync_health" ON sync_health FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sync_dead_letter" ON sync_dead_letter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sync_connections" ON sync_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_connections" ON sync_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage sync_cooldowns" ON sync_cooldowns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Atomic issue key generator function
CREATE OR REPLACE FUNCTION next_issue_key(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
  v_num INTEGER;
  v_prefix TEXT;
BEGIN
  SELECT key INTO v_prefix FROM projects WHERE id = p_project_id;
  INSERT INTO project_sequences (project_id, last_number)
  VALUES (p_project_id, 1)
  ON CONFLICT (project_id)
  DO UPDATE SET last_number = project_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN v_prefix || '-' || v_num;
END;
$$ LANGUAGE plpgsql;
