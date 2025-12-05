-- Remove Entity & Individual Services columns from business_requests table
ALTER TABLE public.business_requests 
  DROP COLUMN IF EXISTS efs_domain,
  DROP COLUMN IF EXISTS efs_service,
  DROP COLUMN IF EXISTS efs_track_type,
  DROP COLUMN IF EXISTS ecs_registry,
  DROP COLUMN IF EXISTS is_saudi,
  DROP COLUMN IF EXISTS is_non_saudi;