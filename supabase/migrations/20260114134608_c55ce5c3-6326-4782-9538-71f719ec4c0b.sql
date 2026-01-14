-- Drop the existing UPDATE policy that's missing WITH CHECK
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.planner_tasks;

-- Create new UPDATE policy with proper WITH CHECK
CREATE POLICY "Authenticated users can update tasks" 
ON public.planner_tasks 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);