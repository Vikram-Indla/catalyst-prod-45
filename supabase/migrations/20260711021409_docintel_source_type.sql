-- CAT-DOCINTEL-V2-20260709-001 Slice 6 — generalise ai_documents beyond uploaded files.
-- Additive: source_type classifies where a document's knowledge came from so Jira/git content
-- can flow through the SAME chunk/embed/retrieval pipeline as PDFs. Existing rows → 'document'.
ALTER TABLE public.ai_documents
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'document';
COMMENT ON COLUMN public.ai_documents.source_type IS
  'Knowledge source: document (uploaded file) | jira | git | markdown. Drives adapter-specific ingestion; retrieval is source-agnostic.';
CREATE INDEX IF NOT EXISTS idx_ai_documents_source_type ON public.ai_documents (project_id, source_type);
