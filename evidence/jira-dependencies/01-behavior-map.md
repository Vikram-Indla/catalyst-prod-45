# Jira Dependencies Feature — Behavior Map

**Source:** Reference screenshots provided by user (jira-deps-*)  
**Reverse-engineered from:** Jira Plans > Dependencies view  
**Analysis date:** 2026-06-24

---

## State Map — Observed Behaviors

### 01 — Entry Point: Empty Dependencies State

**Source screenshot:** User's first reference image  
**URL state:** `?groupBy=project&rollupBy=hierarchy&rollupHierarchyLevel=0`

**Visual state:**
- Tab title: "Dependencies" (active tab in Plans product)
- Main content area shows an empty/default state
- Large centered message: "Plan and prioritize around dependencies"
- Subtitle: "Map connected work to avoid costly delays."
- CTA button: "+ Add a dependency" (blue button, primary action)
- Link below: "Read about dependency mapping"

**Observable controls:**
- Button: "+ Add a dependency" (center-aligned, blue primary style)
- Link: "Read about dependency mapping" (blue underlined link)

**Observed affordances:**
- The CTA is clearly the primary entry point for creating dependencies
- The empty state educates users on the feature's purpose
- No dependencies currently exist in this plan/scenario

**Open questions:**
- Is the background illustration (green/blue gradient shapes) Jira-specific or customizable?
- What is the exact button styling in Atlaskit terms?
- How does this state appear on mobile/responsive layouts?

---

### 02 — Modal: Add Dependency Dialog (Closed state → Open state)

**Source screenshot:** User's second reference image  
**Trigger:** User clicks "+ Add a dependency" button

**Visual state:**
- Modal dialog appears centered on screen
- Modal title: "Add dependency" (modal header)
- Subtitle: "Dependencies in your plan help you sequence work in the right order."
- Modal contains 3 rows:
  1. **First field:** Dropdown "Choose a work item..." (blue-bordered when focused)
  2. **Middle field:** Dropdown showing current value "blocks" (visual indicator of relationship type)
  3. **Third field:** Dropdown "Choose a work item..." (blue-bordered when focused)
- Modal footer:
  - "Cancel" button (secondary style)
  - "Add" button (primary/blue style, likely disabled until both work items selected)
- Modal backdrop: Semi-transparent dark overlay
- Close button: "X" in top-right corner

**Observable behavior:**
- Modal is vertically centered
- Modal is horizontally centered
- The layout is clearly: [Source issue] → [Relationship type] → [Target issue]
- This maps to: "Issue A [blocks] Issue B"

**Open questions:**
- What Atlaskit modal component is this?
- Are the field labels visible or implied?
- What is the focus order? (First field focused by default?)
- How does the "blocks" middle dropdown behave?

---

### 03 — Search: Issue Selection Field (Open Dropdown)

**Source screenshot:** User's third reference image  
**Trigger:** User clicks first "Choose a work item..." field to open issue search

**Visual state:**
- Dropdown list appears with work items
- Items shown:
  - MMS-14 NIC integration (with bookmark icon = Story)
  - MMS-13 MOJ integration (bookmark icon = Story)
  - MMS-76 Gaps (bookmark icon = Story)
  - MMS-125 Nafath - User (bookmark icon = Story)
  - MMS-66 Multiple Companies - Offeror (red circle icon = Incident/Problem)
  - MMS-54 Separate databases (red circle icon = Incident/Problem)
  - MMS-205 CR number 703 - user (bookmark icon = Story)
  - MMS-36 About page content (red circle icon = Incident/Problem)
  - MMS-72 C4C Migration (bookmark icon = Story)

**Observable components:**
- Each item shows:
  - Work item key (e.g., "MMS-14") in a distinct color (likely teal/cyan for link color)
  - Work item title (e.g., "NIC integration") in regular text
  - Work item type icon (bookmark = Story, red circle = Incident/Bug)
- List appears to be scrollable (not all items visible at once)
- List items are clearly tappable/clickable
- Current item appears to have a blue/highlight border (first field is focused)

**Observable behavior:**
- Dropdown is async search — results pre-populated based on current plan/project scope
- Icons visually distinguish issue types
- Keys are colored differently from summary text for scannability

**Open questions:**
- Is this result list filtering in real-time as user types, or is it showing all available items?
- What is the max number of items shown before scrolling?
- Are the icons Jira's standard issue type icons or Atlaskit components?
- Is there a search input field, or is it showing all items by default?

---

### 04 — Timeline View: Visual Dependency Graph

**Source screenshot:** User's fourth reference image  
**Context:** After dependencies are created, users can view them in timeline/graph form

**Visual components:**
- **Top toolbar with filters:**
  - "Roll-up to: Story" dropdown (blue button style)
  - "Group by: Space" dropdown
  - "Space" filter
  - "Sprint" filter
  - "Work item" dropdown
  - "Issue link type" dropdown
  - "Reset" button
- **Main graph area:**
  - Shows "MM Support" project/space header with icon
  - Card for issue MMS-14 showing:
    - Issue key: "MMS-14" (link, teal colored)
    - Title: "NIC"
    - Start date indicator
    - "Add dependency" link (inline link)
  - Connecting line from MMS-14 to MMS-76 labeled "blocks"
  - Card for issue MMS-76 showing:
    - Issue key: "MMS-76" (link, teal colored)
    - Title: "Gaps"
    - "TO DO" status badge (grey lozenge)
- **Context menu** (visible on hover of a card):
  - "Add dependency" link
  - "Filter by this work item" link
  - "Highlight related work item" link
  - "Locate work item in timeline" link

**Observable behavior:**
- Timeline renders as a visual flow diagram
- Cards are connected by lines indicating dependencies
- Relationship type ("blocks") is labeled on the connection line
- Hover actions appear inline on the card
- Filtering and grouping controls allow users to reorganize the view

**Open questions:**
- Is the timeline rendered as SVG, Canvas, or DOM elements?
- What are the exact card dimensions and styling?
- How does the connection line rendering work?
- What happens when there are many cards/connections?

---

### 05 — Table View: Dependency Summary

**Source screenshot:** User's fifth reference image  
**Context:** Tabular representation of the same dependencies

**Visual structure:**
- **Column headers:**
  - "Work item" (first column, key + title)
  - "#" (sequential number)
  - "Blocked by" (count of issues that block this)
  - "Blocks" (count of issues this blocks)
  - "Priority" (priority badge)
  - "Start date" with "D" indicator
  - "Due date" with "D" indicator
  - "Team" (team count)

- **Row grouping:**
  - Project group: "MM Support" (icon + name)
    - Aggregate row showing totals:
      - 1 Work item (in Blocked by)
      - 1 Work item (in Blocks)
      - 2 Highest priority items
      - Mar 30, 2026 (earliest start date)
      - Mar 30, 2026 (latest due date)
      - 0 Teams
  - Subgroup: "Story - 2 work items"
    - MMS-13 MOJ Integration
      - Blocks: 1 Work item
      - Priority: Highest (with up arrow icon)
      - No start/due dates shown
    - MMS-205 CR number 70...
      - Blocked by: 1 Work item
      - Priority: Highest
      - Start date: Mar 30, 2026
      - Due date: Mar 30, 2026

**Observable behavior:**
- Table uses hierarchical grouping (Project → Type → Items)
- Counts aggregate automatically
- Priority is shown with visual indicators (up arrow for Highest)
- Date columns are optional (can be hidden or shown with "D" toggle)
- Text truncation happens for long summaries (MMS-205 shows "...")

**Open questions:**
- What is the "D" toggle next to "Start date" and "Due date"?
- How are the counts calculated (cross-project or scoped to current plan)?
- Can rows be expanded/collapsed?
- What happens when a date isn't available?

---

## Dependency Model — Inferred from Observations

### Entity: Dependency Link

**Structure:**
```
Dependency {
  source_issue: IssueKey (e.g., "MMS-13")
  relationship_type: string (e.g., "blocks", "is blocked by")
  target_issue: IssueKey (e.g., "MMS-76")
  created_by?: User
  created_at?: Timestamp
}
```

### Relationship Types Observed

| Type | Direction | Inverse |
|---|---|---|
| blocks | A blocks B | is blocked by |
| is blocked by | A is blocked by B | blocks |

(Note: Only "blocks" clearly visible in screenshots; other types not explicitly shown)

### Data Flow in Add Dialog

**User action sequence:**
1. Click "+ Add a dependency"
2. Modal opens, first field focused
3. Type/search in first field → async results → select source issue
4. Middle field shows "blocks" (may be selectable)
5. Click third field → search/select target issue
6. Click "Add" button
7. Modal closes
8. Dependency appears in timeline/table view

---

## UI Patterns Identified

### Pattern: Issue Picker / Async Select

**Observed in:** First and third modal fields  
**Behavior:**
- Dropdown field with placeholder text
- Opens to show list of work items
- List includes issue key + icon + summary
- Likely supports type-to-filter or shows pre-populated list
- Selection changes the field value and updates validation state

### Pattern: Relationship Type Selector

**Observed in:** Middle field of modal  
**Behavior:**
- Shows current relationship ("blocks")
- Likely a dropdown (based on context)
- May have constraints on valid relationship types

### Pattern: Modal with Tri-State Form

**Observed in:** Add dependency dialog  
**Behavior:**
- Three fields represent: source → type → target
- Likely enforces selection of all three before "Add" is enabled
- Cancel and Add buttons in footer
- Modal can be dismissed via Escape or close button

### Pattern: Timeline/Graph Rendering

**Observed in:** Timeline view  
**Behavior:**
- Cards represent issues
- Lines with labels represent relationships
- Viewport shows subset of full graph
- Context menu available on hover
- Filtering/grouping controls reorganize view

### Pattern: Hierarchical Table

**Observed in:** Table view  
**Behavior:**
- Project-level grouping
- Type-level subgrouping
- Aggregation of counts at parent levels
- Date and priority columns with visual indicators

---

## Interaction Model

### Primary workflows:

**Create dependency:**
1. User clicks "+ Add a dependency"
2. Selects source issue (from dropdown search)
3. Confirms relationship type (usually "blocks")
4. Selects target issue (from dropdown search)
5. Clicks "Add"
6. Dependency is created and displayed

**View dependencies:**
1. User navigates to Dependencies tab/view
2. Sees timeline or table representation
3. Can group/filter using controls
4. Can hover for additional actions

**Manage dependencies:**
1. User hovers over dependency (in timeline or context menu)
2. Sees context menu with "Add dependency", "Remove", etc.
3. Takes action

---

## Unknowns Requiring Inspection

- [ ] Exact Atlaskit component types (Modal, Select, Dropdown, etc.)
- [ ] Search behavior: real-time filtering vs. pre-populated list
- [ ] Validation rules (self-reference prevention, cyclic dependency detection?)
- [ ] Permission model (who can add dependencies?)
- [ ] API endpoints for search and dependency creation
- [ ] Data persistence (Supabase table structure)
- [ ] Delete/remove dependency flow
- [ ] Edit relationship type flow
- [ ] Performance with large dependency graphs
- [ ] Responsive behavior on small screens

---

## Accessibility Observations

**From screenshots:**
- Buttons have clear text labels ("Add", "Cancel", "+ Add a dependency")
- Modal has clear title and close button
- Issue icons provide visual differentiation (but may need ARIA labels)
- Links are underlined and colored distinctly
- Color is not the only information carrier (icons used alongside colors)

**Likely requirements:**
- Modal has proper ARIA roles (dialog, presentation)
- Form fields have associated labels (visible or aria-label)
- Buttons are keyboard accessible
- Dropdown lists are keyboard navigable (arrow keys, Enter)
- Error states have ARIA live region announcements

