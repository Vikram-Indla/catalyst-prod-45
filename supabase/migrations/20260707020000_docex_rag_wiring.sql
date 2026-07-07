-- Wire Folio/Docex pages into the RAG embedding pipeline.
--
-- Today kb_embeddings.source_type only accepts ministry|jira|catalyst|brd|internal
-- (20260516120000_bootstrap_full_schema.sql:31740) — Folio/Docex content
-- (kb_documents) has no source_type value and no writer targets kb_embeddings
-- from it at all, so it is invisible to RAG/search even in principle. This
-- migration adds the missing enum value and a dirty-flag + index so a
-- polling worker (kb-ingest's new `ingest_folio_batch` action) can find
-- published pages that need (re)embedding without a full table scan.
--
-- Only PUBLISHED pages are eligible (published_at IS NOT NULL) — this matches
-- the existing kb_documents SELECT RLS policy ("published_at IS NOT NULL OR
-- created_by = auth.uid()"), so nothing is embedded that a random querier
-- couldn't already read via the app itself.

ALTER TABLE public.kb_embeddings DROP CONSTRAINT kb_embeddings_source_type_check;
ALTER TABLE public.kb_embeddings ADD CONSTRAINT kb_embeddings_source_type_check
  CHECK (source_type = ANY (ARRAY['ministry'::text, 'jira'::text, 'catalyst'::text, 'brd'::text, 'internal'::text, 'docex'::text]));

ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS needs_reindex boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.kb_documents.needs_reindex IS
  'Set true whenever content/content_text/published_at changes; cleared by '
  'kb-ingest''s ingest_folio_batch action once the page has been (re)chunked '
  'and (re)embedded into kb_embeddings (source_type=''docex'').';

CREATE INDEX IF NOT EXISTS kb_documents_needs_reindex_idx
  ON public.kb_documents (needs_reindex)
  WHERE needs_reindex = true AND published_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kb_documents_flag_reindex()
RETURNS trigger AS $$
BEGIN
  NEW.needs_reindex := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_documents_flag_reindex_trigger ON public.kb_documents;
CREATE TRIGGER kb_documents_flag_reindex_trigger
  BEFORE UPDATE OF content, content_text, published_at ON public.kb_documents
  FOR EACH ROW
  WHEN (
    NEW.content IS DISTINCT FROM OLD.content
    OR NEW.content_text IS DISTINCT FROM OLD.content_text
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
  )
  EXECUTE FUNCTION public.kb_documents_flag_reindex();

-- Existing published pages start eligible for the first embedding pass —
-- unpublished pages stay excluded by the partial index's published_at check,
-- so this is a no-op cost-wise until something is actually published.
