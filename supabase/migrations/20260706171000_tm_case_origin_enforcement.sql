-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B3: case origin + enforcement
-- 1) origin (manual|ai|hybrid) on tm_test_cases
-- 2) tm_test_case_versions immutable once written (V2: published versions immutable)
-- 3) draft cases never executable (V2 hard rule) — enforced at scope-add

-- 1) Origin
ALTER TABLE public.tm_test_cases
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual';

ALTER TABLE public.tm_test_cases
  DROP CONSTRAINT IF EXISTS tm_test_cases_origin_check;
ALTER TABLE public.tm_test_cases
  ADD CONSTRAINT tm_test_cases_origin_check
  CHECK (origin IN ('manual', 'ai', 'hybrid'));

-- Backfill from existing AI flag
UPDATE public.tm_test_cases SET origin = 'ai'
WHERE is_ai_generated = true AND origin = 'manual';

-- 2) Version immutability (INSERT allowed; UPDATE/DELETE denied)
CREATE OR REPLACE FUNCTION public.tm_deny_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tm_test_case_versions rows are immutable (attempted % on version % of case %)',
    TG_OP, COALESCE(OLD.version_number, -1), OLD.test_case_id
    USING ERRCODE = 'raise_exception';
END;
$$;

DROP TRIGGER IF EXISTS tm_test_case_versions_immutable ON public.tm_test_case_versions;
CREATE TRIGGER tm_test_case_versions_immutable
  BEFORE UPDATE OR DELETE ON public.tm_test_case_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_deny_version_mutation();

-- 3) Draft never executable: block adding draft cases to execution scope
CREATE OR REPLACE FUNCTION public.tm_reject_draft_in_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.tm_case_status;
  v_key text;
BEGIN
  SELECT status, case_key INTO v_status, v_key
  FROM public.tm_test_cases WHERE id = NEW.test_case_id;

  IF v_status = 'draft' THEN
    RAISE EXCEPTION 'DRAFT_NOT_EXECUTABLE: test case % is draft and cannot be added to an execution scope', v_key
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Named aa_ so it fires before fn_lock_scope_version (alphabetical BEFORE-trigger order):
-- no version gets locked for a rejected draft.
DROP TRIGGER IF EXISTS aa_tm_cycle_scope_reject_draft ON public.tm_cycle_scope;
CREATE TRIGGER aa_tm_cycle_scope_reject_draft
  BEFORE INSERT ON public.tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_reject_draft_in_scope();
