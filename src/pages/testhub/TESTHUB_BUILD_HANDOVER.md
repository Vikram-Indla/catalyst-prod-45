# Test Module — Build Handover

**Status:** Planning complete. Awaiting implementation start.  
**Next conversation must start building Phase 1 immediately.**

---

## Acceptance Criteria (Non-Negotiable)

**Every PDF in this folder must be covered, wired, and manually testable:**

```
/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/   ← 152 PDFs
```

Vikram will take each PDF and run the manual test. Feature is NOT done until:
1. Every user action described in the PDF works end-to-end
2. Data persists to `tm_*` tables (verify with Supabase MCP SELECT after each action)
3. Admin panel configuration drives the UI (change a priority → it reflects everywhere)

No "coming soon." No placeholders. No partial wiring.

---

## What Was Deleted and Why

Previous frontend at `src/modules-dormant/testhub/` was deleted (commit: `feat(testhub): delete all testhub frontend code for clean rebuild`) because:
- Read from `th_*` tables (legacy), wrote to `tm_*` tables → always empty
- 9 of 14 routes were "coming soon" placeholders
- Dashboard RPCs (`get_dashboard_stats`) read `th_*` — always returned 0

**Dormant shell still exists at:** `src/modules-dormant/testhub/TestHubPage.tsx`  
Route registered in `src/components/layout/SidebarBase.tsx` line ~180:  
`'/testhub': () => import('../../modules-dormant/testhub/TestHubPage')`  
**Replace this import on Phase 1 start.**

---

## Database — Use tm_* Only

**NEVER read or write to `th_*` tables from the new UI.** They are legacy artifacts.

### All tables to use:

| Table | Purpose | Key columns |
|---|---|---|
| `tm_folders` | Folder tree | `name, parent_id, path, depth, project_id` |
| `tm_test_cases` | Cases | `case_key, title, status, priority_id (UUID FK), case_type_id (UUID FK), linked_work_item_id, version` |
| `tm_test_steps` | Steps per case | `step_number, action, expected_result, test_data` |
| `tm_test_sets` | Sets | `name, is_smart, smart_query` |
| `tm_set_cases` | Set membership | `test_set_id, test_case_id, sort_order` |
| `tm_test_cycles` | Cycles | `cycle_key, name, status, sprint_id, environment_id` ← NO pi_id |
| `tm_cycle_scope` | Cases in cycle | `cycle_id, test_case_id, assigned_to, current_status` |
| `tm_test_runs` | Execution runs | `scope_id, cycle_id, case_id, run_number, status, executed_by` |
| `tm_step_results` | Per-step outcome | `run_id, step_id, status, actual_result, executed_at` |
| `tm_defects` | Defects | `defect_key, title, severity, status, external_id, external_url` |
| `tm_defect_links` | Defect ↔ run | `defect_id, test_run_id, step_result_id` |
| `tm_case_priorities` | Priority config | `name, level, color, sort_order` — admin managed |
| `tm_case_types` | Type config | `name, icon, color` — admin managed |
| `tm_environments` | Environment config | `name, url, is_default` — admin managed |
| `tm_labels` | Labels | `name, color` |
| `tm_case_labels` | Case ↔ label | junction |

### Critical query pattern:
```typescript
// CORRECT — priority_id is UUID FK, never text
supabase
  .from('tm_test_cases')
  .select('*, priority_ref:tm_case_priorities(name, color, level), type_ref:tm_case_types(name, icon)')

// WRONG — there is no 'priority' text column
row.priority  // ← always undefined, silent bug
```

### No program increments:
`tm_test_cycles` has a `sprint_id` column → FK to `iterations.id`. Use this only.  
No `pi_id`. No program increment pickers anywhere. Ignore PI entirely.

### Status rules (auto-cascade, from PDF "Rules of Status Updates"):
- All steps pass → run status = `passed`
- Any step fails → run status = `failed`
- Any step blocked → run status = `blocked` (if no fails)
- Any step skipped and rest pass → run status = `passed`
- Run status triggers update to `tm_cycle_scope.current_status`
- Cycle counts (`passed_count`, `failed_count`, etc.) update via DB trigger or after each run save

---

## Admin Module Integration (Mandatory — Not Optional)

### Existing admin tables/hooks to extend:

**`src/hooks/useTypeWorkflow.ts` — `WORK_ITEM_TYPES` array**  
Add test types so they appear in `/admin/workflows` status board:
```typescript
// Add to WORK_ITEM_TYPES:
'Test Case',
'Test Run',
'Defect (Test)',
```
These use `ph_workflow_statuses` + `ph_workflow_type_statuses` — same tables as project types.  
Do NOT create separate status tables for test types. Reuse existing workflow system.

**`/admin/hierarchy-mapping` (`/admin/workhub/jira-connection`)**  
Register test entity hierarchy so Catalyst understands the parent/child relationships:
- Test Cycle → contains → Test Case (via `tm_cycle_scope`)
- Test Case → contains → Test Step
- Test Run → belongs to → Test Cycle Scope

### New admin section to ADD to `AdminSidebar.tsx`:

Add new collapsible section **"Test module"** with these items:

| Nav label | Path | DB table | CRUD |
|---|---|---|---|
| Case priorities | `/admin/test/priorities` | `tm_case_priorities` | CRUD |
| Case statuses | `/admin/test/statuses` | enum + config | CRUD |
| Case types | `/admin/test/types` | `tm_case_types` | CRUD |
| Run statuses | `/admin/test/run-statuses` | enum + config | CRUD |
| Environments | `/admin/test/environments` | `tm_environments` | CRUD |
| Custom fields | `/admin/test/custom-fields` | `tm_custom_fields` | CRUD |
| Project permissions | `/admin/test/permissions` | `tm_user_roles` | CRUD |
| Notifications | `/admin/test/notifications` | config table | CRUD |

**Pattern to follow:** `src/pages/admin/workflows/WorkflowAdminPage.tsx`  
Use same: `AdminGuard`, `PortalMenu` (portal dropdown pattern), `@atlaskit/dropdown-menu` avoided inside overflow containers.

### Icons for admin test types:
Register test icons in `src/lib/test-item-type-icons.tsx` (new file, mirrors `src/lib/jira-issue-type-icons.tsx`):

| Type | Icon description | SVG color |
|---|---|---|
| Test case | Blue flask / beaker | `#0052CC` |
| Test cycle | Purple loop/refresh | `#6554C0` |
| Test set | Teal grid 2×2 | `#00B8D9` |
| Test run | Green play triangle | `#36B37E` |
| Defect | Red bug/radiate | `#DE350B` |
| Requirement link | Amber doc+checkmark | `#FF8B00` |

All icons: inline SVG only. No Lucide. No external icon library.

---

## Routing

Hub entry (already registered, DO NOT change):
```
/testhub/dashboard       → Dashboard
/testhub/my-work         → My work
/testhub/repository      → Test case repository (with folder tree)
/testhub/sets            → Test sets
/testhub/cycles          → Test cycles list
/testhub/cycles/:id      → Cycle detail
/testhub/cycles/:id/execute  → Execution runner
/testhub/defects         → Defects list
/testhub/traceability    → Traceability matrix
/testhub/reports         → Reports hub
/testhub/reports/:type   → Specific report

Admin routes (new):
/admin/test/priorities
/admin/test/statuses
/admin/test/types
/admin/test/run-statuses
/admin/test/environments
/admin/test/custom-fields
/admin/test/permissions
/admin/test/notifications
```

Register all in `src/components/routing/FullAppRoutes.tsx` — find existing testhub block and replace dormant import.

---

## Hooks Structure

New hooks go in `src/hooks/testhub/` (one file per entity):
```
src/hooks/testhub/
  useFolders.ts          → tm_folders CRUD
  useTestCases.ts        → tm_test_cases CRUD + filter/sort
  useTestSteps.ts        → tm_test_steps CRUD
  useTestSets.ts         → tm_test_sets + tm_set_cases
  useTestCycles.ts       → tm_test_cycles CRUD
  useCycleScope.ts       → tm_cycle_scope + assignments
  useTestRuns.ts         → tm_test_runs + tm_step_results
  useDefects.ts          → tm_defects + tm_defect_links
  useTestPriorities.ts   → tm_case_priorities (admin)
  useTestTypes.ts        → tm_case_types (admin)
  useEnvironments.ts     → tm_environments (admin)
  useTestLabels.ts       → tm_labels + tm_case_labels
  useTraceability.ts     → ph_issues ↔ tm_test_cases (linked_work_item_id)
  useTestDashboard.ts    → aggregate stats from tm_* directly (NOT th_* RPCs)
```

Query key pattern: `['test', 'cases', projectId]`, `['test', 'cycles', cycleId]`, etc.

---

## Feature Coverage by PDF Category

### 1 — Cases (PDFs: Creating, Edit Details, Edit Steps, Copy, Move, Delete, Archive, Quick View)
**File:** `src/pages/testhub/repository/RepositoryPage.tsx`
- JiraTable with columns: TC-key, title, type, status, priority, assignee, created
- Left: folder tree (`tm_folders`, self-referential, unlimited depth)
- Create case drawer: title, description, preconditions, expected result, steps editor
- Steps editor: numbered rows, drag-reorder, add/delete steps
- `priority_id` → UUID FK to `tm_case_priorities` (dropdown populated from table, NOT enum)
- `case_type_id` → UUID FK to `tm_case_types`
- `linked_work_item_id` → FK to `ph_issues` (work item linker)
- Copy case: duplicate all steps, increment case_key
- Move case: change `folder_id`
- Archive: set `archived_at = now()`, filter from default view
- Delete: hard delete (no children in scope)

### 2 — Case Versions (PDFs: Creating New Versions, Viewing Different Versions, Adding Version to Cycle/Set)
**CRITICAL: Version system required.** `tm_test_cases.version` increments on each saved version.  
Need `tm_case_versions` table (snapshot of case + steps at each version):

```sql
-- Migration needed:
CREATE TABLE tm_case_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  test_case_id uuid NOT NULL REFERENCES tm_test_cases(id),
  version_number integer NOT NULL,
  title varchar(500),
  description text,
  preconditions text,
  steps jsonb,  -- snapshot of steps at this version
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

Version selector in case detail panel. Add specific version to cycle/set (not always latest).

### 3 — Folders (PDFs: Creating, Renaming, Moving, Reordering, Deleting, Entity-Specific Actions)
- Folder tree uses `tm_folders.path` (materialized path for fast subtree queries)
- Context menu (right-click or ⋯) on folder: Rename, Move, Delete, New subfolder
- Entity-specific actions: different options when right-clicking folder vs case node
- Drag-reorder folders: update `sort_order`

### 4 — Test Cycles (PDFs: Creating, Editing, Copy, Move, Delete, Archive, Planning, Cycle Management from Jira)
**File:** `src/pages/testhub/cycles/CyclesPage.tsx`
- List: CY-key, name, sprint, environment, status, progress bar, dates
- Create cycle: name, description, sprint picker (from `iterations` table), environment picker, date range
- NO program increment picker
- Planning view: show which cases are assigned to whom with status
- Cycle copy: duplicate scope + assignments
- Move cycle: change project/folder
- Archive: set `archived_at`
- Cycle status FSM: `not_started → in_progress → paused → completed / cancelled`

### 5 — Adding Cases to Cycles (PDFs: Add Case, Add Multiple Cases, From Jira Issue, Changing Scope, Assignments)
- Cycle detail page: Scope tab shows assigned cases
- "Add cases" dialog: browse folder tree, checkbox-select cases (or versions)
- Bulk assign: select multiple scope entries → assign to team member
- Changing scope: add/remove cases mid-cycle
- From Jira issue: if `linked_work_item_id` matches, show "Add to cycle" from work item panel

### 6 — Execution (PDFs: Overview, Capturing Results, Defects & Evidence, Bulk Actions, Changing Scope, Rules of Status Updates, Offline, Dataset-Based)
**File:** `src/pages/testhub/cycles/ExecutionPage.tsx`
- Left panel: case list with current status chips, filter by run status
- Right panel: step runner
  - Step: action + expected result (read-only) + actual result text (editable) + status buttons
  - Status buttons: Pass ✓ | Fail ✗ | Block ⊘ | Skip →
  - After last step: auto-calculate run status (rules from PDF)
- Raise defect inline: opens defect form modal pre-filled with step info, creates `tm_defects` + `tm_defect_links`
- Evidence: upload screenshot/file per step result (`tm_attachments` if table exists, else add migration)
- Bulk actions on scope: mark all as pass, reassign, skip all
- Move runs: reassign scope items to different cycle
- Offline mode: local storage queue, sync on reconnect (Phase 3)
- Dataset-based: case has `custom_fields.dataset` (array of parameter sets), execution iterates through each row

### 7 — Test Sets (PDFs: Understanding, Creating, Editing, Copying, Moving, Deleting, Adding to/from Sets)
**File:** `src/pages/testhub/sets/SetsPage.tsx`
- Two types: Static (manual case list) and Smart (saved filter query in `smart_query` jsonb)
- Smart set: UI filter builder saves criteria to `tm_test_sets.smart_query`
- Add cases to set: same folder browser as cycle
- Add set to cycle: one-click "Add set" in cycle scope management
- Copy/move/delete sets + bulk delete multiple

### 8 — Reports (PDFs: 30+ report types)
**File:** `src/pages/testhub/reports/ReportsPage.tsx` + `/reports/:type`

All reports query `tm_*` tables directly — NO `th_*` RPCs.

| Report | Data source | Chart type |
|---|---|---|
| Project overview | `tm_test_cycles` + `tm_test_runs` aggregate | Summary cards |
| Execution burndown | `tm_test_runs` by date | Line chart |
| Execution burn-up | Same, cumulative | Line chart |
| Execution overview | `tm_test_runs` status distribution | Pie/donut |
| Execution summary | Per-cycle pass/fail/blocked counts | Bar chart |
| Execution history | `tm_test_runs` over time | Table |
| Execution distribution | Status across cases | Stacked bar |
| Multi-cycle comparison | Multiple cycles side-by-side | Grouped bar |
| Multi-cycle summary | Aggregate across selected cycles | Table |
| Multi-cycle detail | Per-case across cycles | Matrix table |
| Multi-cycle distribution | Status distribution across cycles | Stacked bar |
| Case distribution | Cases by type/priority/status | Pie |
| Case usage | How many times each case executed | Table |
| Traceability summary | Req coverage % | Table |
| Traceability detail | Per-requirement case list | Expandable table |
| Defect summary | `tm_defects` by severity/status | Summary |
| Defect impact | Defects per cycle/case | Table |
| Defect trend | Opened vs closed over time | Line chart |
| Run distribution | Runs by executor | Bar |
| User activity | Actions per user | Table |
| Project activity | Timeline of changes | Feed |
| Project activity advanced | Filtered activity | Advanced table |
| Project top contributors | Users by run count | Leaderboard |
| Project metrics | KPI dashboard | Cards |
| Automation activity | Automated vs manual runs | Pie |

Save/Share/Schedule reports:
- Save: `tm_saved_reports` table (name, type, filters, created_by)
- Share: generate share URL with report params
- Schedule: cron config (Phase 3, Supabase pg_cron or edge function)

### 9 — Defects (PDFs: Defect Summary, Defect Impact, Defect Trend)
**File:** `src/pages/testhub/defects/DefectsPage.tsx`
- JiraTable: DF-key, title, severity, status, linked run, assignee, created
- Severity: critical / major / minor / trivial (from `tm_defect_severity` enum)
- Status FSM: open → in_progress → resolved → closed / reopened
- Link to Jira issue: `external_id` (Jira key) + `external_url` (deep-link)
- Defect detail panel (`CatalystViewBase`)

### 10 — Traceability (PDFs: Summary, Detail)
**File:** `src/pages/testhub/traceability/TraceabilityPage.tsx`
- Query `ph_issues` WHERE `issue_type IN ('Story', 'Feature', 'Epic')`
- For each issue: find all `tm_test_cases` WHERE `linked_work_item_id = issue.id`
- Coverage: Covered (≥1 passing run) / Partial (cases exist, not all pass) / None (no cases)
- Matrix table: rows = requirements, cols = coverage status
- Export RTM as CSV

### 11 — Grid Actions (PDFs: Grid Actions, Search/Filter/Sort, Customize Columns)
- All list views: JiraTable (never raw `<table>`, never `@atlaskit/dynamic-table` for work items)
- Bulk select checkbox → bulk action bar: assign, copy, move, delete, change status, add to cycle/set
- Search: instant filter on title/key
- Filter: status, priority, type, assignee, created date range, label
- Sort: any column, client-side for small lists, server-side for >200 rows
- Customize columns: column picker per entity (save to user preferences)

### 12 — My Work (PDF: My Work)
**File:** `src/pages/testhub/my-work/MyWorkPage.tsx`
- Cases assigned to `auth.uid()` in active cycles
- Status: not run / in progress / passed / failed / blocked
- Start run directly from this page (opens execution runner)
- Filter by cycle, status

### 13 — Admin: Custom Fields (PDFs: Understanding Custom Fields, Field Configurations)
- `tm_test_cases.custom_fields` jsonb column stores values
- Admin UI defines the schema: field name, type (text/number/date/select/multiselect/checkbox)
- Fields appear in case create/edit drawer based on admin config
- Path: `/admin/test/custom-fields`

### 14 — Admin: Statuses (PDFs: Customize Case Statuses, Customize Run Statuses)
Case statuses (default: draft, ready, approved, deprecated):
- Admin manages name, color, which is "initial"
- Stored in `tm_test_case_statuses` config table OR extend `ph_workflow_statuses` with `entity_type='test_case'`

Run statuses (default: not_run, in_progress, passed, failed, blocked, skipped):
- Admin manages name, color
- Stored in `tm_run_statuses` config table OR extend `ph_workflow_statuses` with `entity_type='test_run'`

**Preferred approach:** Extend existing `ph_workflow_statuses` + `ph_workflow_type_statuses` by adding test types to `WORK_ITEM_TYPES` in `src/hooks/useTypeWorkflow.ts`. Admin already works. Same board, same UX.

### 15 — Admin: Notifications (PDFs: Email Notifications, Email Preferences)
- Trigger events: case assigned, run assigned, cycle completed, defect raised, defect resolved
- Per-user preference: which events to receive
- Delivery: Supabase edge function → Resend API (already wired for other modules at `RESEND_API_KEY`)
- Config tables: `tm_notification_settings` (global), `tm_user_notification_prefs` (per user)

### 16 — Audit Log (PDF: Audit Log)
- Path: `/admin/test/audit`
- Log all CREATE/UPDATE/DELETE on `tm_test_cases`, `tm_test_cycles`, `tm_test_runs`, `tm_defects`
- Table: `tm_audit_log` (entity_type, entity_id, action, old_values jsonb, new_values jsonb, performed_by, performed_at)
- Implement via Postgres triggers or in hook mutation callbacks

### 17 — Export / Import (PDFs: Export to Feature Files, Import Results, Export Cycle Report)
- Export to feature files (Gherkin): generate `.feature` file from test steps
- Import results: CSV upload → parse → bulk insert into `tm_step_results`
- Export cycle report: PDF or CSV of cycle execution summary

### 18 — CATY AI Integration (PDFs: AI Usage Summary)
- Suggest test cases from work item description (Gemini API, existing `GEMINI_API_KEY`)
- Summarize execution run (what passed, what failed, patterns)
- AI usage log: `tm_ai_usage_log` (action, tokens_used, performed_by, performed_at)
- AI admin page: `/admin/test/ai-usage` — usage summary chart
- Use `src/assets/ask-caty-gradient.svg` for AI trigger button (NEVER purple/violet alternatives)
- Follow AIIntelligenceButton pattern from `src/components/ui/AIIntelligenceButton.tsx`

---

## Catalyst Component Rules (Mandatory)

All rules from CLAUDE.md apply. Key ones for this module:

1. **Tables:** JiraTable only. No raw `<table>`, no `@atlaskit/dynamic-table` for work item lists.
2. **Status:** CatalystStatusPill. No raw `<span>` with background color.
3. **Detail panels:** CatalystViewBase for any case/cycle/defect detail drawer.
4. **Right-rail fields:** CatalystSidebarDetails pattern.
5. **Dropdowns inside overflow containers:** portal dropdown pattern (createPortal + getBoundingClientRect). See CLAUDE.md 2026-06-13 lesson.
6. **Colors:** ADS tokens only. `var(--ds-*)` with hex fallback. No hardcoded hex.
7. **Fonts:** `var(--ds-font-family-body)`. No Google Fonts, no Fontsource.
8. **Icons:** Atlaskit icons or inline SVG registered in `src/lib/test-item-type-icons.tsx`. No Lucide.
9. **Work item icons:** Use `JiraIssueTypeIcon` for ph_issues icons. Use `TestItemTypeIcon` (new, from step above) for test entities.
10. **Menus:** `@atlaskit/dropdown-menu` where safe, portal menu where inside overflow ancestor.
11. **No "coming soon."** No placeholders. Everything built.
12. **Assumptions:** When data is null/undefined → render dash or nothing. Never render typed domain fallback (`|| 'draft'`, `|| 'Critical'`). Zero-assumption rule.
13. **Sprint picker:** query `iterations` table filtered by current `project_key`. No PI picker.

---

## Phase Execution Plan

### Phase 1 — Core loop (Sprint 1 — build first, accept nothing less)

Priority order — build in this sequence:

1. **Module shell**
   - Replace dormant import in `SidebarBase.tsx`
   - Register all routes in `FullAppRoutes.tsx`
   - Build `TestHubLayout.tsx` with sidebar nav (9 items)
   - Breadcrumb pattern

2. **Repository page** (`/testhub/repository`)
   - Folder tree left panel (`tm_folders`)
   - JiraTable right panel (`tm_test_cases`)
   - Create/edit case drawer with step editor
   - Copy / move / archive / delete

3. **Test cycles** (`/testhub/cycles`)
   - List with JiraTable
   - Create cycle with sprint picker from `iterations`
   - Cycle detail: add cases, assign users, view scope

4. **Execution runner** (`/testhub/cycles/:id/execute`)
   - Left: case list with status
   - Right: step runner with pass/fail/block/skip
   - Auto-calculate run status (rules from PDF)
   - Raise defect inline

5. **Dashboard** (`/testhub/dashboard`)
   - 4 KPI cards from `tm_*` direct queries (NOT `get_dashboard_stats` RPC — it reads `th_*`)
   - Active cycles with progress bars
   - My pending executions

6. **My work** (`/testhub/my-work`)
   - Cases assigned to current user in active cycles

### Phase 2 — Full feature coverage (Sprint 2)

1. Test sets (static + smart)
2. Case versions + version picker
3. Defects module (list + detail)
4. Traceability matrix
5. Bulk actions everywhere (copy/move/archive/delete multiple)
6. Grid actions (search, filter, sort, column picker)
7. Dataset-based test case execution
8. Import results (CSV)
9. Export to feature files (Gherkin)
10. Export cycle report

### Phase 3 — Reports + Admin + CATY (Sprint 3)

1. All 24 report types
2. Save / share / schedule reports
3. Admin: case priorities, types, statuses, run statuses, environments
4. Admin: extend `WORK_ITEM_TYPES` in `useTypeWorkflow.ts` with test types
5. Admin: custom fields + field configurations
6. Admin: project permissions
7. Admin: email notifications + preferences
8. Admin: audit log
9. CATY AI: suggest test cases from work item
10. CATY AI: summarize run results
11. AI usage summary admin page
12. Offline execution (local queue + sync)
13. Storage manager (uploaded evidence files)

---

## Files to Create (Phase 1 minimum)

```
src/
  pages/testhub/
    TESTHUB_BUILD_HANDOVER.md          ← this file
    TestHubLayout.tsx                  ← hub shell with sidebar
    dashboard/
      DashboardPage.tsx
    my-work/
      MyWorkPage.tsx
    repository/
      RepositoryPage.tsx               ← folder tree + JiraTable
      CaseDrawer.tsx                   ← create/edit case
      StepEditor.tsx                   ← drag-reorder steps
    cycles/
      CyclesPage.tsx                   ← cycles list
      CycleDetailPage.tsx              ← scope + assignments
      ExecutionPage.tsx                ← step runner
      DefectModal.tsx                  ← raise defect inline
    sets/
      SetsPage.tsx
    defects/
      DefectsPage.tsx
    traceability/
      TraceabilityPage.tsx
    reports/
      ReportsPage.tsx

  hooks/testhub/
    useFolders.ts
    useTestCases.ts
    useTestSteps.ts
    useTestCycles.ts
    useCycleScope.ts
    useTestRuns.ts
    useDefects.ts
    useTestDashboard.ts

  lib/
    test-item-type-icons.tsx           ← inline SVG icons for TC/CY/TS/RN/DF

  pages/admin/
    test/
      TestPrioritiesPage.tsx
      TestStatusesPage.tsx
      TestTypesPage.tsx
      RunStatusesPage.tsx
      TestEnvironmentsPage.tsx
      TestCustomFieldsPage.tsx
      TestPermissionsPage.tsx
      TestNotificationsPage.tsx
      TestAuditPage.tsx
      TestAIUsagePage.tsx
```

---

## Files to Modify (Phase 1)

| File | Change |
|---|---|
| `src/components/layout/SidebarBase.tsx` | Replace dormant testhub import with real `TestHubLayout` |
| `src/components/routing/FullAppRoutes.tsx` | Register all `/testhub/*` routes |
| `src/hooks/useTypeWorkflow.ts` | Add test types to `WORK_ITEM_TYPES` (Phase 3) |
| `src/pages/admin/AdminSidebar.tsx` | Add "Test module" collapsible section (Phase 3) |

---

## Supabase Project

ID: `lmqwtldpfacrrlvdnmld`  
URL: `https://lmqwtldpfacrrlvdnmld.supabase.co`

Verify tables exist before writing any hook:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'tm_%'
ORDER BY table_name;
```

If `tm_case_versions` or `tm_audit_log` or `tm_saved_reports` or `tm_notification_settings` are missing, write migrations first (`supabase/migrations/YYYYMMDD_tm_<name>.sql`).

---

## PDF-to-Feature Traceability Map

| PDF filename pattern | Feature | Phase |
|---|---|---|
| `Creating a Case`, `Edit Case Details`, `Edit Case Steps`, `Quick Case View` | Case CRUD | 1 |
| `Copy Cases`, `Copy Multiple Cases`, `Move Cases`, `Move Multiple Cases` | Bulk case ops | 1+2 |
| `Delete Cases`, `Delete Multiple Cases`, `Archive Multiple Cases` | Case archive/delete | 1 |
| `Creating Folders*`, `Renaming Folders`, `Moving Folders`, `Reordering Folders`, `Deleting folders`, `Entity Specific Folder Actions` | Folder management | 1 |
| `Creating a Cycle`, `Editing a Cycle`, `Copy Cycles*`, `Move Cycles`, `Delete Cycles*`, `Archive Cycles*` | Cycle CRUD | 1 |
| `Add Case to Cycle(s)`, `Add Multiple Cases to Existing Cycles`, `Planning a Cycle` | Add cases to cycle | 1 |
| `Manage Cases- Assignments`, `Manage Cases- Changing Scope`, `Manage Cases- Bulk Actions` | Cycle execution management | 1+2 |
| `Execute Case- Overview`, `Execute Case- Capturing Results`, `Execute Case- Defects & Evidence` | Execution runner | 1 |
| `Understanding Cycle Execution Tab Layout` | Execution layout | 1 |
| `Rules of Status Updates` | Auto-cascade status logic | 1 |
| `Filter Cases on Cycles by Run Status` | Execution filter | 1 |
| `AioTests-My Work` | My work page | 1 |
| `AioTests-Project Overview` | Dashboard | 1 |
| `Creating Sets`, `Editing Sets`, `Understanding Sets` | Test sets | 2 |
| `Copying Sets`, `Moving Sets`, `Deleting Sets`, `Delete Multiple Sets`, `Edit Multiple Set Details`, `Move Multiple Sets to a Folder` | Set operations | 2 |
| `Add Case to Set(s)`, `Add Multiple Cases to Existing Sets`, `Add Sets to Cycles`, `Adding a Cycle to a Set`, `Add Cycle(s) to Set`, `Add Multiple Sets to Cycles` | Set ↔ cycle/case | 2 |
| `Creating New Versions of Cases`, `Adding a Case Version to a Cycle`, `Adding Version of a Case to a Set`, `Viewing Different Versions of a Case on Jira Panel` | Case versioning | 2 |
| `Link Existing Cases`, `Unlinking Cases` | Work item linking | 2 |
| `Export to Feature Files` | Gherkin export | 2 |
| `Import Results`, `Execute Offline` | Bulk import / offline | 2 |
| `Executing a Dataset Based Case in a Cycle` | Dataset execution | 2 |
| `Move Runs` | Move runs between cycles | 2 |
| `AioTests-Grid Actions`, `Search, Filter & Sort Actions` | Grid + filter | 1+2 |
| `Customize Columns` | Column picker | 2 |
| `AioTests-AIO Tests Panel in Jira` | Work item test panel | 2 |
| `Executing a Single/Multiple Cases from Jira Issue`, `Cycles on Jira Panel`, `Cycle Management from Jira`, `Adding Single & Multiple Cases to Cycle/Set from Jira Issue`, `Viewing Case Executions` | Jira panel integration | 2 |
| `Understanding Reports`, `Creating Dynamic Reports`, `Saving Reports`, `Sharing Reports`, `Scheduling Reports` | Report framework | 3 |
| `Execution Burndown Report`, `Execution Burn-up Report`, `Execution Overview*`, `Execution Summary Report`, `Execution History Report`, `Execution Distribution*` | Execution reports | 3 |
| `Multi Cycle*` (5 reports) | Multi-cycle reports | 3 |
| `Case Distribution*`, `Case Usage Report` | Case reports | 3 |
| `Traceability Summary*`, `Traceability Detail*` | Traceability reports | 3 |
| `Defect Summary*`, `Defect Impact Report`, `Defect Trend Report` | Defect reports | 3 |
| `User Activity*`, `Project Activity*`, `Project Metrics Report`, `Project Top Contributors` | Project reports | 3 |
| `Automation Activity Report`, `Run Distribution Report` | Automation/run reports | 3 |
| `Customize Case Priorities`, `Customize Case Statuses`, `Customize Case Types`, `Customize Run Statuses` | Admin config | 3 |
| `Field Configurations`, `Understanding Custom Fields` | Custom fields admin | 3 |
| `AioTests-Project Permissions` | Permissions admin | 3 |
| `Email Notifications`, `Email Preferences` | Notifications | 3 |
| `AioTests-Audit Log` | Audit log | 3 |
| `AioTests-Storage Manager` | File storage admin | 3 |
| `AioTests-AI Usage Summary`, `AioTests-Advanced Options` | CATY AI admin | 3 |
| `AioTests-General Preferences`, `AioTests-Report Preferences`, `AioTests-Import Settings`, `AioTests-Theme` | Global preferences | 3 |
| `Export Cycle Report` | Cycle PDF/CSV export | 3 |
| `Open in New Window` | Full-page mode | 2 |

---

## What NOT to Build

- Program increment picker anywhere (Vikram: "ignore program increments")
- Notion integration (banned per CLAUDE.md)
- Story Points field
- MDT Ref, Service Now#, Assessment Feature
- Any Lucide icons
- Any Google Fonts / Fontsource packages
- Any `th_*` table reads or writes
- Any "coming soon" or placeholder page

---

## How to Start (First Lines of Next Conversation)

1. Read this file: `src/pages/testhub/TESTHUB_BUILD_HANDOVER.md`
2. Read docs: `docs/test-management-backend-spec.md` (full schema)
3. Read: `docs/TESTHUB_GAP_ANALYSIS.md` (dual schema problem RCA)
4. Run: verify `tm_*` tables exist in Supabase (`execute_sql` with `information_schema` query above)
5. Start Phase 1, Step 1: module shell + routing
6. Do NOT write any code that touches `th_*` tables
7. Do NOT create any "coming soon" pages
8. Reference PDF folder for each feature: `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/`
