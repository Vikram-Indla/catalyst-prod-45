-- CAT-SLUGS-UNIVERSAL-20260701-001 — Batch A: boards slug column
-- Adds slug to boards table, backfills from name, adds unique index + insert trigger.
-- Slug policy: FROZEN on creation. Rename the board freely — slug stays.

-- 1. Add nullable slug column
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Backfill: slugify name for all existing rows
UPDATE public.boards
SET slug = public.catalyst_slugify(name)
WHERE slug IS NULL AND name IS NOT NULL;

-- 3. For rows with no name, fall back to id prefix
UPDATE public.boards
SET slug = 'board-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- 4. Deduplicate: if two boards produce the same base slug, append -2, -3 etc.
-- Uses a window function approach: rank within (slug group) by created_at, then suffix rank > 1
DO $$
DECLARE
  rec RECORD;
  counter INT;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug
    FROM (
      SELECT id, slug,
        row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
      FROM public.boards
      WHERE slug IS NOT NULL
    ) sub
    WHERE rn > 1
  LOOP
    counter := 2;
    candidate := rec.slug || '-' || counter;
    WHILE EXISTS (SELECT 1 FROM public.boards WHERE slug = candidate AND id != rec.id) LOOP
      counter := counter + 1;
      candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.boards SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 5. Enforce NOT NULL + UNIQUE
ALTER TABLE public.boards ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS boards_slug_unique ON public.boards (slug);

-- 6. Insert trigger: auto-generate slug on INSERT when not provided
CREATE OR REPLACE FUNCTION public.boards_generate_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  -- Only auto-generate if caller did not supply a slug
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN
      base_slug := public.catalyst_slugify(NEW.name);
    ELSE
      base_slug := 'board-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.boards WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boards_slug_trigger ON public.boards;
CREATE TRIGGER boards_slug_trigger
  BEFORE INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.boards_generate_slug();

COMMENT ON COLUMN public.boards.slug IS
  'URL slug — frozen on creation, derived from name. Never changes after insert. Used in /project-hub/:key/boards/:boardSlug';
