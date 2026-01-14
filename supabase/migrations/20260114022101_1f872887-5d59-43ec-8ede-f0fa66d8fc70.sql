-- Drop the old foreign key referencing teams
ALTER TABLE public.planner_tasks DROP CONSTRAINT planner_tasks_workstream_id_fkey;

-- Add the new foreign key referencing planner_workstreams
ALTER TABLE public.planner_tasks 
ADD CONSTRAINT planner_tasks_workstream_id_fkey 
FOREIGN KEY (workstream_id) 
REFERENCES public.planner_workstreams(id) 
ON DELETE SET NULL;