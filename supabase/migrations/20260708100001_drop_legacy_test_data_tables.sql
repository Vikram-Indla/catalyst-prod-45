-- CAT-TESTHUB-PRODREADY-20260707-001 Q4: dead-code sweep, legacy table family.
-- All 0 rows, 0 live code references (superseded by tm_step_results /
-- tm_cycle_scope). Drops in dependency order:
--   tm_test_runs.test_data_row_id -> test_data_rows (unused FK column, 0 non-null)
--   test_step_evidence -> test_execution_step_results
--   test_execution_step_results -> test_cycle_executions
--   test_cycle_executions, test_data_rows, test_data_parameters (leaves)
alter table tm_test_runs drop column if exists test_data_row_id;
drop table if exists test_step_evidence;
drop table if exists test_execution_step_results;
drop table if exists test_cycle_executions;
drop table if exists test_data_rows;
drop table if exists test_data_parameters;
