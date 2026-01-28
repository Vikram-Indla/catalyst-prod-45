-- Add policies for anonymous users to view planner data
-- This allows the Workstreams page to load data without requiring login

-- Allow anonymous users to view workstreams
CREATE POLICY "Workstreams are viewable by anyone"
ON public.planner_workstreams
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to view tasks (read-only)
CREATE POLICY "Tasks are viewable by anyone"
ON public.planner_tasks
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to view statuses (needed for task status display)
CREATE POLICY "Statuses are viewable by anyone"
ON public.planner_statuses
FOR SELECT
TO anon
USING (true);