-- Add NOT NULL constraint to epics.theme_id to prevent orphan epics
-- First, delete any existing orphan epics (soft delete)
UPDATE public.epics 
SET deleted_at = now() 
WHERE theme_id IS NULL AND deleted_at IS NULL;

-- Add check constraint to prevent future orphan epics (allows NULL only if deleted)
-- We use a check constraint instead of NOT NULL to allow soft-deleted records
ALTER TABLE public.epics 
ADD CONSTRAINT epics_require_theme_when_active 
CHECK (deleted_at IS NOT NULL OR theme_id IS NOT NULL);

-- Add a comment documenting the constraint
COMMENT ON CONSTRAINT epics_require_theme_when_active ON public.epics IS 
'Ensures active epics must have a strategic theme linked. Orphan epics are not allowed.';