-- Add new columns to planner_tasks
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE planner_tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocked_by', 'blocks', 'related')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(task_id, depends_on_task_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);

-- task_attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);

-- task_checklist_items table
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checklist_task ON task_checklist_items(task_id);

-- task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

-- task_activity table
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_task ON task_activity(task_id);

-- RLS Policies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- task_dependencies policies
CREATE POLICY "Users can view dependencies" ON task_dependencies FOR SELECT USING (true);
CREATE POLICY "Users can manage dependencies" ON task_dependencies FOR ALL USING (true);

-- task_attachments policies
CREATE POLICY "Users can view attachments" ON task_attachments FOR SELECT USING (true);
CREATE POLICY "Users can manage attachments" ON task_attachments FOR ALL USING (true);

-- task_checklist_items policies
CREATE POLICY "Users can view checklist" ON task_checklist_items FOR SELECT USING (true);
CREATE POLICY "Users can manage checklist" ON task_checklist_items FOR ALL USING (true);

-- task_comments policies
CREATE POLICY "Users can view comments" ON task_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON task_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update comments" ON task_comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete comments" ON task_comments FOR DELETE USING (true);

-- task_activity policies
CREATE POLICY "Users can view activity" ON task_activity FOR SELECT USING (true);
CREATE POLICY "System can insert activity" ON task_activity FOR INSERT WITH CHECK (true);