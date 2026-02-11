
-- ════════════════════════════════════════════════════════════════════
-- WORKHUB v4.5 — PHASE 0: DATABASE MIGRATION (handles existing schema)
-- ════════════════════════════════════════════════════════════════════

-- ALTER existing wh_themes: add missing columns
ALTER TABLE wh_themes ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);
ALTER TABLE wh_themes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE wh_themes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE wh_themes ADD COLUMN IF NOT EXISTS progress NUMERIC(5,2) DEFAULT 0;
ALTER TABLE wh_themes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
-- Drop old check if exists and re-add
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'wh_themes_status_check'
  ) THEN
    ALTER TABLE wh_themes ADD CONSTRAINT wh_themes_status_check 
      CHECK (status IN ('Active', 'Completed', 'On Hold'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- TABLE: wh_jira_projects
CREATE TABLE IF NOT EXISTS wh_jira_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_project_id TEXT NOT NULL UNIQUE,
  project_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  color TEXT DEFAULT '#2563eb',
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_releases
CREATE TABLE IF NOT EXISTS wh_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Planned'
    CHECK (status IN ('Planned', 'Active', 'At Risk', 'Completed', 'Cancelled')),
  start_date DATE,
  target_date DATE NOT NULL,
  actual_date DATE,
  owner_user_id UUID REFERENCES auth.users(id),
  color TEXT DEFAULT '#2563eb',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_work_items
CREATE TABLE IF NOT EXISTS wh_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_issue_id TEXT UNIQUE,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL
    CHECK (item_type IN ('Epic', 'Story', 'Subtask', 'Bug', 'Task', 'Incident')),
  summary TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'To Do'
    CHECK (status IN ('To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Cancelled')),
  priority TEXT DEFAULT 'Medium'
    CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  parent_id UUID REFERENCES wh_work_items(id) ON DELETE SET NULL,
  hierarchy_path TEXT[],
  depth INTEGER DEFAULT 0,
  jira_project_id UUID REFERENCES wh_jira_projects(id),
  jira_status TEXT,
  jira_priority TEXT,
  jira_labels TEXT[],
  jira_sprint TEXT,
  jira_story_points NUMERIC(5,1),
  jira_url TEXT,
  release_id UUID REFERENCES wh_releases(id) ON DELETE SET NULL,
  theme_id UUID REFERENCES wh_themes(id) ON DELETE SET NULL,
  assignee_user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  sync_source TEXT DEFAULT 'manual'
    CHECK (sync_source IN ('jira', 'catalyst', 'manual')),
  is_jira_locked BOOLEAN DEFAULT FALSE,
  story_points NUMERIC(5,1),
  estimated_hours NUMERIC(6,1),
  actual_hours NUMERIC(6,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_resources
CREATE TABLE IF NOT EXISTS wh_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  jira_account_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  department TEXT,
  skills TEXT[],
  color TEXT DEFAULT '#2563eb',
  capacity_hours_per_week NUMERIC(5,1) DEFAULT 40,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_resource_assignments
CREATE TABLE IF NOT EXISTS wh_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES wh_resources(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assignee',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, work_item_id)
);

-- TABLE: wh_jira_sync_log
CREATE TABLE IF NOT EXISTS wh_jira_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_project_id UUID REFERENCES wh_jira_projects(id),
  sync_type TEXT DEFAULT 'full'
    CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status TEXT DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_unchanged INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  triggered_by UUID REFERENCES auth.users(id)
);

-- TABLE: wh_comments
CREATE TABLE IF NOT EXISTS wh_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES wh_work_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_saved_filters
CREATE TABLE IF NOT EXISTS wh_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_shared BOOLEAN DEFAULT FALSE,
  filter_config JSONB NOT NULL,
  page TEXT NOT NULL DEFAULT 'workitems',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: wh_bulk_ops_log
CREATE TABLE IF NOT EXISTS wh_bulk_ops_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  affected_item_ids UUID[] NOT NULL,
  field_changed TEXT,
  old_values JSONB,
  new_values JSONB,
  item_count INTEGER DEFAULT 0,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES auth.users(id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_wh_work_items_parent ON wh_work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_release ON wh_work_items(release_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_theme ON wh_work_items(theme_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_assignee ON wh_work_items(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_project ON wh_work_items(jira_project_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_type ON wh_work_items(item_type);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_status ON wh_work_items(status);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_key ON wh_work_items(item_key);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_due ON wh_work_items(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wh_work_items_depth ON wh_work_items(depth);
CREATE INDEX IF NOT EXISTS idx_wh_work_items_jira_id ON wh_work_items(jira_issue_id);
CREATE INDEX IF NOT EXISTS idx_wh_resource_assignments_resource ON wh_resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_wh_resource_assignments_item ON wh_resource_assignments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_wh_comments_item ON wh_comments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_wh_sync_log_project ON wh_jira_sync_log(jira_project_id);
CREATE INDEX IF NOT EXISTS idx_wh_bulk_ops_log_performed ON wh_bulk_ops_log(performed_at DESC);

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION fn_wh_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers first to avoid "already exists" errors
DROP TRIGGER IF EXISTS trg_wh_jira_projects_updated ON wh_jira_projects;
DROP TRIGGER IF EXISTS trg_wh_releases_updated ON wh_releases;
DROP TRIGGER IF EXISTS trg_wh_themes_updated ON wh_themes;
DROP TRIGGER IF EXISTS trg_wh_work_items_updated ON wh_work_items;
DROP TRIGGER IF EXISTS trg_wh_resources_updated ON wh_resources;
DROP TRIGGER IF EXISTS trg_wh_update_theme_progress ON wh_work_items;

CREATE TRIGGER trg_wh_jira_projects_updated BEFORE UPDATE ON wh_jira_projects
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_timestamp();
CREATE TRIGGER trg_wh_releases_updated BEFORE UPDATE ON wh_releases
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_timestamp();
CREATE TRIGGER trg_wh_themes_updated BEFORE UPDATE ON wh_themes
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_timestamp();
CREATE TRIGGER trg_wh_work_items_updated BEFORE UPDATE ON wh_work_items
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_timestamp();
CREATE TRIGGER trg_wh_resources_updated BEFORE UPDATE ON wh_resources
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_timestamp();

-- Bulk update function
CREATE OR REPLACE FUNCTION fn_wh_bulk_update(
  p_item_ids UUID[],
  p_field TEXT,
  p_value TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_field = 'release_id' THEN
    UPDATE wh_work_items SET release_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'theme_id' THEN
    UPDATE wh_work_items SET theme_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'status' THEN
    UPDATE wh_work_items SET status = p_value WHERE id = ANY(p_item_ids);
  ELSIF p_field = 'assignee_user_id' THEN
    UPDATE wh_work_items SET assignee_user_id = p_value::UUID WHERE id = ANY(p_item_ids);
  ELSE
    RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO wh_bulk_ops_log (operation, affected_item_ids, field_changed, new_values, item_count, performed_by)
  VALUES ('bulk_' || p_field, p_item_ids, p_field, jsonb_build_object(p_field, p_value), v_count, p_user_id);
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recursive tree function
CREATE OR REPLACE FUNCTION fn_wh_get_item_tree(p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, item_key TEXT, item_type TEXT, summary TEXT, status TEXT,
  depth INTEGER, parent_id UUID, release_id UUID, theme_id UUID,
  assignee_user_id UUID, due_date DATE, children_count BIGINT
) AS $$
  WITH RECURSIVE tree AS (
    SELECT wi.id, wi.item_key, wi.item_type, wi.summary, wi.status,
      0 AS depth, wi.parent_id, wi.release_id, wi.theme_id,
      wi.assignee_user_id, wi.due_date
    FROM wh_work_items wi
    WHERE (p_parent_id IS NULL AND wi.parent_id IS NULL)
       OR (p_parent_id IS NOT NULL AND wi.parent_id = p_parent_id)
    UNION ALL
    SELECT child.id, child.item_key, child.item_type, child.summary, child.status,
      tree.depth + 1, child.parent_id, child.release_id, child.theme_id,
      child.assignee_user_id, child.due_date
    FROM wh_work_items child
    JOIN tree ON child.parent_id = tree.id
  )
  SELECT t.*,
    (SELECT COUNT(*) FROM wh_work_items c WHERE c.parent_id = t.id) AS children_count
  FROM tree t
  ORDER BY t.depth, t.item_key;
$$ LANGUAGE sql STABLE;

-- Theme progress trigger function
CREATE OR REPLACE FUNCTION fn_wh_update_theme_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wh_themes SET progress = (
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE status = 'Done')::NUMERIC / COUNT(*)) * 100, 1)
    END
    FROM wh_work_items
    WHERE theme_id = COALESCE(NEW.theme_id, OLD.theme_id)
  )
  WHERE id = COALESCE(NEW.theme_id, OLD.theme_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wh_update_theme_progress
  AFTER INSERT OR UPDATE OF status, theme_id OR DELETE ON wh_work_items
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_theme_progress();

-- VIEWS
CREATE OR REPLACE VIEW vw_wh_work_items_full AS
SELECT
  wi.*,
  jp.project_key,
  jp.name AS project_name,
  jp.color AS project_color,
  r.name AS release_name,
  r.title AS release_title,
  r.status AS release_status,
  r.color AS release_color,
  t.name AS theme_name,
  t.color AS theme_color,
  res.name AS assignee_name,
  res.role AS assignee_role,
  res.department AS assignee_department,
  res.color AS assignee_color,
  parent_wi.item_key AS parent_key,
  parent_wi.summary AS parent_summary,
  (SELECT COUNT(*) FROM wh_work_items c WHERE c.parent_id = wi.id) AS children_count,
  (SELECT COUNT(*) FROM wh_comments cm WHERE cm.work_item_id = wi.id) AS comment_count
FROM wh_work_items wi
LEFT JOIN wh_jira_projects jp ON wi.jira_project_id = jp.id
LEFT JOIN wh_releases r ON wi.release_id = r.id
LEFT JOIN wh_themes t ON wi.theme_id = t.id
LEFT JOIN wh_resources res ON wi.assignee_user_id = res.user_id
LEFT JOIN wh_work_items parent_wi ON wi.parent_id = parent_wi.id;

CREATE OR REPLACE VIEW vw_wh_release_progress AS
SELECT
  r.id, r.name, r.title, r.description, r.status, r.color,
  r.start_date, r.target_date, r.actual_date, r.owner_user_id,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'Done') AS done_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'In Review') AS in_review_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'Blocked') AS blocked_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'To Do') AS todo_items,
  CASE WHEN COUNT(wi.id) = 0 THEN 0
    ELSE ROUND((COUNT(wi.id) FILTER (WHERE wi.status = 'Done')::NUMERIC / COUNT(wi.id)) * 100, 1)
  END AS completion_percent,
  COUNT(DISTINCT wi.assignee_user_id) AS unique_assignees,
  COUNT(DISTINCT wi.jira_project_id) AS project_count,
  MIN(wi.due_date) AS earliest_due,
  MAX(wi.due_date) AS latest_due
FROM wh_releases r
LEFT JOIN wh_work_items wi ON wi.release_id = r.id
GROUP BY r.id, r.name, r.title, r.description, r.status, r.color,
         r.start_date, r.target_date, r.actual_date, r.owner_user_id;

CREATE OR REPLACE VIEW vw_wh_theme_progress AS
SELECT
  t.id, t.name, t.description, t.color, t.owner_user_id,
  t.start_date, t.end_date, t.status, t.progress,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'Done') AS done_items,
  COUNT(wi.id) FILTER (WHERE wi.item_type = 'Epic') AS epic_count,
  COUNT(wi.id) FILTER (WHERE wi.item_type = 'Story') AS story_count,
  COUNT(wi.id) FILTER (WHERE wi.item_type = 'Subtask') AS subtask_count,
  CASE WHEN COUNT(wi.id) = 0 THEN 0
    ELSE ROUND((COUNT(wi.id) FILTER (WHERE wi.status = 'Done')::NUMERIC / COUNT(wi.id)) * 100, 1)
  END AS completion_percent
FROM wh_themes t
LEFT JOIN wh_work_items wi ON wi.theme_id = t.id
GROUP BY t.id, t.name, t.description, t.color, t.owner_user_id,
         t.start_date, t.end_date, t.status, t.progress;

CREATE OR REPLACE VIEW vw_wh_resource_utilization AS
SELECT
  res.id, res.user_id, res.name, res.email, res.role, res.department,
  res.color, res.skills, res.capacity_hours_per_week, res.is_active,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')) AS active_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'Done') AS completed_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'Blocked') AS blocked_items,
  COALESCE(SUM(wi.estimated_hours) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')), 0) AS total_estimated_hours,
  COALESCE(SUM(wi.actual_hours), 0) AS total_actual_hours,
  CASE WHEN res.capacity_hours_per_week = 0 THEN 0
    ELSE ROUND(
      (COALESCE(SUM(wi.estimated_hours) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled')), 0)
       / GREATEST(res.capacity_hours_per_week, 1)) * 100, 1
    )
  END AS utilization_percent,
  COUNT(DISTINCT wi.release_id) AS release_count,
  COUNT(DISTINCT wi.theme_id) AS theme_count,
  MIN(wi.due_date) FILTER (WHERE wi.status NOT IN ('Done', 'Cancelled') AND wi.due_date >= CURRENT_DATE) AS next_due_date
FROM wh_resources res
LEFT JOIN wh_work_items wi ON wi.assignee_user_id = res.user_id
WHERE res.is_active = TRUE
GROUP BY res.id, res.user_id, res.name, res.email, res.role, res.department,
         res.color, res.skills, res.capacity_hours_per_week, res.is_active;

CREATE OR REPLACE VIEW vw_wh_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM wh_releases WHERE status = 'Active') AS active_releases,
  (SELECT COUNT(*) FROM wh_releases WHERE status = 'At Risk') AS at_risk_releases,
  (SELECT COUNT(*) FROM wh_themes WHERE status = 'Active') AS active_themes,
  (SELECT COUNT(*) FROM wh_resources WHERE is_active = TRUE) AS total_resources,
  (SELECT COUNT(*) FROM wh_work_items WHERE status = 'Blocked') AS blocked_items,
  (SELECT COUNT(*) FROM wh_work_items) AS total_work_items,
  (SELECT COUNT(*) FROM wh_work_items WHERE status = 'Done') AS done_work_items,
  (SELECT ROUND(CASE WHEN COUNT(*) = 0 THEN 0
    ELSE (COUNT(*) FILTER (WHERE status = 'Done')::NUMERIC / COUNT(*)) * 100
    END, 1) FROM wh_work_items) AS overall_completion_percent,
  (SELECT COUNT(*) FROM wh_work_items
   WHERE due_date < CURRENT_DATE AND status NOT IN ('Done', 'Cancelled')) AS overdue_items,
  (SELECT COUNT(*) FROM wh_work_items
   WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
   AND status NOT IN ('Done', 'Cancelled')) AS due_this_week;

CREATE OR REPLACE VIEW vw_wh_calendar_events AS
SELECT
  r.id AS entity_id, 'release' AS event_type,
  r.name || ' — ' || r.title AS event_title,
  r.target_date AS event_date, r.start_date AS event_start, r.target_date AS event_end,
  r.status AS event_status, NULL::UUID AS assignee_user_id, NULL::TEXT AS assignee_name, r.color AS event_color
FROM wh_releases r WHERE r.target_date IS NOT NULL
UNION ALL
SELECT t.id, 'theme', t.name, t.start_date, t.start_date, t.end_date,
  t.status, NULL, NULL, t.color
FROM wh_themes t WHERE t.start_date IS NOT NULL
UNION ALL
SELECT wi.id, 'workitem', wi.item_key || ' — ' || wi.summary,
  wi.due_date, wi.start_date, wi.due_date, wi.status, wi.assignee_user_id, res.name,
  CASE wi.item_type WHEN 'Epic' THEN '#1e40af' WHEN 'Story' THEN '#065f46' WHEN 'Bug' THEN '#dc2626' ELSE '#475569' END
FROM wh_work_items wi LEFT JOIN wh_resources res ON wi.assignee_user_id = res.user_id
WHERE wi.due_date IS NOT NULL;

-- ROW LEVEL SECURITY
ALTER TABLE wh_jira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_jira_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_bulk_ops_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('wh_jira_projects','wh_releases','wh_themes','wh_work_items','wh_resources','wh_resource_assignments','wh_jira_sync_log','wh_comments','wh_saved_filters','wh_bulk_ops_log') AND policyname LIKE 'wh_%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "wh_read_all" ON wh_jira_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_themes FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_resource_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_jira_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_all" ON wh_bulk_ops_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_read_own_filters" ON wh_saved_filters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_shared = TRUE);

CREATE POLICY "wh_write_all" ON wh_releases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_themes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_work_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_resource_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_own_filters" ON wh_saved_filters FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "wh_write_all" ON wh_bulk_ops_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_jira_sync_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wh_write_all" ON wh_jira_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
