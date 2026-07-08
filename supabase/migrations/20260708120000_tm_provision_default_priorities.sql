-- CAT-TESTHUB-CERT-20260708-001 — DEF-006 fix.
-- Root cause: tm_case_priorities is project-scoped but only ever seeded for the
-- hardcoded Demo Project (00000000-0000-0000-0000-000000000001) in
-- 20260105144028_f9a03772-de88-45c1-b078-6391c442874c.sql. Every other project
-- (e.g. "Senaei BAU") has zero priority rows, so the Create Test Case dialog's
-- Priority dropdown renders "No options". Mirrors the tm_provision_system_folders
-- pattern (20260706170000_tm_folder_system.sql): idempotent provisioning
-- function + auto-provision trigger on new tm_projects rows + backfill existing.

CREATE OR REPLACE FUNCTION public.tm_provision_default_priorities(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tm_case_priorities (project_id, name, color, sort_order, is_default)
  SELECT p_project_id, v.name, v.color, v.sort_order, v.is_default
  FROM (VALUES
    ('Critical', '#ef4444', 1, false),
    ('High',     '#f97316', 2, false),
    ('Medium',   '#eab308', 3, true),
    ('Low',      '#22c55e', 4, false)
  ) AS v(name, color, sort_order, is_default)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tm_case_priorities
    WHERE project_id = p_project_id AND name = v.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.tm_trigger_provision_default_priorities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.tm_provision_default_priorities(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_projects_provision_default_priorities ON public.tm_projects;
CREATE TRIGGER tm_projects_provision_default_priorities
  AFTER INSERT ON public.tm_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_trigger_provision_default_priorities();

-- Backfill: any existing project with zero priority rows gets the same
-- Critical/High/Medium/Low default set (matches the Demo Project seed).
DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT p.id FROM public.tm_projects p
    WHERE NOT EXISTS (SELECT 1 FROM public.tm_case_priorities pr WHERE pr.project_id = p.id)
  LOOP
    PERFORM public.tm_provision_default_priorities(v_id);
  END LOOP;
END;
$$;
