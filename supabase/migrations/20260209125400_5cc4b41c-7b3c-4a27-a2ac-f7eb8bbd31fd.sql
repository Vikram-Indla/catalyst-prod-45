-- ═══ MODULE 1: WorkHub Jira Connection ═══

-- Table: stores ONE Jira connection per Catalyst workspace
CREATE TABLE IF NOT EXISTS wh_jira_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Connection details
  site_url TEXT NOT NULL DEFAULT '',
  auth_method TEXT NOT NULL DEFAULT 'api_token'
    CHECK (auth_method IN ('api_token', 'oauth2')),
  auth_email TEXT NOT NULL DEFAULT '',
  auth_token_encrypted TEXT NOT NULL DEFAULT '',
  
  -- OAuth2 fields (future)
  oauth_client_id TEXT DEFAULT '',
  oauth_client_secret_encrypted TEXT DEFAULT '',
  oauth_refresh_token_encrypted TEXT DEFAULT '',
  
  -- Connection status
  status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (status IN ('not_configured', 'testing', 'connected', 'error')),
  last_tested_at TIMESTAMPTZ,
  last_test_result JSONB DEFAULT '{}',
  
  -- Discovered metadata (populated after test)
  server_title TEXT DEFAULT '',
  project_count INT DEFAULT 0,
  accessible_projects JSONB DEFAULT '[]',
  jira_server_version TEXT DEFAULT '',
  permissions_level TEXT DEFAULT 'unknown',
  
  -- Audit
  configured_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only ONE connection row allowed per workspace
CREATE UNIQUE INDEX IF NOT EXISTS wh_jira_connection_singleton 
  ON wh_jira_connection ((true));

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION wh_jira_connection_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wh_jira_connection_updated_trigger
  BEFORE UPDATE ON wh_jira_connection
  FOR EACH ROW EXECUTE FUNCTION wh_jira_connection_updated();

-- RLS: Only authenticated users can access
ALTER TABLE wh_jira_connection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_jira_connection_select" ON wh_jira_connection
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wh_jira_connection_insert" ON wh_jira_connection
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "wh_jira_connection_update" ON wh_jira_connection
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Initialize singleton row
INSERT INTO wh_jira_connection (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;