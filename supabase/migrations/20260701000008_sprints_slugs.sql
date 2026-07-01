-- CAT-SLUGS-UNIVERSAL-20260701-001 — Batch A: sprints slug column
-- Slugs are scoped per-project (project_key + slug is the unique lookup).
-- Global slug uniqueness is NOT required — /project-hub/BAU/sprints/sprint-1 and
-- /project-hub/PRD/sprints/sprint-1 can coexist.

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.sprints
SET slug = public.catalyst_slugify(name)
WHERE slug IS NULL AND name IS NOT NULL AND name != '';

UPDATE public.sprints
SET slug = 'sprint-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Deduplicate within each project_id scope
DO $$
DECLARE
  rec RECORD;
  counter INT;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug, project_id
    FROM (
      SELECT id, slug, project_id,
        row_number() OVER (PARTITION BY project_id, slug ORDER BY created_at, id) AS rn
      FROM public.sprints
      WHERE slug IS NOT NULL
    ) sub
    WHERE rn > 1
  LOOP
    counter := 2;
    candidate := rec.slug || '-' || counter;
    WHILE EXISTS (
      SELECT 1 FROM public.sprints
      WHERE slug = candidate AND project_id = rec.project_id AND id != rec.id
    ) LOOP
      counter := counter + 1;
      candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.sprints SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.sprints ALTER COLUMN slug SET NOT NULL;

-- Unique within project scope only (not globally)
CREATE UNIQUE INDEX IF NOT EXISTS sprints_project_slug_unique
  ON public.sprints (project_id, slug);

CREATE OR REPLACE FUNCTION public.sprints_generate_slug()
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
      base_slug := 'sprint-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM public.sprints
      WHERE slug = candidate AND project_id = NEW.project_id
    ) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sprints_slug_trigger ON public.sprints;
CREATE TRIGGER sprints_slug_trigger
  BEFORE INSERT ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.sprints_generate_slug();

COMMENT ON COLUMN public.sprints.slug IS
  'URL slug scoped per project_id. Unique within a project. Used in /project-hub/:key/sprints/:sprintSlug';
