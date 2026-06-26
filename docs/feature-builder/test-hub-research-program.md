# Test Hub — Feature Builder Research Program

**Version:** 1.0  
**Date:** 2026-06-25  
**Protocol:** docs/feature-builder/catalyst-feature-builder-protocol.md  
**Benchmark product:** AIO Tests (Atlassian Marketplace app)  
**PDF source:** `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/` (152 PDFs)  
**DB schema:** `tm_*` tables on Supabase project `cyijbdeuehohvhnsywig` (staging)

---

## Research Objective

Build a Catalyst-native Test Hub that is **functionally superior to AIO Tests** in the context of Catalyst's existing work management data (Jira sync, ph_issues, RBAC, AI). Not a visual clone. A native product that uses Catalyst's data model, design system, and AI capabilities.

---

## What AIO Tests Is (Benchmark Product Summary)

AIO Tests is a Jira-integrated test management tool. Its core model:

**Entity hierarchy:**
```
Folder (tm_folders)
  └── Test Case (tm_test_cases)
        └── Test Step (tm_test_steps)
              └── Step Result (tm_step_results)
        └── Test Version (implicit in case_version field)

Test Set (tm_test_sets) — curated or smart collection of cases
  └── Set Member (tm_set_cases)

Test Cycle (tm_test_cycles) — execution container tied to sprint/release
  └── Cycle Scope (tm_cycle_scope) — cases assigned to cycle with assignee
        └── Test Run (tm_test_runs) — one execution attempt per scope item
              └── Step Result (tm_step_results)
              └── Defect Link (tm_defect_links)

Defect (tm_defects) — issue raised during execution, optionally linked to Jira
```

**Lifecycle states:**
- Case status: `draft → active → deprecated → archived`
- Run status: `not_run → in_progress → passed → failed → blocked → skipped`
- Cycle status: `draft → active → completed → archived`
- Defect status: `open → in_progress → resolved → closed`

**Status cascade rules (from PDF "Rules of Status Updates"):**
- All steps pass → run = passed
- Any step fails → run = failed
- Any step blocked (no fails) → run = blocked
- Mix of skipped + all others pass → run = passed
- Run status → updates `tm_cycle_scope.current_status`
- Scope status aggregate → updates `tm_test_cycles` counts

---

## Current Catalyst Test Hub State (Baseline)

### What Exists (as of 2026-06-25)

| File | Size | State |
|---|---|---|
| `src/pages/testhub/DashboardPage.tsx` | 786B | Thin wrapper → ProjectDashboardPage mode='test' |
| `src/pages/testhub/MyWorkPage.tsx` | 1.6K | Thin wrapper → BacklogPage with testCasesSource |
| `src/pages/testhub/BoardPage.tsx` | 731B | Stub/placeholder |
| `src/pages/testhub/cycles/CyclesPage.tsx` | 33.8K | Exists — completeness unknown |
| `src/pages/testhub/cycles/CycleDetailPage.tsx` | 47.6K | Exists — completeness unknown |
| `src/pages/testhub/cycles/ExecutionPage.tsx` | 24.5K | Exists — completeness unknown |
| `src/pages/testhub/defects/DefectsPage.tsx` | 15.2K | Exists |
| `src/pages/testhub/reports/ReportsPage.tsx` | 10.6K | Exists |
| `src/pages/testhub/reports/ReportDetailPage.tsx` | 50.4K | Exists |
| `src/pages/testhub/repository/RepositoryPage.tsx` | 49.8K | Exists |
| `src/pages/testhub/repository/CaseDrawer.tsx` | 14.4K | Exists |
| `src/pages/testhub/repository/StepEditor.tsx` | 4.9K | Exists |
| `src/pages/testhub/sets/TestSetsPage.tsx` | 20.0K | Exists |
| `src/pages/testhub/sets/SetDetailPage.tsx` | 27.8K | Exists |
| `src/pages/testhub/traceability/TraceabilityPage.tsx` | 14.7K | Exists |

**Also exists:**
- `src/features/my-test-scope/` — typed types.ts, hooks, components (AI recommendation, workload analysis)
- `src/features/test-cycles/` — useCycleDetails hook
- `src/components/releases/test-case-detail/` — TestCasePropertiesPanel, TestCaseVersionHistory, TestCaseExecutionHistory
- `src/components/releases/test-cycles/` — CycleCard, CycleTableView, CycleCardEnhanced, CycleCalendarView

**Previously deleted:**
- `src/modules-dormant/testhub/` — old frontend reading `th_*` tables (legacy). DO NOT restore.

### What Is Not Yet Known (requires probing)

- [ ] Do existing pages read from `tm_*` or `th_*` tables? (CRITICAL)
- [ ] Do existing pages mount and render without crash?
- [ ] Which pages have actual data wiring vs placeholder JSX?
- [ ] Which hooks exist (`src/hooks/testhub/`) and do they SELECT from `tm_*`?
- [ ] Is the routing complete in `FullAppRoutes.tsx`?
- [ ] Is `TestHubLayout.tsx` built and used, or does each page have its own shell?
- [ ] Do `tm_*` tables have data on staging?

---

## Research Phase — Required Before Building

### R1. Code Archaeology (must complete first)

Run these probes BEFORE starting any experiment:

```bash
# Check which DB tables existing pages read from
grep -rn "from('th_\|from('tm_\|from(\"th_\|from(\"tm_" src/pages/testhub/ --include="*.tsx" --include="*.ts"

# Check if all routes registered
grep -n "testhub" src/FullAppRoutes.tsx 2>/dev/null || grep -rn "testhub" src/App.tsx src/components/layout/ --include="*.tsx"

# Check hooks directory
ls src/hooks/testhub/ 2>/dev/null

# Check if TestHubLayout exists
find src -name "TestHubLayout*" 2>/dev/null

# TypeScript errors in testhub files
npx tsc --noEmit 2>&1 | grep "testhub\|pages/testhub"

# ADS violations in current testhub
node design-governance/rules/audit.js src/pages/testhub/ 2>&1 | tail -30
```

### R2. DB Schema Probe (staging)

```sql
-- Run via: supabase db query --linked "<sql>"

-- What tm_ tables exist?
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'tm_%'
ORDER BY table_name;

-- Row counts (are they populated?)
SELECT 'tm_test_cases' AS t, count(*) FROM tm_test_cases
UNION ALL SELECT 'tm_test_cycles', count(*) FROM tm_test_cycles
UNION ALL SELECT 'tm_test_runs', count(*) FROM tm_test_runs
UNION ALL SELECT 'tm_folders', count(*) FROM tm_folders
UNION ALL SELECT 'tm_test_sets', count(*) FROM tm_test_sets
UNION ALL SELECT 'tm_defects', count(*) FROM tm_defects;

-- Priority and type config (admin data)
SELECT * FROM tm_case_priorities ORDER BY sort_order;
SELECT * FROM tm_case_types ORDER BY name;
SELECT * FROM tm_environments ORDER BY name;
```

### R3. AIO Tests PDF Catalogue

**BLOCKER:** AIO Tests PDFs are in `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/`. These must be read and catalogued before the parity scorecard can be used accurately.

**Known PDF categories from handover document:**
1. Cases (9 PDFs: Creating, Edit Details, Edit Steps, Copy, Move, Delete, Archive, Quick View)
2. Case Versions (4 PDFs)
3. Folders (6 PDFs)
4. Test Cycles (8 PDFs: Creating, Editing, Copy, Move, Delete, Archive, Planning, Cycle Management from Jira)
5. Adding Cases to Cycles (5 PDFs)
6. Execution (8 PDFs: Overview, Capturing Results, Defects & Evidence, Bulk Actions, etc.)
7. Test Sets (7 PDFs)
8. Reports (30+ PDFs)
9. Defects (3 PDFs)
10. Traceability (2 PDFs)
11. Grid Actions (3 PDFs)
12. My Work (1 PDF)
13. Admin: Custom Fields (2 PDFs)
14. Admin: Statuses (2 PDFs)
15. Admin: Notifications (2 PDFs)
16. Audit Log (1 PDF)
17. Export / Import (3 PDFs)
18. CATY AI Integration (1 PDF)

**Action required from Vikram/Aiden:** Provide read access to the PDF directory OR export key PDFs as text/markdown for the Builder to read. Without this, parity scores will be estimates only.

---

## Experiment Queue (Priority Order)

### Phase 1 — Core Loop (must pass before Phase 2)

| # | Experiment | Slice | Blocked by |
|---|---|---|---|
| 001 | Baseline audit | Read all existing pages, run scorecard | none |
| 002 | DB schema verify | Confirm tm_* tables + row counts on staging | 001 |
| 003 | Routing audit | Confirm all routes registered, TestHubLayout | 001 |
| 004 | Repository page — read path | RepositoryPage renders folder tree + case list from tm_* | 002, 003 |
| 005 | Repository page — case drawer | CaseDrawer create/edit with steps | 004 |
| 006 | Repository page — CRUD | copy/move/archive/delete cases | 005 |
| 007 | Cycles page — list | CyclesPage with JiraTable from tm_test_cycles | 003 |
| 008 | Cycle detail — scope | CycleDetailPage: scope list, add/remove cases | 007 |
| 009 | Execution runner — step view | ExecutionPage: left list + right step runner | 008 |
| 010 | Execution runner — status cascade | pass/fail/block/skip → auto run status | 009 |
| 011 | Execution runner — defect modal | raise defect from failed step | 010 |
| 012 | Dashboard — KPI cards | 4 metric cards from tm_* (not th_*) | 002 |
| 013 | My work — execution queue | cases assigned to current user in active cycles | 008 |

### Phase 2 — Full Coverage

| # | Experiment | Slice | Blocked by |
|---|---|---|---|
| 014 | Test sets — static | create/edit/delete static set, add/remove cases | 004 |
| 015 | Test sets — smart | smart set with query builder | 014 |
| 016 | Case versions | version history, version picker for cycle | 006 |
| 017 | Defects module | defects list, defect detail, link to Jira | 011 |
| 018 | Traceability | Jira issue → test cases coverage | 004, 017 |
| 019 | Bulk actions | bulk pass/fail/assign/archive | 010 |
| 020 | Grid actions | search + filter + sort + column picker across all lists | 004, 007 |
| 021 | Import results | CSV upload → tm_step_results | 010 |
| 022 | Export cycle report | PDF/CSV from tm_* data | 010 |
| 023 | Export Gherkin | test steps → .feature file | 006 |

### Phase 3 — Reports + Admin + AI

| # | Experiment | Slice | Blocked by |
|---|---|---|---|
| 024 | Reports — base | first 5 report types rendering from tm_* | 010 |
| 025 | Reports — full 24 | remaining 19 report types | 024 |
| 026 | Admin — priorities/types | TestPrioritiesPage, TestTypesPage | 001 |
| 027 | Admin — statuses | TestStatusesPage, RunStatusesPage | 026 |
| 028 | Admin — environments | TestEnvironmentsPage | 026 |
| 029 | Admin — custom fields | CustomFieldsPage, field configs | 027 |
| 030 | Admin — notifications | email notification settings | 026 |
| 031 | Admin — audit log | tm_audit_log view | 026 |
| 032 | CATY — suggest cases | AI suggest test cases from work item description | 012 |
| 033 | CATY — summarize run | AI summarize execution results | 012 |
| 034 | Offline execution | localStorage queue + sync on reconnect | 010 |

---

## Catalyst Advantages Over AIO Tests (Build Towards These)

These are Catalyst-specific superiorities to target — not present in AIO Tests:

1. **Native AI test generation** — CATY can suggest test cases from Jira issue descriptions using the existing Gemini API key. AIO Tests has basic AI but Catalyst's context (full Jira data + sprint data) produces better suggestions.

2. **AI execution summary** — After a cycle completes, CATY summarizes: X passed, Y failed, patterns in failures, linked defects risk. AIO Tests has no post-execution AI summary.

3. **Cross-hub traceability** — Catalyst can link test cases to Business Requests (producthub), Epics, Features, Stories, Incidents (incidenthub) via ph_issues. AIO Tests only links to Jira issues.

4. **R360 assignment intelligence** — Catalyst knows team capacity (resource_inventory). Test assignment can factor in workload. AIO Tests assigns blindly.

5. **Release integration** — Catalyst test cycles can be tied to release milestones (releases hub). Coverage gating at release level. AIO Tests cycles are sprint-only.

6. **My Test Scope** — AI-ranked personal execution queue (already specified in `src/features/my-test-scope/types.ts` with priority scoring algorithm). AIO Tests has basic "my work."

---

## AIO Tests Gaps (Opportunities to Differentiate)

- No AI test case generation from work item description
- No AI execution summary
- No cross-module traceability (only Jira → test, not BR → test)
- No capacity-aware assignment
- Reports are static/predefined only (no custom report builder)
- No dark mode
- No keyboard-first execution (accessibility gap)

---

## What NOT to Build

From TESTHUB_BUILD_HANDOVER.md:
- ❌ Story Points field in test context
- ❌ Program Increment pickers (use sprint/iterations only)
- ❌ `th_*` table reads (legacy, deleted)
- ❌ Notion integration in test module
- ❌ Development/Automation sections (Jira-specific)
- ❌ Assessment Feature, Service Now# custom fields
- ❌ Offline execution until Phase 3 (complex, deprioritized)

---

## Approval Gates

The following require Vikram approval before implementation:

- [ ] New DB column on any `tm_*` table
- [ ] New `tm_*` table
- [ ] New edge function for test AI features
- [ ] Modification of `useTypeWorkflow.ts` WORK_ITEM_TYPES (admin integration)
- [ ] New admin sidebar section
- [ ] Any route rename

Start experiments 001–003 (baseline + audit + DB verify) without approval — these are read-only.
