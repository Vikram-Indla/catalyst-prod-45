

# Business Request Detail: Drawer → Story Modal Conversion

## Summary

Convert the Business Request from a right-side `Sheet` (drawer) with tab-based content into the canonical `StoryDetailModal` two-column layout. Additionally, migrate the status system from the legacy `demand_process_steps` table to the `catalyst_workflow_schemes/statuses/transitions` system already used by Stories, Epics, etc.

---

## Current State

- **BusinessRequestDrawer.tsx** (900 lines): Uses `Sheet` component, tab-based layout (Details, Scoring, Planning, Links, History, Budget, Risks, Milestones)
- **Status system**: Uses `demand_process_steps` table + hardcoded `DRAWER_PROCESS_STEPS` in `StatusDropdown.tsx` — completely separate from the `catalyst_workflow_*` tables used by all other issue types
- **Admin panel**: "Business Request" tab exists in `/admin/workflows` but uses a generic 3-status scheme (Backlog/In Progress/Done), not the actual demand process steps

## Target State

A two-column modal matching `StoryDetailModal` exactly, with:
- Left panel: scrollable content (title, description, sections, activity)
- Right panel: resizable sidebar with all field properties
- Top bar: breadcrumb + share + dots menu + close
- Status powered by `catalyst_workflow_statuses` (same as Story)

---

## Implementation Plan

### Phase 1: Database — Migrate Status System

**Migration**: Populate `catalyst_workflow_statuses` for the "Business Request" workflow scheme with the actual demand process steps:

```
New Demand (todo) → In Review (in_progress) → EA Review (in_progress) → 
Analyse (in_progress) → Approved (in_progress) → Ready to Implement (in_progress) → 
Implement (in_progress) → Closed (done) → Rejected (done) → On Hold (todo)
```

Plus create appropriate transitions in `catalyst_workflow_transitions`.

The existing `demand_process_steps` table and `process_step` column on `business_requests` remain untouched for backward compatibility — the new modal reads from `catalyst_workflow_statuses` and writes `process_step` using the slug.

### Phase 2: New Modal Component

**Create** `src/components/business-requests/BusinessRequestDetailModal.tsx`

Structure (matching StoryDetailModal exactly):
- **Top bar**: `request_key` breadcrumb + Share + MoreHorizontal dots menu + X close
- **Left panel** (scrollable):
  1. **Title** — inline-editable (contentEditable)
  2. **Quick actions bar** — `+` menu (Create subtask, Link work item, Add attachment) + AI sparkle menu
  3. **Description** — TipTap rich text editor with ADF support, view/edit toggle
  4. **Acceptance Criteria** — rich text, view/edit toggle
  5. **Attachments** — reuse `AttachmentsSection` pattern
  6. **Linked Issues** — reuse `LinkedIssuesSection` pattern (epics, features, stories from `business_request_links`)
  7. **Defects** — linked defects section
  8. **Production Incidents** — linked incidents section
  9. **Scoring & Review** — collapsible accordion (Business Score + EA Review combined)
  10. **Budget** — collapsible accordion
  11. **Milestones** — collapsible accordion
  12. **Risks** — collapsible accordion
  13. **Activity** — Comments/History/All tabs (Jira-parity interleaved feed with `RichTextCommentEditor`)

- **Right panel** (resizable sidebar, 280px default):
  - Status dropdown (3-color lozenge from `catalyst_workflow_statuses`)
  - Priority (auto-calculated score pill)
  - Rank badge
  - Assignee (editable avatar picker)
  - Requestor
  - Business Owner
  - Department
  - Delivery Platform
  - Delivery Track
  - Complexity
  - Urgency
  - Risk Rating
  - Health (RAG indicator)
  - Start Date / End Date
  - Planned Quarter (multi-select)
  - Estimated Effort
  - Estimated Cost
  - Labels
  - Created / Updated timestamps

### Phase 3: Status Dropdown Refactor

Replace the legacy `StatusDropdown` (which reads from `DRAWER_PROCESS_STEPS` hardcoded array) with a new dropdown that reads from `useCatalystWorkflow('Business Request')`, grouped by category (To Do / In Progress / Done) with the 3-color lozenge system (Grey/Blue/Green).

### Phase 4: Admin Panel — Workflow Statuses

The "Business Request" tab in `/admin/workflows` already exists and uses `useCatalystWorkflow('Business Request')`. After Phase 1 populates the real statuses, the admin panel will automatically show the correct statuses + transition matrix. No code changes needed — only the database migration.

### Phase 5: Swap Drawer for Modal

Update all consumer pages:
- `src/modules/product-backlog/pages/CatalystDemandList.tsx`
- `src/modules/kanban/pages/CatalystDemandKanban.tsx`
- `src/pages/industry/IndustryRoadmapPage.tsx`

Replace `<BusinessRequestDrawer>` with `<BusinessRequestDetailModal>` using the same props pattern.

### Phase 6: Existing Tab Components as Accordion Sections

Extract and wrap existing tab components into collapsible sections:
- `BusinessScoreViewTab` + `EAReviewTab` → `ScoringAccordion`
- `BudgetViewTab` → `BudgetAccordion`
- `MilestonesViewTab` → `MilestonesAccordion`
- `RisksViewTab` → `RisksAccordion`

These reuse the existing tab component internals but wrap them in a `ChevronRight/ChevronDown` collapsible pattern matching StoryDetailModal's `SectionBlock`.

---

## Files to Create
1. `src/components/business-requests/BusinessRequestDetailModal.tsx` — Main two-column modal
2. `src/components/business-requests/detail-sections/ScoringAccordion.tsx`
3. `src/components/business-requests/detail-sections/BudgetAccordion.tsx`
4. `src/components/business-requests/detail-sections/MilestonesAccordion.tsx`
5. `src/components/business-requests/detail-sections/RisksAccordion.tsx`
6. `src/components/business-requests/detail-sections/BRLinkedIssuesSection.tsx`
7. `src/components/business-requests/detail-sections/BRActivitySection.tsx`

## Files to Modify
1. `src/modules/product-backlog/pages/CatalystDemandList.tsx` — Swap drawer for modal
2. `src/modules/kanban/pages/CatalystDemandKanban.tsx` — Swap drawer for modal
3. `src/pages/industry/IndustryRoadmapPage.tsx` — Swap drawer for modal

## Database Migration
1. Replace the 3 placeholder statuses in `catalyst_workflow_statuses` for scheme `a0000005-...` with the 10 actual demand process steps
2. Create corresponding transitions in `catalyst_workflow_transitions`

## Components Reused from StoryDetailModal
- `RichTextCommentEditor` (comment input)
- `StoryRichTextEditor` / `AdfDescriptionRenderer` (description rendering)
- `AddParentPicker` pattern (breadcrumb)
- `IssueKeyLink` (key display)
- `WorkItemStarButton` (star button)
- Resizable splitter pattern
- 3-color status lozenge system
- `SectionBlock` pattern for collapsible sections

