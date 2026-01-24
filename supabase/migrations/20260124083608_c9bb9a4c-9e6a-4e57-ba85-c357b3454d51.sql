-- Add project_id and budget columns to resource_assignments
ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_assignments_project_id ON public.resource_assignments(project_id);