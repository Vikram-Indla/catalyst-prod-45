-- ============================================================================
-- CAT-TASKS-20260627-001 · Slice 9A — TSK- key unification + canonical-modal columns
-- ----------------------------------------------------------------------------
-- WHY:
--   * Uniform task key prefix across the module: TSK- (was PLN-/workstream-prefix).
--     Client now supplies NO key on insert; this DB trigger is the single source
--     of truth, eliminating the client/DB key drift that caused task-detail
--     "Issue not found" (navigated key != stored key).
--   * Canonical Create modal parity needs two columns tasks lacks today:
--     description_adf (rich-text ADF round-trip) and labels (text[]).
--
-- APPLY: STAGING cyijbdeuehohvhnsywig ONLY (via Management API). NEVER prod,
-- NEVER db push. Idempotent + reversible (see ROLLBACK).
-- ============================================================================

BEGIN;

-- 1) generate_task_key() -> TSK-  (CREATE OR REPLACE; existing set_task_key trigger
--    keeps pointing at it). Never overwrites an explicitly supplied key.
CREATE OR REPLACE FUNCTION public.generate_task_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.key IS NOT NULL AND NEW.key <> '' THEN
    RETURN NEW;  -- never overwrite an explicitly supplied key
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM 5) AS integer)), 0) + 1
    INTO next_num
    FROM public.tasks
    WHERE key ~ '^TSK-[0-9]+$';
  NEW.key := 'TSK-' || next_num;
  RETURN NEW;
END;
$$;

-- 2) Rename existing rows to a uniform TSK- prefix (idempotent; guarded against
--    colliding with an already-present target key).
UPDATE public.tasks SET key = 'TSK-1'
  WHERE key = 'PLN-1' AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE key = 'TSK-1');
UPDATE public.tasks SET key = 'TSK-2'
  WHERE key = 'TIG-1' AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE key = 'TSK-2');

-- 3) Columns for canonical-modal field parity.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description_adf jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

COMMIT;

-- ============================================================================
-- ROLLBACK (manual):
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.generate_task_key() ... (restore 'PLN-' body);
-- -- (key renames are not auto-reverted; restore individually if required)
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS description_adf;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS labels;
-- COMMIT;
-- ============================================================================
