-- Add start_date and due_date columns to planner_workstreams
ALTER TABLE public.planner_workstreams
ADD COLUMN start_date DATE,
ADD COLUMN due_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.planner_workstreams.start_date IS 'Start date of the workstream';
COMMENT ON COLUMN public.planner_workstreams.due_date IS 'Due/target date for the workstream';