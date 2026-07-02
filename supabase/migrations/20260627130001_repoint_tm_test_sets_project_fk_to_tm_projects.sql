-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27 · D10
-- Repoint tm_test_sets.project_id FK: projects → tm_projects.
--
-- The testhub core data family keys project_id on tm_projects (tm_test_cases,
-- tm_test_cycles, tm_folders, tm_case_priorities, tm_case_types, tm_defects,
-- tm_test_plans, …). tm_test_sets erroneously referenced `projects`, so every
-- Set create from a tm_projects-based project (i.e. the entire testhub,
-- including the seed DEMO id) failed with FK 23503
-- ("Key is not present in table projects"). Set CRUD was impossible.
--
-- tm_test_sets is empty (0 rows) → repoint is zero data-risk.
-- Mirrors tm_test_cases_project_id_fkey (ON DELETE CASCADE).
-- Approved by Vikram 2026-06-27 (drift log 08, decision: repoint to tm_projects).
--
-- Scope note: 5 other tm_* outliers (tm_audit_logs, tm_gate_templates,
-- tm_run_templates, tm_scheduled_runs, tm_step_definitions) also FK to
-- `projects` — left untouched (out of Phase 2 scope, flagged in 08).
--
-- Idempotent: safe to re-run.

ALTER TABLE public.tm_test_sets DROP CONSTRAINT IF EXISTS tm_test_sets_project_id_fkey;
ALTER TABLE public.tm_test_sets
  ADD CONSTRAINT tm_test_sets_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.tm_projects(id) ON DELETE CASCADE;
