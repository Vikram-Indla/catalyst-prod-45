
-- Drop existing single ALL policy
DROP POLICY IF EXISTS "Project members can manage ph_attachments" ON public.ph_attachments;

-- SELECT: any project member
CREATE POLICY "ph_attachments_select_project_members"
ON public.ph_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ph_issues i
    JOIN public.ph_projects p ON p.key = i.project_key
    JOIN public.ph_project_members m ON m.project_id = p.id
    WHERE i.id = ph_attachments.work_item_id
      AND m.user_id = auth.uid()
  )
);

-- INSERT: project member, must set uploaded_by = self
CREATE POLICY "ph_attachments_insert_project_members"
ON public.ph_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.ph_issues i
    JOIN public.ph_projects p ON p.key = i.project_key
    JOIN public.ph_project_members m ON m.project_id = p.id
    WHERE i.id = ph_attachments.work_item_id
      AND m.user_id = auth.uid()
  )
);

-- DELETE: uploader OR project admin/owner
CREATE POLICY "ph_attachments_delete_uploader_or_admin"
ON public.ph_attachments
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.ph_issues i
    JOIN public.ph_projects p ON p.key = i.project_key
    JOIN public.ph_project_members m ON m.project_id = p.id
    WHERE i.id = ph_attachments.work_item_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','owner')
  )
);

-- Storage: stricter uploader-or-admin DELETE for the 'attachments' bucket.
CREATE POLICY "attachments_storage_delete_uploader_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.ph_attachments a
      JOIN public.ph_issues i ON i.id = a.work_item_id
      JOIN public.ph_projects p ON p.key = i.project_key
      JOIN public.ph_project_members m ON m.project_id = p.id
      WHERE a.storage_path = storage.objects.name
        AND m.user_id = auth.uid()
        AND m.role IN ('admin','owner')
    )
  )
);
