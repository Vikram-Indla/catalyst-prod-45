-- CAT-DOCS-NOTION-20260704-001 — Wiki batch 2/3: pages
-- kb_documents becomes the Wiki page table: per-workspace slug, sibling
-- ordering, page chrome (icon/cover), templates, dual content format
-- ('adf' legacy read-only | 'blocknote' native), Yjs state column.

-- 1. New columns
ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS content_format TEXT,
  ADD COLUMN IF NOT EXISTS ydoc_state BYTEA;

-- 2. Content format: existing rows are legacy ADF; new rows default blocknote
UPDATE public.kb_documents SET content_format = 'adf' WHERE content_format IS NULL;
ALTER TABLE public.kb_documents ALTER COLUMN content_format SET DEFAULT 'blocknote';
ALTER TABLE public.kb_documents ALTER COLUMN content_format SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.kb_documents
    ADD CONSTRAINT kb_documents_content_format_check
    CHECK (content_format IN ('adf', 'blocknote'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Slug backfill + per-space dedupe
UPDATE public.kb_documents
SET slug = public.catalyst_slugify(title)
WHERE slug IS NULL AND title IS NOT NULL;

UPDATE public.kb_documents
SET slug = 'page-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

DO $$
DECLARE
  rec RECORD;
  counter INT;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id, space_id, slug FROM (
      SELECT id, space_id, slug,
        row_number() OVER (PARTITION BY space_id, slug ORDER BY created_at, id) AS rn
      FROM public.kb_documents WHERE slug IS NOT NULL
    ) sub WHERE rn > 1
  LOOP
    counter := 2;
    candidate := rec.slug || '-' || counter;
    WHILE EXISTS (
      SELECT 1 FROM public.kb_documents
      WHERE space_id = rec.space_id AND slug = candidate AND id != rec.id
    ) LOOP
      counter := counter + 1;
      candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.kb_documents SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.kb_documents ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_space_slug_unique
  ON public.kb_documents (space_id, slug);

-- 4. Slug insert trigger — frozen on creation, unique per workspace
CREATE OR REPLACE FUNCTION public.kb_documents_generate_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.title IS NOT NULL AND NEW.title != '' THEN
      base_slug := public.catalyst_slugify(NEW.title);
    ELSE
      base_slug := 'page-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM public.kb_documents
      WHERE space_id = NEW.space_id AND slug = candidate
    ) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kb_documents_slug_trigger ON public.kb_documents;
CREATE TRIGGER kb_documents_slug_trigger
  BEFORE INSERT ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.kb_documents_generate_slug();

-- 5. Tree traversal index: sibling ordering within a parent
CREATE INDEX IF NOT EXISTS kb_documents_tree_idx
  ON public.kb_documents (space_id, parent_id, position);

COMMENT ON COLUMN public.kb_documents.slug IS
  'URL slug — frozen on creation, unique per workspace. Used in /wiki/:workspaceSlug/:pageSlug';
COMMENT ON COLUMN public.kb_documents.content_format IS
  'adf = legacy Atlaskit document (read-only in Wiki) | blocknote = native Wiki block JSON';
COMMENT ON COLUMN public.kb_documents.ydoc_state IS
  'Yjs document state (phase 2 collaboration); content stays the derived render projection';
