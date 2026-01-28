-- Fix the view to use security invoker instead of security definer
DROP VIEW IF EXISTS public.my_accessible_workstreams;

CREATE VIEW public.my_accessible_workstreams 
WITH (security_invoker = true)
AS
SELECT pw.*
FROM public.planner_workstreams pw
WHERE public.can_access_all_workstreams(auth.uid())
   OR EXISTS (
     SELECT 1 FROM public.workstream_members wm
     WHERE wm.workstream_id = pw.id AND wm.user_id = auth.uid()
   );