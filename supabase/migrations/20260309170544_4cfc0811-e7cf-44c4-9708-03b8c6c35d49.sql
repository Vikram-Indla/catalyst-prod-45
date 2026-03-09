
-- Add sort_order and deleted_at to ph_issues if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ph_issues' AND column_name='sort_order') THEN
    ALTER TABLE ph_issues ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ph_issues' AND column_name='deleted_at') THEN
    ALTER TABLE ph_issues ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Indexes for WorkHub queries
CREATE INDEX IF NOT EXISTS idx_ph_issues_sort ON ph_issues (project_key, status_category, sort_order);
CREATE INDEX IF NOT EXISTS idx_ph_issues_status ON ph_issues (project_key, status);
CREATE INDEX IF NOT EXISTS idx_ph_issues_assignee ON ph_issues (assignee_account_id);
CREATE INDEX IF NOT EXISTS idx_ph_issues_parent ON ph_issues (parent_key);
CREATE INDEX IF NOT EXISTS idx_ph_issues_type ON ph_issues (issue_type);
CREATE INDEX IF NOT EXISTS idx_ph_issues_deleted ON ph_issues (deleted_at) WHERE deleted_at IS NULL;

-- WorkHub Activity Log (separate from existing work_item_activity which has different schema)
CREATE TABLE IF NOT EXISTS workhub_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key TEXT NOT NULL,
  actor_id UUID NULL,
  actor_name TEXT NOT NULL DEFAULT 'System',
  action TEXT NOT NULL,
  field_changed TEXT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  comment_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workhub_activity_issue ON workhub_activity (issue_key, created_at DESC);

ALTER TABLE workhub_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to workhub_activity" ON workhub_activity
  FOR ALL USING (true) WITH CHECK (true);

-- Saved Filter Views
CREATE TABLE IF NOT EXISTS workhub_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key TEXT NOT NULL,
  name TEXT NOT NULL,
  filter_config JSONB NOT NULL DEFAULT '{}',
  sort_config JSONB NOT NULL DEFAULT '{}',
  group_by TEXT DEFAULT 'status_category',
  column_config JSONB NOT NULL DEFAULT '[]',
  created_by UUID NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workhub_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to workhub_saved_views" ON workhub_saved_views
  FOR ALL USING (true) WITH CHECK (true);

-- View: ph_issues with parent summary + child counts for WorkHub
CREATE OR REPLACE VIEW workhub_items_view AS
SELECT 
  wi.id,
  wi.issue_key,
  wi.project_key,
  wi.project_name,
  wi.issue_type,
  wi.summary,
  wi.description_text,
  wi.status,
  wi.status_category,
  wi.priority,
  wi.assignee_account_id,
  wi.assignee_display_name,
  wi.reporter_account_id,
  wi.reporter_display_name,
  wi.parent_key,
  wi.parent_summary,
  wi.story_points,
  wi.due_date,
  wi.labels,
  wi.components,
  wi.sprint_name,
  wi.fix_versions,
  wi.resolution,
  wi.source,
  wi.sort_order,
  wi.deleted_at,
  wi.jira_created_at,
  wi.jira_updated_at,
  wi.synced_at,
  wi.theme_id,
  wi.type_icon_url,
  COALESCE(cc.child_count, 0) AS child_count,
  COALESCE(cc.completed_child_count, 0) AS completed_child_count
FROM ph_issues wi
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*)::int AS child_count,
    COUNT(*) FILTER (WHERE c.status_category IN ('Done', 'Complete'))::int AS completed_child_count
  FROM ph_issues c
  WHERE c.parent_key = wi.issue_key AND c.deleted_at IS NULL
) cc ON true
WHERE wi.deleted_at IS NULL;
