-- Make resource_id nullable to support user-based membership
ALTER TABLE public.workstream_members 
ALTER COLUMN resource_id DROP NOT NULL;

-- Add a check constraint to ensure at least one of resource_id or user_id is set
ALTER TABLE public.workstream_members
ADD CONSTRAINT check_member_identity 
CHECK (resource_id IS NOT NULL OR user_id IS NOT NULL);

-- Update the unique constraint to allow user_id based membership
-- First drop the old constraint
DROP INDEX IF EXISTS idx_workstream_member_unique;

-- Create a new unique constraint that handles both cases
CREATE UNIQUE INDEX idx_workstream_member_resource_unique 
ON public.workstream_members (workstream_id, resource_id) 
WHERE resource_id IS NOT NULL;

CREATE UNIQUE INDEX idx_workstream_member_user_unique 
ON public.workstream_members (workstream_id, user_id) 
WHERE user_id IS NOT NULL;