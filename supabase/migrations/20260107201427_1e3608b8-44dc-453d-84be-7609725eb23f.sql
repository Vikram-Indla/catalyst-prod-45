-- JOB-150: Fix RLS policies for ai_assist_drafts to allow soft delete

-- Drop conflicting/redundant policies
DROP POLICY IF EXISTS "Users can view all drafts" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "ai_assist_drafts_select" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "Users can update drafts" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "ai_assist_drafts_update" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "Admins can delete drafts" ON public.ai_assist_drafts;
DROP POLICY IF EXISTS "Users can create drafts" ON public.ai_assist_drafts;

-- Ensure RLS is enabled
ALTER TABLE public.ai_assist_drafts ENABLE ROW LEVEL SECURITY;

-- SELECT: Only show non-deleted drafts
CREATE POLICY "drafts_select_active" ON public.ai_assist_drafts
FOR SELECT TO authenticated
USING (is_deleted = false);

-- INSERT: Any authenticated user can create drafts
CREATE POLICY "drafts_insert" ON public.ai_assist_drafts
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: Allow updates to non-deleted drafts AND allow soft delete (setting is_deleted=true)
-- This policy allows:
-- 1. Normal updates to active drafts
-- 2. Soft delete operation (updating is_deleted to true)
CREATE POLICY "drafts_update" ON public.ai_assist_drafts
FOR UPDATE TO authenticated
USING (true)  -- Can read any row for update check
WITH CHECK (true);  -- Can write any values (soft delete included)

-- No hard DELETE allowed (use soft delete via UPDATE)
-- Dropping any DELETE policies since we use soft delete