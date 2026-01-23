-- Add assignment_type column to resource_assignments table
ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS assignment_type text;

-- Add comment for documentation
COMMENT ON COLUMN public.resource_assignments.assignment_type IS 'Assignment type: Project, BAU, or Outsources';