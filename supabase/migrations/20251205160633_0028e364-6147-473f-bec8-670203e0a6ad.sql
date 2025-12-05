-- Add Entity & Individual Services columns to business_requests table
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS efs_domain text,
ADD COLUMN IF NOT EXISTS efs_service text,
ADD COLUMN IF NOT EXISTS efs_track_type text,
ADD COLUMN IF NOT EXISTS ecs_registry text,
ADD COLUMN IF NOT EXISTS is_saudi text,
ADD COLUMN IF NOT EXISTS is_non_saudi text;