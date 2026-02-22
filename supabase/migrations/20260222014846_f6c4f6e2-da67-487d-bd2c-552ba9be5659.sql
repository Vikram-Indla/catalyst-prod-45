
-- ============================================================
-- PROJECTHUB DASHBOARD V3 — NEW TABLES, VIEWS, RLS
-- Only creates tables that don't already exist
-- Existing: ph_releases, ph_work_items, ph_activity_log
-- ============================================================

-- === STATUS TRANSITIONS (lifecycle history) ===
CREATE TABLE IF NOT EXISTS ph_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_status_transitions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ph_st_wi ON ph_status_transitions(work_item_id);
CREATE INDEX idx_ph_st_changed ON ph_status_transitions(changed_at);

CREATE POLICY "Anyone can read status transitions"
  ON ph_status_transitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert transitions"
  ON ph_status_transitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- === PRODUCTION INCIDENTS ===
CREATE TABLE IF NOT EXISTS ph_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('P1','P2','P3')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  release_id UUID REFERENCES ph_releases(id),
  project_id UUID NOT NULL,
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_incidents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ph_inc_release ON ph_incidents(release_id);
CREATE INDEX idx_ph_inc_project ON ph_incidents(project_id);
CREATE INDEX idx_ph_inc_priority ON ph_incidents(priority);

CREATE POLICY "Anyone can read incidents"
  ON ph_incidents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage incidents"
  ON ph_incidents FOR ALL USING (auth.uid() IS NOT NULL);

-- === QA DEFECTS ===
CREATE TABLE IF NOT EXISTS ph_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'in_qa',
  release_id UUID REFERENCES ph_releases(id),
  project_id UUID NOT NULL,
  related_item_id UUID REFERENCES ph_work_items(id),
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_defects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ph_def_release ON ph_defects(release_id);
CREATE INDEX idx_ph_def_project ON ph_defects(project_id);
CREATE INDEX idx_ph_def_severity ON ph_defects(severity);

CREATE POLICY "Anyone can read defects"
  ON ph_defects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage defects"
  ON ph_defects FOR ALL USING (auth.uid() IS NOT NULL);

-- === DASHBOARD ACTIVITY ===
CREATE TABLE IF NOT EXISTS ph_dashboard_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  item_key TEXT,
  item_type TEXT,
  release_id UUID REFERENCES ph_releases(id),
  project_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_dashboard_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ph_dact_project ON ph_dashboard_activity(project_id);
CREATE INDEX idx_ph_dact_release ON ph_dashboard_activity(release_id);
CREATE INDEX idx_ph_dact_created ON ph_dashboard_activity(created_at DESC);

CREATE POLICY "Anyone can read dashboard activity"
  ON ph_dashboard_activity FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert activity"
  ON ph_dashboard_activity FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- === MILESTONE CONFIG ===
CREATE TABLE IF NOT EXISTS ph_milestone_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  statuses TEXT[] NOT NULL DEFAULT ARRAY['ready_for_development','beta_ready','production_ready'],
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_milestone_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read milestone config"
  ON ph_milestone_config FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage milestone config"
  ON ph_milestone_config FOR ALL USING (auth.uid() IS NOT NULL);

-- === TIME IN STATUS COLUMN CONFIG ===
CREATE TABLE IF NOT EXISTS ph_tis_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  visible_statuses TEXT[] NOT NULL DEFAULT ARRAY['in_requirements','in_design','ready_for_development','in_development','in_qa','in_uat','in_beta','production_ready','in_production'],
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_tis_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tis config"
  ON ph_tis_config FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage tis config"
  ON ph_tis_config FOR ALL USING (auth.uid() IS NOT NULL);

-- === VIEWS ===

-- Lifecycle view: transitions with profile names and computed durations
CREATE OR REPLACE VIEW ph_lifecycle_view AS
SELECT
  st.id,
  st.work_item_id,
  wi.item_key AS work_item_key,
  wi.item_type AS work_item_type,
  COALESCE(wi.title, wi.summary) AS work_item_title,
  wi.status AS current_status,
  r.name AS release_key,
  st.from_status,
  st.to_status,
  st.changed_at,
  p.full_name AS changed_by_name,
  COALESCE(
    EXTRACT(EPOCH FROM (
      LEAD(st.changed_at) OVER (PARTITION BY st.work_item_id ORDER BY st.changed_at)
      - st.changed_at
    )) / 86400,
    EXTRACT(EPOCH FROM (now() - st.changed_at)) / 86400
  )::NUMERIC(10,1) AS duration_days
FROM ph_status_transitions st
JOIN ph_work_items wi ON wi.id = st.work_item_id
LEFT JOIN ph_releases r ON r.id = wi.release_id
LEFT JOIN profiles p ON p.id = st.changed_by
ORDER BY st.work_item_id, st.changed_at;

-- Team workload view
CREATE OR REPLACE VIEW ph_team_workload_view AS
SELECT
  p.id AS user_id,
  p.full_name AS name,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE wi.item_type IN ('Story','story')) AS story_count,
  COUNT(*) FILTER (WHERE wi.item_type IN ('Subtask','subtask')) AS subtask_count,
  COUNT(*) FILTER (WHERE wi.item_type IN ('Bug','bug')) AS bug_count,
  COUNT(*) FILTER (WHERE wi.item_type IN ('incident')) AS incident_count,
  wi.project_id
FROM ph_work_items wi
JOIN profiles p ON p.id = COALESCE(wi.assignee_id, wi.assignee_user_id)
WHERE wi.status NOT IN ('Done', 'in_production', 'Cancelled')
GROUP BY p.id, p.full_name, wi.project_id;

-- Items by status view
CREATE OR REPLACE VIEW ph_items_by_status_view AS
SELECT
  wi.status,
  wi.release_id,
  r.name AS release_key,
  COUNT(*) AS item_count
FROM ph_work_items wi
JOIN ph_releases r ON r.id = wi.release_id
GROUP BY wi.status, wi.release_id, r.name;

-- Overdue items view
CREATE OR REPLACE VIEW ph_overdue_view AS
SELECT
  wi.id, wi.item_key, COALESCE(wi.title, wi.summary) AS title,
  wi.item_type, wi.status, wi.due_date,
  r.name AS release_key,
  p.full_name AS assignee_name,
  (CURRENT_DATE - wi.due_date) AS days_overdue
FROM ph_work_items wi
JOIN ph_releases r ON r.id = wi.release_id
LEFT JOIN profiles p ON p.id = COALESCE(wi.assignee_id, wi.assignee_user_id)
WHERE wi.due_date < CURRENT_DATE
  AND wi.status NOT IN ('Done', 'in_production', 'Cancelled')
ORDER BY days_overdue DESC;
