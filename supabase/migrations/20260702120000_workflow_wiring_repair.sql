-- CAT-WORKFLOW-STUDIO-20260702-001 / P0.1 — workflow wiring repair
-- 1) ph_workflow_statuses.archived_at: code (useWorkflowStatuses/useTypeWorkflow) selects and
--    filters this column, but no migration ever added it — PostgREST 400 on every workflow read.
-- 2) ph_workflow_type_statuses + ph_workflow_transitions were hand-created out-of-band and have
--    no CREATE TABLE in the migration chain — fresh environments break. DDL below matches prod.
-- 3) Both hand-created tables shipped with RLS disabled; enable with policies mirroring
--    ph_workflow_statuses (member read / project-admin write).
-- Everything here is idempotent: dev/prod drift is a standing assumption for these tables.

ALTER TABLE public.ph_workflow_statuses
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE IF NOT EXISTS public.ph_workflow_type_statuses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  work_item_type text NOT NULL,
  status_id      uuid NOT NULL REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE,
  position       integer NOT NULL DEFAULT 0,
  is_initial     boolean NOT NULL DEFAULT false,
  UNIQUE (project_id, work_item_type, status_id)
);

CREATE TABLE IF NOT EXISTS public.ph_workflow_transitions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  work_item_type text,
  from_status_id uuid REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE,
  to_status_id   uuid NOT NULL REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE,
  UNIQUE NULLS NOT DISTINCT (project_id, work_item_type, from_status_id, to_status_id)
);

-- Tables may pre-exist (hand-created) WITHOUT the FKs above — CREATE IF NOT EXISTS skips them.
-- PostgREST embeds (ph_workflow_type_statuses → ph_workflow_statuses) require the FK to exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_workflow_type_statuses_project_id_fkey') THEN
    ALTER TABLE public.ph_workflow_type_statuses
      ADD CONSTRAINT ph_workflow_type_statuses_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.ph_projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_workflow_type_statuses_status_id_fkey') THEN
    ALTER TABLE public.ph_workflow_type_statuses
      ADD CONSTRAINT ph_workflow_type_statuses_status_id_fkey
      FOREIGN KEY (status_id) REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_workflow_transitions_project_id_fkey') THEN
    ALTER TABLE public.ph_workflow_transitions
      ADD CONSTRAINT ph_workflow_transitions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.ph_projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_workflow_transitions_from_status_id_fkey') THEN
    ALTER TABLE public.ph_workflow_transitions
      ADD CONSTRAINT ph_workflow_transitions_from_status_id_fkey
      FOREIGN KEY (from_status_id) REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ph_workflow_transitions_to_status_id_fkey') THEN
    ALTER TABLE public.ph_workflow_transitions
      ADD CONSTRAINT ph_workflow_transitions_to_status_id_fkey
      FOREIGN KEY (to_status_id) REFERENCES public.ph_workflow_statuses(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ph_wf_type_statuses_proj_type
  ON public.ph_workflow_type_statuses (project_id, work_item_type);
CREATE INDEX IF NOT EXISTS idx_ph_wf_transitions_proj_type
  ON public.ph_workflow_transitions (project_id, work_item_type);

ALTER TABLE public.ph_workflow_type_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_workflow_transitions  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ph_workflow_type_statuses' AND policyname = 'Members view type statuses') THEN
    CREATE POLICY "Members view type statuses" ON public.ph_workflow_type_statuses
      FOR SELECT USING (is_ph_project_member(auth.uid(), project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ph_workflow_type_statuses' AND policyname = 'Admins manage type statuses') THEN
    CREATE POLICY "Admins manage type statuses" ON public.ph_workflow_type_statuses
      FOR ALL USING (is_ph_project_admin(auth.uid(), project_id))
      WITH CHECK (is_ph_project_admin(auth.uid(), project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ph_workflow_transitions' AND policyname = 'Members view transitions') THEN
    CREATE POLICY "Members view transitions" ON public.ph_workflow_transitions
      FOR SELECT USING (is_ph_project_member(auth.uid(), project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ph_workflow_transitions' AND policyname = 'Admins manage transitions') THEN
    CREATE POLICY "Admins manage transitions" ON public.ph_workflow_transitions
      FOR ALL USING (is_ph_project_admin(auth.uid(), project_id))
      WITH CHECK (is_ph_project_admin(auth.uid(), project_id));
  END IF;
END $$;
