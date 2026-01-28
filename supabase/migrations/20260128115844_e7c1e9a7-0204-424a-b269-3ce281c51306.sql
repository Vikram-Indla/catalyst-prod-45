-- Add description column to planner_workstreams if it doesn't exist
ALTER TABLE public.planner_workstreams
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add lead_id column to planner_workstreams if it doesn't exist
ALTER TABLE public.planner_workstreams
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.resource_inventory(id);

-- Add unique constraint on workstream_members if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_workstream_members_unique 
  ON public.workstream_members(workstream_id, resource_id);