-- Docex page IDs (CAT-DOCEX-DB-COEDIT-20260705-001 V3, Vikram 2026-07-06:
-- "how do you ID these pages" — pages must be referenceable from work items).
-- Every kb_document gets a stable display key DOC-<n>, assigned once at
-- insert (trigger + sequence), never renumbered. Existing pages backfilled
-- in creation order.
ALTER TABLE public.kb_documents ADD COLUMN IF NOT EXISTS doc_key TEXT;

CREATE SEQUENCE IF NOT EXISTS public.kb_doc_key_seq;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.kb_documents
  WHERE doc_key IS NULL
)
UPDATE public.kb_documents d
SET doc_key = 'DOC-' || o.rn
FROM ordered o
WHERE d.id = o.id;

SELECT setval(
  'public.kb_doc_key_seq',
  COALESCE((SELECT max(substring(doc_key FROM 5)::int) FROM public.kb_documents WHERE doc_key ~ '^DOC-[0-9]+$'), 0) + 1,
  false
);

CREATE OR REPLACE FUNCTION public.kb_documents_generate_doc_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.doc_key IS NULL OR NEW.doc_key = '' THEN
    NEW.doc_key := 'DOC-' || nextval('public.kb_doc_key_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kb_documents_doc_key_trigger ON public.kb_documents;
CREATE TRIGGER kb_documents_doc_key_trigger
  BEFORE INSERT ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.kb_documents_generate_doc_key();

CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_doc_key_unique
  ON public.kb_documents (doc_key);
