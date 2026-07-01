-- CAT-SLUGS-UNIVERSAL-20260701-001 — Fix: ph_releases slug column
-- Prior migration 20260701000009 targeted public.releases (old table).
-- This migration targets the live table: public.ph_releases.

ALTER TABLE public.ph_releases
  ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.ph_releases
SET slug = public.catalyst_slugify(name)
WHERE slug IS NULL AND name IS NOT NULL AND name != '';

UPDATE public.ph_releases
SET slug = 'release-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

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
      FROM public.ph_releases
      WHERE slug IS NOT NULL
    ) sub
    WHERE rn > 1
  LOOP
    counter := 2;
    candidate := rec.slug || '-' || counter;
    WHILE EXISTS (SELECT 1 FROM public.ph_releases WHERE slug = candidate AND id != rec.id) LOOP
      counter := counter + 1;
      candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.ph_releases SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.ph_releases ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ph_releases_slug_unique ON public.ph_releases (slug);

CREATE OR REPLACE FUNCTION public.ph_releases_generate_slug()
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
      base_slug := 'release-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.ph_releases WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ph_releases_slug_trigger ON public.ph_releases;
CREATE TRIGGER ph_releases_slug_trigger
  BEFORE INSERT ON public.ph_releases
  FOR EACH ROW EXECUTE FUNCTION public.ph_releases_generate_slug();

COMMENT ON COLUMN public.ph_releases.slug IS
  'URL slug — globally unique, frozen on creation. Used in /release-hub/releases-management/:releaseSlug';
