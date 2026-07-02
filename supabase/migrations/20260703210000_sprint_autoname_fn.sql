-- CAT-SPRINTS-NATIVE-20260702-002 S1.3a: sprint auto-naming SQL mirror (D-003).
-- Mirrors src/lib/sprints/autoName.ts — keep in sync.
-- Format: <KEY>-Sprint <M>.<W> - <DD Mon YY>
--   M = start month, W = ceil(startDay/7), date shown = END date
--   end = start+4d (1 week) / start+11d (2 weeks), Sun -> Thu.
-- Trigger is named a10_* so it fires BEFORE ph_jira_sprints_slug_trigger
-- (Postgres fires same-event triggers alphabetically) — the slug must be
-- generated from the FINAL name.

BEGIN;

CREATE OR REPLACE FUNCTION public.sprint_autoname(
  p_project_key text,
  p_start date,
  p_length_weeks int
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_project_key || '-Sprint '
      || EXTRACT(MONTH FROM p_start)::int || '.'
      || CEIL(EXTRACT(DAY FROM p_start) / 7.0)::int || ' - '
      || to_char(p_start + CASE WHEN p_length_weeks = 2 THEN 11 ELSE 4 END, 'DD Mon YY');
$$;

CREATE OR REPLACE FUNCTION public.sprint_autoname_apply()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_project_key text;
  base_name text;
  suffix int;
BEGIN
  -- end_date is derived data in every mode: start + 4d (1w) / start + 11d (2w).
  IF NEW.start_date IS NOT NULL AND NEW.length_weeks IS NOT NULL THEN
    NEW.end_date := NEW.start_date + (CASE WHEN NEW.length_weeks = 2 THEN 11 ELSE 4 END);
  END IF;

  -- Auto mode: the name is server-authoritative — recompute from inputs rather
  -- than trusting the client echo. Custom mode: name passes through untouched.
  IF NEW.name_mode = 'auto'
     AND NEW.start_date IS NOT NULL
     AND NEW.length_weeks IS NOT NULL THEN
    SELECT key INTO v_project_key FROM public.ph_projects WHERE id = NEW.project_id;
    IF v_project_key IS NOT NULL THEN
      NEW.name := public.sprint_autoname(v_project_key, NEW.start_date, NEW.length_weeks);
    END IF;
  END IF;

  -- Dedupe against UNIQUE(project_id, name): suffix -2, -3, ... (D-003).
  -- Applies to auto and custom names alike; excludes the row itself on UPDATE.
  base_name := NEW.name;
  suffix := 2;
  WHILE EXISTS (
    SELECT 1 FROM public.ph_jira_sprints s
    WHERE s.project_id = NEW.project_id
      AND s.name = NEW.name
      AND s.id IS DISTINCT FROM NEW.id
  ) LOOP
    NEW.name := base_name || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a10_sprint_autoname_trigger ON public.ph_jira_sprints;
CREATE TRIGGER a10_sprint_autoname_trigger
  BEFORE INSERT OR UPDATE OF name, name_mode, start_date, length_weeks, project_id
  ON public.ph_jira_sprints
  FOR EACH ROW EXECUTE FUNCTION public.sprint_autoname_apply();

COMMIT;
