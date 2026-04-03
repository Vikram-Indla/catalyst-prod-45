CREATE TABLE IF NOT EXISTS rh_release_issues (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       uuid        NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  issue_key        text        NOT NULL,
  jira_issue_id    text,
  summary          text,
  issue_type       text,
  status           text,
  story_points     integer,
  assignee_id      uuid,
  synced_at        timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),
  UNIQUE(release_id, issue_key)
);

ALTER TABLE rh_release_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rh_release_issues"
  ON rh_release_issues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rh_release_issues"
  ON rh_release_issues FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rh_release_issues"
  ON rh_release_issues FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete rh_release_issues"
  ON rh_release_issues FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rh_release_issues_release_id
  ON rh_release_issues(release_id);

CREATE INDEX IF NOT EXISTS idx_rh_release_issues_issue_key
  ON rh_release_issues(issue_key);