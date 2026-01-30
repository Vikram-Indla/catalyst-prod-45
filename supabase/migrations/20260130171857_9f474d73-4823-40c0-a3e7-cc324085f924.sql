-- ============================================================================
-- LABELS SYSTEM SCHEMA
-- ============================================================================

-- 1. CREATE LABELS TABLE
CREATE TABLE IF NOT EXISTS planner_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- 2. CREATE TASK-LABELS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS planner_task_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
  label_id UUID REFERENCES planner_labels(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, label_id)
);

-- 3. INSERT DEFAULT LABELS
INSERT INTO planner_labels (name, color, description) VALUES
  ('Bug', '#dc2626', 'Bug or defect that needs fixing'),
  ('Feature', '#2563eb', 'New feature request'),
  ('Enhancement', '#8b5cf6', 'Improvement to existing functionality'),
  ('Documentation', '#64748b', 'Documentation related task'),
  ('High Priority', '#f97316', 'Needs immediate attention'),
  ('Blocked', '#ef4444', 'Task is blocked by dependency'),
  ('In Review', '#eab308', 'Under review or awaiting approval'),
  ('Tech Debt', '#6366f1', 'Technical debt to address'),
  ('UX/UI', '#ec4899', 'User experience or interface related'),
  ('Backend', '#14b8a6', 'Backend/API related work'),
  ('Frontend', '#06b6d4', 'Frontend/UI related work'),
  ('DevOps', '#84cc16', 'Infrastructure and deployment')
ON CONFLICT (name) DO NOTHING;

-- 4. ENABLE RLS
ALTER TABLE planner_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_task_labels ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR LABELS
CREATE POLICY "Anyone can read labels" ON planner_labels
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create labels" ON planner_labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Label creators can update" ON planner_labels
  FOR UPDATE USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Authenticated users can delete labels" ON planner_labels
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. RLS POLICIES FOR TASK-LABELS
CREATE POLICY "Anyone can read task labels" ON planner_task_labels
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can assign labels" ON planner_task_labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can remove labels" ON planner_task_labels
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON planner_task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON planner_task_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_labels_name ON planner_labels(name);