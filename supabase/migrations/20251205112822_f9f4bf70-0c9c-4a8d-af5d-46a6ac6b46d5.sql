-- Add deleted_at column for soft delete
ALTER TABLE public.business_requests 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of non-deleted items
CREATE INDEX idx_business_requests_deleted_at ON public.business_requests(deleted_at) WHERE deleted_at IS NULL;