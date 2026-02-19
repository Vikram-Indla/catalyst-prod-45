
-- Fix INSERT policies that still reference ph_project_members directly

-- ph_components INSERT
DROP POLICY IF EXISTS "Members manage components" ON ph_components;
CREATE POLICY "Members manage components" ON ph_components FOR INSERT
  WITH CHECK (public.is_ph_project_member(auth.uid(), project_id));

-- ph_workflow_statuses INSERT
DROP POLICY IF EXISTS "Admins manage statuses" ON ph_workflow_statuses;
CREATE POLICY "Admins manage statuses" ON ph_workflow_statuses FOR INSERT
  WITH CHECK (public.is_ph_project_admin(auth.uid(), project_id));

-- ph_labels INSERT
DROP POLICY IF EXISTS "Members manage labels" ON ph_labels;
CREATE POLICY "Members manage labels" ON ph_labels FOR INSERT
  WITH CHECK (public.is_ph_project_member(auth.uid(), project_id));
