-- CAT-TESTHUB-PROD-20260703-001 P1-S5 (VER-008 / PLN-008, D-006-adjacent)
-- tm_cycle_status had 7 values but the UI (CycleStatus type: PLANNED |
-- IN_PROGRESS | COMPLETED | CANCELLED) only ever recognizes 4. 'draft' and
-- 'planned' were both mapped to the UI label "Planned"; 'active' and
-- 'in_progress' both mapped to "In progress". 'paused' had ZERO UI mapping
-- anywhere (cycleStatusFromDb silently fell back to "Planned" for it) and
-- zero live writers — confirmed via a full-table scan: only draft/active/
-- planned rows exist in production data, never in_progress/paused/completed/
-- archived. Collapsing to the 4 values the app actually uses, rather than
-- carrying 3 unreachable synonyms forever.
--
-- Sequence (A4 E1 pattern): drop dependent views -> convert column to text
-- -> remap values -> drop old enum -> create new enum -> convert column to
-- new enum -> recreate views -> recreate FSM trigger with the collapsed
-- transition graph.

-- 5 dependent views found via pg_depend (2 discovered up front, 3 more via
-- a full pg_depend scan after the first apply attempt failed on one not
-- caught by the initial udt_name search).
DROP VIEW IF EXISTS v_tm_test_cycle_list_metrics;
DROP VIEW IF EXISTS v_tm_cycle_progress;
DROP VIEW IF EXISTS v_tm_traceability_summary;
DROP VIEW IF EXISTS v_tm_execution_by_assignee;
DROP VIEW IF EXISTS v_tm_my_work;

-- Trigger blocks ALTER COLUMN TYPE too; drop and recreate alongside the fn.
DROP TRIGGER IF EXISTS trg_validate_cycle_status_transition ON tm_test_cycles;

ALTER TABLE tm_test_cycles ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tm_test_cycles ALTER COLUMN status TYPE text USING status::text;

UPDATE tm_test_cycles SET status = CASE status
  WHEN 'draft' THEN 'planned'
  WHEN 'in_progress' THEN 'active'
  WHEN 'paused' THEN 'active'
  ELSE status
END;

DROP TYPE tm_cycle_status;
CREATE TYPE tm_cycle_status AS ENUM ('planned', 'active', 'completed', 'archived');

ALTER TABLE tm_test_cycles ALTER COLUMN status TYPE tm_cycle_status USING status::tm_cycle_status;
ALTER TABLE tm_test_cycles ALTER COLUMN status SET DEFAULT 'planned'::tm_cycle_status;

-- Recreate the FSM trigger for the collapsed 4-state graph.
CREATE OR REPLACE FUNCTION public.validate_cycle_status_transition()
RETURNS trigger AS $function$
DECLARE
  allowed_transitions jsonb := '{
    "planned": ["active", "archived"],
    "active": ["completed", "archived"],
    "completed": ["archived"]
  }'::jsonb;
  allowed_next_states jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed_next_states := allowed_transitions->OLD.status::text;

  IF allowed_next_states IS NULL OR NOT (allowed_next_states ? NEW.status::text) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Allowed transitions: %',
      OLD.status,
      NEW.status,
      COALESCE(allowed_next_states::text, 'none');
  END IF;

  IF NEW.status = 'active' AND OLD.status = 'planned' AND NEW.actual_start IS NULL THEN
    NEW.actual_start := NOW();
  END IF;

  IF NEW.status = 'completed' AND NEW.actual_end IS NULL THEN
    NEW.actual_end := NOW();
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE TRIGGER trg_validate_cycle_status_transition
  BEFORE UPDATE ON tm_test_cycles
  FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION validate_cycle_status_transition();

-- Recreate the two dependent views verbatim (only enum literal referenced,
-- 'completed', survives unchanged in the new type).
CREATE VIEW v_tm_test_cycle_list_metrics AS
 SELECT c.id,
    c.project_id,
    c.cycle_key,
    c.name,
    c.description,
    c.status,
    c.environment,
    c.release_id,
    c.assigned_to,
    c.planned_start,
    c.planned_end,
    c.actual_start,
    c.actual_end,
    c.created_at,
    c.updated_at,
    c.created_by,
    COALESCE(scope_metrics.tests_count, 0) AS tests_count,
    COALESCE(run_metrics.runs_total, 0) AS runs_total,
    COALESCE(run_metrics.runs_passed, 0) AS runs_passed,
    COALESCE(run_metrics.runs_failed, 0) AS runs_failed,
    COALESCE(run_metrics.runs_blocked, 0) AS runs_blocked,
    COALESCE(run_metrics.runs_skipped, 0) AS runs_skipped,
        CASE
            WHEN COALESCE(scope_metrics.tests_count, 0) = 0 THEN 0
            ELSE round(COALESCE(run_metrics.unique_cases_executed, 0)::numeric / scope_metrics.tests_count::numeric * 100::numeric)::integer
        END AS progress_pct,
        CASE
            WHEN (COALESCE(run_metrics.runs_passed, 0) + COALESCE(run_metrics.runs_failed, 0)) = 0 THEN NULL::integer
            ELSE round(COALESCE(run_metrics.runs_passed, 0)::numeric / (COALESCE(run_metrics.runs_passed, 0) + COALESCE(run_metrics.runs_failed, 0))::numeric * 100::numeric)::integer
        END AS pass_rate_pct,
    GREATEST(c.updated_at, COALESCE(scope_metrics.latest_scope_update, c.updated_at), COALESCE(run_metrics.latest_run_time, c.updated_at)) AS updated_at_effective,
    run_metrics.avg_duration_seconds
   FROM tm_test_cycles c
     LEFT JOIN LATERAL ( SELECT s.cycle_id,
            count(*)::integer AS tests_count,
            max(s.added_at) AS latest_scope_update
           FROM tm_cycle_scope s
          WHERE s.cycle_id = c.id
          GROUP BY s.cycle_id) scope_metrics ON true
     LEFT JOIN LATERAL ( SELECT count(r.id)::integer AS runs_total,
            count(
                CASE
                    WHEN r.status = 'passed'::tm_execution_status THEN 1
                    ELSE NULL::integer
                END)::integer AS runs_passed,
            count(
                CASE
                    WHEN r.status = 'failed'::tm_execution_status THEN 1
                    ELSE NULL::integer
                END)::integer AS runs_failed,
            count(
                CASE
                    WHEN r.status = 'blocked'::tm_execution_status THEN 1
                    ELSE NULL::integer
                END)::integer AS runs_blocked,
            count(
                CASE
                    WHEN r.status = 'skipped'::tm_execution_status THEN 1
                    ELSE NULL::integer
                END)::integer AS runs_skipped,
            count(DISTINCT
                CASE
                    WHEN r.status = ANY (ARRAY['passed'::tm_execution_status, 'failed'::tm_execution_status, 'blocked'::tm_execution_status, 'skipped'::tm_execution_status]) THEN s.test_case_id
                    ELSE NULL::uuid
                END)::integer AS unique_cases_executed,
            max(COALESCE(r.completed_at, r.created_at)) AS latest_run_time,
            avg(r.duration_seconds) FILTER (WHERE r.duration_seconds IS NOT NULL)::integer AS avg_duration_seconds
           FROM tm_cycle_scope s
             LEFT JOIN tm_test_runs r ON r.cycle_scope_id = s.id
          WHERE s.cycle_id = c.id) run_metrics ON true;

CREATE VIEW v_tm_cycle_progress AS
 SELECT c.id,
    c.project_id,
    c.cycle_key,
    c.name,
    c.description,
    c.status,
    c.environment_id,
    c.planned_start,
    c.planned_end,
    c.actual_start,
    c.actual_end,
    c.total_cases,
    c.passed_count,
    c.failed_count,
    c.blocked_count,
    c.skipped_count,
    c.not_run_count,
    c.created_by,
    c.created_at,
    c.updated_at,
    p.name AS project_name,
    p.key AS project_key,
    e.name AS environment_name,
    creator.full_name AS created_by_name,
        CASE
            WHEN c.total_cases = 0 THEN 0::numeric
            ELSE round((c.passed_count + c.skipped_count)::numeric / c.total_cases::numeric * 100::numeric, 2)
        END AS progress_percent,
        CASE
            WHEN c.status = 'completed'::tm_cycle_status THEN 'completed'::text
            WHEN c.planned_end < now() AND c.status <> 'completed'::tm_cycle_status THEN 'overdue'::text
            WHEN c.planned_start > now() THEN 'upcoming'::text
            ELSE 'on_track'::text
        END AS schedule_status
   FROM tm_test_cycles c
     LEFT JOIN tm_projects p ON c.project_id = p.id
     LEFT JOIN tm_environments e ON c.environment_id = e.id
     LEFT JOIN profiles creator ON c.created_by = creator.id;

CREATE VIEW v_tm_traceability_summary AS
 SELECT id AS project_id,
    name AS project_name,
    key AS project_key,
    ( SELECT count(*) AS count
           FROM tm_test_cases
          WHERE tm_test_cases.project_id = p.id) AS total_cases,
    ( SELECT count(*) AS count
           FROM tm_test_cases
          WHERE tm_test_cases.project_id = p.id AND tm_test_cases.status = 'approved'::tm_case_status) AS approved_cases,
    ( SELECT count(*) AS count
           FROM tm_test_cycles
          WHERE tm_test_cycles.project_id = p.id) AS total_cycles,
    ( SELECT count(*) AS count
           FROM tm_test_cycles
          WHERE tm_test_cycles.project_id = p.id AND tm_test_cycles.status = 'completed'::tm_cycle_status) AS completed_cycles,
    ( SELECT count(*) AS count
           FROM tm_defects
          WHERE tm_defects.project_id = p.id AND tm_defects.status = 'open'::tm_defect_status) AS open_defects
   FROM tm_projects p
  WHERE is_active = true;

CREATE VIEW v_tm_execution_by_assignee AS
 SELECT cs.assigned_to AS user_id,
    u.full_name AS assignee_name,
    c.id AS cycle_id,
    c.name AS cycle_name,
    c.project_id,
    count(*) AS total_assigned,
    count(*) FILTER (WHERE cs.current_status = 'passed'::tm_execution_status) AS passed,
    count(*) FILTER (WHERE cs.current_status = 'failed'::tm_execution_status) AS failed,
    count(*) FILTER (WHERE cs.current_status = 'blocked'::tm_execution_status) AS blocked,
    count(*) FILTER (WHERE cs.current_status = 'not_run'::tm_execution_status) AS not_run,
        CASE
            WHEN count(*) = 0 THEN 0::numeric
            ELSE round(count(*) FILTER (WHERE cs.current_status <> ALL (ARRAY['not_run'::tm_execution_status, 'in_progress'::tm_execution_status]))::numeric / count(*)::numeric * 100::numeric, 2)
        END AS completion_percent
   FROM tm_cycle_scope cs
     JOIN tm_test_cycles c ON cs.cycle_id = c.id
     LEFT JOIN profiles u ON cs.assigned_to = u.id
  WHERE cs.assigned_to IS NOT NULL
  GROUP BY cs.assigned_to, u.full_name, c.id, c.name, c.project_id;

-- v_tm_my_work: 'in_progress'::tm_cycle_status -> 'active' (P1-S5 collapse;
-- the execution-status 'in_progress' literals in this view are a DIFFERENT
-- enum, tm_execution_status, and are untouched).
CREATE VIEW v_tm_my_work AS
 SELECT cs.assigned_to AS user_id,
    'cycle_scope'::text AS work_type,
    cs.id AS item_id,
    tc.case_key AS item_key,
    tc.title AS item_title,
    cs.current_status AS status,
    c.name AS context_name,
    c.id AS context_id,
    c.planned_end AS due_date,
        CASE
            WHEN c.planned_end < now() THEN 'overdue'::text
            WHEN c.planned_end < (now() + '2 days'::interval) THEN 'due_soon'::text
            ELSE 'normal'::text
        END AS urgency,
    cs.added_at AS assigned_at
   FROM tm_cycle_scope cs
     JOIN tm_test_cycles c ON cs.cycle_id = c.id
     JOIN tm_test_cases tc ON cs.test_case_id = tc.id
  WHERE (cs.current_status = ANY (ARRAY['not_run'::tm_execution_status, 'in_progress'::tm_execution_status, 'blocked'::tm_execution_status])) AND (c.status = ANY (ARRAY['planned'::tm_cycle_status, 'active'::tm_cycle_status]));
