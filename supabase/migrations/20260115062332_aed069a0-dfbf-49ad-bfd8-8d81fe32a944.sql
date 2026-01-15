-- Add status column to resource_allocations table for committed/forecast tracking
ALTER TABLE public.resource_allocations 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'committed' 
CHECK (status IN ('committed', 'forecast'));

-- Add index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_resource_allocations_status ON public.resource_allocations(status);

-- Add index for faster lookups by resource + date range
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource_dates ON public.resource_allocations(resource_id, start_date, end_date);