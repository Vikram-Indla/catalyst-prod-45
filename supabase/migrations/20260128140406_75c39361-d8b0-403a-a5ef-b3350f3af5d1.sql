-- Add UPDATE policy for planner_workstreams
CREATE POLICY "Allow authenticated users to update workstreams"
ON public.planner_workstreams
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add INSERT policy for planner_workstreams  
CREATE POLICY "Allow authenticated users to insert workstreams"
ON public.planner_workstreams
FOR INSERT
WITH CHECK (true);

-- Add DELETE policy for planner_workstreams
CREATE POLICY "Allow authenticated users to delete workstreams"
ON public.planner_workstreams
FOR DELETE
USING (true);