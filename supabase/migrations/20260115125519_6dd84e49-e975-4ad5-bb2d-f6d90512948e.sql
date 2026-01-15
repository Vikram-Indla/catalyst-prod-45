-- Add color column to resource_assignments for timeline bar colors
ALTER TABLE public.resource_assignments 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#2563eb';

-- Add comment for clarity
COMMENT ON COLUMN public.resource_assignments.color IS 'Hex color code for timeline bar visualization';