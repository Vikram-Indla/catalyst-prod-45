-- CAT-TESTHUB-ENGINE-20260626-001 · 2026-06-27 · D13 (continuation)
-- Repoint tm_cycle_execution_audit.test_case_id FK: dead `test_cases` →
-- tm_test_cases. The audit table's other 3 FKs already point at the canonical
-- tm_* tables (cycle_id→tm_test_cycles, scope_id→tm_cycle_scope,
-- test_run_id→tm_test_runs); test_case_id was the lone outlier pointing at the
-- DEAD bare `test_cases` family. After D13 fixed the audit trigger functions,
-- the audit INSERT still 409'd (23503) because this FK rejected tm_test_cases
-- ids. Repointing completes the execution-audit fix.
--
-- Table is empty (0 rows) → zero data risk. ON DELETE CASCADE (audit row dies
-- with its case), matching the intent of an execution-history record.
-- Part of D13 (Vikram approved fixing the audit path 2026-06-27).
-- Idempotent.

ALTER TABLE public.tm_cycle_execution_audit DROP CONSTRAINT IF EXISTS tm_cycle_execution_audit_test_case_id_fkey;
ALTER TABLE public.tm_cycle_execution_audit
  ADD CONSTRAINT tm_cycle_execution_audit_test_case_id_fkey
  FOREIGN KEY (test_case_id) REFERENCES public.tm_test_cases(id) ON DELETE CASCADE;
