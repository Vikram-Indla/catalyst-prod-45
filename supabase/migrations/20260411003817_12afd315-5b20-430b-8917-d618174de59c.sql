-- Allow authenticated users to update work items (status, labels, parent, priority, etc.)
CREATE POLICY "wh_issues_update"
ON public.ph_issues
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);