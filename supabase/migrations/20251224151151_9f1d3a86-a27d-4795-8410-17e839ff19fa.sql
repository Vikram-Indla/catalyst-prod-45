-- Add planner-specific fields to work_manager_tasks for proper category mapping
ALTER TABLE public.work_manager_tasks
ADD COLUMN IF NOT EXISTS planned_date date,
ADD COLUMN IF NOT EXISTS ready_for_sprint boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS decision_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'none' CHECK (review_status IN ('none', 'pending', 'approved', 'rejected'));

-- Add index for efficient category queries
CREATE INDEX IF NOT EXISTS idx_work_manager_tasks_planner_category 
ON public.work_manager_tasks(status, ready_for_sprint, decision_required, review_status);

-- Add index for planned_date sorting
CREATE INDEX IF NOT EXISTS idx_work_manager_tasks_planned_date 
ON public.work_manager_tasks(planned_date) WHERE planned_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.work_manager_tasks.planned_date IS 'Target sprint/planning date for the task';
COMMENT ON COLUMN public.work_manager_tasks.ready_for_sprint IS 'Whether task is ready to be included in sprint';
COMMENT ON COLUMN public.work_manager_tasks.decision_required IS 'Whether task requires a decision/review before proceeding';
COMMENT ON COLUMN public.work_manager_tasks.review_status IS 'Review status: none, pending, approved, rejected';