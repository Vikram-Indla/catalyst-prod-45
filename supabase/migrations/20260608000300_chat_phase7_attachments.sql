-- =====================================================================
-- Catalyst Chat Phase 7 — attachments
-- =====================================================================
-- chat_attachments table + chat-attachments Storage bucket + RLS.
-- Attachments are stored in Supabase Storage; the table holds metadata.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  uploader_id     uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
  storage_path    text NOT NULL,
  filename        text NOT NULL,
  mime_type       text,
  byte_size       bigint,
  width_px        integer,
  height_px       integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_attachments IS
  'Per-message attachment metadata. Bytes live in the chat-attachments Storage bucket.';

CREATE INDEX IF NOT EXISTS chat_attachments_message_idx
  ON public.chat_attachments (message_id);
CREATE INDEX IF NOT EXISTS chat_attachments_conversation_idx
  ON public.chat_attachments (conversation_id);
CREATE INDEX IF NOT EXISTS chat_attachments_uploader_idx
  ON public.chat_attachments (uploader_id);

ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_attachments_select ON public.chat_attachments;
CREATE POLICY chat_attachments_select ON public.chat_attachments
  FOR SELECT TO authenticated
  USING (
    uploader_id = auth.uid()
    OR public.chat_is_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS chat_attachments_insert ON public.chat_attachments;
CREATE POLICY chat_attachments_insert ON public.chat_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND public.chat_is_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS chat_attachments_delete ON public.chat_attachments;
CREATE POLICY chat_attachments_delete ON public.chat_attachments
  FOR DELETE TO authenticated
  USING (uploader_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage bucket — chat-attachments. Private by default; signed URLs only.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
     VALUES ('chat-attachments', 'chat-attachments', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS — files are placed under <conversation_id>/<uuid>-<filename>.
-- Read access: member of the conversation. Write access: same.
DROP POLICY IF EXISTS chat_attachments_storage_select ON storage.objects;
CREATE POLICY chat_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.chat_is_member(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_attachments_storage_insert ON storage.objects;
CREATE POLICY chat_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.chat_is_member(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_attachments_storage_delete ON storage.objects;
CREATE POLICY chat_attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND owner = auth.uid()
  );
