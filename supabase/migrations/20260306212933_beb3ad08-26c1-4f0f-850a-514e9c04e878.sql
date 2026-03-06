
CREATE TABLE IF NOT EXISTS ra_jira_connections (
  id                  BIGSERIAL PRIMARY KEY,
  project_key         TEXT NOT NULL UNIQUE,
  project_name        TEXT NOT NULL,
  jira_url            TEXT NOT NULL,
  jira_email          TEXT NOT NULL,
  api_token_encrypted TEXT NOT NULL,
  status              TEXT DEFAULT 'connected',
  ticket_count        INTEGER DEFAULT 0,
  pdf_ticket_count    INTEGER DEFAULT 0,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ra_jira_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ra_jira_connections"
  ON ra_jira_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ra_jira_connections"
  ON ra_jira_connections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ra_jira_connections"
  ON ra_jira_connections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete ra_jira_connections"
  ON ra_jira_connections FOR DELETE TO authenticated USING (true);
