DROP POLICY IF EXISTS "Members can manage attachments" ON public.ph_attachments;
DROP POLICY IF EXISTS "Project members can manage ph_attachments" ON public.ph_attachments;

CREATE POLICY "Project members can manage ph_attachments"
ON public.ph_attachments
FOR ALL
TO authenticated
USING (
  work_item_id IN (
    SELECT i.id
    FROM public.ph_issues i
    JOIN public.ph_projects p ON p.key = i.project_key
    JOIN public.ph_project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid()
  )
)
WITH CHECK (
  uploaded_by = auth.uid()
  AND work_item_id IN (
    SELECT i.id
    FROM public.ph_issues i
    JOIN public.ph_projects p ON p.key = i.project_key
    JOIN public.ph_project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid()
  )
);