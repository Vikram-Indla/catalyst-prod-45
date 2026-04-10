
-- 2026 Guardrail: Prevent pre-2026 items from entering ph_issues
CREATE OR REPLACE FUNCTION public.guard_2026_ph_issues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.jira_created_at IS NOT NULL AND NEW.jira_created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL; -- silently skip
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_2026_ph_issues
  BEFORE INSERT OR UPDATE ON public.ph_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_2026_ph_issues();

-- 2026 Guardrail: Prevent pre-2026 items from entering tm_defects
CREATE OR REPLACE FUNCTION public.guard_2026_tm_defects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.jira_created_at IS NOT NULL AND NEW.jira_created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL; -- silently skip
  END IF;
  IF NEW.jira_created_at IS NULL AND NEW.created_at IS NOT NULL AND NEW.created_at < '2026-01-01'::timestamptz THEN
    RETURN NULL; -- silently skip
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_2026_tm_defects
  BEFORE INSERT OR UPDATE ON public.tm_defects
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_2026_tm_defects();
