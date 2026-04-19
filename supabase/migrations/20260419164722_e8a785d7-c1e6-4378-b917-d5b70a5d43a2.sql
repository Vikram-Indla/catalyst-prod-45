BEGIN;

-- Pre-flight guard: abort if rows appeared since classification (both expected empty).
DO $$
DECLARE c_comments bigint; c_activity bigint;
BEGIN
  SELECT COUNT(*) INTO c_comments FROM public.ph_comments;
  SELECT COUNT(*) INTO c_activity FROM public.ph_activity_log;
  IF c_comments > 0 THEN
    RAISE EXCEPTION 'ABORT: ph_comments now has % rows. Classification assumed 0. Re-run discovery.', c_comments;
  END IF;
  IF c_activity > 0 THEN
    RAISE EXCEPTION 'ABORT: ph_activity_log now has % rows. Classification assumed 0. Re-run discovery.', c_activity;
  END IF;
END $$;

-- ─────────── ph_comments ───────────

-- 1a. Repoint FK from ph_work_items → ph_issues
ALTER TABLE public.ph_comments
  DROP CONSTRAINT IF EXISTS wh_comments_work_item_id_fkey;

ALTER TABLE public.ph_comments
  ADD CONSTRAINT ph_comments_work_item_id_fkey
  FOREIGN KEY (work_item_id)
  REFERENCES public.ph_issues(id)
  ON DELETE CASCADE;

-- 1b. Rewrite broken SELECT policy BEFORE dropping permissives (no readability gap).
DROP POLICY IF EXISTS "Members can view comments" ON public.ph_comments;
CREATE POLICY "Members can view comments"
  ON public.ph_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ph_issues i
      JOIN public.ph_projects p ON p.key = i.project_key
      JOIN public.ph_project_members m ON m.project_id = p.id
      WHERE i.id = ph_comments.work_item_id
        AND m.user_id = auth.uid()
    )
  );

-- (INSERT/UPDATE/DELETE policies on ph_comments only key on author_id — leave intact.)

-- 1c. Now safe to drop wide-open permissives.
DROP POLICY IF EXISTS wh_write_all ON public.ph_comments;
DROP POLICY IF EXISTS wh_read_all ON public.ph_comments;

-- 1d. Index on FK
CREATE INDEX IF NOT EXISTS ph_comments_work_item_id_idx
  ON public.ph_comments (work_item_id);

-- ─────────── ph_activity_log ───────────

-- 2a. Repoint FK from ph_work_items → ph_issues
ALTER TABLE public.ph_activity_log
  DROP CONSTRAINT IF EXISTS ph_activity_log_work_item_id_fkey;

ALTER TABLE public.ph_activity_log
  ADD CONSTRAINT ph_activity_log_work_item_id_fkey
  FOREIGN KEY (work_item_id)
  REFERENCES public.ph_issues(id)
  ON DELETE CASCADE;

-- 2b. Rewrite broken SELECT policy
DROP POLICY IF EXISTS "Members can view activity" ON public.ph_activity_log;
CREATE POLICY "Members can view activity"
  ON public.ph_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ph_issues i
      JOIN public.ph_projects p ON p.key = i.project_key
      JOIN public.ph_project_members m ON m.project_id = p.id
      WHERE i.id = ph_activity_log.work_item_id
        AND m.user_id = auth.uid()
    )
  );

-- ("System inserts activity" INSERT policy keys on user_id = auth.uid() — leave intact.)

-- 2c. Index on FK
CREATE INDEX IF NOT EXISTS ph_activity_log_work_item_id_idx
  ON public.ph_activity_log (work_item_id);

COMMIT;