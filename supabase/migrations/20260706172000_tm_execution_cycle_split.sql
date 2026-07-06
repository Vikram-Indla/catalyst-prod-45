-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B4: Execution/Cycle split (D-002)
-- Test Execution = lab container (scope: sprint/release/project/product/BR/custom).
-- Test Cycle = dated attempt inside an execution (existing tm_test_cycles).
-- Closed cycles (completed|archived) become immutable through their children.

-- 1) Execution lab table
CREATE TABLE IF NOT EXISTS public.tm_test_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tm_projects(id) ON DELETE CASCADE,
  execution_key varchar(30) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  lab_scope_type text NOT NULL DEFAULT 'project'
    CHECK (lab_scope_type IN ('sprint', 'release', 'project', 'product', 'business_request', 'custom')),
  sprint_id uuid REFERENCES public.ph_jira_sprints(id) ON DELETE SET NULL,
  -- live cyij: all tm_* release FKs target ph_releases (not the legacy `releases` table)
  release_id uuid REFERENCES public.ph_releases(id) ON DELETE SET NULL,
  business_request_id uuid REFERENCES public.business_requests(id) ON DELETE SET NULL,
  custom_scope_label text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, execution_key)
);

CREATE INDEX IF NOT EXISTS idx_tm_test_executions_project ON public.tm_test_executions (project_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_executions_sprint ON public.tm_test_executions (sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tm_test_executions_release ON public.tm_test_executions (release_id) WHERE release_id IS NOT NULL;

-- Key assignment (EX-n per project, reuses tm_key_sequences)
CREATE OR REPLACE FUNCTION public.tm_set_execution_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.execution_key IS NULL OR NEW.execution_key = '' THEN
    NEW.execution_key := public.tm_next_entity_key(NEW.project_id, 'EX');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_test_executions_set_key ON public.tm_test_executions;
CREATE TRIGGER tm_test_executions_set_key
  BEFORE INSERT ON public.tm_test_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_set_execution_key();

-- RLS (canonical tm pattern)
ALTER TABLE public.tm_test_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tm_test_executions_select ON public.tm_test_executions;
DROP POLICY IF EXISTS tm_test_executions_insert ON public.tm_test_executions;
DROP POLICY IF EXISTS tm_test_executions_update ON public.tm_test_executions;
DROP POLICY IF EXISTS tm_test_executions_delete ON public.tm_test_executions;
CREATE POLICY tm_test_executions_select ON public.tm_test_executions
  FOR SELECT USING (public.tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_executions_insert ON public.tm_test_executions
  FOR INSERT WITH CHECK (public.tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_executions_update ON public.tm_test_executions
  FOR UPDATE USING (public.tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_test_executions_delete ON public.tm_test_executions
  FOR DELETE USING (public.tm_user_has_access(auth.uid(), project_id));

-- 2) Cycle → Execution link
ALTER TABLE public.tm_test_cycles
  ADD COLUMN IF NOT EXISTS execution_id uuid REFERENCES public.tm_test_executions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tm_test_cycles_execution ON public.tm_test_cycles (execution_id) WHERE execution_id IS NOT NULL;

-- 3) Backfill: one execution per existing unlinked cycle (scope inferred)
DO $$
DECLARE
  r RECORD;
  v_exec uuid;
BEGIN
  FOR r IN SELECT * FROM public.tm_test_cycles WHERE execution_id IS NULL
  LOOP
    INSERT INTO public.tm_test_executions
      (project_id, name, description, lab_scope_type, sprint_id, release_id, status, created_by, created_at)
    VALUES (
      r.project_id,
      r.name,
      'Auto-created from cycle ' || COALESCE(r.cycle_key, r.id::text) || ' (B4 backfill)',
      CASE
        WHEN r.sprint_id IS NOT NULL THEN 'sprint'
        WHEN r.release_id IS NOT NULL THEN 'release'
        ELSE 'project'
      END,
      r.sprint_id,
      r.release_id,
      CASE WHEN r.status IN ('completed', 'archived') THEN 'completed' ELSE 'active' END,
      r.created_by,
      r.created_at
    )
    RETURNING id INTO v_exec;

    UPDATE public.tm_test_cycles SET execution_id = v_exec WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4) Closed-cycle immutability: children of completed/archived cycles reject writes
CREATE OR REPLACE FUNCTION public.tm_cycle_is_closed(p_cycle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tm_test_cycles
    WHERE id = p_cycle_id AND status IN ('completed', 'archived')
  );
$$;

CREATE OR REPLACE FUNCTION public.tm_deny_closed_cycle_scope_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cycle uuid := COALESCE(OLD.cycle_id, NEW.cycle_id);
BEGIN
  IF public.tm_cycle_is_closed(v_cycle) THEN
    RAISE EXCEPTION 'CLOSED_CYCLE_IMMUTABLE: cycle % is closed; scope rows cannot be % ', v_cycle, TG_OP
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.tm_deny_closed_cycle_run_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cycle uuid;
BEGIN
  SELECT cs.cycle_id INTO v_cycle
  FROM public.tm_cycle_scope cs
  WHERE cs.id = COALESCE(OLD.cycle_scope_id, NEW.cycle_scope_id);

  IF v_cycle IS NOT NULL AND public.tm_cycle_is_closed(v_cycle) THEN
    RAISE EXCEPTION 'CLOSED_CYCLE_IMMUTABLE: cycle % is closed; runs cannot be %', v_cycle, TG_OP
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.tm_deny_closed_cycle_step_result_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cycle uuid;
BEGIN
  SELECT cs.cycle_id INTO v_cycle
  FROM public.tm_test_runs r
  JOIN public.tm_cycle_scope cs ON cs.id = r.cycle_scope_id
  WHERE r.id = COALESCE(OLD.test_run_id, NEW.test_run_id);

  IF v_cycle IS NOT NULL AND public.tm_cycle_is_closed(v_cycle) THEN
    RAISE EXCEPTION 'CLOSED_CYCLE_IMMUTABLE: cycle % is closed; step results cannot be %', v_cycle, TG_OP
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ab_tm_cycle_scope_closed_guard ON public.tm_cycle_scope;
CREATE TRIGGER ab_tm_cycle_scope_closed_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_deny_closed_cycle_scope_mutation();

DROP TRIGGER IF EXISTS ab_tm_test_runs_closed_guard ON public.tm_test_runs;
CREATE TRIGGER ab_tm_test_runs_closed_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.tm_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_deny_closed_cycle_run_mutation();

DROP TRIGGER IF EXISTS ab_tm_step_results_closed_guard ON public.tm_step_results;
CREATE TRIGGER ab_tm_step_results_closed_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.tm_step_results
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_deny_closed_cycle_step_result_mutation();

-- updated_at maintenance
DROP TRIGGER IF EXISTS tm_test_executions_updated_at ON public.tm_test_executions;
CREATE TRIGGER tm_test_executions_updated_at
  BEFORE UPDATE ON public.tm_test_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.tm_update_updated_at();
