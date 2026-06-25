-- P1: Fold terminal→done, tighten category CHECK, add workflow can_transition() validator
-- DECISION-1: 3-category model (todo/in_progress/done) — Jira parity, StatusLozenge guardrail intact

BEGIN;

-- Step 1: Clear is_default on terminal rows before category change
-- (prevents uq_default_per_category unique index violation on UPDATE)
UPDATE public.ph_workflow_statuses
SET    is_default = false
WHERE  category = 'terminal' AND is_default = true;

-- Step 2: Fold terminal statuses into done
UPDATE public.ph_workflow_statuses
SET    category = 'done'
WHERE  category = 'terminal';

-- Step 3: Replace 4-value constraint with 3-value
ALTER TABLE public.ph_workflow_statuses
  DROP CONSTRAINT IF EXISTS ph_workflow_statuses_category_check;

ALTER TABLE public.ph_workflow_statuses
  ADD CONSTRAINT ph_workflow_statuses_category_check
  CHECK (category IN ('todo', 'in_progress', 'done'));

-- Step 4: Workflow transition validator
-- Checks ph_workflow_transitions for an exact type+from→to row,
-- OR a global rule (work_item_type IS NULL, from_status_id IS NULL).
-- Overloads the existing can_transition(varchar,uuid,varchar,varchar)
-- approval-workflow function — different param types, no conflict.
CREATE OR REPLACE FUNCTION public.can_transition(
  p_project_id     uuid,
  p_work_item_type text,
  p_from_status_id uuid,
  p_to_status_id   uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ph_workflow_transitions
    WHERE  project_id      = p_project_id
      AND  work_item_type  = p_work_item_type
      AND  from_status_id  = p_from_status_id
      AND  to_status_id    = p_to_status_id
  )
  OR EXISTS (
    SELECT 1 FROM public.ph_workflow_transitions
    WHERE  project_id      = p_project_id
      AND  work_item_type  IS NULL
      AND  from_status_id  IS NULL
      AND  to_status_id    = p_to_status_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_transition(uuid, text, uuid, uuid) TO authenticated;

COMMIT;
