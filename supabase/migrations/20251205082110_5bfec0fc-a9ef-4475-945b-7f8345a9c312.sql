-- Add force-rank tracking fields to business_requests
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS is_force_ranked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS force_ranked_by TEXT,
ADD COLUMN IF NOT EXISTS force_ranked_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.business_requests.is_force_ranked IS 'Indicates if rank was manually overridden';
COMMENT ON COLUMN public.business_requests.force_ranked_by IS 'User who force-ranked this item';
COMMENT ON COLUMN public.business_requests.force_ranked_at IS 'Timestamp when force-ranking occurred';