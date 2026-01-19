-- Add performance indexes for planner_tasks
CREATE INDEX IF NOT EXISTS idx_planner_tasks_workstream 
ON planner_tasks(workstream_id);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_assignee 
ON planner_tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_status 
ON planner_tasks(status_id);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_priority 
ON planner_tasks(priority);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_due_date 
ON planner_tasks(due_date);