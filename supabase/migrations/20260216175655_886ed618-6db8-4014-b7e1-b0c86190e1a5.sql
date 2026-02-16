-- Drop the overly permissive policy that bypasses all role-based controls (Check 65)
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.releases;

-- Add explicit INSERT policy for authenticated users (since create needs it)
CREATE POLICY "Authenticated users can insert releases"
ON public.releases
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add explicit UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update releases"
ON public.releases
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add explicit DELETE policy restricted to admins only
CREATE POLICY "Only admins can delete releases"
ON public.releases
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
