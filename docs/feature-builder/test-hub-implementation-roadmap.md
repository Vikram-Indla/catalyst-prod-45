# Test Hub — Implementation Roadmap

**Version:** 1.0  
**Date:** 2026-06-25  
**Protocol:** docs/feature-builder/catalyst-feature-builder-protocol.md  
**Phase entry condition:** Research Phase (experiments 001-003) must complete first

---

## Pre-Build Gate (Research Phase)

These must complete before ANY code is written:

```
[ ] Experiment 001: Baseline code archaeology
    → Which existing pages read tm_* (not th_*)?
    → TypeScript error count in testhub?
    → ADS violations in testhub?

[ ] Experiment 002: DB schema + data verify
    → All tm_* tables exist on staging?
    → Any tables have rows? (need seed data for testing)
    → Priority/type/environment config populated?

[ ] Experiment 003: Routing + layout audit  
    → All routes registered in FullAppRoutes?
    → TestHubLayout built and mounted?
    → SidebarBase routing to correct entry?

[ ] AIO Tests PDF access (BLOCKING for parity score)
    → Need read access to /Users/vikramindla/Downloads/Catalyst/Catalyst Tests/
    → OR Vikram/Aiden to export key PDFs as text
    → Minimum needed: Cases, Cycles, Execution category PDFs
```

---

## Phase 1 — Core Loop (Minimum Viable Test Hub)

**Definition of done:** Vikram can create a test case, add it to a cycle, execute it step by step, mark pass/fail, and see the result on the dashboard. Data persists. No placeholders.

### Experiment 004 — Repository: Read Path
**Files:** `src/pages/testhub/repository/RepositoryPage.tsx`  
**Acceptance:**
- [ ] Folder tree renders from `tm_folders` (not hardcoded)
- [ ] Case list renders from `tm_test_cases` using JiraTable
- [ ] Priority renders from `tm_case_priorities` FK join (NOT `row.priority`)
- [ ] Type icon renders from `tm_case_types` FK join
- [ ] Empty state for both folder tree and case list
- [ ] ADS: 0 violations

**Reuse:** JiraTable, `makeKeyCell`, `makeStatusCell`, `CatalystStatusPill`

---

### Experiment 005 — Repository: Case Drawer (Create + Edit)
**Files:** `src/pages/testhub/repository/CaseDrawer.tsx`, `StepEditor.tsx`  
**Acceptance:**
- [ ] Create case: title, priority (from tm_case_priorities), type (from tm_case_types), folder
- [ ] Add test steps with action + expected result
- [ ] Reorder steps (drag handle)
- [ ] Save creates `tm_test_cases` + `tm_test_steps` rows
- [ ] Edit opens drawer pre-filled with existing data
- [ ] Link to Jira work item (ph_issues search)
- [ ] No `|| 'Critical'` or typed domain fallbacks in priority/type display
- [ ] ADS: 0 violations

**Reuse:** `CatalystViewBase` (drawer mode), `CatalystSidebarDetails`, `@atlaskit/textfield`

---

### Experiment 006 — Repository: CRUD (Copy/Move/Delete/Archive)
**Files:** `src/pages/testhub/repository/RepositoryPage.tsx`  
**Acceptance:**
- [ ] Copy case: creates new row in `tm_test_cases` + clones `tm_test_steps`
- [ ] Move case: updates `folder_id` in `tm_test_cases`
- [ ] Delete case: soft delete (sets `deleted_at` or similar)
- [ ] Archive case: sets `status = 'archived'`
- [ ] Context menu uses `@atlaskit/dropdown-menu` or portal pattern
- [ ] ADS: 0 violations

---

### Experiment 007 — Cycles: List
**Files:** `src/pages/testhub/cycles/CyclesPage.tsx`  
**Acceptance:**
- [ ] Cycle list renders from `tm_test_cycles` with JiraTable
- [ ] Status col renders `CatalystStatusPill`
- [ ] Sprint col joins `iterations` table
- [ ] Progress bar: passed_count/total_count from `tm_test_cycles`
- [ ] Create cycle: name + sprint picker (iterations FK) + status
- [ ] ADS: 0 violations

---

### Experiment 008 — Cycle Detail: Scope Management
**Files:** `src/pages/testhub/cycles/CycleDetailPage.tsx`  
**Acceptance:**
- [ ] Scope list renders from `tm_cycle_scope` JOIN `tm_test_cases`
- [ ] Add cases dialog: search `tm_test_cases`, bulk select, confirm
- [ ] Assign case to user (profile picker)
- [ ] Remove case from scope
- [ ] Status shows `current_status` from `tm_cycle_scope`
- [ ] ADS: 0 violations

---

### Experiment 009 — Execution: Step Runner (Read)
**Files:** `src/pages/testhub/cycles/ExecutionPage.tsx`  
**Acceptance:**
- [ ] Left panel: scope list (case key + title + current_status)
- [ ] Right panel: selected case's steps with action + expected
- [ ] Step status shows `tm_step_results.status` if run exists
- [ ] Step status = 'not_run' if no result yet
- [ ] ADS: 0 violations

---

### Experiment 010 — Execution: Status Write + Cascade
**Files:** `src/pages/testhub/cycles/ExecutionPage.tsx`  
**Acceptance:**
- [ ] Click pass/fail/block/skip per step → writes to `tm_step_results`
- [ ] After each step write: re-calculate run status per cascade rules
  - All pass → `tm_test_runs.status = 'passed'`
  - Any fail → `tm_test_runs.status = 'failed'`
  - Any blocked (no fail) → `tm_test_runs.status = 'blocked'`
- [ ] Run status update propagates to `tm_cycle_scope.current_status`
- [ ] Cycle counts update (`passed_count`, `failed_count`, etc.)
- [ ] ADS: 0 violations

---

### Experiment 011 — Execution: Raise Defect
**Files:** `src/pages/testhub/cycles/ExecutionPage.tsx`  
**Acceptance:**
- [ ] "Raise defect" button on failed step
- [ ] Defect modal: title, severity, description
- [ ] Creates `tm_defects` row
- [ ] Creates `tm_defect_links` row linking to `tm_test_runs` + `tm_step_results`
- [ ] Defect shows inline on the step after creation
- [ ] ADS: 0 violations

---

### Experiment 012 — Dashboard: KPI Cards
**Files:** `src/pages/testhub/DashboardPage.tsx`  
**Acceptance:**
- [ ] 4 KPI cards: total cases, active cycles, pass rate, open defects
- [ ] Data from `tm_*` direct queries (NOT `get_dashboard_stats` RPC which reads `th_*`)
- [ ] Active cycles with progress bars (from `tm_test_cycles`)
- [ ] My pending executions section (from `tm_cycle_scope` where `assigned_to = auth.uid()`)
- [ ] Empty states for all sections
- [ ] ADS: 0 violations

---

### Experiment 013 — My Work: Execution Queue
**Files:** `src/pages/testhub/MyWorkPage.tsx`  
**Acceptance:**
- [ ] Cases assigned to current user in active cycles
- [ ] Priority score computed (algorithmic, not AI)
- [ ] Status column from `tm_cycle_scope.current_status`
- [ ] Click row → opens ExecutionPage for that cycle/case
- [ ] ADS: 0 violations

---

## Phase 2 — Full Feature Coverage

*Full experiment specs available in test-hub-research-program.md experiments 014-023.*

| # | Feature | Key acceptance |
|---|---|---|
| 014 | Test sets — static | CRUD on tm_test_sets + tm_set_cases |
| 015 | Test sets — smart | Smart query builder, auto-refresh |
| 016 | Case versions | History view, version picker in cycle |
| 017 | Defects module | Full defect list + detail + Jira link |
| 018 | Traceability | ph_issues → tm_test_cases coverage matrix |
| 019 | Bulk actions | Multi-select pass/fail/assign/archive |
| 020 | Grid actions | Filter + sort + column picker on all lists |
| 021 | Import results | CSV → tm_step_results |
| 022 | Export cycle report | PDF/CSV from tm_* |
| 023 | Export Gherkin | Steps → .feature file |

---

## Phase 3 — Reports + Admin + AI

| # | Feature | Key acceptance |
|---|---|---|
| 024-025 | All 24+ report types | tm_* data, no hardcoded values |
| 026-031 | Admin config pages | All 7 admin sections |
| 032 | AI: suggest test cases | Edge function + AIIntelligenceButton |
| 033 | AI: summarize execution | Edge function + cycle detail panel |
| 034 | Offline execution | localStorage queue + sync |

---

## Canonical Components to Reuse (Mandatory Lookup)

Before each experiment, verify these are being mounted (not rebuilt):

| Need | Use This | Source |
|---|---|---|
| Work item list table | `JiraTable` | `src/components/shared/JiraTable/` |
| Detail drawer/panel | `CatalystViewBase` | `src/components/shared/` |
| Right-rail fields | `CatalystSidebarDetails` | shared |
| Status badge | `CatalystStatusPill` | shared |
| Work item type icon | `JiraIssueTypeIcon` | `src/lib/jira-issue-type-icons.tsx` |
| Test entity icons | `TestItemTypeIcon` (create once, reuse) | `src/lib/test-item-type-icons.tsx` |
| Avatar | `@atlaskit/avatar` | atlaskit |
| Dropdown (safe context) | `@atlaskit/dropdown-menu` | atlaskit |
| Dropdown (overflow parent) | portal pattern | CLAUDE.md 2026-06-13 |
| Toast | `@atlaskit/flag` | atlaskit |
| Spinner | `@atlaskit/spinner` | atlaskit |
| Modal | `@atlaskit/modal-dialog` | atlaskit |
| AI CTA button | `AIIntelligenceButton` | `src/components/ui/` |

---

## DB Query Patterns (Mandatory)

```typescript
// CORRECT: Join to get priority name/color (never use text column)
supabase
  .from('tm_test_cases')
  .select(`
    id, case_key, title, status,
    priority_ref:tm_case_priorities(name, color, level),
    type_ref:tm_case_types(name, icon),
    folder_ref:tm_folders(name),
    assignee_ref:profiles(full_name, avatar_url)
  `)

// CORRECT: Access FK data on raw DB row (snake_case)
const priorityName = row.priority_ref?.name ?? null;  // never: row.priority_ref?.name || 'Medium'
const icon = row.type_ref ? <TestTypeIcon name={row.type_ref.name} /> : null;

// WRONG: These are all bugs
row.priority              // undefined — no text priority column
row.priorityRef?.name    // camelCase on raw DB row — undefined
row.priority_ref?.name || 'Medium'  // typed domain fallback — lie
```

---

## Milestone Gates

**Phase 1 complete when:**
Vikram can open `/testhub/repository`, create a test case with 3 steps, add it to a new cycle, execute it step by step, mark step 2 as "fail", raise a defect from that step, and see the cycle's dashboard card update to show 1 failed.

**Phase 2 complete when:**
All 120 AIO Tests PDF actions produce a verified result in Catalyst. Parity score ≥ 85/100.

**Phase 3 complete when:**
Reports, admin config, and CATY AI features are live. Catalyst-native features (AI generation, cross-hub traceability) score better than AIO Tests equivalent.

---

## Open Items Requiring Vikram Approval

Before starting:
1. Confirm staging `tm_*` tables are populated with enough test data OR provide seed script
2. Provide AIO Tests PDF access (directory or exported text)
3. Confirm routing: should all Test Hub routes use `TestHubLayout.tsx` shell or continue using existing page shells?

During build (approval before each):
- New DB columns on `tm_*` tables
- New edge functions (`ai-suggest-test-cases`, `ai-summarize-cycle`)
- Admin sidebar section addition
- `useTypeWorkflow.ts` WORK_ITEM_TYPES modification
