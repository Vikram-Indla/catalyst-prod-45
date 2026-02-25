
-- ═══════════════════════════════════════════════════════════
-- RESOURCE 360° Member Detail — Database Schema (r360md_ prefix)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS r360md_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Developer',
  department TEXT NOT NULL DEFAULT 'Engineering',
  team TEXT DEFAULT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT DEFAULT NULL,
  capacity_hours INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS r360md_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL UNIQUE,
  module TEXT DEFAULT NULL,
  color TEXT NOT NULL DEFAULT '#64748B',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS r360md_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('unstarted','started','completed','blocked')),
  color TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  dot_color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_terminal BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS r360md_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('bug','task','story','epic','subtask')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('highest','critical','high','medium','low')),
  project_id UUID REFERENCES r360md_projects(id),
  assigned_to UUID REFERENCES r360md_members(id),
  assigner_id UUID REFERENCES r360md_members(id),
  parent_item_id UUID REFERENCES r360md_work_items(id),
  status_id UUID REFERENCES r360md_status_config(id),
  release_name TEXT DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  comments_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_r360md_wi_assigned ON r360md_work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_r360md_wi_status ON r360md_work_items(status_id);
CREATE INDEX IF NOT EXISTS idx_r360md_wi_project ON r360md_work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_r360md_wi_parent ON r360md_work_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_r360md_wi_updated ON r360md_work_items(updated_at DESC);

-- Chronology View
CREATE OR REPLACE VIEW r360md_chronology_view AS
SELECT
  wi.id,
  wi.item_key,
  wi.title,
  wi.item_type,
  wi.priority,
  sc.name AS status_name,
  sc.category AS status_category,
  sc.color AS status_color,
  sc.bg_color AS status_bg_color,
  sc.dot_color AS status_dot_color,
  p.key_prefix AS project_key,
  p.name AS project_name,
  p.color AS project_color,
  m.full_name AS assignee_name,
  m.avatar_url AS assignee_avatar,
  m.id AS assignee_id,
  assigner.full_name AS assigner_name,
  assigner.avatar_url AS assigner_avatar,
  parent.item_key AS parent_key,
  parent.title AS parent_title,
  (wi.updated_at AT TIME ZONE 'Asia/Riyadh')::DATE AS group_date,
  CASE
    WHEN (wi.updated_at AT TIME ZONE 'Asia/Riyadh')::DATE = (now() AT TIME ZONE 'Asia/Riyadh')::DATE
      THEN 'Today, ' || to_char(wi.updated_at AT TIME ZONE 'Asia/Riyadh', 'Mon DD')
    WHEN (wi.updated_at AT TIME ZONE 'Asia/Riyadh')::DATE = ((now() AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 day')::DATE
      THEN 'Yesterday, ' || to_char(wi.updated_at AT TIME ZONE 'Asia/Riyadh', 'Mon DD')
    ELSE to_char(wi.updated_at AT TIME ZONE 'Asia/Riyadh', 'Dy, Mon DD')
  END AS date_label,
  EXTRACT(DAY FROM now() - wi.created_at)::INTEGER AS age_days,
  CASE
    WHEN EXTRACT(DAY FROM now() - wi.created_at)::INTEGER <= 7 THEN 'green'
    WHEN EXTRACT(DAY FROM now() - wi.created_at)::INTEGER <= 14 THEN 'amber'
    ELSE 'red'
  END AS age_class,
  wi.release_name AS release,
  wi.due_date,
  wi.updated_at
FROM r360md_work_items wi
JOIN r360md_status_config sc ON wi.status_id = sc.id
JOIN r360md_projects p ON wi.project_id = p.id
JOIN r360md_members m ON wi.assigned_to = m.id
LEFT JOIN r360md_members assigner ON wi.assigner_id = assigner.id
LEFT JOIN r360md_work_items parent ON wi.parent_item_id = parent.id
ORDER BY wi.updated_at DESC;

-- Member KPIs View
CREATE OR REPLACE VIEW r360md_member_kpis_view AS
SELECT
  m.id AS member_id,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE sc.category != 'completed') AS open_items,
  COUNT(wi.id) FILTER (
    WHERE sc.category != 'completed'
    AND EXTRACT(DAY FROM now() - wi.created_at) > 14
  ) AS stale_items,
  ROUND(
    COUNT(wi.id) FILTER (WHERE sc.category = 'completed')::NUMERIC /
    NULLIF(COUNT(wi.id), 0) * 100, 1
  ) AS closure_pct,
  ROUND(AVG(EXTRACT(DAY FROM now() - wi.created_at))::NUMERIC, 1) AS avg_age_days
FROM r360md_members m
LEFT JOIN r360md_work_items wi ON wi.assigned_to = m.id
LEFT JOIN r360md_status_config sc ON wi.status_id = sc.id
GROUP BY m.id;

-- Date Group Stats View
CREATE OR REPLACE VIEW r360md_date_group_stats_view AS
SELECT
  (wi.updated_at AT TIME ZONE 'Asia/Riyadh')::DATE AS group_date,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE sc.category = 'completed') AS done_count,
  COUNT(*) FILTER (WHERE sc.category = 'started') AS in_progress_count,
  COUNT(*) FILTER (WHERE sc.category = 'unstarted') AS todo_count,
  COUNT(*) FILTER (WHERE sc.category = 'blocked') AS blocked_count,
  ROUND(
    COUNT(*) FILTER (WHERE sc.category = 'completed')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 0
  ) AS progress_pct
FROM r360md_work_items wi
JOIN r360md_status_config sc ON wi.status_id = sc.id
GROUP BY (wi.updated_at AT TIME ZONE 'Asia/Riyadh')::DATE
ORDER BY group_date DESC;

-- RLS
ALTER TABLE r360md_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE r360md_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE r360md_status_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE r360md_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to r360md_members" ON r360md_members FOR ALL USING (true);
CREATE POLICY "Allow all access to r360md_projects" ON r360md_projects FOR ALL USING (true);
CREATE POLICY "Allow all access to r360md_status_config" ON r360md_status_config FOR ALL USING (true);
CREATE POLICY "Allow all access to r360md_work_items" ON r360md_work_items FOR ALL USING (true);
