
-- Step 1: Add all missing columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_category TEXT DEFAULT 'todo';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'on_track';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_epics INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_stories INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_items_todo INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_items_in_progress INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_items_done INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_status_cat ON projects(status_category);
CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health_status);
