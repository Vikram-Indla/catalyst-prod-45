-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "t10_items_delete_owner" ON public.t10_items;

-- Create a new policy that allows deletion by:
-- 1. The owner (created_by = auth.uid())
-- 2. OR if created_by is NULL (legacy/mock data)
CREATE POLICY "t10_items_delete_policy" 
ON public.t10_items 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND (created_by = auth.uid() OR created_by IS NULL)
);