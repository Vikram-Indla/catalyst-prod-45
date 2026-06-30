-- Add slug column to ph_saved_filters for human-readable URLs
-- e.g. /project-hub/BAU/filters/my-bau-tickets instead of /.../{uuid}

ALTER TABLE public.ph_saved_filters
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slugify helper: lowercase, replace non-alphanum with hyphens, trim hyphens
CREATE OR REPLACE FUNCTION slugify(val TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(val);
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);
  result := substring(result from 1 for 80);
  RETURN result;
END;
$$;

-- Populate existing rows: slug = slugify(name), dedup with -2/-3 suffix
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, name FROM public.ph_saved_filters ORDER BY created_at LOOP
    base_slug := slugify(rec.name);
    candidate := base_slug;
    counter   := 2;
    WHILE EXISTS (SELECT 1 FROM public.ph_saved_filters WHERE slug = candidate AND id <> rec.id) LOOP
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    END LOOP;
    UPDATE public.ph_saved_filters SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Now make slug NOT NULL and unique
ALTER TABLE public.ph_saved_filters
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT ph_saved_filters_slug_unique UNIQUE (slug);
