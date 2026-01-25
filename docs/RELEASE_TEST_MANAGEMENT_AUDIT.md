# Release & Test Management Module - Complete Audit Dump
## Generated: 2026-01-25

---

# EXECUTIVE SUMMARY

This document provides a complete technical audit of the Release & Test Management module implementation.

## Current Data State (Live Counts)
| Table | Row Count |
|-------|-----------|
| tm_test_cases | 28 |
| tm_test_cycles | 4 |
| tm_cycle_scope | 6 |
| tm_test_runs | 5 |
| tm_test_steps | 62 |
| tm_step_results | 10 |
| tm_defects | 7 |
| releases | 6 |
| tm_folders | 6 |
| test_data_rows | 6 |
| test_data_parameters | 8 |

---

# SECTION 1: DATABASE SCHEMA

## 1.1 Core Tables (tm_* prefix - Primary Schema)

### tm_test_cases
**Purpose**: Central test case repository
**Columns**:
- id (uuid, PK)
- project_id (uuid, FK)
- folder_id (uuid, FK → tm_folders)
- case_key (varchar) - e.g., "TC-268"
- title (text)
- description (text)
- priority (tm_priority enum)
- type (tm_test_type enum)
- status (varchar) - Draft/Active/Deprecated
- preconditions (text)
- estimated_time_minutes (integer)
- automation_status (varchar)
- assigned_to (uuid, FK → profiles)
- created_by (uuid)
- created_at, updated_at (timestamptz)
- tags (text[])
- is_template (boolean)
- release_id (uuid, FK → releases)

**Status**: ✅ FULLY WIRED - CRUD operations work

### tm_test_steps
**Purpose**: Steps within test cases
**Columns**:
- id (uuid, PK)
- test_case_id (uuid, FK → tm_test_cases)
- step_order (integer)
- action (text) - What the tester does
- expected_result (text)
- notes (text)
- step_data (jsonb)
- created_at, updated_at (timestamptz)

**Status**: ✅ FULLY WIRED - Steps persist correctly

### tm_test_cycles
**Purpose**: Test execution cycles/sprints
**Columns**:
- id (uuid, PK)
- project_id (uuid, FK)
- cycle_key (varchar) - e.g., "CYC-12"
- name (text)
- description (text)
- status (tm_cycle_status enum) - planned/in_progress/completed/cancelled
- environment_id (uuid, FK → tm_environments)
- planned_start (date)
- planned_end (date)
- actual_start, actual_end (date)
- total_cases (integer) - CACHED counter
- passed_count, failed_count, blocked_count, skipped_count, not_run_count (integer) - CACHED
- created_by (uuid)
- created_at, updated_at (timestamptz)

**Status**: ⚠️ PARTIALLY WIRED - Basic CRUD works, cached counters may drift

### tm_cycle_scope
**Purpose**: SOURCE OF TRUTH for test cases in a cycle
**Columns**:
- id (uuid, PK)
- cycle_id (uuid, FK → tm_test_cycles)
- test_case_id (uuid, FK → tm_test_cases)
- current_status (tm_execution_status enum) - not_run/in_progress/passed/failed/blocked/skipped
- assigned_to (uuid, FK → profiles)
- priority (varchar)
- due_date (date)
- added_at (timestamptz)
- updated_at (timestamptz)

**Status**: ✅ FULLY WIRED - Kanban/Table/Calendar derive from this

### tm_test_runs
**Purpose**: Individual execution attempts
**Columns**:
- id (uuid, PK)
- cycle_id (uuid, FK → tm_test_cycles)
- cycle_scope_id (uuid, FK → tm_cycle_scope)
- test_case_id (uuid, FK → tm_test_cases)
- run_key (varchar)
- status (tm_execution_status enum)
- executor_id (uuid)
- started_at, completed_at (timestamptz)
- duration_seconds (integer)
- test_data_row_snapshot (jsonb) - For DDT runs
- notes (text)
- environment_id (uuid)
- created_at, updated_at (timestamptz)

**Status**: ✅ FULLY WIRED - Runs created on execution

### tm_step_results
**Purpose**: Per-step execution results
**Columns**:
- id (uuid, PK)
- run_id (uuid, FK → tm_test_runs)
- step_id (uuid, FK → tm_test_steps)
- status (tm_execution_status enum)
- actual_result (text)
- notes (text)
- execution_time_ms (integer)
- executed_at (timestamptz)
- executed_by (uuid)
- created_at (timestamptz)

**Status**: ✅ FULLY WIRED - Step-by-step results persist

### tm_defects
**Purpose**: Defects linked to test failures
**Columns**:
- id (uuid, PK)
- defect_key (varchar) - e.g., "DEF-42"
- title (text)
- description (text)
- severity (varchar)
- priority (varchar)
- status (varchar)
- reporter_id (uuid)
- assignee_id (uuid)
- linked_run_id (uuid)
- linked_step_id (uuid)
- project_id (uuid)
- created_at, updated_at (timestamptz)

**Status**: ⚠️ PARTIALLY WIRED - Basic CRUD, linking may be incomplete

### tm_folders
**Purpose**: Test case folder hierarchy
**Columns**:
- id (uuid, PK)
- project_id (uuid)
- name (text)
- parent_id (uuid, FK → tm_folders) - Self-referential
- path (text) - Materialized path
- depth (integer)
- case_count (integer)
- sort_order (integer)
- icon, color (varchar)
- created_by (uuid)
- created_at, updated_at (timestamptz)

**Status**: ✅ FULLY WIRED - Folder tree works

### tm_audit_log
**Purpose**: Field-level change tracking
**Columns**:
- id (uuid, PK)
- project_id (uuid)
- entity_type (varchar) - 'test_case', 'cycle', etc.
- entity_id (uuid)
- action (audit_action enum) - create/update/delete
- actor_id (uuid)
- changes (jsonb) - { field: { old: x, new: y } }
- ip_address (inet)
- created_at (timestamptz)

**Status**: ⚠️ PARTIALLY WIRED - Writes on some actions, not all

### tm_test_case_versions
**Purpose**: Full snapshots for version history
**Columns**:
- id (uuid, PK)
- test_case_id (uuid, FK)
- version_number (integer)
- snapshot (jsonb) - Complete test case state
- created_by (uuid)
- created_at (timestamptz)
- change_summary (text)

**Status**: ⚠️ PARTIALLY WIRED - Created on some updates

## 1.2 Data-Driven Testing Tables

### test_data_parameters
**Purpose**: Column definitions for DDT
**Columns**:
- id (uuid, PK)
- test_case_id (uuid, FK)
- parameter_name (varchar)
- parameter_type (varchar) - string/number/boolean
- column_order (integer)
- created_at, updated_at (timestamptz)

**Status**: ✅ FULLY WIRED

### test_data_rows
**Purpose**: Data row values for DDT
**Columns**:
- id (uuid, PK)
- test_case_id (uuid, FK)
- row_data (jsonb) - { "param1": "value1", ... }
- row_order (integer)
- created_at, updated_at (timestamptz)

**Status**: ✅ FULLY WIRED

## 1.3 Release Tables

### releases
**Purpose**: Release tracking
**Columns**:
- id (uuid, PK)
- release_vehicle_id (uuid)
- name (text)
- version (varchar)
- description (text)
- status (release_status enum) - planned/active/uat/released/cancelled
- target_date, start_date, release_date (date)
- progress (integer)
- health (varchar)
- is_blocked (boolean)
- blocked_reason (text)
- owner_id (uuid)
- project_id (uuid)
- test_cases_total, test_cases_passed, defects_open, coverage_percent (integer) - CACHED
- created_by (uuid)
- created_at, updated_at (timestamptz)

**Status**: ⚠️ PARTIALLY WIRED - Basic display works, metrics may be stale

## 1.4 Supporting Tables

### tm_environments
- id, name, description, url, is_active
- **Status**: ✅ Works

### tm_labels
- id, project_id, name, color
- **Status**: ⚠️ UI exists, wiring incomplete

### tm_test_plans
- id, project_id, plan_key, name, description, status
- **Status**: ❌ UI SHELL ONLY

### tm_test_plan_cases
- id, plan_id, test_case_id, order
- **Status**: ❌ UI SHELL ONLY

---

# SECTION 2: DATABASE VIEWS

## v_tm_test_cycle_list_metrics (SECURITY INVOKER)
**Purpose**: Authoritative metrics for cycle list
**Derives From**: tm_cycle_scope, tm_test_runs
**Returns**: id, total_tests, passed, failed, blocked, not_run, progress_percent, pass_rate
**Status**: ✅ USED - Powers cycle list page

## v_tm_cycle_progress
**Purpose**: Cycle with computed progress and schedule status
**Status**: ✅ USED

## v_tm_execution_by_assignee
**Purpose**: Workload per tester in a cycle
**Status**: ✅ USED - Team workload bars

## v_tm_my_work
**Purpose**: Personal work queue
**Status**: ⚠️ PARTIAL - View exists, UI may not consume

## tm_folders_with_counts
**Purpose**: Folders with test case counts
**Status**: ✅ USED

## tm_users
**Purpose**: Maps profiles to TM user format
**Status**: ✅ USED

---

# SECTION 3: STORED PROCEDURES / RPCs

## Fully Wired RPCs
| RPC Name | Purpose | Status |
|----------|---------|--------|
| save_test_data | Atomic DDT parameter/row save | ✅ WORKS |
| calculate_release_health | Compute release health score | ✅ WORKS |
| tm_next_entity_key | Generate TC-xxx, CYC-xxx keys | ✅ WORKS |
| tm_get_cycle_details | Detailed cycle info | ✅ WORKS |
| tm_get_cycle_execution_summary | Aggregate execution stats | ✅ WORKS |
| tm_get_cycle_activity_feed | Activity timeline | ✅ WORKS |
| tm_get_cycle_team_workload | Tester workload | ✅ WORKS |
| tm_assign_scope_item | Assign tester to scope item | ✅ WORKS |

## Partially Wired RPCs
| RPC Name | Purpose | Status |
|----------|---------|--------|
| tm_create_version_snapshot | Create test case version | ⚠️ Called inconsistently |
| tm_create_audit_log | Log changes | ⚠️ Called inconsistently |
| tm_clone_test_case | Duplicate test case | ⚠️ RPC exists, UI missing |
| tm_get_version_history | Retrieve versions | ⚠️ Used in Versions tab |

## UI Shell Only RPCs (Not Actually Called)
| RPC Name | Purpose | Status |
|----------|---------|--------|
| tm_get_plan_stats | Test plan statistics | ❌ SHELL |
| tm_get_plan_analytics | Plan analytics | ❌ SHELL |
| tm_get_plan_burndown | Burndown chart | ❌ SHELL |
| tm_compare_cycles | Cycle comparison | ❌ SHELL |
| tm_evaluate_release_gates | Quality gate evaluation | ❌ SHELL |
| tm_request_signoff | Release sign-off | ❌ SHELL |
| tm_submit_signoff_decision | Sign-off voting | ❌ SHELL |
| tm_get_traceability_matrix | RTM generation | ❌ SHELL |

---

# SECTION 4: FRONTEND HOOKS

## src/hooks/test-cycles/ (26 hooks)

### Fully Wired Hooks
| Hook | Purpose | DB Tables Used |
|------|---------|----------------|
| useCycleExecutionItems | SOURCE OF TRUTH for views | tm_cycle_scope, tm_test_runs |
| useExecutionMutations | Status updates | tm_cycle_scope, tm_test_runs |
| useCycleDetails | Cycle metadata | tm_test_cycles |
| useTestCycleList | Cycle list with metrics | v_tm_test_cycle_list_metrics |
| useCycleMutations | CRUD cycles | tm_test_cycles |
| useCycleScopeMutations | Add/remove from scope | tm_cycle_scope |
| useAddTestsToCycle | Add tests to cycle | tm_cycle_scope |
| useCyclesForTestCase | Find cycles containing test | tm_cycle_scope |
| useCycleAnalytics | Summary stats | tm_cycle_scope, tm_test_runs |
| useCycleActivityFeed | Activity timeline | RPC: tm_get_cycle_activity_feed |
| useCycleTeamWorkload | Tester workload | RPC: tm_get_cycle_team_workload |
| useCalendarData | Calendar events | tm_cycle_scope |
| useApplyAssignment | Assign tester | tm_cycle_scope |
| useTestRepository | Available tests | tm_test_cases |
| useTestFilters | Filter state | Local state |
| useTestSelection | Selection state | Local state |

### Partially Wired Hooks
| Hook | Purpose | Issue |
|------|---------|-------|
| useBulkActions | Bulk operations | ⚠️ Some actions incomplete |
| useSmartAssignment | AI assignment | ⚠️ Algorithm exists, AI not integrated |
| useInlineEdit | Inline editing | ⚠️ Works for some fields |

## src/features/test-execution/hooks/ (50 hooks)

### Fully Wired
| Hook | Purpose | Status |
|------|---------|--------|
| useExecutionRun | Load single run | ✅ |
| useStepResultMutation | Save step result | ✅ |
| useStepNavigation | Navigate steps | ✅ |
| useExecutionTimer | Track duration | ✅ |
| useLinkedDefects | Defects on run | ✅ |
| useDefectMutations | Create defects | ✅ |
| useStepEvidence | Attachments | ⚠️ Storage may not work |

### UI Shell Only
| Hook | Purpose | Status |
|------|---------|--------|
| useParallelRunner | Parallel execution | ❌ SHELL |
| useWorkerPool | Worker management | ❌ SHELL |
| useQueueManagement | Execution queue | ❌ SHELL |
| useResourceAllocation | Environment allocation | ❌ SHELL |
| useBatchExport | Export runs | ❌ SHELL |

---

# SECTION 5: PAGES & COMPONENTS

## Pages Status

### ✅ Fully Functional
| Page | Route | Description |
|------|-------|-------------|
| TestCasesLibraryPage | /releases/test-cases | Test case repository |
| TestCaseDetailPage | /releases/test-case-detail/:id | Full test case view with Data, Steps, Versions, Changes tabs |
| TestCyclesPage | /releases/test-cycles | Cycle list with metrics |
| CycleCommandCenter | /releases/cycle-command-center/:cycleId | Kanban, Table, Calendar, Reports |
| ExecutionPage | /releases/execute/:cycleId/:runId | Step-by-step execution |
| DefectsPage | /releases/defects | Defect list |

### ⚠️ Partially Functional
| Page | Route | Issue |
|------|-------|-------|
| AllReleasesPage | /releases/all | List works, metrics may be stale |
| ReleaseDashboardPage | /releases/dashboard | Some widgets use mock data |
| CommandCenterPage | /releases/command-center | Wired to DB but some KPIs may be inaccurate |
| ComparePage | /releases/compare | Basic comparison works |

### ❌ UI Shell Only (No Real Data)
| Page | Route | Issue |
|------|-------|-------|
| TestPlansPage | /releases/test-plans | Table displays, CRUD not wired |
| TestPlanDetailPage | /releases/test-plans/:id | Shell only |
| QualityGatesPage | /releases/quality-gates | Shell only |
| CoverageReportsPage | /releases/coverage | Shell only |
| CycleTemplatesPage | /releases/cycle-templates | Shell only |
| MyTestScopePage | /releases/my-test-scope | Partial - feature exists but incomplete |
| CalendarPage | /releases/calendar | May show cycles but incomplete |

## Key Components

### src/components/releases/cycle-command-center/
| Component | Status | Notes |
|-----------|--------|-------|
| CycleKanbanView | ✅ WORKS | Drag-drop persists to tm_cycle_scope |
| CycleTableView | ✅ WORKS | Same data source as Kanban |
| CycleCalendarView | ✅ WORKS | Due dates from tm_cycle_scope |
| CycleReportsView | ⚠️ PARTIAL | Charts render, data may be incomplete |
| SummaryMetricCards | ✅ WORKS | Derives from useCycleExecutionItems |
| TeamWorkloadBars | ✅ WORKS | Uses useCycleTeamWorkload |
| ActivityFeed | ✅ WORKS | Uses useCycleActivityFeed |

### src/components/releases/test-case-detail/
| Component | Status | Notes |
|-----------|--------|-------|
| TestCaseSteps | ✅ WORKS | CRUD operations work |
| TestCaseDataTab | ✅ WORKS | DDT grid persists via save_test_data |
| TestCaseExecutionHistory | ✅ WORKS | Shows runs from tm_test_runs |
| TestCaseVersionHistory | ⚠️ PARTIAL | Versions tab shows snapshots |
| TestCaseChangeHistory | ⚠️ PARTIAL | Changes tab shows audit log |
| SelectCycleToRunDialog | ✅ WORKS | Cycle selection for execution |

### src/components/releases/test-execution/
| Component | Status | Notes |
|-----------|--------|-------|
| ExecutionWorkspace | ✅ WORKS | Main execution UI |
| StepDisplay | ✅ WORKS | Renders steps with DDT substitution |
| SubstitutedText | ✅ WORKS | Variable replacement with tooltips |
| StepResultCapture | ✅ WORKS | Pass/Fail/Block buttons |
| ExecutionSidebar | ✅ WORKS | Test info panel |

---

# SECTION 6: KNOWN ISSUES & GAPS

## Critical Issues
1. **Test Plans Module**: Entire module is UI shell only - no database operations
2. **Quality Gates**: UI exists, RPCs exist, but not wired together
3. **Coverage Reports**: UI shell only
4. **Cycle Templates**: UI shell only

## Data Integrity Issues
1. **Cached Counters in tm_test_cycles**: May drift from actual tm_cycle_scope counts
2. **Release Metrics**: test_cases_total, defects_open may not update
3. **Triggers Missing**: No triggers found for automatic counter updates

## Missing Functionality
1. **Parallel Execution Framework**: 50+ hooks exist but not integrated
2. **AI Step Generation**: Edge function exists, UI integration partial
3. **Bulk Operations**: Some work, others incomplete
4. **Export/Import**: Limited functionality
5. **Sign-off Workflow**: RPCs exist, UI not wired

## UI/UX Issues
1. **Some dropdowns crash on empty value**: Need __all__ placeholders
2. **Inconsistent loading states**: Some components lack spinners
3. **Error handling**: Not uniform across all mutations

---

# SECTION 7: ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAGES                                     │
├─────────────────────────────────────────────────────────────────┤
│ TestCasesLibraryPage  │  TestCyclesPage  │  ExecutionPage       │
│ TestCaseDetailPage    │  CycleCommandCenter  │  DefectsPage     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SHARED HOOKS                                 │
├─────────────────────────────────────────────────────────────────┤
│ useCycleExecutionItems ◄── SOURCE OF TRUTH                      │
│ useExecutionMutations  ◄── Status changes                       │
│ useTestCycleList       ◄── Cycle list with metrics              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│ tm_cycle_scope ◄── Single source of truth for test status       │
│       │                                                          │
│       ├── tm_test_runs (execution attempts)                      │
│       │       └── tm_step_results (per-step results)             │
│       │                                                          │
│       └── tm_test_cases (repository)                             │
│               └── tm_test_steps (step definitions)               │
│               └── test_data_parameters / test_data_rows (DDT)    │
│                                                                  │
│ v_tm_test_cycle_list_metrics ◄── Derived view for list page     │
│ v_tm_execution_by_assignee   ◄── Derived view for workload      │
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 8: RECOMMENDED AUDIT FOCUS AREAS

## Priority 1: Verify Core Flow
1. Create test case → Add steps → Add to cycle → Execute → Record results
2. Confirm data persists at each step
3. Verify Kanban drag-drop updates tm_cycle_scope.current_status

## Priority 2: Check Data Consistency
1. Do v_tm_test_cycle_list_metrics counts match actual tm_cycle_scope?
2. Do tm_test_cycles cached counters stay in sync?
3. Do release metrics reflect actual test execution?

## Priority 3: Identify Dead Code
1. Which hooks in src/features/test-execution/hooks/ are never imported?
2. Which RPCs in database are never called?
3. Which components are mounted but never receive real data?

## Priority 4: Missing Wiring
1. Test Plans → tm_test_plans, tm_test_plan_cases
2. Quality Gates → tm_release_quality_gates, tm_release_gate_results
3. Sign-offs → tm_release_signoffs, tm_signoff_templates

---

# SECTION 9: FILES TO REVIEW

## Core Hook Files
- `src/hooks/test-cycles/useCycleExecutionItems.ts` - Central data hook
- `src/hooks/test-cycles/useExecutionMutations.ts` - Status mutations
- `src/hooks/test-cycles/useCycleDetails.ts` - Cycle metadata
- `src/features/test-execution/hooks/useStepResultMutation.ts` - Step results

## Core Page Files
- `src/pages/releases/TestCyclesPage.tsx` - Cycle list
- `src/pages/releases/CycleCommandCenter.tsx` - Execution hub
- `src/pages/releases/TestCaseDetailPage.tsx` - Test case workspace
- `src/pages/releases/ExecutionPage.tsx` - Step-by-step runner

## Component Files
- `src/components/releases/cycle-command-center/CycleKanbanView.tsx`
- `src/components/releases/cycle-command-center/CycleTableView.tsx`
- `src/components/releases/test-case-detail/TestCaseDataTab.tsx`
- `src/components/releases/test-execution/StepDisplay.tsx`

---

END OF AUDIT DOCUMENT
