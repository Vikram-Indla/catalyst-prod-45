-- ============================================================================
-- CAT-TASKS-20260627-001 · Slice 3 — Task data-model hardening (DEFECT-002)
-- ----------------------------------------------------------------------------
-- WHY: The live `tasks` / `task_statuses` / `task_workstreams` tables were
-- created by Lovable and never existed in repo migrations, so they carry NO
-- foreign-key constraints. PostgREST resolves embedded selects (used by the
-- canonical TaskCatalystView: status:task_statuses(*), workstream:..., assignee:
-- profiles!tasks_assignee_id_fkey(...)) from REAL DB FKs. Without them every
-- embed returns PGRST200 and the task detail body cannot render for ANY task.
-- Additionally `tasks.key` is NOT NULL but its key-generation trigger is bound
-- to the legacy `planner_tasks` table, so direct inserts (including the app's
-- useCreateTaskMutation, which omits `key`) fail.
--
-- WHAT THIS MIGRATION DOES (and ONLY this):
--   1. Adds the 6 missing FK constraints on `tasks` (safe: NOT VALID then
--      VALIDATE, after orphan pre-checks).
--   2. Adds a `tasks.key` PLN-N generator trigger (fires only when key is
--      null/blank; never overwrites an existing key; bound to `tasks`).
--
-- SCOPE GUARDS (explicitly NOT done here):
--   - Does NOT touch / drop / migrate legacy planner_* tables.
--   - Does NOT rename any table.
--   - Does NOT add task<->work-item linking (no parent_task_id — that column
--     does not exist on the live `tasks` table; the D-011 self-FK is N/A).
--   - Does NOT change RLS (see the commented, opt-in RLS section at the bottom +
--     finding RLS-001 in the Slice 3 report — requires an explicit decision).
--   - Does NOT touch app/UI code.
--
-- APPLY: write-only. Apply later via `supabase db push` / CI against the dev
-- project. Do NOT apply to catalyst-prod. Reversible — see ROLLBACK at bottom.
-- Column names + nullability verified against src/integrations/supabase/types.ts
-- (tasks Row) and live introspection on 2026-06-27.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Orphan pre-checks — abort with a clear message if any task references a
--    row that does not exist, so VALIDATE never fails mid-migration. (This env's
--    `tasks` is empty, so these pass trivially; other envs may carry real data.)
-- ----------------------------------------------------------------------------
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.status_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.task_statuses s WHERE s.id = t.status_id);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan status_id (no matching task_statuses). Clean before re-running.', n; END IF;

  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.workstream_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.task_workstreams w WHERE w.id = t.workstream_id);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan workstream_id.', n; END IF;

  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.assignee_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.assignee_id);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan assignee_id.', n; END IF;

  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.created_by);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan created_by.', n; END IF;

  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.reporter_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.reporter_id);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan reporter_id.', n; END IF;

  SELECT count(*) INTO n FROM public.tasks t
    WHERE t.reviewer_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.reviewer_id);
  IF n > 0 THEN RAISE EXCEPTION 'DEFECT-002 abort: % task row(s) have orphan reviewer_id.', n; END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Add FK constraints (idempotent; NOT VALID first, VALIDATE after).
--    ON DELETE: status_id is NOT NULL -> RESTRICT (cannot null it); all nullable
--    FKs -> SET NULL. FK names match the relationships PostgREST/types.ts expect
--    (notably tasks_assignee_id_fkey, used by the TaskCatalystView embed).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.task_statuses(id) ON DELETE RESTRICT NOT VALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_workstream_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_workstream_id_fkey FOREIGN KEY (workstream_id) REFERENCES public.task_workstreams(id) ON DELETE SET NULL NOT VALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_created_by_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reporter_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reviewer_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    EXECUTE 'ALTER TABLE public.tasks ADD CONSTRAINT tasks_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
  END IF;
END $$;

-- Validate (no-op if already validated; safe now that orphan checks passed).
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_status_id_fkey;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_workstream_id_fkey;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_assignee_id_fkey;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_created_by_fkey;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_reporter_id_fkey;
ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_reviewer_id_fkey;

-- ----------------------------------------------------------------------------
-- 3) tasks.key auto-generation (PLN-N — D-008). Fires only when key is
--    null/blank; NEVER overwrites an existing key; reads from `tasks` (not
--    planner_tasks). Idempotent: CREATE OR REPLACE + DROP/CREATE trigger.
-- ----------------------------------------------------------------------------
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
    WHERE key ~ '^PLN-[0-9]+$';
  NEW.key := 'PLN-' || next_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_task_key ON public.tasks;
CREATE TRIGGER set_task_key
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.key IS NULL OR NEW.key = '')
  EXECUTE FUNCTION public.generate_task_key();

COMMIT;

-- ============================================================================
-- ROLLBACK (run manually to revert this migration):
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_task_key ON public.tasks;
-- DROP FUNCTION IF EXISTS public.generate_task_key();
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_id_fkey;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_workstream_id_fkey;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_fkey;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reviewer_id_fkey;
-- COMMIT;
-- ============================================================================

-- ============================================================================
-- OPTIONAL · RLS-001 hardening (DISABLED BY DEFAULT — opt-in only).
-- ----------------------------------------------------------------------------
-- FINDING (verified live 2026-06-27): with only the public anon key and NO user
-- token, an unauthenticated client can BOTH read AND delete `tasks` (anon DELETE
-- returned HTTP 200). RLS is effectively off / fully permissive on the tasks
-- family (tasks, task_statuses, task_workstreams). This is a security gap.
--
-- It is left COMMENTED OUT because (a) authenticated app read/write works today,
-- and (b) per the Slice 3 decision RLS must not change without an explicit call.
-- Mirrors the existing planner_tasks posture (public SELECT on non-deleted rows,
-- authenticated writes). REVIEW the policies against any unauthenticated app path
-- before enabling. To apply: uncomment, confirm, and run.
--
-- BEGIN;
-- ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.task_statuses    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.task_workstreams ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "tasks_select"  ON public.tasks FOR SELECT USING (deleted_at IS NULL);
-- CREATE POLICY "tasks_insert"  ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- CREATE POLICY "tasks_update"  ON public.tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
-- CREATE POLICY "tasks_delete"  ON public.tasks FOR DELETE USING (auth.uid() IS NOT NULL);
--
-- CREATE POLICY "task_statuses_select"    ON public.task_statuses    FOR SELECT USING (true);
-- CREATE POLICY "task_statuses_write"     ON public.task_statuses    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- CREATE POLICY "task_workstreams_select" ON public.task_workstreams FOR SELECT USING (true);
-- CREATE POLICY "task_workstreams_write"  ON public.task_workstreams FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- COMMIT;
-- ============================================================================
