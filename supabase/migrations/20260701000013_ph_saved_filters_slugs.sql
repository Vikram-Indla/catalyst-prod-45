-- Phase 3H: Add slug to ph_saved_filters
-- Dual-mode resolution already in FilterDetailPage + FilterPreviewPage

ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill from name
UPDATE public.ph_saved_filters
SET slug = catalyst_slugify(name)
WHERE slug IS NULL;

-- Dedup: append -2, -3 for collisions
WITH ranked AS (
  SELECT id, slug,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.ph_saved_filters
  WHERE slug IS NOT NULL
)
UPDATE public.ph_saved_filters f
SET slug = r.slug || '-' || r.rn
FROM ranked r
WHERE f.id = r.id AND r.rn > 1;

-- Fallback: any still-null rows get id-based slug
UPDATE public.ph_saved_filters
SET slug = 'filter-' || substring(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Enforce NOT NULL + UNIQUE
ALTER TABLE public.ph_saved_filters
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'ph_saved_filters' AND indexname = 'ph_saved_filters_slug_key'
  ) THEN
    CREATE UNIQUE INDEX ph_saved_filters_slug_key ON public.ph_saved_filters(slug);
  END IF;
END;
$$;

-- INSERT trigger: auto-generate slug for new filters
CREATE OR REPLACE FUNCTION public.ph_saved_filters_set_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := catalyst_slugify(NEW.name);
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'filter-' || substring(NEW.id::text, 1, 8);
  END IF;

  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.ph_saved_filters WHERE slug = candidate AND id IS DISTINCT FROM NEW.id
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter   := counter + 1;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ph_saved_filters_set_slug ON public.ph_saved_filters;
CREATE TRIGGER trg_ph_saved_filters_set_slug
  BEFORE INSERT ON public.ph_saved_filters
  FOR EACH ROW EXECUTE FUNCTION public.ph_saved_filters_set_slug();
