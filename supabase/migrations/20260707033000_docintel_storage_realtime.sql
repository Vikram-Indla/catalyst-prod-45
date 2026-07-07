-- ============================================================================
-- DOCINTEL — private storage bucket, path-scoped RLS, realtime, prompt seed
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
-- Bucket 'docintel-documents' is PRIVATE (public=false). Object paths are laid
--   out as <project_id>/<...>; access requires membership of that project.
--   First folder (storage.foldername(name))[1] is cast to uuid and matched
--   against ph_project_members — same shape as the attachments private-bucket RLS.
-- ============================================================================

-- Private bucket, 50 MiB per-object limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('docintel-documents', 'docintel-documents', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='docintel_documents_member_insert'
  ) THEN
    CREATE POLICY docintel_documents_member_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'docintel-documents'
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='docintel_documents_member_select'
  ) THEN
    CREATE POLICY docintel_documents_member_select ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'docintel-documents'
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='docintel_documents_member_delete'
  ) THEN
    CREATE POLICY docintel_documents_member_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'docintel-documents'
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Realtime: pipeline surfaces subscribe to document/page/job status changes.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_documents;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_document_pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_document_pages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_document_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_document_jobs;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed placeholder prompt rows (version 1) so ai_agent_runs.prompt_id FKs work.
-- Real prompt text is set in slice 10.
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_agent_prompts (agent, version, prompt, is_active)
VALUES
  ('intent',         1, 'PLACEHOLDER — set in slice 10', true),
  ('retrieval',      1, 'PLACEHOLDER — set in slice 10', true),
  ('ocr_validation', 1, 'PLACEHOLDER — set in slice 10', true),
  ('structuring',    1, 'PLACEHOLDER — set in slice 10', true),
  ('summary',        1, 'PLACEHOLDER — set in slice 10', true),
  ('epic',           1, 'PLACEHOLDER — set in slice 10', true),
  ('story',          1, 'PLACEHOLDER — set in slice 10', true),
  ('brd',            1, 'PLACEHOLDER — set in slice 10', true),
  ('translation',    1, 'PLACEHOLDER — set in slice 10', true),
  ('critic',         1, 'PLACEHOLDER — set in slice 10', true)
ON CONFLICT (agent, version) DO NOTHING;
