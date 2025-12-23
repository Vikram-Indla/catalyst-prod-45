-- Add lock fields for Target Completion Date
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS end_date_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS end_date_locked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS end_date_locked_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_business_requests_assignee ON public.business_requests(assignee);
CREATE INDEX IF NOT EXISTS idx_business_requests_department_id ON public.business_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_business_requests_business_owner_id ON public.business_requests(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_business_requests_planned_quarter ON public.business_requests USING GIN(planned_quarter);
CREATE INDEX IF NOT EXISTS idx_business_requests_delivery_platform ON public.business_requests(delivery_platform);

COMMENT ON COLUMN public.business_requests.end_date_locked IS 'Whether the target completion date is locked';
COMMENT ON COLUMN public.business_requests.end_date_locked_by IS 'User who locked the target completion date';
COMMENT ON COLUMN public.business_requests.end_date_locked_at IS 'When the target completion date was locked';