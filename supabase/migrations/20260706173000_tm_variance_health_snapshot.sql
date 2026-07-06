-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B5: variance + sprint health + full scope snapshot
-- 1) tm_cycle_scope.locked_snapshot: full case content frozen at scope-add (V2 snapshot rule)
-- 2) tm_case_variance: explicit variance records (banner + pull-latest resolution audit)
-- 3) tm_sprint_test_health: sprint gate snapshots (pass|warn|block)

-- 1) Full snapshot on scope add
-- NOTE: the live BEFORE INSERT trigger on tm_cycle_scope is
-- trg_tm_cycle_scope_populate_locked_version → tm_cycle_scope_populate_locked_version.
-- The bootstrap fn_lock_scope_version is stale/unattached — both get the snapshot
-- logic so either wiring works.
ALTER TABLE public.tm_cycle_scope
  ADD COLUMN IF NOT EXISTS locked_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.tm_cycle_scope_populate_locked_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps jsonb;
BEGIN
  SELECT * INTO v_case FROM tm_test_cases WHERE id = NEW.test_case_id;

  IF NEW.locked_version IS NULL THEN
    NEW.locked_version := v_case.version;
  END IF;

  IF NEW.locked_snapshot IS NULL AND v_case.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'step_number', s.step_number,
        'action', s.action,
        'action_html', s.action_html,
        'expected_result', s.expected_result,
        'expected_result_html', s.expected_result_html,
        'test_data', s.test_data,
        'is_optional', s.is_optional
      ) ORDER BY s.step_number
    ), '[]'::jsonb)
    INTO v_steps
    FROM tm_test_steps s
    WHERE s.test_case_id = NEW.test_case_id AND s.deleted_at IS NULL;

    NEW.locked_snapshot := jsonb_build_object(
      'case_key', v_case.case_key,
      'title', v_case.title,
      'description', v_case.description,
      'description_html', v_case.description_html,
      'preconditions', v_case.preconditions,
      'preconditions_html', v_case.preconditions_html,
      'expected_result', v_case.expected_result,
      'test_format', v_case.test_format,
      'gherkin_feature', v_case.gherkin_feature,
      'gherkin_scenario', v_case.gherkin_scenario,
      'status', v_case.status,
      'origin', v_case.origin,
      'folder_id', v_case.folder_id,
      'locked_version', NEW.locked_version,
      'snapshotted_at', now(),
      'steps', v_steps
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lock_scope_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps jsonb;
BEGIN
  SELECT * INTO v_case FROM tm_test_cases WHERE id = NEW.test_case_id;

  IF NEW.locked_version IS NULL THEN
    NEW.locked_version := v_case.version;
  END IF;

  IF NEW.locked_snapshot IS NULL AND v_case.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'step_number', s.step_number,
        'action', s.action,
        'action_html', s.action_html,
        'expected_result', s.expected_result,
        'expected_result_html', s.expected_result_html,
        'test_data', s.test_data,
        'is_optional', s.is_optional
      ) ORDER BY s.step_number
    ), '[]'::jsonb)
    INTO v_steps
    FROM tm_test_steps s
    WHERE s.test_case_id = NEW.test_case_id AND s.deleted_at IS NULL;

    NEW.locked_snapshot := jsonb_build_object(
      'case_key', v_case.case_key,
      'title', v_case.title,
      'description', v_case.description,
      'description_html', v_case.description_html,
      'preconditions', v_case.preconditions,
      'preconditions_html', v_case.preconditions_html,
      'expected_result', v_case.expected_result,
      'test_format', v_case.test_format,
      'gherkin_feature', v_case.gherkin_feature,
      'gherkin_scenario', v_case.gherkin_scenario,
      'status', v_case.status,
      'origin', v_case.origin,
      'folder_id', v_case.folder_id,
      'locked_version', NEW.locked_version,
      'snapshotted_at', now(),
      'steps', v_steps
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Variance records
CREATE TABLE IF NOT EXISTS public.tm_case_variance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tm_projects(id) ON DELETE CASCADE,
  cycle_scope_id uuid NOT NULL REFERENCES public.tm_cycle_scope(id) ON DELETE CASCADE,
  test_case_id uuid NOT NULL REFERENCES public.tm_test_cases(id) ON DELETE CASCADE,
  locked_version integer NOT NULL,
  latest_version integer NOT NULL,
  variance_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text CHECK (resolution IN ('pulled_latest', 'accepted_snapshot', 'cloned')),
  resolved_by uuid,
  UNIQUE (cycle_scope_id, latest_version)
);

CREATE INDEX IF NOT EXISTS idx_tm_case_variance_scope ON public.tm_case_variance (cycle_scope_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tm_case_variance_case ON public.tm_case_variance (test_case_id);

ALTER TABLE public.tm_case_variance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tm_case_variance_select ON public.tm_case_variance;
DROP POLICY IF EXISTS tm_case_variance_insert ON public.tm_case_variance;
DROP POLICY IF EXISTS tm_case_variance_update ON public.tm_case_variance;
CREATE POLICY tm_case_variance_select ON public.tm_case_variance
  FOR SELECT USING (public.tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_variance_insert ON public.tm_case_variance
  FOR INSERT WITH CHECK (public.tm_user_has_access(auth.uid(), project_id));
CREATE POLICY tm_case_variance_update ON public.tm_case_variance
  FOR UPDATE USING (public.tm_user_has_access(auth.uid(), project_id));

-- 3) Sprint test health snapshots
CREATE TABLE IF NOT EXISTS public.tm_sprint_test_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.ph_jira_sprints(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.tm_projects(id) ON DELETE SET NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  gate_state text NOT NULL DEFAULT 'warn' CHECK (gate_state IN ('pass', 'warn', 'block')),
  gate_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_by uuid
);

CREATE INDEX IF NOT EXISTS idx_tm_sprint_test_health_sprint ON public.tm_sprint_test_health (sprint_id, computed_at DESC);

ALTER TABLE public.tm_sprint_test_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tm_sprint_test_health_select ON public.tm_sprint_test_health;
DROP POLICY IF EXISTS tm_sprint_test_health_insert ON public.tm_sprint_test_health;
CREATE POLICY tm_sprint_test_health_select ON public.tm_sprint_test_health
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY tm_sprint_test_health_insert ON public.tm_sprint_test_health
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
