# TESTHUB COMPREHENSIVE GAP ANALYSIS
## Claude Code Independent Verification — April 4, 2026
## Branch: claude/e2e-code-verification-b3kIv

---

## CRITICAL FINDING: DUAL SCHEMA (`tm_*` vs `th_*`)

The database has **TWO parallel TestHub schemas** that coexist:

### Schema A: `tm_*` (migration `20260104074712` + patches)
- **Normalized design** — priority/type are FK references, not inline text
- Tables: `tm_test_cases`, `tm_test_cycles`, `tm_cycle_scope`, `tm_test_runs`, `tm_defects`, `tm_requirements`, `tm_shared_steps`, `tm_environments`, `tm_folders`, `tm_case_priorities`, `tm_case_types`
- Used by: ~90% of hooks and pages (195+ query call sites)

### Schema B: `th_*` (migration `20260207215641` + `20260210111048`)
- **Denormalized design** — priority/type are inline text columns
- Tables: `th_test_cases`, `th_test_steps`, `th_test_cycles`, `th_cycle_test_cases`, `th_folders`, `th_shared_steps`, `th_test_case_versions`, `th_plan_cycles`, `th_test_executions`, `th_execution_attachments`
- Used by: `CreateTestCaseModal`, `ViewTestCaseModal`, `ChangeStatusModal`, `ImportModal`, `CatyAI`, some DefectG25 queries, dashboard RPCs

### Why This Matters
- **RPCs `get_dashboard_stats` and `get_my_stats` query `th_*` tables** — but all cycle/scope management writes to `tm_*` tables
- Data written to `tm_test_cycles` via the UI **never appears in dashboard RPCs** that read from `th_test_cycles`
- Test cases created via `CreateTestCaseModal` go to `th_test_cases`, but `TestRepositoryPage` reads from `tm_test_cases`
- **This is the root cause of many "empty data" bugs** — data flows into one schema but queries read from the other

---

## CONFIRMED SCHEMA (after all migration patches)

### `tm_test_cases` — Actual Columns
```
id, project_id, folder_id, case_key, title, description, preconditions, expected_result,
status, priority_id (UUID FK → tm_case_priorities), case_type_id (UUID FK → tm_case_types),
automation_status, estimated_time, created_by, created_at, updated_at
```
**Does NOT have:** `priority` (text), `type` (text), `objective`, `key`, `type_id`

### `tm_cycle_scope` — Actual Columns (after migration `20260125072554`)
```
id, cycle_id, test_case_id, assigned_to, current_status, sort_order, added_at,
priority (VARCHAR, added later), due_date (TIMESTAMPTZ, added later), updated_at (added later)
```
**Does NOT have:** `executed_by`, `executed_at`

### `tm_test_cycles` — Actual Columns (after migration `20260125093803`)
```
id, project_id, cycle_key, name, description, status, environment_id,
planned_start, planned_end, actual_start, actual_end,
total_cases, passed_count, failed_count, blocked_count, skipped_count,
not_run_count, in_progress_count (added later),
created_by, created_at, updated_at
```

### `tm_test_runs` — Actual Columns
```
id, cycle_scope_id, run_number, status, executed_by, started_at, completed_at,
duration_seconds, notes, environment_snapshot, created_at, updated_at
```
**Does NOT have:** `test_case_id`, `cycle_id` (must join through `tm_cycle_scope`)

### `th_test_cases` — Actual Columns (Schema B)
```
id, case_key, title, objective, preconditions, folder_id,
priority (TEXT: critical/high/medium/low), type (TEXT: functional/regression/...),
status, automation, owner_id, version, created_at, updated_at
```
**HAS inline:** `priority`, `type`, `objective` — columns that DON'T exist on `tm_test_cases`

### `th_cycle_test_cases` — Actual Columns (Schema B)
```
id, cycle_id, test_case_id, assigned_to, execution_status,
executed_at, executed_by, execution_time_seconds, notes, defect_ids,
created_at, updated_at
```
**HAS:** `executed_by`, `executed_at` — columns that DON'T exist on `tm_cycle_scope`

---

## GAP INVENTORY

### GAP 1 — BROKEN COLUMN REFERENCES: `tm_test_cases`
**Severity: HIGH — Causes 400 errors at runtime**

These files select columns that exist on `th_test_cases` but NOT on `tm_test_cases`:

| # | File | Line | Wrong Column(s) | Correct For `tm_*` |
|---|------|------|-----------------|---------------------|
| 1 | `src/pages/testhub/TestHubExecutionPage.tsx` | 160 | `objective`, `priority`, `type` | `description`, `priority_id`, `case_type_id` (or FK join) |
| 2 | `src/pages/testhub/TestCycleDetailPage.tsx` | 106 | `priority`, `type` | `priority_id`, `case_type_id` (or FK join) |
| 3 | `src/pages/testhub/RequirementDetailPage.tsx` | 84 | `priority` | `priority_id` (or FK join) |
| 4 | `src/pages/testhub/TestRunsPage.tsx` | 68 | `priority` (on tm_test_cases join) | `priority_id` (or FK join) |
| 5 | `src/hooks/test-cycles/useSmartAssignment.ts` | 90 | `priority` (on tm_test_cases join) | `priority_id` (or FK join) |
| 6 | `src/components/testhub/requirements/LinkTestCaseModal.tsx` | 42 | `priority` | `priority_id` (or FK join) |
| 7 | `src/hooks/test-management/useTestPlans.ts` | 197 | `key`, `type_id` | `case_key`, `case_type_id` |

**Correct pattern** (already used in `TestRepositoryPage.tsx:184`):
```typescript
.from('tm_test_cases').select('*, priority_ref:tm_case_priorities(name), type_ref:tm_case_types(name)')
```

---

### GAP 2 — BROKEN FK JOIN: `tm_cycle_scope` → `executed_by`
**Severity: HIGH — Causes 400 error on dashboard load**

| File | Line | Broken Code | Fix |
|------|------|-------------|-----|
| `src/pages/testhub/TestHubDashboardPage.tsx` | 59–62 | Selects `executed_at`, `executed_by` from `tm_cycle_scope`; joins `profiles!tm_cycle_scope_executed_by_fkey` | These columns exist on `tm_test_runs`, not `tm_cycle_scope`. Must join through `tm_test_runs` or use `assigned_to` with `profiles!tm_cycle_scope_assigned_to_fkey` |

**Detail:**
- `tm_cycle_scope` has NO `executed_by` or `executed_at` columns
- `tm_cycle_scope` only has FK to profiles via `assigned_to`
- Execution data lives in `tm_test_runs` (which has `executed_by`, `completed_at`)
- The dashboard "Recent Activity" widget is completely broken

---

### GAP 3 — SCHEMA SPLIT: Write/Read Mismatch
**Severity: CRITICAL — Data disappears between write and read**

| Operation | Writes To | Reads From | Result |
|-----------|-----------|------------|--------|
| Create test case (CreateTestCaseModal) | `th_test_cases` | `tm_test_cases` (TestRepositoryPage) | **Test case invisible in repository** |
| Create test steps (CreateTestCaseModal) | `th_test_steps` | `th_test_steps` (ExecutionPage) | OK (both use `th_`) |
| Create cycle | `tm_test_cycles` | `tm_test_cycles` (TestCyclesPage) | OK (both use `tm_`) |
| Record execution | `tm_cycle_scope` + `tm_test_runs` | `th_cycle_test_cases` (RPCs) | **Execution data invisible in dashboard** |
| Dashboard stats RPC | — | `th_test_cases`, `th_test_cycles`, `th_cycle_test_cases` | **Shows stale/empty data** |
| My stats RPC | — | `th_cycle_test_cases` | **Shows 0 for all users** |

**Impact:** The dashboard RPCs (`get_dashboard_stats`, `get_my_stats`) read from `th_*` tables, but all execution/cycle management writes to `tm_*` tables. Dashboard will always show stale or zero data.

---

### GAP 4 — `useCalendarData.ts` Broken Query
**Severity: MEDIUM — Calendar view crashes**

| File | Line | Issue |
|------|------|-------|
| `src/hooks/test-cycles/useCalendarData.ts` | 44–49 | Queries `tm_test_runs` with `.eq('cycle_id', cycleId)` — but `tm_test_runs` has NO `cycle_id` column. It has `cycle_scope_id`. Must join through `tm_cycle_scope` to filter by cycle. |

---

### GAP 5 — FSM Status Mapping Incomplete
**Severity: MEDIUM — Status transitions may fail silently**

**DB enum `tm_cycle_status`:** `draft`, `planned`, `active`, `paused`, `in_progress`, `completed`, `archived` (7 values)

| File | Line | Issue |
|------|------|-------|
| `src/hooks/test-management/useTestCycles.ts` | 20–39 | `cycleStatusToDb()` only maps 5 statuses (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED, ARCHIVED). Missing: DRAFT, ACTIVE, PAUSED. Return type incorrectly specifies only 4 values. Default fallback to `'planned'` masks failures. |
| `src/features/test-cycles/types/cycle-config.ts` | — | FSM transitions use `active` as primary running state, but existing cycle data uses `in_progress`. Both are valid enum values, but inconsistency causes confusion. |

**Decision needed:** Standardize on `in_progress` (matches seed data) or `active` (matches FSM config). Pick one.

---

### GAP 6 — `tm_get_requirement_test_cases` References Dead Table
**Severity: MEDIUM — Function will throw at runtime**

| File | Lines | Issue |
|------|-------|-------|
| `supabase/migrations/20260121133047_ff6a1d9a-...sql` | 145–157 | `tm_get_requirement_test_cases()` references `tm_test_executions` which was never created as a table. Latest `tm_get_traceability_matrix` was fixed (migration `20260403212041`) but this function was NOT. |

---

### GAP 7 — Legacy Table Name References
**Severity: LOW — Config/spec files only, not active queries**

| File | Lines | Issue |
|------|------|-------|
| `src/utils/releaseModuleCompleteSpec.ts` | 168, 249, 267, 424, 761, 936, 1259 | References `test_cases` instead of `tm_test_cases` |
| `src/pages/testhub/ImportExportPage.tsx` | 53, 113, 230 | Uses `test_cases` as UI config key |

---

### GAP 8 — Dummy UUID in Traceability Call
**Severity: LOW — Verification page only**

| File | Line | Issue |
|------|------|-------|
| `src/pages/testhub/TestHubVerifyPage.tsx` | 141 | Falls back to `'00000000-0000-0000-0000-000000000000'` for `tm_get_traceability_matrix` when no project found. Acceptable as defensive coding on a diagnostic page. |

---

### GAP 9 — `get_my_stats` Empty String Fallback
**Severity: LOW — Verification page only**

| File | Line | Issue |
|------|------|-------|
| `src/pages/testhub/TestHubVerifyPage.tsx` | 149 | Passes `p_user_id: user?.id ?? ''` — empty string is not a valid UUID. Should guard with early return if no user. |

---

## FULL FILE INVENTORY — What Needs Fixing

### Priority 1: Schema Split Resolution (GAP 3)
**Decision required from Vikram:** Consolidate on `tm_*` OR `th_*`. Cannot fix individual queries until this is decided.

If consolidating on `tm_*` (recommended — it's the canonical schema per CLAUDE.md):
- Update `get_dashboard_stats` RPC to query `tm_*` tables
- Update `get_my_stats` RPC to query `tm_cycle_scope` + `tm_test_runs`
- Update `CreateTestCaseModal.tsx` to write to `tm_test_cases`
- Update `ViewTestCaseModal.tsx` to read steps from `tm_test_steps` (if that table exists) or create migration
- Update `ChangeStatusModal.tsx` to use `tm_test_cases`
- Update `ImportModal.tsx` to use `tm_test_cases`

If consolidating on `th_*`:
- Rewrite all 195+ `tm_*` query sites to use `th_*` tables
- Update all hooks, pages, and components
- This is a much larger effort

### Priority 2: Broken Column References (GAPs 1, 2, 4)

| File | Fix |
|------|-----|
| `src/pages/testhub/TestHubExecutionPage.tsx:160` | Replace `objective` → `description`, `priority` → `priority_id` or join, `type` → `case_type_id` or join |
| `src/pages/testhub/TestCycleDetailPage.tsx:106` | Replace `priority` → join to `tm_case_priorities`, `type` → join to `tm_case_types` |
| `src/pages/testhub/RequirementDetailPage.tsx:84` | Replace `priority` → `priority_id` or join |
| `src/pages/testhub/TestRunsPage.tsx:68` | Replace `priority` → `priority_id` or join |
| `src/hooks/test-cycles/useSmartAssignment.ts:90` | Replace `priority` → `priority_id` or join |
| `src/components/testhub/requirements/LinkTestCaseModal.tsx:42` | Replace `priority` → `priority_id` or join |
| `src/hooks/test-management/useTestPlans.ts:197` | Replace `key` → `case_key`, `type_id` → `case_type_id` |
| `src/pages/testhub/TestHubDashboardPage.tsx:59-62` | Rewrite to join `tm_test_runs` for execution data, not `tm_cycle_scope` |
| `src/hooks/test-cycles/useCalendarData.ts:44-49` | Fix `cycle_id` → join through `tm_cycle_scope.cycle_id` |

### Priority 3: FSM & RPC Fixes (GAPs 5, 6)

| File | Fix |
|------|-----|
| `src/hooks/test-management/useTestCycles.ts:20-39` | Add DRAFT, ACTIVE, PAUSED to status map |
| Migration needed | Fix `tm_get_requirement_test_cases` to use `tm_cycle_scope` |

---

## QUERIES CONFIRMED VALID (Corrected From Initial Analysis)

These were initially flagged as broken but are actually **VALID** after later migrations:

| Query | Why Valid |
|-------|----------|
| `tm_cycle_scope.priority` | Added in migration `20260125072554` |
| `tm_cycle_scope.due_date` | Added in migration `20260125072554` |
| `tm_cycle_scope.updated_at` | Added in migration `20260125072554` |
| `tm_test_cycles.in_progress_count` | Added in migration `20260125093803` |

---

## SUMMARY SCORECARD

| Gap | Severity | Category | Blocking? |
|-----|----------|----------|-----------|
| GAP 3: Schema split (tm_ vs th_) | CRITICAL | Architecture | YES — must decide before other fixes |
| GAP 1: Wrong tm_test_cases columns | HIGH | Broken queries | YES — 400 errors in 7 files |
| GAP 2: executed_by FK on tm_cycle_scope | HIGH | Broken query | YES — dashboard broken |
| GAP 4: useCalendarData wrong join | MEDIUM | Broken query | Partial — calendar view |
| GAP 5: FSM status mapping | MEDIUM | Logic bug | No — fallback masks it |
| GAP 6: Dead table in RPC | MEDIUM | DB function | Depends on usage |
| GAP 7: Legacy table names in specs | LOW | Cleanup | No |
| GAP 8: Dummy UUID fallback | LOW | Defensive code | No |
| GAP 9: Empty string p_user_id | LOW | Edge case | No |

**Total gaps: 9 (2 CRITICAL/HIGH blocking, 3 MEDIUM, 4 LOW)**
