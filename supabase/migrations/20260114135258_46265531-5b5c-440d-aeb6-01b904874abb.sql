-- Postgres doesn't support CREATE POLICY IF NOT EXISTS
-- Create (or replace) a SELECT policy that allows authenticated users to see soft-deleted rows.

DROP POLICY IF EXISTS "Authenticated users can view deleted tasks" ON public.planner_tasks;

CREATE POLICY "Authenticated users can view deleted tasks"
ON public.planner_tasks
FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NOT NULL);