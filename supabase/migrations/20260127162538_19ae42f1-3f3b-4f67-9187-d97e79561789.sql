-- Add is_active column to planner_workstreams
ALTER TABLE public.planner_workstreams 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing workstreams to be active
UPDATE public.planner_workstreams SET is_active = true WHERE is_active IS NULL;