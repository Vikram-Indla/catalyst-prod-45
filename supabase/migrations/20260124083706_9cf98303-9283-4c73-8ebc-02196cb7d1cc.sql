-- Add assignment_status column to resource_assignments
ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'yet_to_start' 
CHECK (assignment_status IN ('yet_to_start', 'on_hold', 'in_progress', 'completed'));