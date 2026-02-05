/**
 * RELEASE & TEST MANAGEMENT MODULE - COMPLETE TECHNICAL SPECIFICATION
 * 
 * This document provides exhaustive detail for rebuilding the entire module.
 * Every function, component, hook, database table, and business rule is documented.
 */

// ============================================================================
// SECTION 1: DATABASE SCHEMA SPECIFICATION
// ============================================================================

export interface DatabaseSchema {
  tables: TableSpec[];
  views: ViewSpec[];
  functions: DbFunctionSpec[];
  triggers: TriggerSpec[];
  policies: RlsPolicySpec[];
}

export interface TableSpec {
  name: string;
  description: string;
  columns: ColumnSpec[];
  primaryKey: string;
  foreignKeys: ForeignKeySpec[];
  indexes: IndexSpec[];
  constraints: ConstraintSpec[];
}

export interface ColumnSpec {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  description: string;
}

export interface ForeignKeySpec {
  column: string;
  references: { table: string; column: string };
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndexSpec {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintSpec {
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'EXCLUSION';
  definition: string;
}

export interface ViewSpec {
  name: string;
  description: string;
  query: string;
  columns: string[];
}

export interface DbFunctionSpec {
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string }[];
  returnType: string;
  language: 'plpgsql' | 'sql';
  securityDefiner: boolean;
  purpose: string;
}

export interface TriggerSpec {
  name: string;
  table: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  function: string;
  description: string;
}

export interface RlsPolicySpec {
  name: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using: string;
  withCheck?: string;
  description: string;
}

// ============================================================================
// SECTION 2: COMPLETE DATABASE TABLES
// ============================================================================

export const DATABASE_TABLES: TableSpec[] = [
  // ----- RELEASES TABLE -----
  {
    name: 'releases',
    description: 'Core table storing release/version information with lifecycle management',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'version', type: 'varchar(50)', nullable: false, description: 'Version number (e.g., "2.1.0", "Q1-2024")' },
      { name: 'name', type: 'varchar(255)', nullable: false, description: 'Human-readable release name' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed release description and scope' },
      { name: 'status', type: 'release_status_enum', nullable: false, defaultValue: "'planning'", description: 'Current lifecycle status' },
      { name: 'planned_date', type: 'date', nullable: false, description: 'Target release date' },
      { name: 'actual_date', type: 'date', nullable: true, description: 'Actual release date (set when released)' },
      { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects table' },
      { name: 'release_manager_id', type: 'uuid', nullable: true, description: 'FK to profiles - release owner' },
      { name: 'qa_lead_id', type: 'uuid', nullable: true, description: 'FK to profiles - QA lead' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'FK to profiles - creator' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'project_id', references: { table: 'projects', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'release_manager_id', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'qa_lead_id', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_releases_project', columns: ['project_id'], unique: false, type: 'btree' },
      { name: 'idx_releases_status', columns: ['status'], unique: false, type: 'btree' },
      { name: 'idx_releases_planned_date', columns: ['planned_date'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- TEST PLANS TABLE -----
  {
    name: 'tm_test_plans',
    description: 'Test planning documents linking releases to testing scope and strategy',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'name', type: 'varchar(255)', nullable: false, description: 'Test plan name' },
      { name: 'description', type: 'text', nullable: true, description: 'Test plan scope and objectives' },
      { name: 'release_id', type: 'uuid', nullable: true, description: 'FK to releases - associated release' },
      { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects' },
      { name: 'status', type: 'test_plan_status_enum', nullable: false, defaultValue: "'draft'", description: 'Plan status: draft, active, completed, archived' },
      { name: 'start_date', type: 'date', nullable: true, description: 'Planned test start date' },
      { name: 'end_date', type: 'date', nullable: true, description: 'Planned test end date' },
      { name: 'owner_id', type: 'uuid', nullable: true, description: 'FK to profiles - plan owner' },
      { name: 'test_strategy', type: 'text', nullable: true, description: 'Testing approach and methodology' },
      { name: 'entry_criteria', type: 'jsonb', nullable: true, description: 'Conditions to start testing' },
      { name: 'exit_criteria', type: 'jsonb', nullable: true, description: 'Conditions to complete testing' },
      { name: 'environment_requirements', type: 'jsonb', nullable: true, description: 'Required test environments' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'release_id', references: { table: 'releases', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'project_id', references: { table: 'projects', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'owner_id', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_test_plans_release', columns: ['release_id'], unique: false, type: 'btree' },
      { name: 'idx_test_plans_project', columns: ['project_id'], unique: false, type: 'btree' },
      { name: 'idx_test_plans_status', columns: ['status'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- TEST CASES TABLE -----
  {
    name: 'test_cases',
    description: 'Individual test case definitions with steps, expected results, and metadata',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'test_case_key', type: 'varchar(50)', nullable: false, description: 'Human-readable key (e.g., TC-001)' },
      { name: 'title', type: 'varchar(500)', nullable: false, description: 'Test case title/summary' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed test case description' },
      { name: 'preconditions', type: 'text', nullable: true, description: 'Required setup before execution' },
      { name: 'steps', type: 'jsonb', nullable: true, description: 'Array of test steps with actions and expected results' },
      { name: 'expected_result', type: 'text', nullable: true, description: 'Overall expected outcome' },
      { name: 'priority', type: 'priority_enum', nullable: false, defaultValue: "'medium'", description: 'Test priority: critical, high, medium, low' },
      { name: 'type', type: 'test_type_enum', nullable: false, defaultValue: "'functional'", description: 'Test type: functional, regression, smoke, integration, e2e' },
      { name: 'status', type: 'test_case_status_enum', nullable: false, defaultValue: "'draft'", description: 'Case status: draft, ready, approved, deprecated' },
      { name: 'automated', type: 'boolean', nullable: false, defaultValue: 'false', description: 'Whether test is automated' },
      { name: 'automation_id', type: 'varchar(255)', nullable: true, description: 'Link to automation framework test ID' },
      { name: 'folder_id', type: 'uuid', nullable: true, description: 'FK to test_folders for organization' },
      { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'FK to profiles - author' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'FK to profiles - assignee' },
      { name: 'estimated_duration', type: 'interval', nullable: true, description: 'Estimated execution time' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Array of tags for categorization' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'folder_id', references: { table: 'test_folders', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'project_id', references: { table: 'projects', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'created_by', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'assigned_to', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_test_cases_key', columns: ['test_case_key'], unique: true, type: 'btree' },
      { name: 'idx_test_cases_project', columns: ['project_id'], unique: false, type: 'btree' },
      { name: 'idx_test_cases_folder', columns: ['folder_id'], unique: false, type: 'btree' },
      { name: 'idx_test_cases_status', columns: ['status'], unique: false, type: 'btree' },
      { name: 'idx_test_cases_tags', columns: ['tags'], unique: false, type: 'gin' },
    ],
    constraints: [],
  },

  // ----- TEST CYCLES TABLE -----
  {
    name: 'tm_test_cycles',
    description: 'Test execution cycles grouping test runs for a release or sprint',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'name', type: 'varchar(255)', nullable: false, description: 'Cycle name (e.g., "Sprint 5 Regression")' },
      { name: 'description', type: 'text', nullable: true, description: 'Cycle scope and objectives' },
      { name: 'release_id', type: 'uuid', nullable: true, description: 'FK to releases' },
      { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects' },
      { name: 'status', type: 'cycle_status_enum', nullable: false, defaultValue: "'not_started'", description: 'Cycle status: not_started, in_progress, completed, cancelled' },
      { name: 'start_date', type: 'date', nullable: true, description: 'Actual start date' },
      { name: 'end_date', type: 'date', nullable: true, description: 'Actual end date' },
      { name: 'planned_start_date', type: 'date', nullable: true, description: 'Planned start date' },
      { name: 'planned_end_date', type: 'date', nullable: true, description: 'Planned end date' },
      { name: 'environment', type: 'varchar(100)', nullable: true, description: 'Test environment (e.g., QA, Staging)' },
      { name: 'build_version', type: 'varchar(100)', nullable: true, description: 'Build/version under test' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'FK to profiles - creator' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'release_id', references: { table: 'releases', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'project_id', references: { table: 'projects', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_test_cycles_release', columns: ['release_id'], unique: false, type: 'btree' },
      { name: 'idx_test_cycles_project', columns: ['project_id'], unique: false, type: 'btree' },
      { name: 'idx_test_cycles_status', columns: ['status'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- TEST RUNS TABLE -----
  {
    name: 'tm_test_runs',
    description: 'Individual test execution instances linking test cases to cycles',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'test_case_id', type: 'uuid', nullable: false, description: 'FK to test_cases' },
      { name: 'cycle_id', type: 'uuid', nullable: false, description: 'FK to tm_test_cycles' },
      { name: 'status', type: 'execution_status_enum', nullable: false, defaultValue: "'not_run'", description: 'Execution status: not_run, passed, failed, blocked, skipped' },
      { name: 'executed_by', type: 'uuid', nullable: true, description: 'FK to profiles - executor' },
      { name: 'executed_at', type: 'timestamptz', nullable: true, description: 'Execution timestamp' },
      { name: 'duration_seconds', type: 'integer', nullable: true, description: 'Actual execution duration' },
      { name: 'notes', type: 'text', nullable: true, description: 'Execution notes and observations' },
      { name: 'step_results', type: 'jsonb', nullable: true, description: 'Per-step pass/fail results' },
      { name: 'attachments', type: 'jsonb', nullable: true, description: 'Array of attachment URLs' },
      { name: 'defect_ids', type: 'uuid[]', nullable: true, description: 'Linked defect IDs' },
      { name: 'environment', type: 'varchar(100)', nullable: true, description: 'Execution environment' },
      { name: 'build_version', type: 'varchar(100)', nullable: true, description: 'Build version tested' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'FK to profiles - assignee' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'test_case_id', references: { table: 'test_cases', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'cycle_id', references: { table: 'tm_test_cycles', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'executed_by', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'assigned_to', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_test_runs_case', columns: ['test_case_id'], unique: false, type: 'btree' },
      { name: 'idx_test_runs_cycle', columns: ['cycle_id'], unique: false, type: 'btree' },
      { name: 'idx_test_runs_status', columns: ['status'], unique: false, type: 'btree' },
      { name: 'idx_test_runs_assigned', columns: ['assigned_to'], unique: false, type: 'btree' },
      { name: 'idx_test_runs_executed', columns: ['executed_at'], unique: false, type: 'btree' },
    ],
    constraints: [
      { name: 'unique_case_per_cycle', type: 'UNIQUE', definition: '(test_case_id, cycle_id)' },
    ],
  },

  // ----- DEFECTS TABLE -----
  {
    name: 'tm_defects',
    description: 'Defect/bug tracking with full lifecycle management',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'defect_key', type: 'varchar(50)', nullable: false, description: 'Human-readable key (e.g., DEF-001)' },
      { name: 'title', type: 'varchar(500)', nullable: false, description: 'Defect summary/title' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed defect description' },
      { name: 'steps_to_reproduce', type: 'jsonb', nullable: true, description: 'Array of reproduction steps' },
      { name: 'expected_result', type: 'text', nullable: true, description: 'Expected behavior' },
      { name: 'actual_result', type: 'text', nullable: true, description: 'Actual observed behavior' },
      { name: 'severity', type: 'severity_enum', nullable: false, defaultValue: "'medium'", description: 'Severity: blocker, critical, major, minor, trivial' },
      { name: 'priority', type: 'priority_enum', nullable: false, defaultValue: "'medium'", description: 'Priority: critical, high, medium, low' },
      { name: 'status', type: 'defect_status_enum', nullable: false, defaultValue: "'open'", description: 'Status: open, in_progress, resolved, closed, reopened, deferred' },
      { name: 'resolution', type: 'resolution_enum', nullable: true, description: 'Resolution: fixed, duplicate, wont_fix, cannot_reproduce, by_design' },
      { name: 'release_id', type: 'uuid', nullable: true, description: 'FK to releases - found in release' },
      { name: 'target_release_id', type: 'uuid', nullable: true, description: 'FK to releases - target fix release' },
      { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects' },
      { name: 'test_run_id', type: 'uuid', nullable: true, description: 'FK to tm_test_runs - source test run' },
      { name: 'reported_by', type: 'uuid', nullable: true, description: 'FK to profiles - reporter' },
      { name: 'assigned_to', type: 'uuid', nullable: true, description: 'FK to profiles - assignee' },
      { name: 'environment', type: 'varchar(100)', nullable: true, description: 'Environment where found' },
      { name: 'browser', type: 'varchar(100)', nullable: true, description: 'Browser/client info' },
      { name: 'os', type: 'varchar(100)', nullable: true, description: 'Operating system' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Tags for categorization' },
      { name: 'attachments', type: 'jsonb', nullable: true, description: 'Array of attachment URLs' },
      { name: 'root_cause', type: 'text', nullable: true, description: 'Root cause analysis' },
      { name: 'fix_description', type: 'text', nullable: true, description: 'Description of fix applied' },
      { name: 'resolved_at', type: 'timestamptz', nullable: true, description: 'Resolution timestamp' },
      { name: 'resolved_by', type: 'uuid', nullable: true, description: 'FK to profiles - resolver' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'release_id', references: { table: 'releases', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'target_release_id', references: { table: 'releases', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'project_id', references: { table: 'projects', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'test_run_id', references: { table: 'tm_test_runs', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_defects_key', columns: ['defect_key'], unique: true, type: 'btree' },
      { name: 'idx_defects_release', columns: ['release_id'], unique: false, type: 'btree' },
      { name: 'idx_defects_project', columns: ['project_id'], unique: false, type: 'btree' },
      { name: 'idx_defects_status', columns: ['status'], unique: false, type: 'btree' },
      { name: 'idx_defects_severity', columns: ['severity'], unique: false, type: 'btree' },
      { name: 'idx_defects_assigned', columns: ['assigned_to'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- QUALITY GATES TABLE -----
  {
    name: 'tm_quality_gates',
    description: 'Quality gate definitions with thresholds and auto-calculation rules',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'name', type: 'varchar(255)', nullable: false, description: 'Gate name (e.g., "Test Pass Rate")' },
      { name: 'description', type: 'text', nullable: true, description: 'Gate description and purpose' },
      { name: 'release_id', type: 'uuid', nullable: false, description: 'FK to releases' },
      { name: 'metric_type', type: 'gate_metric_enum', nullable: false, description: 'Metric: pass_rate, coverage, defect_count, blocker_count, etc.' },
      { name: 'operator', type: 'operator_enum', nullable: false, description: 'Comparison: >=, <=, ==, >, <' },
      { name: 'threshold_value', type: 'numeric(10,2)', nullable: false, description: 'Target threshold value' },
      { name: 'current_value', type: 'numeric(10,2)', nullable: true, description: 'Current calculated value' },
      { name: 'status', type: 'gate_status_enum', nullable: false, defaultValue: "'pending'", description: 'Status: pending, passed, failed, waived' },
      { name: 'is_blocking', type: 'boolean', nullable: false, defaultValue: 'true', description: 'Whether gate blocks release' },
      { name: 'waived_by', type: 'uuid', nullable: true, description: 'FK to profiles - who waived' },
      { name: 'waived_at', type: 'timestamptz', nullable: true, description: 'Waiver timestamp' },
      { name: 'waiver_reason', type: 'text', nullable: true, description: 'Reason for waiver' },
      { name: 'auto_calculate', type: 'boolean', nullable: false, defaultValue: 'true', description: 'Auto-calculate from data' },
      { name: 'calculation_query', type: 'text', nullable: true, description: 'Custom SQL for calculation' },
      { name: 'last_calculated_at', type: 'timestamptz', nullable: true, description: 'Last calculation timestamp' },
      { name: 'order_index', type: 'integer', nullable: false, defaultValue: '0', description: 'Display order' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Last update timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'release_id', references: { table: 'releases', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'waived_by', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_quality_gates_release', columns: ['release_id'], unique: false, type: 'btree' },
      { name: 'idx_quality_gates_status', columns: ['status'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- RELEASE READINESS SNAPSHOTS TABLE -----
  {
    name: 'tm_release_readiness_snapshots',
    description: 'Point-in-time snapshots of release readiness for approval workflow',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'release_id', type: 'uuid', nullable: false, description: 'FK to releases' },
      { name: 'snapshot_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Snapshot timestamp' },
      { name: 'overall_status', type: 'readiness_status_enum', nullable: false, description: 'Status: not_ready, at_risk, ready, approved' },
      { name: 'gates_passed', type: 'integer', nullable: false, defaultValue: '0', description: 'Number of passed gates' },
      { name: 'gates_total', type: 'integer', nullable: false, defaultValue: '0', description: 'Total number of gates' },
      { name: 'blocking_gates_passed', type: 'integer', nullable: false, defaultValue: '0', description: 'Passed blocking gates' },
      { name: 'blocking_gates_total', type: 'integer', nullable: false, defaultValue: '0', description: 'Total blocking gates' },
      { name: 'test_execution_pct', type: 'numeric(5,2)', nullable: false, defaultValue: '0', description: 'Test execution percentage' },
      { name: 'test_pass_pct', type: 'numeric(5,2)', nullable: false, defaultValue: '0', description: 'Test pass percentage' },
      { name: 'open_blockers', type: 'integer', nullable: false, defaultValue: '0', description: 'Open blocker defects' },
      { name: 'open_criticals', type: 'integer', nullable: false, defaultValue: '0', description: 'Open critical defects' },
      { name: 'recommendation', type: 'text', nullable: true, description: 'AI or manual recommendation' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'FK to profiles - snapshot creator' },
      { name: 'approved_by', type: 'uuid', nullable: true, description: 'FK to profiles - approver' },
      { name: 'approved_at', type: 'timestamptz', nullable: true, description: 'Approval timestamp' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'release_id', references: { table: 'releases', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'created_by', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'approved_by', references: { table: 'profiles', column: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_readiness_release', columns: ['release_id'], unique: false, type: 'btree' },
      { name: 'idx_readiness_snapshot_at', columns: ['snapshot_at'], unique: false, type: 'btree' },
    ],
    constraints: [],
  },

  // ----- REQUIREMENT COVERAGE TABLE -----
  {
    name: 'tm_requirement_coverage',
    description: 'Links between requirements/stories and test cases for traceability',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'requirement_id', type: 'uuid', nullable: false, description: 'FK to stories/requirements' },
      { name: 'requirement_type', type: 'varchar(50)', nullable: false, description: 'Type: story, feature, epic' },
      { name: 'test_case_id', type: 'uuid', nullable: false, description: 'FK to test_cases' },
      { name: 'coverage_status', type: 'coverage_status_enum', nullable: false, defaultValue: "'linked'", description: 'Status: linked, verified, gap' },
      { name: 'created_by', type: 'uuid', nullable: true, description: 'FK to profiles' },
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()', description: 'Creation timestamp' },
    ],
    primaryKey: 'id',
    foreignKeys: [
      { column: 'test_case_id', references: { table: 'test_cases', column: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_coverage_requirement', columns: ['requirement_id'], unique: false, type: 'btree' },
      { name: 'idx_coverage_test_case', columns: ['test_case_id'], unique: false, type: 'btree' },
      { name: 'unique_req_case', columns: ['requirement_id', 'test_case_id'], unique: true, type: 'btree' },
    ],
    constraints: [],
  },
];

// ============================================================================
// SECTION 3: DATABASE FUNCTIONS (RPC)
// ============================================================================

export const DATABASE_FUNCTIONS: DbFunctionSpec[] = [
  {
    name: 'tm_get_release_health_score',
    description: 'Calculates overall health score for a release based on test metrics and defects',
    parameters: [
      { name: 'p_release_id', type: 'uuid', description: 'Target release ID' },
    ],
    returnType: 'jsonb',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      ALGORITHM:
      1. Get test execution stats: total, passed, failed, blocked, not_run
      2. Get defect stats: open blockers, open criticals, total open
      3. Get quality gate stats: passed, failed, total
      4. Calculate weighted score:
         - Test pass rate: 40% weight
         - Blocker/Critical defects: 30% weight (penalty)
         - Quality gates: 20% weight
         - Execution coverage: 10% weight
      5. Return health_score (0-100), health_level (healthy/attention/at_risk/critical)
      
      RETURNS:
      {
        "health_score": 85,
        "health_level": "healthy",
        "metrics": {
          "test_pass_rate": 92,
          "execution_coverage": 88,
          "open_blockers": 0,
          "open_criticals": 2,
          "gates_passed": 5,
          "gates_total": 6
        }
      }
    `,
  },
  {
    name: 'tm_get_release_metrics',
    description: 'Retrieves comprehensive metrics for a release',
    parameters: [
      { name: 'p_release_id', type: 'uuid', description: 'Target release ID' },
    ],
    returnType: 'jsonb',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      GATHERS:
      - Total test cases in scope
      - Execution breakdown (passed, failed, blocked, not_run)
      - Defect counts by severity
      - Quality gate statuses
      - Scope items and completion
      - Coverage metrics
      
      RETURNS full ReleaseMetrics object
    `,
  },
  {
    name: 'tm_create_readiness_snapshot',
    description: 'Creates a point-in-time snapshot of release readiness',
    parameters: [
      { name: 'p_release_id', type: 'uuid', description: 'Target release ID' },
      { name: 'p_user_id', type: 'uuid', description: 'Creating user ID' },
      { name: 'p_recommendation', type: 'text', description: 'Optional recommendation text' },
    ],
    returnType: 'uuid',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      PROCESS:
      1. Calculate current quality gate statuses
      2. Calculate test execution percentages
      3. Count open blocker/critical defects
      4. Determine overall_status based on rules:
         - 'ready' if all blocking gates passed, no blockers, >95% execution
         - 'at_risk' if any blocking gate failed OR blockers exist
         - 'not_ready' if <80% execution OR critical failures
      5. Insert snapshot record
      6. Return snapshot ID
    `,
  },
  {
    name: 'tm_approve_release_readiness',
    description: 'Approves a readiness snapshot for release',
    parameters: [
      { name: 'p_snapshot_id', type: 'uuid', description: 'Snapshot to approve' },
      { name: 'p_user_id', type: 'uuid', description: 'Approving user ID' },
    ],
    returnType: 'boolean',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      VALIDATION:
      1. Check snapshot exists and is not already approved
      2. Verify user has approval permissions
      3. Update snapshot with approved_by, approved_at
      4. Update overall_status to 'approved'
      5. Return success boolean
    `,
  },
  {
    name: 'tm_calculate_quality_gates',
    description: 'Recalculates all quality gate values for a release',
    parameters: [
      { name: 'p_release_id', type: 'uuid', description: 'Target release ID' },
    ],
    returnType: 'void',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      FOR EACH gate WHERE auto_calculate = true:
      1. Execute calculation based on metric_type:
         - pass_rate: (passed / total_executed) * 100
         - coverage: (covered_requirements / total_requirements) * 100
         - defect_count: COUNT(*) WHERE severity = X AND status = 'open'
         - blocker_count: COUNT(*) WHERE severity = 'blocker' AND status = 'open'
      2. Update current_value
      3. Compare against threshold using operator
      4. Update status to 'passed' or 'failed'
      5. Update last_calculated_at
    `,
  },
  {
    name: 'tm_get_release_readiness_history',
    description: 'Returns historical readiness snapshots for a release',
    parameters: [
      { name: 'p_release_id', type: 'uuid', description: 'Target release ID' },
    ],
    returnType: 'SETOF tm_release_readiness_snapshots',
    language: 'sql',
    securityDefiner: false,
    purpose: 'Returns all snapshots ordered by snapshot_at DESC',
  },
  {
    name: 'tm_get_command_center_kpis',
    description: 'Returns KPI data for command center dashboard',
    parameters: [
      { name: 'p_project_id', type: 'uuid', description: 'Project ID' },
      { name: 'p_release_id', type: 'uuid', description: 'Optional release filter' },
    ],
    returnType: 'jsonb',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      CALCULATES:
      - Total test cases
      - Execution rate (executed / total)
      - Pass rate (passed / executed)
      - Active defects count
      - Includes trend data vs previous period
      
      RETURNS KPIMetric[] structure
    `,
  },
  {
    name: 'tm_get_defect_trends',
    description: 'Returns defect opened/closed trends over time',
    parameters: [
      { name: 'p_project_id', type: 'uuid', description: 'Project ID' },
      { name: 'p_days', type: 'integer', description: 'Number of days to analyze' },
    ],
    returnType: 'jsonb',
    language: 'plpgsql',
    securityDefiner: true,
    purpose: `
      AGGREGATES daily:
      - opened: COUNT(*) WHERE created_at::date = day
      - closed: COUNT(*) WHERE resolved_at::date = day
      - net: opened - closed (cumulative)
      
      RETURNS DefectTrendPoint[] for charting
    `,
  },
];

// ============================================================================
// SECTION 4: HOOK SPECIFICATIONS
// ============================================================================

export interface HookSpec {
  name: string;
  file: string;
  description: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  returns: { type: string; description: string };
  queryKey: string[];
  dbTables: string[];
  rpcFunctions: string[];
  mutations: MutationSpec[];
  sideEffects: string[];
  errorHandling: string[];
  acceptanceCriteria: string[];
}

export interface MutationSpec {
  name: string;
  description: string;
  parameters: { name: string; type: string }[];
  optimisticUpdate: boolean;
  invalidates: string[];
  onSuccessToast: string;
  onErrorToast: string;
}

export const HOOK_SPECIFICATIONS: HookSpec[] = [
  // ----- useReleases Hook -----
  {
    name: 'useReleases',
    file: 'src/hooks/releases/useReleases.ts',
    description: 'Fetches and manages release list with filtering, sorting, and CRUD operations',
    parameters: [
      { name: 'projectId', type: 'string', required: true, description: 'Project to fetch releases for' },
      { name: 'filters', type: 'ReleaseFilters', required: false, description: 'Optional filter criteria' },
    ],
    returns: {
      type: '{ data: Release[], isLoading, error, refetch }',
      description: 'React Query result with typed release array',
    },
    queryKey: ['releases', 'projectId', 'filters'],
    dbTables: ['releases', 'profiles'],
    rpcFunctions: ['tm_get_release_health_score'],
    mutations: [
      {
        name: 'createRelease',
        description: 'Creates new release with default values',
        parameters: [
          { name: 'version', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'plannedDate', type: 'string' },
          { name: 'projectId', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['releases'],
        onSuccessToast: 'Release created successfully',
        onErrorToast: 'Failed to create release',
      },
      {
        name: 'updateRelease',
        description: 'Updates release properties',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'updates', type: 'Partial<Release>' },
        ],
        optimisticUpdate: true,
        invalidates: ['releases', 'release-detail'],
        onSuccessToast: 'Release updated',
        onErrorToast: 'Failed to update release',
      },
      {
        name: 'deleteRelease',
        description: 'Soft-deletes a release (sets status to cancelled)',
        parameters: [{ name: 'id', type: 'string' }],
        optimisticUpdate: false,
        invalidates: ['releases'],
        onSuccessToast: 'Release deleted',
        onErrorToast: 'Failed to delete release',
      },
    ],
    sideEffects: [
      'Recalculates health scores on status change',
      'Updates related test cycles on release date change',
    ],
    errorHandling: [
      'Catch Supabase errors and throw new Error(error.message)',
      'Validate UUID format before queries',
      'Handle 404 for non-existent release IDs',
    ],
    acceptanceCriteria: [
      'GIVEN a valid project ID, WHEN useReleases is called, THEN returns all releases for that project',
      'GIVEN status filter "in_progress", WHEN applied, THEN only in-progress releases returned',
      'GIVEN a new release is created, WHEN mutation succeeds, THEN releases list is invalidated and refetched',
      'GIVEN release update fails, WHEN error occurs, THEN toast displays error message',
      'GIVEN release with health_score < 50, WHEN rendered, THEN health_level is "critical"',
    ],
  },

  // ----- useReleaseDetail Hook -----
  {
    name: 'useReleaseDetail',
    file: 'src/hooks/releases/useReleaseDetail.ts',
    description: 'Fetches comprehensive release detail including metrics, gates, and team',
    parameters: [
      { name: 'releaseId', type: 'string', required: true, description: 'Release UUID' },
    ],
    returns: {
      type: '{ data: ReleaseDetail, isLoading, error }',
      description: 'Full release detail with computed metrics',
    },
    queryKey: ['release-detail', 'releaseId'],
    dbTables: ['releases', 'tm_quality_gates', 'tm_test_runs', 'tm_defects', 'profiles'],
    rpcFunctions: ['tm_get_release_health_score', 'tm_get_release_metrics'],
    mutations: [],
    sideEffects: [],
    errorHandling: [
      'Return null for invalid/non-existent release ID',
      'Handle permission denied gracefully',
    ],
    acceptanceCriteria: [
      'GIVEN valid release ID, WHEN hook is called, THEN returns complete release with metrics',
      'GIVEN release has quality gates, WHEN fetched, THEN gates included in response',
      'GIVEN release has test runs, WHEN fetched, THEN execution metrics calculated correctly',
      'GIVEN release_manager_id is set, WHEN fetched, THEN manager profile data included',
    ],
  },

  // ----- useTestCases Hook -----
  {
    name: 'useTestCases',
    file: 'src/hooks/test-management/useTestCases.ts',
    description: 'Manages test case repository with folder hierarchy, search, and bulk operations',
    parameters: [
      { name: 'projectId', type: 'string', required: true, description: 'Project ID' },
      { name: 'folderId', type: 'string | null', required: false, description: 'Filter by folder' },
      { name: 'search', type: 'string', required: false, description: 'Search term' },
      { name: 'filters', type: 'TestCaseFilters', required: false, description: 'Additional filters' },
    ],
    returns: {
      type: '{ data: TestCase[], isLoading, error, totalCount }',
      description: 'Paginated test case list with total count',
    },
    queryKey: ['test-cases', 'projectId', 'folderId', 'search', 'filters'],
    dbTables: ['test_cases', 'test_folders', 'profiles'],
    rpcFunctions: [],
    mutations: [
      {
        name: 'createTestCase',
        description: 'Creates new test case in specified folder',
        parameters: [
          { name: 'title', type: 'string' },
          { name: 'folderId', type: 'string | null' },
          { name: 'priority', type: 'Priority' },
          { name: 'type', type: 'TestType' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-cases'],
        onSuccessToast: 'Test case created',
        onErrorToast: 'Failed to create test case',
      },
      {
        name: 'updateTestCase',
        description: 'Updates test case properties',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'updates', type: 'Partial<TestCase>' },
        ],
        optimisticUpdate: true,
        invalidates: ['test-cases', 'test-case-detail'],
        onSuccessToast: 'Test case updated',
        onErrorToast: 'Failed to update test case',
      },
      {
        name: 'bulkUpdateTestCases',
        description: 'Updates multiple test cases at once',
        parameters: [
          { name: 'ids', type: 'string[]' },
          { name: 'updates', type: 'Partial<TestCase>' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-cases'],
        onSuccessToast: 'Updated {count} test cases',
        onErrorToast: 'Failed to update test cases',
      },
      {
        name: 'deleteTestCase',
        description: 'Moves test case to trash (soft delete)',
        parameters: [{ name: 'id', type: 'string' }],
        optimisticUpdate: false,
        invalidates: ['test-cases'],
        onSuccessToast: 'Test case deleted',
        onErrorToast: 'Failed to delete test case',
      },
      {
        name: 'moveTestCases',
        description: 'Moves test cases to different folder',
        parameters: [
          { name: 'ids', type: 'string[]' },
          { name: 'targetFolderId', type: 'string | null' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-cases'],
        onSuccessToast: 'Moved {count} test cases',
        onErrorToast: 'Failed to move test cases',
      },
    ],
    sideEffects: [
      'Auto-generates test_case_key on create (TC-XXXX format)',
      'Updates folder test counts on move',
      'Logs activity for audit trail',
    ],
    errorHandling: [
      'Validate test case key uniqueness before create',
      'Handle concurrent edit conflicts',
      'Validate folder exists before move',
    ],
    acceptanceCriteria: [
      'GIVEN project with test cases, WHEN useTestCases called, THEN returns all cases',
      'GIVEN folder filter, WHEN applied, THEN only cases in that folder returned',
      'GIVEN search term "login", WHEN applied, THEN cases with "login" in title/description returned',
      'GIVEN bulk select 5 cases, WHEN bulk update priority, THEN all 5 updated atomically',
      'GIVEN test case with steps, WHEN updated, THEN steps preserved correctly',
      'GIVEN new test case created, WHEN saved, THEN auto-generated key is unique',
    ],
  },

  // ----- useTestCycles Hook -----
  {
    name: 'useTestCycles',
    file: 'src/hooks/test-management/useTestCycles.ts',
    description: 'Manages test execution cycles with progress tracking',
    parameters: [
      { name: 'projectId', type: 'string', required: true, description: 'Project ID' },
      { name: 'releaseId', type: 'string | null', required: false, description: 'Filter by release' },
    ],
    returns: {
      type: '{ data: TestCycle[], isLoading, error }',
      description: 'Test cycles with computed progress',
    },
    queryKey: ['test-cycles', 'projectId', 'releaseId'],
    dbTables: ['tm_test_cycles', 'tm_test_runs', 'releases'],
    rpcFunctions: [],
    mutations: [
      {
        name: 'createCycle',
        description: 'Creates new test cycle',
        parameters: [
          { name: 'name', type: 'string' },
          { name: 'releaseId', type: 'string | null' },
          { name: 'plannedStartDate', type: 'string' },
          { name: 'plannedEndDate', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-cycles'],
        onSuccessToast: 'Test cycle created',
        onErrorToast: 'Failed to create cycle',
      },
      {
        name: 'addTestsToCycle',
        description: 'Adds test cases to cycle creating test runs',
        parameters: [
          { name: 'cycleId', type: 'string' },
          { name: 'testCaseIds', type: 'string[]' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-cycles', 'test-runs'],
        onSuccessToast: 'Added {count} tests to cycle',
        onErrorToast: 'Failed to add tests',
      },
      {
        name: 'startCycle',
        description: 'Transitions cycle to in_progress',
        parameters: [{ name: 'cycleId', type: 'string' }],
        optimisticUpdate: true,
        invalidates: ['test-cycles'],
        onSuccessToast: 'Cycle started',
        onErrorToast: 'Failed to start cycle',
      },
      {
        name: 'completeCycle',
        description: 'Completes cycle and locks further execution',
        parameters: [{ name: 'cycleId', type: 'string' }],
        optimisticUpdate: true,
        invalidates: ['test-cycles'],
        onSuccessToast: 'Cycle completed',
        onErrorToast: 'Failed to complete cycle',
      },
    ],
    sideEffects: [
      'Sets start_date when status changes to in_progress',
      'Sets end_date when status changes to completed',
      'Triggers quality gate recalculation on completion',
    ],
    errorHandling: [
      'Prevent adding duplicate test cases to same cycle',
      'Validate cycle is not completed before modifications',
    ],
    acceptanceCriteria: [
      'GIVEN release with cycles, WHEN filtered by release, THEN only those cycles returned',
      'GIVEN cycle with 100 test runs, WHEN fetched, THEN progress calculated correctly',
      'GIVEN completed cycle, WHEN user tries to add tests, THEN error thrown',
      'GIVEN cycle started, WHEN fetched, THEN start_date is set',
    ],
  },

  // ----- useTestExecution Hook -----
  {
    name: 'useTestExecution',
    file: 'src/hooks/test-management/useTestExecution.ts',
    description: 'Manages individual test run execution with step-by-step tracking',
    parameters: [
      { name: 'testRunId', type: 'string', required: true, description: 'Test run UUID' },
    ],
    returns: {
      type: '{ data: TestRun, testCase: TestCase, isLoading, error }',
      description: 'Test run with associated test case details',
    },
    queryKey: ['test-run', 'testRunId'],
    dbTables: ['tm_test_runs', 'test_cases', 'tm_defects'],
    rpcFunctions: [],
    mutations: [
      {
        name: 'updateRunStatus',
        description: 'Updates test run execution status',
        parameters: [
          { name: 'status', type: 'ExecutionStatus' },
          { name: 'notes', type: 'string | null' },
        ],
        optimisticUpdate: true,
        invalidates: ['test-run', 'test-runs', 'test-cycles'],
        onSuccessToast: 'Status updated',
        onErrorToast: 'Failed to update status',
      },
      {
        name: 'updateStepResult',
        description: 'Updates individual step pass/fail status',
        parameters: [
          { name: 'stepIndex', type: 'number' },
          { name: 'status', type: 'StepStatus' },
          { name: 'notes', type: 'string | null' },
        ],
        optimisticUpdate: true,
        invalidates: ['test-run'],
        onSuccessToast: '',
        onErrorToast: 'Failed to update step',
      },
      {
        name: 'linkDefect',
        description: 'Links existing defect to test run',
        parameters: [{ name: 'defectId', type: 'string' }],
        optimisticUpdate: false,
        invalidates: ['test-run'],
        onSuccessToast: 'Defect linked',
        onErrorToast: 'Failed to link defect',
      },
      {
        name: 'createAndLinkDefect',
        description: 'Creates new defect from failed test and links it',
        parameters: [
          { name: 'title', type: 'string' },
          { name: 'severity', type: 'Severity' },
          { name: 'description', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-run', 'defects'],
        onSuccessToast: 'Defect created and linked',
        onErrorToast: 'Failed to create defect',
      },
      {
        name: 'addAttachment',
        description: 'Uploads and attaches file to test run',
        parameters: [
          { name: 'file', type: 'File' },
          { name: 'type', type: 'screenshot | video | log' },
        ],
        optimisticUpdate: false,
        invalidates: ['test-run'],
        onSuccessToast: 'Attachment added',
        onErrorToast: 'Failed to upload attachment',
      },
    ],
    sideEffects: [
      'Sets executed_at timestamp when status changes from not_run',
      'Sets executed_by to current user',
      'Calculates duration_seconds from start to completion',
      'Auto-sets status to failed if any step fails',
    ],
    errorHandling: [
      'Validate test run exists and is accessible',
      'Handle file upload failures gracefully',
      'Prevent status changes on completed cycles',
    ],
    acceptanceCriteria: [
      'GIVEN test run not_run, WHEN user sets to passed, THEN executed_at and executed_by set',
      'GIVEN test case with 5 steps, WHEN step 3 fails, THEN overall status becomes failed',
      'GIVEN failed step, WHEN defect created, THEN step notes pre-populate defect description',
      'GIVEN execution in progress, WHEN screenshot attached, THEN visible in attachments',
      'GIVEN blocked status set, WHEN notes required, THEN validation enforces notes',
    ],
  },

  // ----- useDefects Hook -----
  {
    name: 'useDefects',
    file: 'src/hooks/defects/useDefects.ts',
    description: 'Manages defect tracking with workflow transitions and filtering',
    parameters: [
      { name: 'projectId', type: 'string', required: true, description: 'Project ID' },
      { name: 'filters', type: 'DefectFilters', required: false, description: 'Filter criteria' },
    ],
    returns: {
      type: '{ data: Defect[], isLoading, error, totalCount }',
      description: 'Filtered defect list with counts',
    },
    queryKey: ['defects', 'projectId', 'filters'],
    dbTables: ['tm_defects', 'releases', 'profiles', 'tm_test_runs'],
    rpcFunctions: [],
    mutations: [
      {
        name: 'createDefect',
        description: 'Creates new defect with auto-generated key',
        parameters: [
          { name: 'title', type: 'string' },
          { name: 'severity', type: 'Severity' },
          { name: 'priority', type: 'Priority' },
          { name: 'description', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['defects'],
        onSuccessToast: 'Defect {key} created',
        onErrorToast: 'Failed to create defect',
      },
      {
        name: 'updateDefect',
        description: 'Updates defect properties',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'updates', type: 'Partial<Defect>' },
        ],
        optimisticUpdate: true,
        invalidates: ['defects', 'defect-detail'],
        onSuccessToast: 'Defect updated',
        onErrorToast: 'Failed to update defect',
      },
      {
        name: 'transitionStatus',
        description: 'Transitions defect through workflow states',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'newStatus', type: 'DefectStatus' },
          { name: 'resolution', type: 'Resolution | null' },
        ],
        optimisticUpdate: false,
        invalidates: ['defects', 'defect-detail'],
        onSuccessToast: 'Status changed to {status}',
        onErrorToast: 'Failed to change status',
      },
      {
        name: 'assignDefect',
        description: 'Assigns defect to team member',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'assigneeId', type: 'string' },
        ],
        optimisticUpdate: true,
        invalidates: ['defects'],
        onSuccessToast: 'Defect assigned',
        onErrorToast: 'Failed to assign defect',
      },
    ],
    sideEffects: [
      'Auto-generates defect_key (DEF-YYYY-XXXX format)',
      'Sets resolved_at and resolved_by when status changes to resolved/closed',
      'Logs all status transitions to defect_history',
      'Triggers quality gate recalculation on blocker/critical changes',
    ],
    errorHandling: [
      'Validate workflow transitions (cannot go from closed to in_progress directly)',
      'Require resolution when closing defect',
    ],
    acceptanceCriteria: [
      'GIVEN defects in project, WHEN filtered by severity blocker, THEN only blockers returned',
      'GIVEN new defect created, WHEN saved, THEN unique key generated',
      'GIVEN defect resolved, WHEN closed, THEN resolved_at timestamp set',
      'GIVEN defect assigned, WHEN saved, THEN assignee notification sent',
      'GIVEN workflow rules, WHEN invalid transition attempted, THEN error thrown',
    ],
  },

  // ----- useQualityGates Hook -----
  {
    name: 'useQualityGates',
    file: 'src/hooks/releases/useQualityGates.ts',
    description: 'Manages quality gates for releases with auto-calculation',
    parameters: [
      { name: 'releaseId', type: 'string', required: true, description: 'Release ID' },
    ],
    returns: {
      type: '{ data: QualityGate[], isLoading, error }',
      description: 'Quality gates with current values and statuses',
    },
    queryKey: ['quality-gates', 'releaseId'],
    dbTables: ['tm_quality_gates', 'releases'],
    rpcFunctions: ['tm_calculate_quality_gates'],
    mutations: [
      {
        name: 'createGate',
        description: 'Creates new quality gate',
        parameters: [
          { name: 'name', type: 'string' },
          { name: 'metricType', type: 'GateMetricType' },
          { name: 'operator', type: 'Operator' },
          { name: 'thresholdValue', type: 'number' },
          { name: 'isBlocking', type: 'boolean' },
        ],
        optimisticUpdate: false,
        invalidates: ['quality-gates'],
        onSuccessToast: 'Quality gate created',
        onErrorToast: 'Failed to create gate',
      },
      {
        name: 'updateGate',
        description: 'Updates gate configuration',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'updates', type: 'Partial<QualityGate>' },
        ],
        optimisticUpdate: true,
        invalidates: ['quality-gates'],
        onSuccessToast: 'Gate updated',
        onErrorToast: 'Failed to update gate',
      },
      {
        name: 'waiveGate',
        description: 'Waives a failed quality gate with justification',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'reason', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['quality-gates', 'release-readiness'],
        onSuccessToast: 'Gate waived',
        onErrorToast: 'Failed to waive gate',
      },
      {
        name: 'recalculateGates',
        description: 'Triggers recalculation of all auto-calculate gates',
        parameters: [],
        optimisticUpdate: false,
        invalidates: ['quality-gates'],
        onSuccessToast: 'Gates recalculated',
        onErrorToast: 'Failed to recalculate',
      },
    ],
    sideEffects: [
      'Auto-recalculate on test execution changes',
      'Auto-recalculate on defect status changes',
      'Records waiver audit trail',
    ],
    errorHandling: [
      'Validate threshold is positive number',
      'Require reason for waiver',
    ],
    acceptanceCriteria: [
      'GIVEN release with gates, WHEN fetched, THEN all gates returned with current values',
      'GIVEN gate with auto_calculate=true, WHEN recalculate triggered, THEN value updated',
      'GIVEN gate threshold 95%, current 90%, WHEN evaluated, THEN status is failed',
      'GIVEN blocking gate failed, WHEN waived with reason, THEN status changes to waived',
      'GIVEN gate order_index, WHEN displayed, THEN gates sorted by order_index',
    ],
  },

  // ----- useReleaseReadiness Hook -----
  {
    name: 'useReleaseReadiness',
    file: 'src/hooks/releases/useReleaseReadiness.ts',
    description: 'Manages release readiness snapshots and approval workflow',
    parameters: [
      { name: 'releaseId', type: 'string', required: true, description: 'Release ID' },
    ],
    returns: {
      type: '{ data: ReadinessSnapshot[], latest: ReadinessSnapshot, isLoading }',
      description: 'Historical snapshots with latest for current status',
    },
    queryKey: ['release-readiness', 'releaseId'],
    dbTables: ['tm_release_readiness_snapshots', 'releases', 'profiles'],
    rpcFunctions: ['tm_create_readiness_snapshot', 'tm_approve_release_readiness', 'tm_get_release_readiness_history'],
    mutations: [
      {
        name: 'createSnapshot',
        description: 'Creates point-in-time readiness snapshot',
        parameters: [
          { name: 'recommendation', type: 'string | null' },
        ],
        optimisticUpdate: false,
        invalidates: ['release-readiness'],
        onSuccessToast: 'Readiness snapshot created',
        onErrorToast: 'Failed to create snapshot',
      },
      {
        name: 'approveRelease',
        description: 'Approves release based on latest snapshot',
        parameters: [
          { name: 'snapshotId', type: 'string' },
        ],
        optimisticUpdate: false,
        invalidates: ['release-readiness', 'releases'],
        onSuccessToast: 'Release approved for deployment',
        onErrorToast: 'Failed to approve release',
      },
    ],
    sideEffects: [
      'Snapshot captures current state of all metrics',
      'Approval updates release status to approved/ready',
    ],
    errorHandling: [
      'Validate user has approval permissions',
      'Prevent approval if blocking gates failed (unless waived)',
    ],
    acceptanceCriteria: [
      'GIVEN release, WHEN snapshot created, THEN captures current test/defect metrics',
      'GIVEN snapshot with blockers=0, WHEN evaluated, THEN overall_status is ready',
      'GIVEN snapshot approved, WHEN fetched, THEN approved_by and approved_at populated',
      'GIVEN approval attempted by non-approver, WHEN submitted, THEN error thrown',
    ],
  },

  // ----- useCommandCenterKPIs Hook -----
  {
    name: 'useCommandCenterKPIs',
    file: 'src/modules/command-center/hooks/useCommandCenterKPIs.ts',
    description: 'Fetches KPI metrics for command center dashboard with trends',
    parameters: [
      { name: 'projectId', type: 'string', required: true, description: 'Project ID' },
      { name: 'releaseId', type: 'string | null', required: false, description: 'Optional release filter' },
    ],
    returns: {
      type: '{ data: KPIMetric[], isLoading, error }',
      description: 'Array of KPI metrics with trends',
    },
    queryKey: ['command-center-kpis', 'projectId', 'releaseId'],
    dbTables: ['test_cases', 'tm_test_runs', 'tm_defects'],
    rpcFunctions: ['tm_get_command_center_kpis'],
    mutations: [],
    sideEffects: [],
    errorHandling: ['Handle empty data gracefully with zero defaults'],
    acceptanceCriteria: [
      'GIVEN project with test data, WHEN KPIs fetched, THEN 4 metrics returned',
      'GIVEN 100 tests / 80 passed, WHEN pass rate calculated, THEN shows 80%',
      'GIVEN previous period had 70% pass rate, WHEN trend calculated, THEN shows +10% up',
      'GIVEN release filter, WHEN applied, THEN KPIs scoped to that release only',
    ],
  },
];

// ============================================================================
// SECTION 5: COMPONENT SPECIFICATIONS
// ============================================================================

export interface ComponentSpec {
  name: string;
  file: string;
  description: string;
  props: PropSpec[];
  state: StateSpec[];
  hooks: string[];
  events: EventSpec[];
  children: string[];
  styling: string[];
  accessibility: string[];
  acceptanceCriteria: string[];
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface StateSpec {
  name: string;
  type: string;
  initial: string;
  description: string;
}

export interface EventSpec {
  name: string;
  payload: string;
  description: string;
}

export const COMPONENT_SPECIFICATIONS: ComponentSpec[] = [
  // ----- ReleaseCard Component -----
  {
    name: 'ReleaseCard',
    file: 'src/features/all-releases/components/ReleaseCard.tsx',
    description: 'Displays release summary with health indicator, metrics, and actions',
    props: [
      { name: 'release', type: 'Release', required: true, description: 'Release data object' },
      { name: 'onClick', type: '(id: string) => void', required: false, description: 'Card click handler' },
      { name: 'onEdit', type: '(id: string) => void', required: false, description: 'Edit action handler' },
      { name: 'compact', type: 'boolean', required: false, default: 'false', description: 'Compact display mode' },
    ],
    state: [
      { name: 'isHovered', type: 'boolean', initial: 'false', description: 'Hover state for animations' },
    ],
    hooks: [],
    events: [
      { name: 'onClick', payload: 'string (releaseId)', description: 'Navigates to release detail' },
      { name: 'onEdit', payload: 'string (releaseId)', description: 'Opens edit modal' },
    ],
    children: ['HealthIndicator', 'MetricsBadge', 'ProgressBar', 'Avatar'],
    styling: [
      'Card with shadow-sm hover:shadow-md transition',
      'Health-based border-left color (green/yellow/orange/red)',
      'Responsive grid layout for metrics',
    ],
    accessibility: [
      'role="article"',
      'aria-label describing release name and status',
      'Keyboard navigable with Enter to click',
    ],
    acceptanceCriteria: [
      'GIVEN release data, WHEN rendered, THEN shows version, name, planned date',
      'GIVEN health_level critical, WHEN rendered, THEN border is red',
      'GIVEN compact=true, WHEN rendered, THEN metrics hidden',
      'GIVEN onClick handler, WHEN card clicked, THEN handler called with releaseId',
    ],
  },

  // ----- TestCaseTable Component -----
  {
    name: 'TestCaseTable',
    file: 'src/components/test-cases/TestCaseTable.tsx',
    description: 'Data table for test cases with sorting, filtering, and bulk selection',
    props: [
      { name: 'testCases', type: 'TestCase[]', required: true, description: 'Test cases to display' },
      { name: 'isLoading', type: 'boolean', required: false, default: 'false', description: 'Loading state' },
      { name: 'onSelect', type: '(ids: string[]) => void', required: false, description: 'Selection change handler' },
      { name: 'onRowClick', type: '(id: string) => void', required: false, description: 'Row click handler' },
      { name: 'selectedIds', type: 'string[]', required: false, default: '[]', description: 'Currently selected IDs' },
    ],
    state: [
      { name: 'sortColumn', type: 'string', initial: 'created_at', description: 'Current sort column' },
      { name: 'sortDirection', type: 'asc | desc', initial: 'desc', description: 'Sort direction' },
      { name: 'columnWidths', type: 'Record<string, number>', initial: '{}', description: 'Resizable column widths' },
    ],
    hooks: ['useVirtualizer (for large lists)'],
    events: [
      { name: 'onSelect', payload: 'string[]', description: 'Called when selection changes' },
      { name: 'onSort', payload: '{ column: string, direction: string }', description: 'Sort change' },
    ],
    children: ['Checkbox', 'PriorityBadge', 'StatusBadge', 'Avatar'],
    styling: [
      'Virtualized rows for performance (1000+ items)',
      'Resizable columns with min/max widths',
      'Sticky header on scroll',
      'Row hover highlighting',
    ],
    accessibility: [
      'role="table" with proper row/cell roles',
      'aria-selected for selected rows',
      'Keyboard navigation between rows',
      'Screen reader announces sort state',
    ],
    acceptanceCriteria: [
      'GIVEN 1000 test cases, WHEN rendered, THEN virtualizes rows for performance',
      'GIVEN header clicked, WHEN sortable, THEN toggles sort direction',
      'GIVEN checkbox clicked, WHEN row selected, THEN onSelect called with updated IDs',
      'GIVEN Shift+Click on row, WHEN another selected, THEN range selection applied',
      'GIVEN column resized, WHEN released, THEN width persisted to state',
    ],
  },

  // ----- ExecutionRunner Component -----
  {
    name: 'ExecutionRunner',
    file: 'src/components/test-execution/ExecutionRunner.tsx',
    description: 'Full-screen test execution interface with step-by-step workflow',
    props: [
      { name: 'testRunId', type: 'string', required: true, description: 'Test run to execute' },
      { name: 'onComplete', type: '() => void', required: false, description: 'Callback when execution completes' },
      { name: 'onExit', type: '() => void', required: true, description: 'Exit execution mode' },
    ],
    state: [
      { name: 'currentStepIndex', type: 'number', initial: '0', description: 'Active step index' },
      { name: 'stepResults', type: 'StepResult[]', initial: '[]', description: 'Per-step results' },
      { name: 'notes', type: 'string', initial: "''", description: 'Execution notes' },
      { name: 'isSubmitting', type: 'boolean', initial: 'false', description: 'Submit in progress' },
      { name: 'elapsedTime', type: 'number', initial: '0', description: 'Execution timer (seconds)' },
    ],
    hooks: ['useTestExecution', 'useTimer', 'useKeyboardShortcuts'],
    events: [
      { name: 'onStepPass', payload: 'stepIndex', description: 'Mark step as passed' },
      { name: 'onStepFail', payload: 'stepIndex', description: 'Mark step as failed' },
      { name: 'onComplete', payload: 'ExecutionResult', description: 'Finalize execution' },
      { name: 'onCreateDefect', payload: 'DefectDraft', description: 'Create defect from failure' },
    ],
    children: ['StepCard', 'ResultButtons', 'NotesEditor', 'AttachmentUploader', 'DefectQuickCreate'],
    styling: [
      'Full-screen overlay with exit button',
      'Split view: steps list left, current step detail right',
      'Progress indicator showing completed steps',
      'Timer display in header',
    ],
    accessibility: [
      'Focus trapped within runner',
      'Keyboard shortcuts: P=Pass, F=Fail, N=Next, B=Back',
      'Screen reader announces step transitions',
    ],
    acceptanceCriteria: [
      'GIVEN test with 5 steps, WHEN runner opens, THEN first step active',
      'GIVEN step marked passed, WHEN P pressed, THEN advances to next step',
      'GIVEN step marked failed, WHEN confirmed, THEN prompts for defect creation',
      'GIVEN all steps complete, WHEN finished, THEN overall status determined',
      'GIVEN execution in progress, WHEN timer runs, THEN elapsed time updates',
      'GIVEN escape pressed, WHEN runner active, THEN confirms before exit',
    ],
  },

  // ----- QualityGatePanel Component -----
  {
    name: 'QualityGatePanel',
    file: 'src/components/releases/QualityGatePanel.tsx',
    description: 'Displays quality gates with status indicators and waiver capability',
    props: [
      { name: 'releaseId', type: 'string', required: true, description: 'Release ID' },
      { name: 'canWaive', type: 'boolean', required: false, default: 'false', description: 'User can waive gates' },
      { name: 'compact', type: 'boolean', required: false, default: 'false', description: 'Compact display' },
    ],
    state: [
      { name: 'waiverModalOpen', type: 'boolean', initial: 'false', description: 'Waiver modal visibility' },
      { name: 'selectedGateId', type: 'string | null', initial: 'null', description: 'Gate being waived' },
    ],
    hooks: ['useQualityGates'],
    events: [
      { name: 'onWaive', payload: '{ gateId: string, reason: string }', description: 'Gate waiver submitted' },
      { name: 'onRecalculate', payload: 'void', description: 'Trigger gate recalculation' },
    ],
    children: ['GateCard', 'WaiverModal', 'ProgressRing'],
    styling: [
      'Grid of gate cards with status colors',
      'Progress ring showing passed/total',
      'Blocking gates highlighted differently',
    ],
    accessibility: [
      'Gate status announced to screen readers',
      'Modal focus management',
    ],
    acceptanceCriteria: [
      'GIVEN 5 gates, 3 passed, WHEN rendered, THEN shows 3/5 in summary',
      'GIVEN failed gate, WHEN displayed, THEN shows red status indicator',
      'GIVEN canWaive=true, WHEN failed gate clicked, THEN waiver option shown',
      'GIVEN waiver submitted, WHEN confirmed, THEN gate status changes to waived',
    ],
  },
];

// ============================================================================
// SECTION 6: BUSINESS RULES
// ============================================================================

export interface BusinessRule {
  id: string;
  category: string;
  name: string;
  description: string;
  conditions: string[];
  actions: string[];
  exceptions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export const BUSINESS_RULES: BusinessRule[] = [
  // ----- Release Lifecycle Rules -----
  {
    id: 'BUS-001',
    category: 'Release Lifecycle',
    name: 'Release Status Transitions',
    description: 'Valid state transitions for release status',
    conditions: [
      'Release status can only transition through defined workflow',
    ],
    actions: [
      'planning → in_progress: Allowed when at least one test cycle created',
      'in_progress → testing: Allowed when test execution started',
      'testing → staging: Allowed when all blocking gates passed',
      'staging → released: Allowed when approved by release manager',
      'Any status → cancelled: Always allowed with reason',
    ],
    exceptions: [
      'Admin can force any transition with audit log',
    ],
    priority: 'critical',
  },
  {
    id: 'BUS-002',
    category: 'Release Lifecycle',
    name: 'Release Health Score Calculation',
    description: 'Algorithm for calculating release health score (0-100)',
    conditions: [
      'Score calculated from test metrics, defects, and gates',
    ],
    actions: [
      'Test Pass Rate contribution: (passed/executed) * 40',
      'Defect penalty: -5 per blocker, -3 per critical, -1 per major',
      'Gate contribution: (passed_gates/total_gates) * 20',
      'Execution coverage: (executed/total) * 10',
      'Score capped at 0 minimum, 100 maximum',
    ],
    exceptions: [
      'Cancelled releases excluded from health calculation',
    ],
    priority: 'high',
  },
  {
    id: 'BUS-003',
    category: 'Release Lifecycle',
    name: 'Health Level Thresholds',
    description: 'Mapping health score to health level',
    conditions: [],
    actions: [
      'score >= 80: healthy (green)',
      'score >= 60: attention (yellow)',
      'score >= 40: at_risk (orange)',
      'score < 40: critical (red)',
    ],
    exceptions: [],
    priority: 'high',
  },

  // ----- Test Execution Rules -----
  {
    id: 'BUS-010',
    category: 'Test Execution',
    name: 'Execution Status Determination',
    description: 'How overall test run status is determined from steps',
    conditions: [
      'Test case has defined steps with expected results',
    ],
    actions: [
      'All steps passed → overall status: passed',
      'Any step failed → overall status: failed',
      'Any step blocked (no failures) → overall status: blocked',
      'No steps executed → overall status: not_run',
      'User can override with notes and justification',
    ],
    exceptions: [
      'Tests without steps use manual status selection',
    ],
    priority: 'high',
  },
  {
    id: 'BUS-011',
    category: 'Test Execution',
    name: 'Execution Locking',
    description: 'When test execution is locked',
    conditions: [
      'Test cycle status determines execution availability',
    ],
    actions: [
      'Cycle not_started: Execution not allowed',
      'Cycle in_progress: Execution allowed',
      'Cycle completed: Execution locked, view only',
      'Cycle cancelled: Execution locked, view only',
    ],
    exceptions: [
      'Admin can unlock completed cycles for corrections',
    ],
    priority: 'critical',
  },
  {
    id: 'BUS-012',
    category: 'Test Execution',
    name: 'Defect Auto-Linking',
    description: 'Automatic defect linking on test failure',
    conditions: [
      'Test run status changed to failed',
      'Step results indicate failure point',
    ],
    actions: [
      'Prompt user to create or link defect',
      'If created, pre-populate: title from step, environment from run',
      'Auto-link defect to test run',
      'Set defect source_test_run_id',
    ],
    exceptions: [
      'User can skip defect creation',
    ],
    priority: 'medium',
  },

  // ----- Defect Rules -----
  {
    id: 'BUS-020',
    category: 'Defect Management',
    name: 'Defect Workflow Transitions',
    description: 'Valid defect status transitions',
    conditions: [],
    actions: [
      'open → in_progress: When developer starts work',
      'in_progress → resolved: When fix applied',
      'resolved → closed: When verified by QA',
      'resolved → reopened: When verification fails',
      'open → deferred: With target release assignment',
      'reopened → in_progress: When rework starts',
    ],
    exceptions: [
      'duplicate status can be set from any state',
    ],
    priority: 'high',
  },
  {
    id: 'BUS-021',
    category: 'Defect Management',
    name: 'Resolution Required',
    description: 'Resolution field requirements',
    conditions: [
      'Defect status changed to resolved or closed',
    ],
    actions: [
      'resolution field becomes required',
      'Valid resolutions: fixed, duplicate, wont_fix, cannot_reproduce, by_design',
      'If duplicate: duplicate_of_id required',
    ],
    exceptions: [],
    priority: 'high',
  },
  {
    id: 'BUS-022',
    category: 'Defect Management',
    name: 'SLA Tracking',
    description: 'SLA calculation based on severity',
    conditions: [
      'Defect has severity assigned',
    ],
    actions: [
      'Blocker: 4 hour response, 24 hour resolution',
      'Critical: 8 hour response, 48 hour resolution',
      'Major: 24 hour response, 1 week resolution',
      'Minor: 48 hour response, 2 week resolution',
      'SLA breach triggers notification to assignee and manager',
    ],
    exceptions: [
      'Weekends excluded from SLA calculation',
    ],
    priority: 'medium',
  },

  // ----- Quality Gate Rules -----
  {
    id: 'BUS-030',
    category: 'Quality Gates',
    name: 'Gate Evaluation',
    description: 'How quality gates are evaluated',
    conditions: [
      'Gate has metric_type, operator, and threshold defined',
      'auto_calculate is true',
    ],
    actions: [
      'Fetch current value based on metric_type query',
      'Compare: current_value [operator] threshold_value',
      'If comparison true: status = passed',
      'If comparison false: status = failed',
      'Update last_calculated_at timestamp',
    ],
    exceptions: [
      'Waived gates retain waived status regardless of calculation',
    ],
    priority: 'critical',
  },
  {
    id: 'BUS-031',
    category: 'Quality Gates',
    name: 'Blocking Gate Enforcement',
    description: 'How blocking gates affect release',
    conditions: [
      'Gate has is_blocking = true',
    ],
    actions: [
      'Blocking gate failed: Release cannot transition to staging',
      'Blocking gate waived: Release can proceed with audit trail',
      'All blocking gates passed: Release can transition',
    ],
    exceptions: [
      'Release manager can override with documented justification',
    ],
    priority: 'critical',
  },

  // ----- Coverage Rules -----
  {
    id: 'BUS-040',
    category: 'Coverage',
    name: 'Requirement Coverage Calculation',
    description: 'How requirement coverage is calculated',
    conditions: [],
    actions: [
      'Covered: Requirement has at least one linked test case',
      'Executed: Linked test case has been executed in current release',
      'Verified: Linked test case passed in current release',
      'Coverage % = (covered requirements / total requirements) * 100',
    ],
    exceptions: [
      'Deprecated requirements excluded from calculation',
    ],
    priority: 'high',
  },
];

// ============================================================================
// SECTION 7: API CONTRACTS (Edge Functions)
// ============================================================================

export interface EdgeFunctionSpec {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  authentication: 'required' | 'optional' | 'none';
  requestBody?: {
    contentType: string;
    schema: Record<string, { type: string; required: boolean; description: string }>;
  };
  queryParams?: Record<string, { type: string; required: boolean; description: string }>;
  responseBody: {
    success: { status: number; schema: Record<string, unknown> };
    errors: { status: number; description: string }[];
  };
  rateLimiting?: { requests: number; windowSeconds: number };
  permissions: string[];
}

export const EDGE_FUNCTION_SPECS: EdgeFunctionSpec[] = [
  {
    name: 'generate-test-cases',
    path: '/functions/v1/generate-test-cases',
    method: 'POST',
    description: 'AI-powered test case generation from requirements',
    authentication: 'required',
    requestBody: {
      contentType: 'application/json',
      schema: {
        requirement_text: { type: 'string', required: true, description: 'Requirement to generate tests for' },
        requirement_id: { type: 'string', required: false, description: 'Optional requirement ID to link' },
        count: { type: 'number', required: false, description: 'Number of test cases to generate (default: 5)' },
        test_type: { type: 'string', required: false, description: 'Type of tests: functional, edge_case, negative' },
        project_id: { type: 'string', required: true, description: 'Project to create tests in' },
      },
    },
    responseBody: {
      success: {
        status: 200,
        schema: {
          test_cases: 'TestCase[]',
          created_count: 'number',
        },
      },
      errors: [
        { status: 400, description: 'Invalid request body' },
        { status: 401, description: 'Unauthorized' },
        { status: 429, description: 'Rate limit exceeded' },
        { status: 500, description: 'AI generation failed' },
      ],
    },
    rateLimiting: { requests: 10, windowSeconds: 60 },
    permissions: ['test_case.create'],
  },
  {
    name: 'analyze-release-risk',
    path: '/functions/v1/analyze-release-risk',
    method: 'POST',
    description: 'AI analysis of release readiness and risk factors',
    authentication: 'required',
    requestBody: {
      contentType: 'application/json',
      schema: {
        release_id: { type: 'string', required: true, description: 'Release to analyze' },
        include_recommendations: { type: 'boolean', required: false, description: 'Include AI recommendations' },
      },
    },
    responseBody: {
      success: {
        status: 200,
        schema: {
          risk_score: 'number (0-100)',
          risk_level: 'low | medium | high | critical',
          risk_factors: 'RiskFactor[]',
          recommendations: 'Recommendation[]',
          summary: 'string',
        },
      },
      errors: [
        { status: 400, description: 'Invalid release ID' },
        { status: 404, description: 'Release not found' },
      ],
    },
    rateLimiting: { requests: 20, windowSeconds: 60 },
    permissions: ['release.read'],
  },
];

// ============================================================================
// SECTION 8: DATA FLOW SPECIFICATIONS
// ============================================================================

export interface DataFlowSpec {
  name: string;
  trigger: string;
  steps: DataFlowStep[];
  outcome: string;
}

export interface DataFlowStep {
  order: number;
  action: string;
  actor: 'user' | 'frontend' | 'database' | 'edge_function' | 'realtime';
  details: string;
}

export const DATA_FLOWS: DataFlowSpec[] = [
  {
    name: 'Test Execution Flow',
    trigger: 'User opens test execution runner',
    steps: [
      { order: 1, action: 'Load test run', actor: 'frontend', details: 'useTestExecution fetches test run by ID' },
      { order: 2, action: 'Fetch test case', actor: 'database', details: 'Join to test_cases for steps and expected results' },
      { order: 3, action: 'Display runner', actor: 'frontend', details: 'ExecutionRunner renders with steps' },
      { order: 4, action: 'Start timer', actor: 'frontend', details: 'Timer begins counting execution duration' },
      { order: 5, action: 'Execute steps', actor: 'user', details: 'User marks each step pass/fail' },
      { order: 6, action: 'Update step_results', actor: 'frontend', details: 'Optimistic update to local state' },
      { order: 7, action: 'Persist results', actor: 'database', details: 'Update tm_test_runs with step_results JSONB' },
      { order: 8, action: 'Determine status', actor: 'frontend', details: 'Calculate overall status from steps' },
      { order: 9, action: 'Save final status', actor: 'database', details: 'Update status, executed_at, executed_by' },
      { order: 10, action: 'Invalidate queries', actor: 'frontend', details: 'Refetch test-runs and test-cycles' },
      { order: 11, action: 'Update metrics', actor: 'database', details: 'Trigger updates cycle progress stats' },
    ],
    outcome: 'Test run recorded with duration, status, and linked defects',
  },
  {
    name: 'Quality Gate Recalculation Flow',
    trigger: 'Test execution completed or defect status changed',
    steps: [
      { order: 1, action: 'Detect change', actor: 'database', details: 'Trigger on tm_test_runs or tm_defects update' },
      { order: 2, action: 'Queue recalculation', actor: 'database', details: 'Insert into gate_recalc_queue' },
      { order: 3, action: 'Process queue', actor: 'edge_function', details: 'Scheduled function processes queue' },
      { order: 4, action: 'Calculate metrics', actor: 'database', details: 'Run queries for each metric type' },
      { order: 5, action: 'Evaluate thresholds', actor: 'edge_function', details: 'Compare values against thresholds' },
      { order: 6, action: 'Update gate status', actor: 'database', details: 'Set status passed/failed per gate' },
      { order: 7, action: 'Broadcast change', actor: 'realtime', details: 'Notify subscribed clients' },
      { order: 8, action: 'Update UI', actor: 'frontend', details: 'React Query invalidates quality-gates' },
    ],
    outcome: 'Quality gates reflect current test and defect state',
  },
  {
    name: 'Release Approval Flow',
    trigger: 'User clicks "Approve Release" button',
    steps: [
      { order: 1, action: 'Validate eligibility', actor: 'frontend', details: 'Check all blocking gates passed/waived' },
      { order: 2, action: 'Create snapshot', actor: 'database', details: 'Call tm_create_readiness_snapshot RPC' },
      { order: 3, action: 'Capture metrics', actor: 'database', details: 'Snapshot current test/defect/gate state' },
      { order: 4, action: 'Display confirmation', actor: 'frontend', details: 'Show approval dialog with summary' },
      { order: 5, action: 'Submit approval', actor: 'user', details: 'User confirms approval' },
      { order: 6, action: 'Validate permissions', actor: 'database', details: 'RPC checks user is release manager' },
      { order: 7, action: 'Record approval', actor: 'database', details: 'Set approved_by, approved_at on snapshot' },
      { order: 8, action: 'Update release', actor: 'database', details: 'Transition release status to approved' },
      { order: 9, action: 'Notify stakeholders', actor: 'edge_function', details: 'Send approval notifications' },
      { order: 10, action: 'Update UI', actor: 'frontend', details: 'Show success and refresh release data' },
    ],
    outcome: 'Release approved with audit trail and notifications sent',
  },
];

// ============================================================================
// SECTION 9: UI/UX SPECIFICATIONS
// ============================================================================

export interface UISpec {
  page: string;
  layout: string;
  primaryActions: string[];
  secondaryActions: string[];
  dataDisplays: string[];
  emptyStates: string[];
  loadingStates: string[];
  errorStates: string[];
  responsiveness: string[];
}

export const UI_SPECIFICATIONS: UISpec[] = [
  {
    page: 'Command Center',
    layout: 'Full-width dashboard with header, KPI row, and 2x3 widget grid',
    primaryActions: ['Refresh Data', 'Export Reports', 'Select Release Filter'],
    secondaryActions: ['Configure Widgets', 'Set Time Range', 'Toggle Auto-Refresh'],
    dataDisplays: [
      'KPI Cards: Total Tests, Execution Rate, Pass Rate, Active Defects',
      'Release Health: Horizontal list with health indicators',
      'Quality Gates: Pie/donut chart of gate statuses',
      'Test Progress: Stacked bar chart by sprint',
      'Defect Trends: Line chart opened vs closed over time',
      'Team Performance: Leaderboard with avatars and metrics',
      'Activity Feed: Real-time log of recent actions',
      'Milestones: Upcoming deadlines with urgency indicators',
    ],
    emptyStates: [
      'No releases: "Create your first release to see dashboard data"',
      'No test data: "Start test execution to populate metrics"',
    ],
    loadingStates: [
      'Skeleton loaders for each widget independently',
      'Staggered loading animation for visual appeal',
    ],
    errorStates: [
      'Individual widget error: Show retry button within widget',
      'Full page error: Error boundary with "Reload Dashboard" button',
    ],
    responsiveness: [
      'Desktop (1920+): Full 2x3 grid',
      'Laptop (1024-1919): 2x2 grid with scroll',
      'Tablet (768-1023): Single column, stacked widgets',
      'Mobile (<768): Compact cards, collapsible sections',
    ],
  },
  {
    page: 'Test Case Repository',
    layout: 'Split panel: Folder tree left (20%), case list/detail right (80%)',
    primaryActions: ['Create Test Case', 'Create Folder', 'Import Cases'],
    secondaryActions: ['Bulk Edit', 'Bulk Delete', 'Export Selected', 'Filter/Search'],
    dataDisplays: [
      'Folder tree with counts and expand/collapse',
      'Test case table with sortable columns',
      'Case detail panel with tabs (Steps, History, Links)',
    ],
    emptyStates: [
      'No folders: "Create folders to organize your test cases"',
      'No cases in folder: "This folder is empty. Create a test case or move one here."',
    ],
    loadingStates: [
      'Tree skeleton for folders',
      'Table rows skeleton for cases',
    ],
    errorStates: [
      'Failed to load: Inline error with retry',
    ],
    responsiveness: [
      'Desktop: Split panel layout',
      'Tablet: Collapsible folder panel',
      'Mobile: Bottom sheet for folders, full-width list',
    ],
  },
];

// ============================================================================
// SECTION 10: VALIDATION RULES
// ============================================================================

export interface ValidationRule {
  entity: string;
  field: string;
  rule: string;
  errorMessage: string;
  appliesTo: 'create' | 'update' | 'both';
}

export const VALIDATION_RULES: ValidationRule[] = [
  // Release validations
  { entity: 'Release', field: 'version', rule: 'Required, max 50 chars, unique per project', errorMessage: 'Version is required and must be unique', appliesTo: 'both' },
  { entity: 'Release', field: 'name', rule: 'Required, max 255 chars', errorMessage: 'Name is required', appliesTo: 'both' },
  { entity: 'Release', field: 'planned_date', rule: 'Required, must be valid date', errorMessage: 'Planned date is required', appliesTo: 'both' },
  { entity: 'Release', field: 'actual_date', rule: 'Optional, must be >= created_at', errorMessage: 'Actual date cannot be before release creation', appliesTo: 'update' },
  
  // Test Case validations
  { entity: 'TestCase', field: 'title', rule: 'Required, 5-500 chars', errorMessage: 'Title must be between 5 and 500 characters', appliesTo: 'both' },
  { entity: 'TestCase', field: 'test_case_key', rule: 'Auto-generated, unique, immutable after create', errorMessage: 'Test case key cannot be changed', appliesTo: 'update' },
  { entity: 'TestCase', field: 'steps', rule: 'If provided, each step must have action and expected_result', errorMessage: 'Each step must have an action and expected result', appliesTo: 'both' },
  { entity: 'TestCase', field: 'priority', rule: 'Required, must be: critical, high, medium, low', errorMessage: 'Invalid priority', appliesTo: 'both' },
  
  // Defect validations
  { entity: 'Defect', field: 'title', rule: 'Required, 10-500 chars', errorMessage: 'Title must be between 10 and 500 characters', appliesTo: 'both' },
  { entity: 'Defect', field: 'severity', rule: 'Required, must be: blocker, critical, major, minor, trivial', errorMessage: 'Invalid severity', appliesTo: 'both' },
  { entity: 'Defect', field: 'resolution', rule: 'Required when status is resolved or closed', errorMessage: 'Resolution is required when closing defect', appliesTo: 'update' },
  { entity: 'Defect', field: 'duplicate_of_id', rule: 'Required when resolution is duplicate', errorMessage: 'Must specify duplicate defect', appliesTo: 'update' },
  
  // Quality Gate validations
  { entity: 'QualityGate', field: 'threshold_value', rule: 'Required, positive number', errorMessage: 'Threshold must be a positive number', appliesTo: 'both' },
  { entity: 'QualityGate', field: 'waiver_reason', rule: 'Required when status changed to waived', errorMessage: 'Waiver reason is required', appliesTo: 'update' },
];

// ============================================================================
// SECTION 11: EXPORT FUNCTION
// ============================================================================

export function generateCompleteSpecMarkdown(): string {
  let md = `# Release & Test Management Module - Complete Technical Specification

**Generated:** ${new Date().toISOString()}
**Version:** 1.0.0
**Purpose:** Comprehensive specification for rebuilding the complete module

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Database Functions (RPC)](#2-database-functions-rpc)
3. [React Hooks](#3-react-hooks)
4. [Components](#4-components)
5. [Business Rules](#5-business-rules)
6. [Edge Functions (API)](#6-edge-functions-api)
7. [Data Flows](#7-data-flows)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Validation Rules](#9-validation-rules)

---

## 1. Database Schema

`;

  // Database tables
  for (const table of DATABASE_TABLES) {
    md += `### Table: \`${table.name}\`

**Description:** ${table.description}

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
`;
    for (const col of table.columns) {
      md += `| ${col.name} | ${col.type} | ${col.nullable ? 'Yes' : 'No'} | ${col.defaultValue || '-'} | ${col.description} |
`;
    }
    
    md += `
**Primary Key:** \`${table.primaryKey}\`

**Foreign Keys:**
`;
    for (const fk of table.foreignKeys) {
      md += `- \`${fk.column}\` → \`${fk.references.table}.${fk.references.column}\` (ON DELETE ${fk.onDelete})
`;
    }
    
    md += `
**Indexes:**
`;
    for (const idx of table.indexes) {
      md += `- \`${idx.name}\`: ${idx.columns.join(', ')} (${idx.unique ? 'UNIQUE ' : ''}${idx.type})
`;
    }
    md += `
---

`;
  }

  // Database functions
  md += `## 2. Database Functions (RPC)

`;
  for (const fn of DATABASE_FUNCTIONS) {
    md += `### \`${fn.name}\`

**Description:** ${fn.description}

**Parameters:**
`;
    for (const param of fn.parameters) {
      md += `- \`${param.name}\` (${param.type}): ${param.description}
`;
    }
    md += `
**Returns:** \`${fn.returnType}\`

**Purpose:**
\`\`\`
${fn.purpose}
\`\`\`

---

`;
  }

  // Hooks
  md += `## 3. React Hooks

`;
  for (const hook of HOOK_SPECIFICATIONS) {
    md += `### \`${hook.name}\`

**File:** \`${hook.file}\`

**Description:** ${hook.description}

**Parameters:**
`;
    for (const param of hook.parameters) {
      md += `- \`${param.name}\` (${param.type}${param.required ? '' : '?'}): ${param.description}
`;
    }
    md += `
**Returns:** \`${hook.returns.type}\`

**Query Key:** \`${JSON.stringify(hook.queryKey)}\`

**Database Tables:** ${hook.dbTables.join(', ')}

**RPC Functions:** ${hook.rpcFunctions.join(', ') || 'None'}

**Mutations:**
`;
    for (const mut of hook.mutations) {
      md += `
#### \`${mut.name}\`
- **Description:** ${mut.description}
- **Parameters:** ${mut.parameters.map(p => `\`${p.name}: ${p.type}\``).join(', ')}
- **Optimistic Update:** ${mut.optimisticUpdate}
- **Invalidates:** ${mut.invalidates.join(', ')}
- **Success Toast:** "${mut.onSuccessToast}"
- **Error Toast:** "${mut.onErrorToast}"
`;
    }
    
    md += `
**Acceptance Criteria:**
`;
    for (const ac of hook.acceptanceCriteria) {
      md += `- ${ac}
`;
    }
    md += `
---

`;
  }

  // Components
  md += `## 4. Components

`;
  for (const comp of COMPONENT_SPECIFICATIONS) {
    md += `### \`${comp.name}\`

**File:** \`${comp.file}\`

**Description:** ${comp.description}

**Props:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
`;
    for (const prop of comp.props) {
      md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default || '-'} | ${prop.description} |
`;
    }
    
    md += `
**State:**
`;
    for (const state of comp.state) {
      md += `- \`${state.name}\` (${state.type}, initial: ${state.initial}): ${state.description}
`;
    }
    
    md += `
**Events:**
`;
    for (const event of comp.events) {
      md += `- \`${event.name}\` → ${event.payload}: ${event.description}
`;
    }
    
    md += `
**Children Components:** ${comp.children.join(', ')}

**Accessibility:**
`;
    for (const a11y of comp.accessibility) {
      md += `- ${a11y}
`;
    }
    
    md += `
**Acceptance Criteria:**
`;
    for (const ac of comp.acceptanceCriteria) {
      md += `- ${ac}
`;
    }
    md += `
---

`;
  }

  // Business Rules
  md += `## 5. Business Rules

`;
  for (const rule of BUSINESS_RULES) {
    md += `### ${rule.id}: ${rule.name}

**Category:** ${rule.category} | **Priority:** ${rule.priority}

**Description:** ${rule.description}

**Conditions:**
`;
    for (const cond of rule.conditions) {
      md += `- ${cond}
`;
    }
    md += `
**Actions:**
`;
    for (const action of rule.actions) {
      md += `- ${action}
`;
    }
    if (rule.exceptions.length > 0) {
      md += `
**Exceptions:**
`;
      for (const exc of rule.exceptions) {
        md += `- ${exc}
`;
      }
    }
    md += `
---

`;
  }

  // Edge Functions
  md += `## 6. Edge Functions (API)

`;
  for (const fn of EDGE_FUNCTION_SPECS) {
    md += `### \`${fn.name}\`

**Path:** \`${fn.method} ${fn.path}\`

**Description:** ${fn.description}

**Authentication:** ${fn.authentication}

`;
    if (fn.requestBody) {
      md += `**Request Body:** (${fn.requestBody.contentType})
| Field | Type | Required | Description |
|-------|------|----------|-------------|
`;
      for (const [field, spec] of Object.entries(fn.requestBody.schema)) {
        md += `| ${field} | ${spec.type} | ${spec.required ? 'Yes' : 'No'} | ${spec.description} |
`;
      }
      md += `
`;
    }
    
    md += `**Response:**
- **Success (${fn.responseBody.success.status}):** \`${JSON.stringify(fn.responseBody.success.schema)}\`
- **Errors:**
`;
    for (const err of fn.responseBody.errors) {
      md += `  - ${err.status}: ${err.description}
`;
    }
    
    if (fn.rateLimiting) {
      md += `
**Rate Limiting:** ${fn.rateLimiting.requests} requests per ${fn.rateLimiting.windowSeconds} seconds
`;
    }
    md += `
---

`;
  }

  // Data Flows
  md += `## 7. Data Flows

`;
  for (const flow of DATA_FLOWS) {
    md += `### ${flow.name}

**Trigger:** ${flow.trigger}

| Step | Actor | Action | Details |
|------|-------|--------|---------|
`;
    for (const step of flow.steps) {
      md += `| ${step.order} | ${step.actor} | ${step.action} | ${step.details} |
`;
    }
    md += `
**Outcome:** ${flow.outcome}

---

`;
  }

  // UI/UX Specs
  md += `## 8. UI/UX Specifications

`;
  for (const ui of UI_SPECIFICATIONS) {
    md += `### ${ui.page}

**Layout:** ${ui.layout}

**Primary Actions:** ${ui.primaryActions.join(', ')}

**Secondary Actions:** ${ui.secondaryActions.join(', ')}

**Data Displays:**
`;
    for (const display of ui.dataDisplays) {
      md += `- ${display}
`;
    }
    
    md += `
**Empty States:**
`;
    for (const empty of ui.emptyStates) {
      md += `- ${empty}
`;
    }
    
    md += `
**Responsiveness:**
`;
    for (const resp of ui.responsiveness) {
      md += `- ${resp}
`;
    }
    md += `
---

`;
  }

  // Validation Rules
  md += `## 9. Validation Rules

| Entity | Field | Rule | Error Message | Applies To |
|--------|-------|------|---------------|------------|
`;
  for (const rule of VALIDATION_RULES) {
    md += `| ${rule.entity} | ${rule.field} | ${rule.rule} | ${rule.errorMessage} | ${rule.appliesTo} |
`;
  }

  md += `

---

## End of Specification

This document contains all information needed to rebuild the Release & Test Management module from scratch.
`;

  return md;
}

export function downloadCompleteSpec(): void {
  const content = generateCompleteSpecMarkdown();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `release-module-complete-spec-${new Date().toISOString().split('T')[0]}.md`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
