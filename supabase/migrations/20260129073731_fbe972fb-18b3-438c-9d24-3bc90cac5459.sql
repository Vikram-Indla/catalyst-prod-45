-- Add is_archived column to planner_workstreams table
ALTER TABLE public.planner_workstreams 
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create index for filtering archived workstreams
CREATE INDEX IF NOT EXISTS idx_planner_workstreams_is_archived 
ON public.planner_workstreams (is_archived);