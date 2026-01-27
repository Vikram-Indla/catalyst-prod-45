
-- ============================================================
-- MY TASKS BUSINESS RULES - Schema Changes
-- ============================================================

-- Add reporter_id and reviewer_id columns to planner_tasks
ALTER TABLE planner_tasks 
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_planner_tasks_reporter_id ON planner_tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_reviewer_id ON planner_tasks(reviewer_id);
