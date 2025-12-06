-- Add business_request_id column to milestones table for Demand milestones
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS business_request_id uuid REFERENCES public.business_requests(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_milestones_business_request_id ON public.milestones(business_request_id);

-- Add comment for documentation
COMMENT ON COLUMN public.milestones.business_request_id IS 'Reference to business_requests table for Demand milestones';