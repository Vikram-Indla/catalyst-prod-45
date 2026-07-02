-- CAT-SPRINTS-NATIVE-20260702-002 slice S0.1a
-- Codify the out-of-band slug trigger on ph_jira_sprints (staging has it, no migration does)
-- and add native-sprint columns. Idempotent: safe to run on envs with or without the
-- out-of-band slug patch already applied (e.g. staging cyij already has `slug`).

ALTER TABLE public.ph_jira_sprints
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.ph_jira_sprints_generate_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE base_slug TEXT; candidate TEXT; counter INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := CASE WHEN NEW.name IS NOT NULL AND NEW.name != '' THEN public.catalyst_slugify(NEW.name) ELSE 'sprint-' || substr(NEW.id::text, 1, 8) END;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.ph_jira_sprints WHERE slug = candidate AND project_id = NEW.project_id) LOOP
      candidate := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$function$;

-- BEFORE INSERT OR UPDATE (not just INSERT) so the same trigger can backfill legacy rows below;
-- the function only ever fills a NULL/empty slug, so an already-set slug stays frozen (slug contract).
CREATE OR REPLACE TRIGGER ph_jira_sprints_slug_trigger
  BEFORE INSERT OR UPDATE ON public.ph_jira_sprints
  FOR EACH ROW EXECUTE FUNCTION public.ph_jira_sprints_generate_slug();

-- Backfill slug for any pre-existing rows still missing one (out-of-band envs already have it).
UPDATE public.ph_jira_sprints SET updated_at = updated_at WHERE slug IS NULL OR slug = '';

ALTER TABLE public.ph_jira_sprints
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ph_jira_sprints_slug_key'
  ) THEN
    ALTER TABLE public.ph_jira_sprints ADD CONSTRAINT ph_jira_sprints_slug_key UNIQUE (project_id, slug);
  END IF;
END $$;

-- Native-sprint columns (S0.1a scope only — no backfill, no FK repoint, no status vocab change)
ALTER TABLE public.ph_jira_sprints
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS name_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS length_weeks int,
  ADD COLUMN IF NOT EXISTS approval_policy text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS end_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ph_jira_sprints_name_mode_check'
  ) THEN
    ALTER TABLE public.ph_jira_sprints
      ADD CONSTRAINT ph_jira_sprints_name_mode_check CHECK (name_mode IN ('auto', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ph_jira_sprints_length_weeks_check'
  ) THEN
    ALTER TABLE public.ph_jira_sprints
      ADD CONSTRAINT ph_jira_sprints_length_weeks_check CHECK (length_weeks IS NULL OR length_weeks IN (1, 2));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ph_jira_sprints_approval_policy_check'
  ) THEN
    ALTER TABLE public.ph_jira_sprints
      ADD CONSTRAINT ph_jira_sprints_approval_policy_check CHECK (approval_policy IN ('any', 'all', 'quorum'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ph_jira_sprints_project_id_name_key'
  ) THEN
    ALTER TABLE public.ph_jira_sprints
      ADD CONSTRAINT ph_jira_sprints_project_id_name_key UNIQUE (project_id, name);
  END IF;
END $$;
