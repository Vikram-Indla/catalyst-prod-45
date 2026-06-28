# Phase 1 — Current State Discovery
**Feature Work ID:** CAT-TESTHUB-REPORTS-20260627-001  
**Date:** 2026-06-27

---

## Route Inventory
All routes under `/testhub/` confirmed — see preflight doc.  
Reports routes: `/testhub/reports` (tile grid) + `/testhub/reports/:type` (detail page).

## Component Inventory

### Existing report components (src/pages/testhub/reports/)
| File | Purpose |
|---|---|
| `ReportsPage.tsx` | Tile grid (22 report cards grouped by category) |
| `ReportDetailPage.tsx` | Individual report renderer — 22 reports, real Supabase queries, plain tables |

### Support components used
| Component | Source |
|---|---|
| `ProjectPageHeader` | `src/components/layout/ProjectPageHeader.tsx` |
| `TestHubSidebar` | `src/components/layout/TestHubSidebar.tsx` |
| `@atlaskit/spinner` | Spinner during loads |
| `@atlaskit/button/standard-button` | Save report action |
| `@tanstack/react-query` | Data fetching + caching |

### Missing from current reports UI
- No charts (all data shown as plain HTML tables)
- No left navigator (tile grid → separate page navigation)
- No persistent filter bar (date range only, per-page)
- No KPI ribbon beyond 4 basic metrics
- No AI insight panel
- No formula drawer
- No skeleton loading states (only Spinner)
- No empty states with guidance

## Data Model Inventory

### Confirmed tables (queried in existing report hooks)
| Table | Fields used | Purpose |
|---|---|---|
| `tm_projects` | `id`, `name` | Project scoping |
| `tm_test_cases` | `id`, `title`, `case_key`, `status`, `linked_work_item_id`, `project_id` | Case data |
| `tm_test_cycles` | `id`, `name`, `status`, `start_date`, `end_date`, `project_id`, `created_at` | Cycle data |
| `tm_test_runs` | `id`, `status`, `executed_at`, `executed_by`, `test_case_id`, `cycle_id` | Execution runs |
| `tm_cycle_scope` | `cycle_id`, `test_case_id`, `execution_status` | Cycle↔case scope + status |
| `tm_defects` | `id`, `title`, `severity`, `status`, `defect_key`, `created_at`, `project_id` | Defects |
| `tm_defect_links` | `test_run_id` → `tm_test_runs` → `tm_test_cases` | Defect↔case linkage |
| `tm_saved_reports` | `name`, `type`, `filters`, `project_id` | Saved report configs |
| `ph_issues` | `id`, `issue_key`, `summary` | Jira/work items for traceability |
| `profiles` | `full_name` | User display names |

### Tables referenced in testhub hooks (discovered via grep)
- `tm_test_sets`, `tm_set_cases` — test sets
- `tm_folders` — folder tree
- `tm_test_steps`, `tm_step_results` — step-level execution
- `tm_case_labels`, `tm_case_priorities`, `tm_case_types` — case metadata
- `tm_environments`, `tm_labels` — admin config
- `tm_attachments` — file attachments
- `tm_requirement_links`, `tm_requirement_tests` — requirement traceability (alternative model)
- `tm_comments` — case/run comments

### NOT confirmed (not found in any query):
- `test_cases`, `test_cycles`, `test_executions` — these are NOT the table names; all tm_ prefixed
- `defects` — NOT the table name; it's `tm_defects`
- `releases`, `products` — not used in testhub directly; uses `ph_issues` for traceability

## Existing Hooks/Services
| Hook | File | Purpose |
|---|---|---|
| `useTestCycles` | `src/hooks/test-management/` | Cycle CRUD |
| `useTestCases` | `src/hooks/test-management/` | Case CRUD |
| `useDefects` | `src/hooks/test-management/` | Defect CRUD |
| `useFolderTree` | `src/hooks/test-management/` | Folder hierarchy |
| `useProjects` | `src/hooks/test-management/` | TM project scoping |
| `useAdminConfig` | `src/hooks/test-management/` | Priorities/types/envs |
| Report hooks | `ReportDetailPage.tsx` (inline) | All 22 report queries inline |

**Note:** All report hooks are currently inline in ReportDetailPage. Phase 4 will extract them to a service layer.

## Existing UI Patterns to Reuse
1. `ProjectPageHeader` — breadcrumb + title + actions
2. `TestHubSidebar` nav pattern (left sidebar, grouped items)
3. `StatusBadge` component (already in ReportDetailPage — will extract)
4. `DateRangePicker` (already in ReportDetailPage — will extract)
5. ADS token usage pattern (already correct in reports code)
6. `@tanstack/react-query` caching with `staleTime`

## Existing Gaps
1. **No charts** — recharts installed but unused in testhub
2. **No command center layout** — tile grid → separate pages, not a unified canvas
3. **No AI insight** — no Gemini integration in testhub reports
4. **No formula transparency** — calculations buried in data hooks
5. **No export** — exportDefects.ts exists but not wired to reports
6. **No skeleton loading** — Spinner only
7. **No saved filter views** — tm_saved_reports exists but only saves type+dateRange
8. **No multi-project scoping** — always picks first project alphabetically

## Screenshots of Current Reports
*Lab route will capture screenshots. Current page captures require dev server.*

## Console Errors
*To be captured in Phase 7 evidence.*

## Current Report Screen Limitations
1. Each report opens as a new page — no persistent context
2. 200-row hard limit on execution history queries
3. `linked_work_item_id` on tm_test_cases — traceability only works if cases are linked to ph_issues; coverage % not calculated
4. Burndown/burnup show cumulative totals, not remaining-vs-ideal (not true burndown)
5. Multi-cycle detail truncated at 500 scope rows
6. No priority/folder/assignee filter in reports
7. No blocked count in case-distribution (only status field tracked)
