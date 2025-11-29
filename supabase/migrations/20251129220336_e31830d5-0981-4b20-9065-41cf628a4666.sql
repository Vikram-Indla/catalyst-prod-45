-- Add soft delete and parking lot columns to features table
ALTER TABLE public.features 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS global_rank INTEGER;

-- Add soft delete and parking lot columns to capabilities table
ALTER TABLE public.capabilities 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parked_at TIMESTAMPTZ;

-- Create index for better query performance on deleted items
CREATE INDEX IF NOT EXISTS idx_features_deleted_at ON public.features(deleted_at);
CREATE INDEX IF NOT EXISTS idx_features_parked_at ON public.features(parked_at);
CREATE INDEX IF NOT EXISTS idx_capabilities_deleted_at ON public.capabilities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_capabilities_parked_at ON public.capabilities(parked_at);