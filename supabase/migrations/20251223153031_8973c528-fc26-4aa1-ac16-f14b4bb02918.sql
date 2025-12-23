-- Drop and recreate the update policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "Users can update incidents" ON public.incidents;

CREATE POLICY "Users can update incidents"
ON public.incidents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also add a delete policy for soft deletes (updating deleted_at)
-- This ensures authenticated users can perform soft deletes
DROP POLICY IF EXISTS "Users can soft delete incidents" ON public.incidents;

CREATE POLICY "Users can soft delete incidents"
ON public.incidents
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);