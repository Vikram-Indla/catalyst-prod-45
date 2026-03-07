
CREATE TABLE IF NOT EXISTS ra_jira_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key     TEXT NOT NULL UNIQUE,
  project_name    TEXT NOT NULL,
  project_avatar  TEXT,
  avatar_color    TEXT DEFAULT '#3F3F46',
  ticket_count    INTEGER DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ra_jira_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated access" ON ra_jira_connections
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE ra_jira_tickets
  ADD COLUMN IF NOT EXISTS project_name     TEXT,
  ADD COLUMN IF NOT EXISTS ticket_summary   TEXT,
  ADD COLUMN IF NOT EXISTS priority         TEXT DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS has_pdf          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jira_issue_id    TEXT,
  ADD COLUMN IF NOT EXISTS synced_at        TIMESTAMPTZ DEFAULT now();

TRUNCATE TABLE ra_jira_tickets;
TRUNCATE TABLE ra_jira_connections;
