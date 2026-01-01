-- Allow capacity-planner assignments without a project
ALTER TABLE public.assignments
  ALTER COLUMN project_id DROP NOT NULL;