
-- ═══════════════════════════════════════════════════════════
-- SDLC SCHEMA: SDLC-PROJECTHUB-VIEWS
-- ═══════════════════════════════════════════════════════════

-- SECTION 1A: Add missing columns to ph_work_items
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS estimate INTEGER;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_ph_wi_priority ON ph_work_items(priority);
CREATE INDEX IF NOT EXISTS idx_ph_wi_sort_order ON ph_work_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_ph_wi_due_date ON ph_work_items(due_date);
CREATE INDEX IF NOT EXISTS idx_ph_wi_deleted ON ph_work_items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ph_wi_reporter ON ph_work_items(reporter_id);

-- ═══════════════════════════════════════════════════════════
-- SECTION 2A: Board Configuration
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ph_board_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  column_label TEXT NOT NULL,
  column_order INTEGER NOT NULL,
  wip_limit INTEGER,
  is_visible BOOLEAN DEFAULT true,
  color_group TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, status_key)
);

ALTER TABLE ph_board_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ph_board_project ON ph_board_config(project_id);
CREATE INDEX IF NOT EXISTS idx_ph_board_order ON ph_board_config(project_id, column_order);

CREATE POLICY "Board config readable by authenticated users"
  ON ph_board_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Board config writable by authenticated users"
  ON ph_board_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- SECTION 2B: List View Configuration (per user)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ph_list_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visible_columns TEXT[] DEFAULT ARRAY['release','key','type','title','status','priority','assignee','due_date'],
  column_order TEXT[] DEFAULT ARRAY['release','key','type','title','status','priority','assignee','due_date'],
  sort_column TEXT DEFAULT 'sort_order',
  sort_direction TEXT DEFAULT 'asc',
  group_by TEXT,
  rows_per_page INTEGER DEFAULT 50,
  show_subtasks BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE ph_list_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ph_list_config_user ON ph_list_config(user_id);
CREATE INDEX IF NOT EXISTS idx_ph_list_config_project ON ph_list_config(project_id);

CREATE POLICY "Users can manage their own list config"
  ON ph_list_config FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- SECTION 2C: Backlog Configuration (per user)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ph_backlog_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_by TEXT DEFAULT 'status',
  show_completed BOOLEAN DEFAULT false,
  show_subtasks BOOLEAN DEFAULT true,
  show_empty_groups BOOLEAN DEFAULT false,
  quick_filters TEXT[] DEFAULT '{}',
  visible_columns TEXT[] DEFAULT ARRAY['release','key','type','title','status','priority','assignee','due_date'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE ph_backlog_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ph_backlog_config_user ON ph_backlog_config(user_id);

CREATE POLICY "Users can manage their own backlog config"
  ON ph_backlog_config FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- SECTION 3A: Work Items Full View
-- Uses actual column names: item_key, item_type, assignee_id
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW ph_work_items_full_view AS
SELECT
  wi.id,
  wi.item_key,
  wi.title,
  wi.item_type,
  wi.status,
  wi.priority,
  wi.sort_order,
  wi.due_date,
  wi.estimate,
  wi.labels,
  wi.description,
  wi.parent_id,
  wi.project_id,
  wi.release_id,
  wi.assignee_id,
  wi.reporter_id,
  wi.deleted_at,
  wi.created_at,
  wi.updated_at,
  wi.department,
  wi.team,
  wi.environment,
  wi.security_level,
  wi.is_flagged,
  wi.flag_reason,
  wi.cycle_time_days,
  wi.status_changed_at,
  wi.resolved_at,
  wi.on_hold_reason,
  wi.backlog_order,
  
  -- Release info
  r.name AS release_name,
  r.status AS release_status,
  
  -- Assignee info
  ap.full_name AS assignee_name,
  ap.avatar_url AS assignee_avatar,
  
  -- Reporter info
  rp.full_name AS reporter_name,
  
  -- Parent info
  pw.item_key AS parent_key,
  pw.title AS parent_title,
  
  -- Computed: days in current status
  COALESCE(
    EXTRACT(DAY FROM (now() - (
      SELECT MAX(changed_at) FROM ph_status_transitions st 
      WHERE st.work_item_id = wi.id AND st.to_status = wi.status
    ))),
    EXTRACT(DAY FROM (now() - wi.created_at))
  )::INTEGER AS days_in_status,
  
  -- Computed: is overdue
  CASE 
    WHEN wi.due_date IS NOT NULL AND wi.due_date < CURRENT_DATE 
      AND wi.status NOT IN ('in_production', 'production_ready')
    THEN true 
    ELSE false 
  END AS is_overdue,
  
  -- Computed: days overdue
  CASE 
    WHEN wi.due_date IS NOT NULL AND wi.due_date < CURRENT_DATE 
      AND wi.status NOT IN ('in_production', 'production_ready')
    THEN (CURRENT_DATE - wi.due_date)
    ELSE NULL 
  END AS days_overdue,
  
  -- Computed: sub-issue count
  (SELECT COUNT(*) FROM ph_work_items sub WHERE sub.parent_id = wi.id AND sub.deleted_at IS NULL) AS sub_issue_count
  
FROM ph_work_items wi
LEFT JOIN ph_releases r ON r.id = wi.release_id
LEFT JOIN profiles ap ON ap.id = wi.assignee_id
LEFT JOIN profiles rp ON rp.id = wi.reporter_id
LEFT JOIN ph_work_items pw ON pw.id = wi.parent_id
WHERE wi.deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- SECTION 3B: Board Column Summary View
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW ph_board_column_counts_view AS
SELECT
  bc.project_id,
  bc.status_key,
  bc.column_label,
  bc.column_order,
  bc.wip_limit,
  bc.color_group,
  bc.is_visible,
  COUNT(wi.id) AS item_count,
  CASE 
    WHEN bc.wip_limit IS NOT NULL AND COUNT(wi.id) > bc.wip_limit THEN 'exceeded'
    WHEN bc.wip_limit IS NOT NULL AND COUNT(wi.id) = bc.wip_limit THEN 'at_limit'
    ELSE 'ok'
  END AS wip_status
FROM ph_board_config bc
LEFT JOIN ph_work_items wi 
  ON wi.status = bc.status_key 
  AND wi.project_id = bc.project_id
  AND wi.deleted_at IS NULL
WHERE bc.is_visible = true
GROUP BY bc.id, bc.project_id, bc.status_key, bc.column_label, 
         bc.column_order, bc.wip_limit, bc.color_group, bc.is_visible
ORDER BY bc.column_order;
