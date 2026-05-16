-- Add UPDATE policy for planner_tasks to allow authenticated users to update tasks
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.planner_tasks;
CREATE POLICY "Authenticated users can update tasks"
ON public.planner_tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also add INSERT policy if missing
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.planner_tasks;
CREATE POLICY "Authenticated users can insert tasks"
ON public.planner_tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add DELETE policy if missing
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.planner_tasks;
CREATE POLICY "Authenticated users can delete tasks"
ON public.planner_tasks
FOR DELETE
TO authenticated
USING (true);