-- ============================================================================
-- CAT-TASKS-20260627-001 · Slice 6 — task <-> work-item linking junction
-- ----------------------------------------------------------------------------
-- WHY: A task must be linkable to any Catalyst work item EXCEPT the sub-task
-- category (rules #1/#2). No such linkage exists today. This adds a clean
-- many-to-many junction between `tasks` (Tasks Hub) and `ph_issues` work items
-- (referenced by their universal issue_key). The CHECK enforces the sub-task
-- exclusion at the DB layer; the picker UI also excludes sub-task.
--
-- WRITE-ONLY: do NOT auto-apply. Apply later via supabase db push / CI against
-- the dev project (cyijbdeuehohvhnsywig) — NOT catalyst-prod, NOT via MCP.
-- No RLS is enabled here (matches the tasks-family posture; RLS-001 is a
-- separate decision). Reversible — see ROLLBACK at bottom.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.task_work_item_links (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  work_item_key  text        NOT NULL,                       -- ph_issues.issue_key
  work_item_type text        NOT NULL,                       -- story / epic / feature / production-incident / ...
  link_type      text        NOT NULL DEFAULT 'relates',
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_work_item_links_unique UNIQUE (task_id, work_item_key),
  -- rule #1: a task may NOT be linked to a sub-task.
  CONSTRAINT task_work_item_links_not_subtask CHECK (lower(work_item_type) <> 'sub-task')
);

CREATE INDEX IF NOT EXISTS idx_task_work_item_links_task      ON public.task_work_item_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_item_links_work_item ON public.task_work_item_links(work_item_key);

COMMIT;

-- ============================================================================
-- ROLLBACK (run manually to revert):
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP TABLE IF EXISTS public.task_work_item_links;  -- drops indexes + constraints
-- COMMIT;
-- ============================================================================
