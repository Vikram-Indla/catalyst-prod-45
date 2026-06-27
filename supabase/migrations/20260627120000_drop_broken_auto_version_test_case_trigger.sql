-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27
-- Drop broken auto-version trigger on tm_test_cases.
--
-- auto_create_test_case_version() (BEFORE UPDATE) referenced OLD.objective,
-- OLD.priority and NEW.updated_by — none of which exist on tm_test_cases
-- (real columns: description, priority_id, created_by). Result: every UPDATE
-- on tm_test_cases failed with PostgREST 42703
-- ("record \"old\" has no field \"objective\""), killing the entire edit
-- surface (CaseDrawer edit, inline status/priority, archive, folder-move,
-- bulk update, version create).
--
-- Versioning is already handled in app code (useUpdateTestCase inserts a
-- snapshot into tm_test_case_versions), so this trigger was both broken AND
-- redundant. Dropping it restores all edit paths with no double-versioning.
-- Approved by Vikram 2026-06-27 (drift log 08, decision: DROP).
--
-- Idempotent: safe to re-run.

DROP TRIGGER IF EXISTS trg_auto_version_test_case ON public.tm_test_cases;
DROP FUNCTION IF EXISTS public.auto_create_test_case_version();
