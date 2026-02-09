
-- ═══════════════════════════════════════
-- Migration: 002_wh_schema.sql
-- WorkHub: Full schema (tables 2-8, views, functions)
-- Depends on: wh_jira_connection (already exists)
-- ═══════════════════════════════════════

-- ═══ TABLE 2: wh_issues ═══
CREATE TABLE IF NOT EXISTS wh_issues (
  issue_key       TEXT PRIMARY KEY,
  project_key     TEXT NOT NULL,
  issue_type      TEXT NOT NULL DEFAULT 'Task',
  summary         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'To Do',
  status_category TEXT DEFAULT 'To Do',
  assignee_account_id   TEXT,
  assignee_display_name TEXT,
  parent_key      TEXT,
  hierarchy_level INT DEFAULT 2,
  fix_versions    JSONB DEFAULT '[]',
  due_date        DATE,
  effective_due_date    DATE,
  effective_due_source  TEXT DEFAULT 'Unscheduled',
  labels          JSONB DEFAULT '[]',
  components      JSONB DEFAULT '[]',
  priority        TEXT DEFAULT 'Medium',
  story_points    NUMERIC,
  sprint_name     TEXT,
  resolution      TEXT,
  jira_created_at TIMESTAMPTZ,
  jira_updated_at TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  raw_json        JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_wh_issues_project ON wh_issues(project_key);
CREATE INDEX IF NOT EXISTS idx_wh_issues_assignee ON wh_issues(assignee_account_id);
CREATE INDEX IF NOT EXISTS idx_wh_issues_parent ON wh_issues(parent_key);
CREATE INDEX IF NOT EXISTS idx_wh_issues_status_cat ON wh_issues(status_category);
CREATE INDEX IF NOT EXISTS idx_wh_issues_eff_due ON wh_issues(effective_due_date);
CREATE INDEX IF NOT EXISTS idx_wh_issues_updated ON wh_issues(jira_updated_at);
CREATE INDEX IF NOT EXISTS idx_wh_issues_level ON wh_issues(hierarchy_level);

-- ═══ TABLE 3: wh_versions ═══
CREATE TABLE IF NOT EXISTS wh_versions (
  jira_id         TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  project_key     TEXT NOT NULL,
  description     TEXT DEFAULT '',
  release_date    DATE,
  parsed_date     DATE,
  start_date      DATE,
  released        BOOLEAN DEFAULT false,
  archived        BOOLEAN DEFAULT false,
  synced_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_versions_project ON wh_versions(project_key);

-- ═══ TABLE 4: wh_config ═══
CREATE TABLE IF NOT EXISTS wh_config (
  key             TEXT PRIMARY KEY,
  value           JSONB NOT NULL,
  description     TEXT DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id)
);

CREATE OR REPLACE FUNCTION wh_config_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wh_config_updated_trigger ON wh_config;
CREATE TRIGGER wh_config_updated_trigger
  BEFORE UPDATE ON wh_config
  FOR EACH ROW EXECUTE FUNCTION wh_config_updated();

-- Default config entries
INSERT INTO wh_config (key, value, description) VALUES
  ('sync_lookback_months',  '1',                                              'Default lookback window for incremental sync'),
  ('sync_max_months',       '6',                                              'Maximum lookback window (hard limit)'),
  ('sync_interval_minutes', '15',                                             'Incremental sync frequency'),
  ('sync_full_time_utc',    '"02:00"',                                        'Daily full sync time (UTC)'),
  ('included_projects',     '["CAT","SEN","TAH","MIM","DEL","DAI"]',          'Project keys to sync'),
  ('hierarchy_levels',      '[{"level":1,"name":"Epic","jiraTypes":["Epic"]},{"level":2,"name":"Story","jiraTypes":["Story","User Story","Feature"]},{"level":3,"name":"Subtask","jiraTypes":["Sub-task","Technical Task"]},{"level":4,"name":"Bug","jiraTypes":["Bug","Defect"]},{"level":5,"name":"Incident","jiraTypes":["Incident"]},{"level":6,"name":"Other","jiraTypes":["Task","Spike","Research"]}]', 'Issue type hierarchy mapping'),
  ('status_mapping',        '{"To Do":["Open","To Do","Backlog","New"],"In Progress":["In Progress","In Development","Active"],"Blocked":["Blocked","Impediment"],"In Review":["In Review","Code Review","QA"],"Done":["Done","Closed","Resolved","Complete"]}', 'Jira status to Catalyst category mapping'),
  ('stale_threshold_days',  '7',                                              'Days without update before item marked stale'),
  ('critical_threshold_days','30',                                            'Days without update before item marked critical'),
  ('multi_version_strategy','"earliest"',                                     'When issue has multiple FixVersions: earliest/latest/first'),
  ('version_name_parsing',  'true',                                           'Enable version name date parsing'),
  ('flag_unscheduled',      'true',                                           'Flag issues with no effective due date'),
  ('flag_conflicting_dates','true',                                           'Flag issues where child due > parent due'),
  ('flag_unmapped_types',   'true',                                           'Flag issues with unmapped Jira types'),
  ('flag_orphans',          'false',                                          'Flag issues with no parent')
ON CONFLICT (key) DO NOTHING;

-- ═══ TABLE 5: wh_user_mapping ═══
CREATE TABLE IF NOT EXISTS wh_user_mapping (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_account_id     TEXT UNIQUE NOT NULL,
  jira_display_name   TEXT DEFAULT '',
  jira_email          TEXT DEFAULT '',
  jira_avatar_url     TEXT DEFAULT '',
  catalyst_profile_id UUID,
  is_mapped           BOOLEAN DEFAULT false,
  auto_matched        BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_user_mapping_jira ON wh_user_mapping(jira_account_id);

CREATE OR REPLACE FUNCTION wh_user_mapping_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wh_user_mapping_updated_trigger ON wh_user_mapping;
CREATE TRIGGER wh_user_mapping_updated_trigger
  BEFORE UPDATE ON wh_user_mapping
  FOR EACH ROW EXECUTE FUNCTION wh_user_mapping_updated();

-- ═══ TABLE 6: wh_themes ═══
CREATE TABLE IF NOT EXISTS wh_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  color           TEXT NOT NULL DEFAULT '#6554C0',
  target_date     DATE,
  status          TEXT DEFAULT 'To Do',
  owner_id        UUID,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION wh_themes_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wh_themes_updated_trigger ON wh_themes;
CREATE TRIGGER wh_themes_updated_trigger
  BEFORE UPDATE ON wh_themes
  FOR EACH ROW EXECUTE FUNCTION wh_themes_updated();

-- ═══ TABLE 7: wh_theme_items ═══
CREATE TABLE IF NOT EXISTS wh_theme_items (
  theme_id        UUID NOT NULL REFERENCES wh_themes(id) ON DELETE CASCADE,
  issue_key       TEXT NOT NULL,
  added_at        TIMESTAMPTZ DEFAULT now(),
  added_by        UUID REFERENCES auth.users(id),
  PRIMARY KEY (theme_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_wh_theme_items_issue ON wh_theme_items(issue_key);

-- ═══ TABLE 8: wh_sync_log ═══
CREATE TABLE IF NOT EXISTS wh_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  lookback_months INT DEFAULT 1,
  jql_query       TEXT DEFAULT '',
  issues_fetched  INT DEFAULT 0,
  issues_upserted INT DEFAULT 0,
  issues_pruned   INT DEFAULT 0,
  versions_fetched INT DEFAULT 0,
  warnings        TEXT[] DEFAULT '{}',
  error_message   TEXT,
  duration_ms     INT DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wh_sync_log_started ON wh_sync_log(started_at DESC);

-- ═══ VIEWS ═══

CREATE OR REPLACE VIEW wh_overview_stats AS
SELECT
  count(*) FILTER (WHERE status_category != 'Done') AS active_count,
  count(*) FILTER (WHERE status_category = 'Done'
    AND jira_updated_at >= now() - interval '7 days') AS done_this_week,
  count(*) FILTER (WHERE effective_due_date < CURRENT_DATE
    AND status_category NOT IN ('Done', 'Blocked')) AS overdue_count,
  count(*) FILTER (WHERE jira_updated_at < now() - interval '7 days'
    AND status_category != 'Done') AS stale_count,
  count(*) FILTER (WHERE status_category = 'Blocked') AS blocked_count
FROM wh_issues;

CREATE OR REPLACE VIEW wh_release_health AS
SELECT
  v.jira_id,
  v.name AS version_name,
  v.project_key,
  COALESCE(v.release_date, v.parsed_date) AS effective_release_date,
  v.released,
  count(i.issue_key) AS total_issues,
  count(i.issue_key) FILTER (WHERE i.status_category = 'Done') AS done_count,
  count(i.issue_key) FILTER (WHERE i.status_category = 'In Progress') AS in_progress_count,
  count(i.issue_key) FILTER (WHERE i.status_category = 'Blocked') AS blocked_count,
  count(i.issue_key) FILTER (WHERE i.status_category IN ('To Do', 'In Review')) AS todo_count,
  CASE WHEN count(i.issue_key) > 0
    THEN round((count(i.issue_key) FILTER (WHERE i.status_category = 'Done'))::numeric
         / count(i.issue_key) * 100)
    ELSE 0 END AS completion_pct
FROM wh_versions v
LEFT JOIN wh_issues i ON i.fix_versions @> jsonb_build_array(jsonb_build_object('id', v.jira_id))
GROUP BY v.jira_id, v.name, v.project_key, v.release_date, v.parsed_date, v.released;

CREATE OR REPLACE VIEW wh_at_risk_items AS
SELECT
  issue_key, project_key, issue_type, summary, status, status_category,
  assignee_display_name, effective_due_date, effective_due_source,
  fix_versions, parent_key,
  CASE
    WHEN status_category = 'Blocked' THEN 'blocked'
    WHEN effective_due_date < CURRENT_DATE AND status_category != 'Done' THEN 'overdue'
    WHEN jira_updated_at < now() - interval '7 days' AND status_category != 'Done' THEN 'stale'
  END AS risk_tag
FROM wh_issues
WHERE status_category != 'Done'
  AND (
    status_category = 'Blocked'
    OR (effective_due_date < CURRENT_DATE)
    OR (jira_updated_at < now() - interval '7 days')
  )
ORDER BY
  CASE
    WHEN status_category = 'Blocked' THEN 1
    WHEN effective_due_date < CURRENT_DATE THEN 2
    ELSE 3
  END,
  effective_due_date ASC NULLS LAST
LIMIT 20;

CREATE OR REPLACE VIEW wh_person_workload AS
SELECT
  assignee_account_id,
  assignee_display_name,
  count(*) FILTER (WHERE status_category NOT IN ('Done')) AS active_count,
  count(*) FILTER (WHERE status_category = 'Done') AS done_count,
  count(*) FILTER (WHERE effective_due_date < CURRENT_DATE
    AND status_category NOT IN ('Done', 'Blocked')) AS overdue_count,
  count(*) FILTER (WHERE status_category = 'Blocked') AS blocked_count,
  count(*) FILTER (WHERE status_category = 'Done'
    AND jira_updated_at >= now() - interval '7 days') AS done_this_week
FROM wh_issues
WHERE assignee_account_id IS NOT NULL
GROUP BY assignee_account_id, assignee_display_name;

CREATE OR REPLACE VIEW wh_exceptions AS
SELECT
  i.issue_key, i.project_key, i.issue_type, i.summary, i.status_category,
  i.effective_due_date, i.effective_due_source, i.parent_key,
  CASE
    WHEN i.effective_due_date IS NULL AND i.status_category != 'Done'
      THEN 'unscheduled'
    WHEN i.effective_due_date IS NOT NULL
      AND p.effective_due_date IS NOT NULL
      AND i.effective_due_date > p.effective_due_date
      THEN 'conflicting'
    ELSE 'unmapped_type'
  END AS exception_type
FROM wh_issues i
LEFT JOIN wh_issues p ON p.issue_key = i.parent_key
WHERE i.status_category != 'Done'
  AND (
    (i.effective_due_date IS NULL)
    OR (i.effective_due_date IS NOT NULL
        AND p.effective_due_date IS NOT NULL
        AND i.effective_due_date > p.effective_due_date)
  );

-- ═══ FUNCTIONS ═══

CREATE OR REPLACE FUNCTION wh_parse_version_name(vname TEXT)
RETURNS DATE AS $$
DECLARE
  yr INT; mn INT; qr INT;
BEGIN
  IF vname ~ '^\d{4}\s+\d{1,2}$' THEN
    yr := (regexp_match(vname, '^(\d{4})'))[1]::INT;
    mn := (regexp_match(vname, '\s+(\d{1,2})$'))[1]::INT;
    IF mn BETWEEN 1 AND 12 THEN
      RETURN (make_date(yr, mn, 1) + interval '1 month - 1 day')::DATE;
    END IF;
  END IF;
  IF vname ~* '^\d{4}\s+Q[1-4]$' THEN
    yr := (regexp_match(vname, '^(\d{4})'))[1]::INT;
    qr := (regexp_match(vname, 'Q(\d)'))[1]::INT;
    mn := qr * 3;
    RETURN (make_date(yr, mn, 1) + interval '1 month - 1 day')::DATE;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION wh_recompute_all()
RETURNS void AS $$
DECLARE
  max_level INT;
  cur_level INT;
BEGIN
  SELECT COALESCE(max(hierarchy_level), 3) INTO max_level FROM wh_issues;
  FOR cur_level IN 1..max_level LOOP
    UPDATE wh_issues i SET
      effective_due_date = COALESCE(
        i.due_date,
        (SELECT min(COALESCE(v.release_date, v.parsed_date))
         FROM wh_versions v
         WHERE v.jira_id IN (
           SELECT (elem->>'id')
           FROM jsonb_array_elements(i.fix_versions) AS elem
         )
         AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL
        ),
        (SELECT p.effective_due_date FROM wh_issues p WHERE p.issue_key = i.parent_key)
      ),
      effective_due_source = CASE
        WHEN i.due_date IS NOT NULL THEN 'Due Date'
        WHEN (SELECT min(COALESCE(v.release_date, v.parsed_date))
              FROM wh_versions v
              WHERE v.jira_id IN (
                SELECT (elem->>'id')
                FROM jsonb_array_elements(i.fix_versions) AS elem
              )
              AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL
             ) IS NOT NULL
          THEN 'FixVersion (' || (
            SELECT v.name FROM wh_versions v
            WHERE v.jira_id IN (
              SELECT (elem->>'id') FROM jsonb_array_elements(i.fix_versions) AS elem
            )
            AND COALESCE(v.release_date, v.parsed_date) IS NOT NULL
            ORDER BY COALESCE(v.release_date, v.parsed_date)
            LIMIT 1
          ) || ')'
        WHEN (SELECT p.effective_due_date FROM wh_issues p WHERE p.issue_key = i.parent_key) IS NOT NULL
          THEN 'Inherited from ' || i.parent_key
        ELSE 'Unscheduled'
      END
    WHERE i.hierarchy_level = cur_level;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION wh_prune_stale(window_months INT DEFAULT 6)
RETURNS INT AS $$
DECLARE pruned INT;
BEGIN
  DELETE FROM wh_issues
  WHERE jira_updated_at < now() - (window_months || ' months')::interval
    AND status_category = 'Done';
  GET DIAGNOSTICS pruned = ROW_COUNT;
  RETURN pruned;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION wh_parse_and_update_versions()
RETURNS void AS $$
BEGIN
  UPDATE wh_versions SET parsed_date = wh_parse_version_name(name)
  WHERE release_date IS NULL AND parsed_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ═══ RLS POLICIES ═══

ALTER TABLE wh_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_issues_select" ON wh_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_issues_service" ON wh_issues FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE wh_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_versions_select" ON wh_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_versions_service" ON wh_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE wh_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_config_select" ON wh_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_config_update" ON wh_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_config_service" ON wh_config FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE wh_user_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_user_mapping_select" ON wh_user_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_user_mapping_modify" ON wh_user_mapping FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE wh_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_themes_select" ON wh_themes FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_themes_crud" ON wh_themes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE wh_theme_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_theme_items_select" ON wh_theme_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_theme_items_crud" ON wh_theme_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE wh_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_sync_log_select" ON wh_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_sync_log_service" ON wh_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);
