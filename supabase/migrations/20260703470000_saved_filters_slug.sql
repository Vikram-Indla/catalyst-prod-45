-- P1-S14 (slug contract sweep, TD-001/PLN-053): saved_filters is a SHARED
-- table across every module's filter surface (testhub/project-hub/
-- product-hub/incident-hub/release-hub/tasks). FilterDetailPage.tsx already
-- had an `isUuid ? 'id' : 'slug'` read-path fallback, but the slug column
-- never existed -- that branch would 42703 if ever exercised. Table is
-- confirmed empty (0 rows) so no backfill risk; slug is NOT NULL from the
-- start.
ALTER TABLE saved_filters ADD COLUMN slug TEXT;

CREATE OR REPLACE FUNCTION public.saved_filters_generate_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE base_slug TEXT; candidate TEXT; counter INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN base_slug := public.catalyst_slugify(NEW.name);
    ELSE base_slug := 'filter-' || substr(NEW.id::text,1,8); END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.saved_filters WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_saved_filters_generate_slug
BEFORE INSERT ON saved_filters
FOR EACH ROW EXECUTE FUNCTION public.saved_filters_generate_slug();

ALTER TABLE saved_filters ALTER COLUMN slug SET NOT NULL;
ALTER TABLE saved_filters ADD CONSTRAINT saved_filters_slug_key UNIQUE (slug);
