-- Catalyst-native worklog table linked to ph_issues.
--
-- wh_work_logs already exists but its FK targets wh_work_items, the
-- parallel Workhub work-item system. The ticket detail view on the
-- Catalyst side mounts on ph_issues, so we need our own table.

CREATE TABLE IF NOT EXISTS public.ph_worklogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.ph_issues(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  time_spent_minutes integer NOT NULL CHECK (time_spent_minutes > 0),
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ph_worklogs_work_item
  ON public.ph_worklogs(work_item_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ph_worklogs_author
  ON public.ph_worklogs(author_id);

ALTER TABLE public.ph_worklogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ph_worklogs_select_authenticated" ON public.ph_worklogs;
CREATE POLICY "ph_worklogs_select_authenticated"
  ON public.ph_worklogs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ph_worklogs_insert_own" ON public.ph_worklogs;
CREATE POLICY "ph_worklogs_insert_own"
  ON public.ph_worklogs FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "ph_worklogs_update_own_or_admin" ON public.ph_worklogs;
CREATE POLICY "ph_worklogs_update_own_or_admin"
  ON public.ph_worklogs FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

NOTIFY pgrst, 'reload schema';
