-- Add is_starred column to planner_tasks for starring/bookmarking tasks
ALTER TABLE public.planner_tasks 
ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries on starred tasks
CREATE INDEX idx_planner_tasks_starred ON public.planner_tasks(is_starred) WHERE is_starred = true;