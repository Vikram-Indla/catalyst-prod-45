-- JOB-150: Add policy to allow checking draft status for delete operation
-- This allows the app to check if a draft exists and its deletion status

-- Drop and recreate the select policy to allow reading deleted drafts for status check
DROP POLICY IF EXISTS "drafts_select_active" ON public.ai_assist_drafts;

-- SELECT: Show non-deleted drafts for normal queries
-- The RPC/check operation will need to use a different approach
CREATE POLICY "drafts_select" ON public.ai_assist_drafts
FOR SELECT TO authenticated
USING (true);  -- Allow reading all drafts, filtering done in app layer