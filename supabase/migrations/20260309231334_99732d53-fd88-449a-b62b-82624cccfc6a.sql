
-- TABLE: work_item_transitions
CREATE TABLE IF NOT EXISTS work_item_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_status_category TEXT,
  to_status_category TEXT NOT NULL,
  transitioned_by TEXT NOT NULL DEFAULT 'Unknown',
  transitioned_by_avatar TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL,
  time_in_from_status_ms BIGINT,
  jira_changelog_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(work_item_id, jira_changelog_id)
);

CREATE INDEX idx_transitions_work_item ON work_item_transitions (work_item_id, transitioned_at ASC);
CREATE INDEX idx_transitions_jira_id ON work_item_transitions (jira_changelog_id);

ALTER TABLE work_item_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to transitions" ON work_item_transitions FOR ALL USING (true) WITH CHECK (true);

-- TABLE: work_item_comments
CREATE TABLE IF NOT EXISTS work_item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  jira_comment_id TEXT,
  author_name TEXT NOT NULL DEFAULT 'Unknown',
  author_avatar TEXT,
  author_email TEXT,
  body_text TEXT NOT NULL,
  body_html TEXT,
  comment_created_at TIMESTAMPTZ NOT NULL,
  comment_updated_at TIMESTAMPTZ,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(work_item_id, jira_comment_id)
);

CREATE INDEX idx_comments_work_item ON work_item_comments (work_item_id, comment_created_at DESC);

ALTER TABLE work_item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to comments" ON work_item_comments FOR ALL USING (true) WITH CHECK (true);

-- TABLE: work_item_changelogs
CREATE TABLE IF NOT EXISTS work_item_changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  jira_changelog_id TEXT,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'jira',
  from_value TEXT,
  from_display TEXT,
  to_value TEXT,
  to_display TEXT,
  changed_by TEXT NOT NULL DEFAULT 'Unknown',
  changed_by_avatar TEXT,
  changed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(work_item_id, jira_changelog_id, field_name)
);

CREATE INDEX idx_changelogs_work_item ON work_item_changelogs (work_item_id, changed_at DESC);
CREATE INDEX idx_changelogs_field ON work_item_changelogs (work_item_id, field_name, changed_at);

ALTER TABLE work_item_changelogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to changelogs" ON work_item_changelogs FOR ALL USING (true) WITH CHECK (true);

-- VIEW: Cycle time per status
CREATE OR REPLACE VIEW work_item_cycle_time_view AS
WITH transitions_ordered AS (
  SELECT
    work_item_id,
    to_status,
    to_status_category,
    transitioned_at,
    transitioned_by,
    LEAD(transitioned_at) OVER (PARTITION BY work_item_id ORDER BY transitioned_at) AS next_transition_at,
    ROW_NUMBER() OVER (PARTITION BY work_item_id ORDER BY transitioned_at) AS seq
  FROM work_item_transitions
),
time_in_status AS (
  SELECT
    work_item_id,
    to_status AS status,
    to_status_category AS status_category,
    transitioned_at AS entered_at,
    COALESCE(next_transition_at, now()) AS exited_at,
    EXTRACT(EPOCH FROM (COALESCE(next_transition_at, now()) - transitioned_at)) AS seconds_in_status
  FROM transitions_ordered
)
SELECT
  work_item_id,
  status,
  status_category,
  entered_at,
  exited_at,
  seconds_in_status,
  CASE
    WHEN seconds_in_status < 3600 THEN ROUND(seconds_in_status / 60) || 'm'
    WHEN seconds_in_status < 86400 THEN ROUND(seconds_in_status / 3600, 1) || 'h'
    ELSE ROUND(seconds_in_status / 86400, 1) || 'd'
  END AS duration_formatted,
  seconds_in_status / 86400.0 AS days_in_status
FROM time_in_status
ORDER BY work_item_id, entered_at;

-- VIEW: Cycle time summary by category
CREATE OR REPLACE VIEW work_item_cycle_summary_view AS
SELECT
  work_item_id,
  status_category,
  SUM(seconds_in_status) AS total_seconds,
  COUNT(*) AS times_entered,
  MIN(entered_at) AS first_entered,
  MAX(exited_at) AS last_exited,
  ROUND(SUM(seconds_in_status) / 86400.0, 1) AS total_days
FROM work_item_cycle_time_view
GROUP BY work_item_id, status_category;
