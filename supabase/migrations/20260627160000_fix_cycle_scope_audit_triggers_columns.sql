-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27 · D13
-- Fix the two tm_cycle_scope audit-logging trigger functions. Both read from
-- the DEAD bare `test_cases` table and a nonexistent `test_key` column (the
-- canonical table is tm_test_cases, the column is case_key). The status-change
-- one also referenced OLD/NEW.status, but tm_cycle_scope's column is
-- current_status. Result: EVERY UPDATE on tm_cycle_scope failed with 42703
-- ("column test_key does not exist"), blocking execution rollup (Phase 4a
-- scope status writes) and assignee changes (Phase 3b).
--
-- The audit table tm_cycle_execution_audit and all referenced columns exist,
-- so the fix preserves the execution-audit history feature.
-- Approved by Vikram 2026-06-27 (drift log 08, decision: fix both triggers).
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.tm_log_cycle_scope_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key,
      action_type, from_status, to_status, actor_id
    )
    SELECT
      NEW.cycle_id,
      NEW.id,
      NEW.test_case_id,
      tc.case_key,
      'status_changed',
      OLD.current_status,
      NEW.current_status,
      auth.uid()
    FROM tm_test_cases tc WHERE tc.id = NEW.test_case_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tm_log_cycle_assignment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_name TEXT;
  v_tc_key TEXT;
  v_tc_title TEXT;
BEGIN
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();

  SELECT case_key, title INTO v_tc_key, v_tc_title
  FROM tm_test_cases WHERE id = NEW.test_case_id;

  IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'assigned', auth.uid(), v_actor_name,
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'unassigned', auth.uid(), v_actor_name,
      jsonb_build_object('unassigned_from', OLD.assigned_to)
    );
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'assigned', auth.uid(), v_actor_name,
      jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to)
    );
  END IF;
  RETURN NEW;
END;
$function$;
