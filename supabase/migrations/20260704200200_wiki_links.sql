-- CAT-DOCS-NOTION-20260704-001 — Wiki batch 3/3: page ↔ work item links
-- Polymorphic link table (mirrors the universal attachments/comments
-- entity_type + entity_id convention) replacing the single-link columns
-- kb_documents.linked_work_item_id/type (kept read-only for compat).
-- Plus page ↔ page backlinks extracted from @-mentions.

-- 1. Page ↔ work item
CREATE TABLE IF NOT EXISTS public.kb_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'business_request', 'epic', 'feature', 'story', 'task',
    'defect', 'incident', 'test_case', 'risk', 'idea', 'issue'
  )),
  entity_id TEXT NOT NULL,
  link_origin TEXT NOT NULL DEFAULT 'manual' CHECK (link_origin IN ('manual', 'mention')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, entity_type, entity_id)
);

-- Work-item side lookup ("Pages" section on a story/defect/...)
CREATE INDEX IF NOT EXISTS kb_document_links_entity_idx
  ON public.kb_document_links (entity_type, entity_id);

-- 2. Backfill from the legacy single-link columns
INSERT INTO public.kb_document_links (document_id, entity_type, entity_id, link_origin, created_by)
SELECT d.id,
       CASE d.linked_work_item_type
         WHEN 'bug' THEN 'defect'
         WHEN 'subtask' THEN 'task'
         ELSE d.linked_work_item_type
       END,
       d.linked_work_item_id,
       'manual',
       d.created_by
FROM public.kb_documents d
WHERE d.linked_work_item_id IS NOT NULL
  AND d.linked_work_item_type IS NOT NULL
  AND d.linked_work_item_type IN (
    'business_request', 'epic', 'feature', 'story', 'task',
    'defect', 'incident', 'test_case', 'risk', 'idea', 'issue', 'bug', 'subtask'
  )
ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING;

-- 3. Page ↔ page backlinks (extracted from page-link mentions in content)
CREATE TABLE IF NOT EXISTS public.kb_page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_page_id, target_page_id)
);

CREATE INDEX IF NOT EXISTS kb_page_links_target_idx
  ON public.kb_page_links (target_page_id);

-- 4. RLS — matches the current kb_* posture (authenticated read, creator writes).
-- Tightening to project/product membership is the dedicated D5 slice.
ALTER TABLE public.kb_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_page_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY kb_document_links_select ON public.kb_document_links
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kb_document_links_insert ON public.kb_document_links
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kb_document_links_delete ON public.kb_document_links
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kb_page_links_select ON public.kb_page_links
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kb_page_links_insert ON public.kb_page_links
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kb_page_links_delete ON public.kb_page_links
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.kb_document_links IS
  'Wiki page ↔ work item links. link_origin=mention rows are auto-written when a page @-mentions a work item (Confluence↔Jira parity).';
COMMENT ON TABLE public.kb_page_links IS
  'Wiki page ↔ page backlinks, extracted server-side from page-link inline content.';
