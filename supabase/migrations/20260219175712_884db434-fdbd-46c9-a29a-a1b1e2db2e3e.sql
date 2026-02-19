
-- Fix ph_components policies
DROP POLICY IF EXISTS "Admins delete components" ON ph_components;
DROP POLICY IF EXISTS "Members update components" ON ph_components;
DROP POLICY IF EXISTS "Members view components" ON ph_components;

CREATE POLICY "Members view components" ON ph_components FOR SELECT
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Members update components" ON ph_components FOR UPDATE
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Admins delete components" ON ph_components FOR DELETE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

-- Fix ph_workflow_statuses policies
DROP POLICY IF EXISTS "Admins delete statuses" ON ph_workflow_statuses;
DROP POLICY IF EXISTS "Admins update statuses" ON ph_workflow_statuses;
DROP POLICY IF EXISTS "Members view statuses" ON ph_workflow_statuses;

CREATE POLICY "Members view statuses" ON ph_workflow_statuses FOR SELECT
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Admins update statuses" ON ph_workflow_statuses FOR UPDATE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

CREATE POLICY "Admins delete statuses" ON ph_workflow_statuses FOR DELETE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

-- Fix ph_work_types policies
DROP POLICY IF EXISTS "Admins manage types" ON ph_work_types;
DROP POLICY IF EXISTS "Members view types" ON ph_work_types;

CREATE POLICY "Members view types" ON ph_work_types FOR SELECT
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Admins manage types" ON ph_work_types FOR UPDATE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

-- Fix ph_type_field_layouts policies
DROP POLICY IF EXISTS "Members view field layouts" ON ph_type_field_layouts;

CREATE POLICY "Members view field layouts" ON ph_type_field_layouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ph_work_types t
    WHERE t.id = ph_type_field_layouts.type_id
    AND public.is_ph_project_member(auth.uid(), t.project_id)
  ));

-- Fix ph_labels policies
DROP POLICY IF EXISTS "Admins delete labels" ON ph_labels;
DROP POLICY IF EXISTS "Members update labels" ON ph_labels;
DROP POLICY IF EXISTS "Members view labels" ON ph_labels;

CREATE POLICY "Members view labels" ON ph_labels FOR SELECT
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Members update labels" ON ph_labels FOR UPDATE
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Admins delete labels" ON ph_labels FOR DELETE
  USING (public.is_ph_project_admin(auth.uid(), project_id));
