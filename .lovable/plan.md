

# Workflow & Status Management Module — Admin Panel

## Overview

Build a comprehensive **Workflow Administration** module at `/admin/workflows` that manages statuses, transitions, and category mappings per issue type — with full downstream propagation to Kanban boards, backlogs, detail views, and status badges across all hubs.

---

## Current State Assessment

### Existing DB Tables (already present)
- **`epic_statuses`** / **`feature_statuses`** — simple status lists (no transitions, no category column)
- **`injira_statuses`** — full Jira-class schema with `category`, `is_initial`, `is_final`, `color`
- **`injira_workflow_transitions`** — transition graph with `from_status_id`, `to_status_id`, `is_global`, `is_initial`
- **`ph_workflow_statuses`** — project-scoped statuses with `category`, `position`
- **`wh_workflow_transitions`** — project-scoped transitions

### Existing Frontend
- `WorkflowEngine` class in `src/modules/in-jira/engine/` — fully built FSM with conditions, validators, post-functions
- `KANBAN_COLUMNS` in `kanban-tokens.ts` — **hardcoded** column definitions mapping statuses to columns
- `useStatusMappingLookup` — maps raw statuses to 5 categories via `wh_config` table
- `getStatusCategory()` in `statusCategory.ts` — 3-bucket resolver used by 181+ files
- Existing admin pages: `EpicStatuses.tsx`, `FeatureStatuses.tsx` — basic CRUD, no transitions

### Issue Types in Production
Story, Epic, Sub-task, Defect, Business Request, Task, Production Incident, QA Bug (+ 10 others)

---

## Architecture Plan

### Phase 1 — Database Schema (3 new tables)

**Table: `catalyst_workflow_schemes`**
```
id, name, description, issue_type (text), is_active, is_default, initial_status_id (FK), created_at, updated_at
```
One row per issue type workflow (e.g., "Sectorial Story Workflow", "Epic Workflow", "Subtask Workflow", "Defect Workflow").

**Table: `catalyst_workflow_statuses`**
```
id, scheme_id (FK), name, slug, category ('todo'|'in_progress'|'done'), color, position, is_initial, is_final, created_at, updated_at
```
Statuses belonging to a workflow scheme. Category column is the 3-bucket assignment.

**Table: `catalyst_workflow_transitions`**
```
id, scheme_id (FK), name, from_status_id (FK, nullable for global), to_status_id (FK), is_global, sort_order, created_at, updated_at
```
Directed edges in the workflow graph. `from_status_id = NULL` + `is_global = true` means "Any → target".

**Seed data** from the screenshots:
- **Story**: START → In Requirements → In Design / Ready for Dev → In Development → In QA → In UAT → In Beta → In Entity Integration → Technical Validation → End to End Testing → Production Ready → Beta Ready → In Production → On Hold (13 statuses, complex graph)
- **Epic**: START → Backlog ↔ In Progress → Done (3 statuses, simple)
- **Sub-task**: START → Backlog → Hold / In Progress → Done (4 statuses with "⚡ Any" globals)
- **Defect**: START → Todo → Under Implementation → Ready for QA → Blocked / Rejected → In Beta → UAT Ready → Beta Ready → In Production → Ready for Production → Closed / Re-Open / Retest / Monitor / Deferred for Int / Awaiting Info (16+ statuses)
- **Business Request**: Same scheme as Epic (initial implementation)
- **Task**: Same scheme as Sub-task

RLS: All tables get authenticated read, admin-only write via `has_role()`.

---

### Phase 2 — Admin UI Module (`/admin/workflows`)

#### 2A — Workflow List Page
- Tab bar: **Story | Epic | Sub-task | Defect | Business Request | Task | Incident**
- Each tab shows the active workflow scheme for that issue type
- "Edit Workflow" button opens the editor

#### 2B — Workflow Editor (per issue type)
**Left panel: Status List**
- Draggable reorder
- Add/Edit/Delete status
- Each status shows: Name, Category dropdown (To Do / In Progress / Done), Color picker
- Inline edit for status name

**Right panel: Transition Matrix**
- Table grid: rows = from-status, columns = to-status
- Checkbox at intersection = transition allowed
- Special row: "Global (Any)" — checkboxes for statuses reachable from any state
- Visual indicator for initial status (START → first status)

**Workflow Diagram Preview** (read-only, matches Jira screenshots)
- Auto-layout using the transition data
- Status nodes colored by category (grey = To Do, blue = In Progress, green = Done)
- Arrows showing transitions
- "Show transition labels" toggle

#### 2C — Category Assignment
- Dropdown on each status to set its 3-bucket category
- Bulk "Auto-categorize" button using position heuristics

---

### Phase 3 — Canonical Hook: `useCatalystWorkflow`

```typescript
// Returns statuses, transitions, and helpers for a given issue type
function useCatalystWorkflow(issueType: string) {
  // Fetches from catalyst_workflow_statuses + catalyst_workflow_transitions
  // Returns: statuses[], transitions[], getAvailableTransitions(currentStatus), categoryOf(status)
}
```

This hook becomes the **single source of truth** replacing all hardcoded status arrays.

---

### Phase 4 — Downstream Propagation (Impact Map)

Every place that currently uses hardcoded statuses or the old mapping must be rewired:

| Area | Current Source | New Source | Files |
|------|---------------|------------|-------|
| **Kanban columns** | `KANBAN_COLUMNS` hardcoded in `kanban-tokens.ts` | Dynamic from `useCatalystWorkflow('Story')` | `kanban-tokens.ts`, `KanbanBoardPage.tsx` |
| **Status badges** | `getStatusCategory()` → static mapping | `useCatalystWorkflow` → category from DB | `statusCategory.ts`, 181+ consumers |
| **Status dropdowns** | Various hardcoded arrays | `useCatalystWorkflow(issueType).statuses` | `EditableFields.tsx`, detail modals |
| **DnD status update** | Maps column → `COL_PRIMARY_STATUS` | Maps column → first status in dynamic column | `KanbanBoardPage.tsx` |
| **WorkflowEngine** | `injira_*` tables | `catalyst_workflow_*` tables | `WorkflowEngine.ts` |
| **Status mapping admin** | `wh_config.status_mapping` JSON | Replaced by `catalyst_workflow_statuses.category` | `useStatusMappingLookup.ts` |
| **Epic/Feature status admin** | `epic_statuses`, `feature_statuses` tables | Superseded by `catalyst_workflow_statuses` | Legacy pages deprecated |
| **For You dashboard** | `getStatusCategory()` | Same hook | `ForYouPage.tsx` |
| **R360 status styling** | `r360-helpers.ts` fallback | Category from workflow | `r360-helpers.ts` |

#### Kanban Board Dynamic Columns (Key Change)
Instead of hardcoded `KANBAN_COLUMNS`, the board will:
1. Fetch Story workflow statuses via `useCatalystWorkflow('Story')`
2. Group statuses by category to form columns, OR use status positions to create columns
3. Dynamically build `STATUS_TO_COL_ID` map at runtime

---

### Phase 5 — Sidebar Navigation Entry

Add to `AdminSidebarV2.tsx` under a new **"Workflows"** section:
```
{
  id: 'workflows',
  label: 'Workflows',
  icon: GitBranch,
  path: '/admin/workflows',
  children: [
    { label: 'Status & Transitions', path: '/admin/workflows/status' },
  ],
}
```

---

## Technical Details

### Migration Strategy
1. Create the 3 new tables with seed data from the Jira screenshots
2. Keep old `epic_statuses`/`feature_statuses` tables intact (no breaking changes)
3. New `useCatalystWorkflow` hook reads from new tables
4. Gradually replace consumers — start with Kanban board, then status badges, then detail views
5. Old admin pages (`EpicStatuses.tsx`, `FeatureStatuses.tsx`) redirect to new module

### Transition Validation
- Cannot delete a status that is currently assigned to any `ph_issues` row
- Cannot remove a transition that would orphan issues in that status (warn, don't block)
- Initial status cannot be deleted
- Category changes propagate immediately (no restart needed — React Query invalidation)

### File Changes Summary
| Action | File |
|--------|------|
| **NEW** | `src/pages/admin/workflows/WorkflowAdminPage.tsx` — main page with issue type tabs |
| **NEW** | `src/pages/admin/workflows/WorkflowEditor.tsx` — status list + transition matrix |
| **NEW** | `src/pages/admin/workflows/WorkflowDiagram.tsx` — visual flowchart preview |
| **NEW** | `src/hooks/useCatalystWorkflow.ts` — canonical workflow hook |
| **EDIT** | `src/components/admin/AdminSidebarV2.tsx` — add Workflows nav entry |
| **EDIT** | `src/routes/FullAppRoutes.tsx` — add `/admin/workflows/*` routes |
| **EDIT** | `src/components/kanban/kanban-tokens.ts` — make columns dynamic |
| **EDIT** | `src/pages/project-hub/KanbanBoardPage.tsx` — consume dynamic columns |
| **EDIT** | `src/utils/statusCategory.ts` — delegate to workflow hook |
| **EDIT** | `src/hooks/useStatusMappingLookup.ts` — integrate with workflow tables |
| **MIGRATE** | 3 new DB tables + seed data + RLS policies |

### Execution Order
1. Database migration (tables + seed + RLS)
2. `useCatalystWorkflow` hook
3. Admin UI: WorkflowAdminPage + WorkflowEditor + WorkflowDiagram
4. Sidebar + Routes wiring
5. Kanban board dynamic columns
6. Status category propagation to `getStatusCategory()`

---

## Recommendations

1. **Start with Story and Sub-task workflows** — they have the most complex graphs and the highest visibility (Kanban board). Epic and Defect can follow immediately after.
2. **The transition matrix UI** is more practical than a visual drag-and-drop editor for complex workflows (16+ statuses for Defect). The diagram view is read-only for now.
3. **Do NOT break the existing `getStatusCategory()` contract** — the new hook will feed into it, so all 181+ consumers get the update for free.
4. **Kanban columns should remain configurable** — the admin defines which statuses map to which board column. This is a separate concern from the workflow transitions.

