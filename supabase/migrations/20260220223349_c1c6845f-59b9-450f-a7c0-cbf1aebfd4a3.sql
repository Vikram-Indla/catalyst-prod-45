
-- Project favorites table
CREATE TABLE IF NOT EXISTS project_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proj_fav_user ON project_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_proj_fav_project ON project_favorites(project_id);

ALTER TABLE project_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON project_favorites;
CREATE POLICY "Users can view own favorites" ON project_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON project_favorites;
CREATE POLICY "Users can insert own favorites" ON project_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON project_favorites;
CREATE POLICY "Users can delete own favorites" ON project_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- All Projects list view
CREATE OR REPLACE VIEW v_project_list AS
SELECT 
  p.id,
  p.key AS project_key,
  p.name,
  p.department,
  p.description,
  p.status,
  p.health_status,
  p.status_category,
  p.total_epics,
  p.total_stories,
  p.total_tasks,
  p.work_items_todo,
  p.work_items_in_progress,
  p.work_items_done,
  p.completion_percentage,
  p.updated_at,
  p.created_at,
  p.owner_id,
  p.priority,
  p.tags,
  COALESCE(mc.member_count, 0) AS member_count,
  mc.member_ids
FROM projects p
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*)::INTEGER AS member_count,
    ARRAY_AGG(pm.user_id) AS member_ids
  FROM project_members pm 
  WHERE pm.project_id = p.id
) mc ON true
WHERE p.status = 'active'
ORDER BY p.updated_at DESC;
