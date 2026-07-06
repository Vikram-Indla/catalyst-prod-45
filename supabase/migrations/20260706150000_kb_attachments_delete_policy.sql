-- Docex attachments (CAT-DOCEX-DB-COEDIT-20260705-001 V4). The table shipped
-- with INSERT + SELECT policies only — deleting your own upload was
-- impossible. Uploader-owned DELETE.
CREATE POLICY "Users can delete own kb attachments"
  ON public.kb_document_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());
