-- CAT-DOCS-NOTION-20260704-001 — Wiki batch 1/3: workspaces
-- kb_doc_spaces becomes the Wiki workspace table: one workspace per
-- project, per product, plus a single Organization workspace.
-- Slug policy: FROZEN on creation (CAT-SLUGS-UNIVERSAL-20260701-001).

-- 1. Container columns: a workspace belongs to a project, a product, or the org
ALTER TABLE public.kb_doc_spaces
  ADD COLUMN IF NOT EXISTS container_type TEXT,
  ADD COLUMN IF NOT EXISTS container_id UUID,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE public.kb_doc_spaces
  ALTER COLUMN project_id DROP NOT NULL;

-- 2. Backfill container from legacy project_id
UPDATE public.kb_doc_spaces
SET container_type = 'project', container_id = project_id
WHERE container_type IS NULL AND project_id IS NOT NULL;

UPDATE public.kb_doc_spaces
SET container_type = 'organization'
WHERE container_type IS NULL;

ALTER TABLE public.kb_doc_spaces
  ALTER COLUMN container_type SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.kb_doc_spaces
    ADD CONSTRAINT kb_doc_spaces_container_type_check
    CHECK (container_type IN ('project', 'product', 'organization'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One workspace per container (organization: container_id IS NULL, enforced below)
CREATE UNIQUE INDEX IF NOT EXISTS kb_doc_spaces_container_unique
  ON public.kb_doc_spaces (container_type, container_id)
  WHERE container_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_doc_spaces_org_unique
  ON public.kb_doc_spaces (container_type)
  WHERE container_type = 'organization' AND container_id IS NULL;

-- 3. Slug backfill + dedupe
UPDATE public.kb_doc_spaces
SET slug = public.catalyst_slugify(name)
WHERE slug IS NULL AND name IS NOT NULL;

UPDATE public.kb_doc_spaces
SET slug = 'workspace-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

DO $$
DECLARE
  rec RECORD;
  counter INT;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug FROM (
      SELECT id, slug,
        row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
      FROM public.kb_doc_spaces WHERE slug IS NOT NULL
    ) sub WHERE rn > 1
  LOOP
    counter := 2;
    candidate := rec.slug || '-' || counter;
    WHILE EXISTS (SELECT 1 FROM public.kb_doc_spaces WHERE slug = candidate AND id != rec.id) LOOP
      counter := counter + 1;
      candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.kb_doc_spaces SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.kb_doc_spaces ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_doc_spaces_slug_unique ON public.kb_doc_spaces (slug);

-- 4. Slug insert trigger — frozen on creation
CREATE OR REPLACE FUNCTION public.kb_doc_spaces_generate_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN
      base_slug := public.catalyst_slugify(NEW.name);
    ELSE
      base_slug := 'workspace-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.kb_doc_spaces WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kb_doc_spaces_slug_trigger ON public.kb_doc_spaces;
CREATE TRIGGER kb_doc_spaces_slug_trigger
  BEFORE INSERT ON public.kb_doc_spaces
  FOR EACH ROW EXECUTE FUNCTION public.kb_doc_spaces_generate_slug();

-- 5. Auto-provision: one workspace per project, per product, plus Organization
-- NOTE: legacy project_id points at kb_projects (kb-internal registry), so new
-- workspaces leave it NULL and carry identity via container_type/container_id.
INSERT INTO public.kb_doc_spaces (name, description, container_type, container_id)
SELECT p.name, 'Project workspace', 'project', p.id
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_doc_spaces s
  WHERE s.container_type = 'project' AND s.container_id = p.id
);

INSERT INTO public.kb_doc_spaces (name, description, container_type, container_id)
SELECT pr.name, 'Product workspace', 'product', pr.id
FROM public.products pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_doc_spaces s
  WHERE s.container_type = 'product' AND s.container_id = pr.id
);

INSERT INTO public.kb_doc_spaces (name, description, container_type)
SELECT 'Organization', 'Cross-cutting documentation for the whole organization', 'organization'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_doc_spaces s
  WHERE s.container_type = 'organization' AND s.container_id IS NULL
);

COMMENT ON COLUMN public.kb_doc_spaces.slug IS
  'URL slug — frozen on creation, derived from name. Used in /wiki/:workspaceSlug';
COMMENT ON COLUMN public.kb_doc_spaces.container_type IS
  'Workspace container: project | product | organization. One workspace per container.';
