-- ============================================================================
-- DOCINTEL — S3 Knowledge Integration: document ↔ work item / Folio links
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
--
-- ai_document_links mirrors the Folio kb_document_links polymorphic link model
-- (20260704200200_wiki_links.sql) for Doc Intel documents. entity_type covers
-- Catalyst work items (ph_issues / ph_work_items ids), business requests,
-- TestHub test cases, Release Ops releases/changes, and Folio documents
-- (entity_type='document' → kb_documents.id).
--
-- RLS: child-table posture — scope inherited through parent ai_documents →
-- ph_project_members, copying the exact child-table policy pattern from
-- 20260707031000_docintel_rls_audit.sql. Audit: same docintel_audit() trigger
-- the sibling ai_* content tables carry.
-- ============================================================================

CREATE TABLE public.ai_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'business_request', 'epic', 'feature', 'story', 'task',
    'defect', 'incident', 'test_case', 'release', 'change', 'document'
  )),
  entity_id uuid NOT NULL,
  link_origin text NOT NULL DEFAULT 'manual'
    CHECK (link_origin IN ('manual', 'promotion', 'mention')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (document_id, entity_type, entity_id)
);

COMMENT ON TABLE public.ai_document_links IS
  'Doc Intel document ↔ Catalyst entity links. link_origin=promotion rows are written when an artifact is promoted to work items; entity_type=document links a Folio (kb_documents) page.';

-- Document-side lookup (Links tab on a Doc Intel document)
CREATE INDEX idx_ai_document_links_document
  ON public.ai_document_links (document_id);

-- Entity-side lookup ("Documents" section on a work item, future slice)
CREATE INDEX idx_ai_document_links_entity
  ON public.ai_document_links (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Audit trigger — mirrors the sibling ai_* content tables (031000)
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_ai_document_links_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_document_links
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();

-- ---------------------------------------------------------------------------
-- RLS — child-table pattern from 20260707031000_docintel_rls_audit.sql:
-- scope through parent ai_documents.project_id → ph_project_members.
-- SELECT / INSERT / DELETE for authenticated members (links are immutable
-- rows — no UPDATE policy; change = delete + insert).
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_document_links_select ON public.ai_document_links FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ai_documents d
                 WHERE d.id = ai_document_links.document_id
                   AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));

CREATE POLICY ai_document_links_insert ON public.ai_document_links FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_documents d
                      WHERE d.id = ai_document_links.document_id
                        AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));

CREATE POLICY ai_document_links_delete ON public.ai_document_links FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.ai_documents d
                 WHERE d.id = ai_document_links.document_id
                   AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));
