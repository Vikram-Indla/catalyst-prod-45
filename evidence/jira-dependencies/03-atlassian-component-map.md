# Jira Dependencies — Atlassian/Atlaskit Component Map

**Purpose:** Map observable UI elements to likely Atlaskit components or ADS patterns  
**Source:** Reference screenshots + visual analysis  
**Confidence notes:** High/Medium/Low based on evidence strength

---

## Add Dependency Modal

### Modal Dialog Container

**Observable element:** Large centered dialog with title, form, and action buttons  
**Likely Atlaskit component:** `@atlaskit/modal-dialog`  
**Evidence:**
- Standard Atlaskit modal styling: rounded corners, box shadow, centered position
- Header with title and close button (standard Atlaskit modal header)
- Backdrop with semi-transparent overlay
- Standard modal footer with Cancel/Add buttons
- Screenshot: User's 2nd image (add-dependency modal)

**Confidence:** **HIGH**  
**Reason:** This matches the exact Atlaskit Modal Dialog visual pattern used across Jira

**Catalyst equivalent:** `@atlaskit/modal-dialog` (same component)

**Gaps:** None identified

---

### Title & Descriptive Text

**Observable element:** 
- Title: "Add dependency" (bold, large font)
- Subtitle: "Dependencies in your plan help you sequence work in the right order."

**Likely Atlaskit component:**
- Title: `@atlaskit/heading` (or raw `<h1>` with Heading styling)
- Subtitle: Standard paragraph/text

**Evidence:**
- Title styling matches ADS Heading Large (20px, 600 weight)
- Subtitle is standard body text (14px, 400 weight)
- Screenshot: User's 2nd image

**Confidence:** **HIGH**  
**Reason:** Standard typography matching ADS

**Catalyst equivalent:** `@atlaskit/heading` + standard text

---

### Form Fields (Source / Target Issue Selectors)

**Observable element:**
- Input fields with placeholder "Choose a work item..."
- Blue border when focused
- Dropdown list showing issue keys, icons, and summaries
- Async behavior (results appear as user interacts)

**Likely Atlaskit component:** `@atlaskit/select` (or `AsyncSelect`)  
**Evidence:**
- Field styling matches Atlaskit Select (border, focus state, size)
- Dropdown list styling matches Atlaskit Select options list
- Blue focus border (Atlaskit primary color #0052CC)
- Icon + key + summary structure inside each option
- Screenshot: User's 3rd image (dropdown open)

**Confidence:** **HIGH**  
**Reason:** This is the canonical Atlaskit pattern for issue selection in Jira

**Catalyst equivalent:** `@atlaskit/select` or Catalyst's existing `useProjectAllWorkItems` hook + custom select wrapper

**Gaps:** May need async search optimization if using custom implementation

---

### Relationship Type Selector

**Observable element:**
- Middle field showing "blocks" as the current selection
- Likely a dropdown (based on context and layout)

**Likely Atlaskit component:** `@atlaskit/select` (simple select, not async)  
**Evidence:**
- Styled consistently with the other select fields
- Shows a single value ("blocks") that can likely be changed
- Logical position between source and target issue selectors
- Screenshot: User's 2nd image (modal open)

**Confidence:** **MEDIUM**  
**Reason:** Visually appears to be a select field, but the dropdown is not shown open in any reference screenshot

**Catalyst equivalent:** `@atlaskit/select` with static options

**Gaps:**
- Need to confirm all valid relationship types (blocks, is blocked by, duplicates?, relates to?)
- Need to know if type selection is constrained based on issue types

---

### Cancel & Add Buttons

**Observable element:**
- "Cancel" button (secondary style, left)
- "Add" button (primary blue style, right)
- Footer alignment: right

**Likely Atlaskit component:** `@atlaskit/button`  
**Evidence:**
- Button styling matches Atlaskit Button (padding, border-radius, colors)
- Cancel button: subtle/secondary appearance (transparent bg, blue text)
- Add button: primary appearance (blue bg, white text)
- Footer layout: standard modal footer with right-aligned buttons
- Screenshot: User's 2nd image (modal footer)

**Confidence:** **HIGH**  
**Reason:** Standard Atlaskit button patterns

**Catalyst equivalent:** `@atlaskit/button`

**Gaps:** None identified

---

## Timeline View

### Toolbar & Filter Controls

**Observable element:**
- "Roll-up to: Story" dropdown button
- "Group by: Space" dropdown button
- "Space" filter
- "Sprint" filter
- "Work item" dropdown
- "Issue link type" dropdown
- "Reset" button

**Likely Atlaskit component:** 
- `@atlaskit/button` for "Reset"
- `@atlaskit/dropdown-menu` for filter dropdowns (or similar)

**Evidence:**
- Button styling matches Atlaskit (especially "Reset" button)
- Dropdown buttons show current selection (e.g., "Roll-up to: Story")
- Layout is horizontal, toolbar-style
- Screenshot: User's 4th image (timeline view, toolbar visible)

**Confidence:** **MEDIUM**  
**Reason:** Buttons are clearly Atlaskit, but dropdown implementation not fully visible

**Catalyst equivalent:** Will need custom toolbar component combining buttons and selects

**Gaps:**
- Need to know if these are `@atlaskit/button` with inline dropdowns or custom components
- What are all valid "Roll-up" and "Group by" options?

---

### Issue Cards in Timeline

**Observable element:**
- Cards showing issue key (link), title, metadata, and actions
- Positioned absolutely in a graph layout
- Hover actions: context menu appears
- Connection lines between cards indicating dependencies

**Likely Atlaskit component:** Custom component (no standard Atlaskit card for this context)  
**Evidence:**
- Card styling is Catalyst/Jira-specific, not from Atlaskit primitives
- Layout is custom (absolute positioning in graph view)
- Screenshot: User's 4th image (issue cards visible)

**Confidence:** **MEDIUM**  
**Reason:** Cards are clearly custom for this feature, but built from Atlaskit primitives (button, link, text)

**Catalyst equivalent:** Custom `DependencyCard` component (to be created)

**Gaps:**
- Need to know how cards are rendered (DOM, SVG, Canvas?)
- How are connection lines calculated and rendered?

---

### Context Menu (on Card Hover)

**Observable element:**
- Menu appears on hover of issue card
- Options: "Add dependency", "Filter by this work item", "Highlight related work item", "Locate work item in timeline"
- Positioned inline with the card

**Likely Atlaskit component:** `@atlaskit/dropdown-menu`  
**Evidence:**
- Menu styling and options layout matches Atlaskit dropdown pattern
- Positioned as a context menu (absolute positioning relative to card)
- Screenshot: User's 4th image (context menu visible)

**Confidence:** **MEDIUM-HIGH**  
**Reason:** Visual pattern matches Atlaskit dropdown, but implementation could be custom

**Catalyst equivalent:** `@atlaskit/dropdown-menu` or custom-rolled menu with @atlaskit/button + @atlaskit/popup

**Gaps:**
- Need to confirm dropdown behavior (click to open vs. hover triggered)
- Does it support keyboard navigation?

---

### Connection Lines & Labels

**Observable element:**
- Lines connecting issue cards in the graph
- Labels on lines indicating relationship type (e.g., "blocks")
- Appear to be vector-drawn (SVG or similar)

**Likely implementation:** SVG or Canvas  
**Evidence:**
- Lines are smooth and scalable (not image-based)
- Labels are positioned relative to lines
- Likely SVG given Jira's use of SVG for diagrams
- Screenshot: User's 4th image (connection line visible)

**Confidence:** **HIGH**  
**Reason:** This is clearly not an Atlaskit component, but a custom rendering layer

**Catalyst equivalent:** Custom SVG rendering or use of a graph library (e.g., D3.js, ELK)

**Gaps:**
- Need to determine if Jira uses a specific graph layout algorithm
- How are line endpoints positioned relative to cards?
- How does rendering scale with many dependencies?

---

## Table View

### Dynamic Table Container

**Observable element:**
- Tabular view of dependencies with columns for issue, counts, priority, dates, team
- Rows can be grouped and nested (project → type → items)
- Rows appear expandable/collapsible (based on the group toggle chevron)

**Likely Atlaskit component:** `@atlaskit/dynamic-table`  
**Evidence:**
- Table styling matches Atlaskit Dynamic Table (headers, cell styling, spacing)
- Grouping and nesting support matches Dynamic Table's row structure
- Screenshot: User's 5th image (table view)

**Confidence:** **HIGH**  
**Reason:** This is the canonical Atlaskit table component for Jira complex tables

**Catalyst equivalent:** `@atlaskit/dynamic-table` or custom table with grouping logic

**Gaps:**
- Need to confirm sort/filter support (likely yes based on other Jira tables)

---

### Column Headers

**Observable element:**
- "Work item", "Blocked by", "Blocks", "Priority", "Start date", "Due date", "Team"
- "D" buttons next to "Start date" and "Due date" (toggle column visibility?)

**Likely Atlaskit component:** Part of dynamic table header  
**Evidence:**
- Header styling matches Atlaskit Dynamic Table headers
- "D" buttons appear to be small secondary buttons (ADS token toggle)
- Screenshot: User's 5th image (column headers visible)

**Confidence:** **HIGH**  
**Reason:** Standard Atlaskit Dynamic Table header pattern

**Catalyst equivalent:** Part of dynamic table implementation

---

### Group Rows

**Observable element:**
- Project-level row: "MM Support" with totals (1 Work item, 1 Work item, 2 Highest, dates, teams)
- Subgroup row: "Story - 2 work items"
- Toggle chevron to expand/collapse groups

**Likely Atlaskit component:** `@atlaskit/dynamic-table` grouping feature  
**Evidence:**
- Row styling indicates parent/child hierarchy (indentation, styling)
- Chevron toggle is standard Atlaskit pattern for expandable rows
- Screenshot: User's 5th image (group rows visible)

**Confidence:** **HIGH**  
**Reason:** Matches Atlaskit Dynamic Table grouping pattern

**Catalyst equivalent:** Custom grouping logic on top of dynamic table (or use Atlaskit's grouping support if available)

---

### Status/Priority Badges

**Observable element:**
- Priority displayed as badge: "Highest" with up arrow icon (⬆)
- Style: colored background + icon + text
- Status badge: "TO DO" (grey lozenge-style)

**Likely Atlaskit component:** `@atlaskit/lozenge` or custom badge  
**Evidence:**
- Styling matches Atlaskit Lozenge for status (grey background, rounded corners)
- Priority badge appears custom (colored based on priority level)
- Screenshot: User's 5th image (badges visible)

**Confidence:** **MEDIUM-HIGH**  
**Reason:** Status badges match Atlaskit Lozenge, priority badges may be custom

**Catalyst equivalent:** `@atlaskit/lozenge` + custom styling for priorities

---

## Issue Key Links

**Observable element:**
- Appears in multiple places: modal results, cards, table rows
- Color: #0052CC (Jira link blue)
- Font: monospace (appears to be Atlassian Mono)
- Format: "MMS-14", "MMS-76", etc.

**Likely Atlaskit component:** None (standard link + custom styling)  
**Evidence:**
- Color matches Jira's issue key styling
- Font is monospace (Atlassian Mono)
- Screenshot: All images showing issue keys

**Confidence:** **HIGH**  
**Reason:** Standard Jira/Catalyst styling for issue keys

**Catalyst equivalent:** Custom styled `<a>` element or Icon + Link component

---

## Issue Type Icons

**Observable element:**
- Bookmark icon (📑) for Stories
- Red circle icon (🔴) for Incidents/Problems
- Multiple different icon styles

**Likely implementation:** Jira's issue type icon library or Atlaskit icon set  
**Evidence:**
- Icons are simple, flat, and colored
- Consistent with Jira's issue type iconography
- Screenshot: User's 3rd image (dropdown with icons)

**Confidence:** **HIGH**  
**Reason:** These match Jira's standard issue type icons

**Catalyst equivalent:** `JiraIssueTypeIcon` from Catalyst's existing library (`src/lib/jira-issue-type-icons`)

---

## Summary Table

| UI Element | Observable Component | Likely Atlaskit | Catalyst Equivalent | Confidence | New Component Needed? |
|---|---|---|---|---|---|
| Modal dialog | Centered dialog box | `@atlaskit/modal-dialog` | `@atlaskit/modal-dialog` | HIGH | No |
| Title/Heading | "Add dependency" | `@atlaskit/heading` | Standard text | HIGH | No |
| Source issue input | Async select field | `@atlaskit/select` | Custom or `@atlaskit/select` | HIGH | Maybe* |
| Relationship dropdown | Select field | `@atlaskit/select` | `@atlaskit/select` | MEDIUM | No |
| Target issue input | Async select field | `@atlaskit/select` | Custom or `@atlaskit/select` | HIGH | Maybe* |
| Cancel/Add buttons | Primary + secondary buttons | `@atlaskit/button` | `@atlaskit/button` | HIGH | No |
| Timeline toolbar | Filter/rollup controls | `@atlaskit/button` + selects | Custom toolbar | MEDIUM | Yes |
| Issue cards | Graph nodes with metadata | Custom (not Atlaskit) | Custom component | MEDIUM | Yes |
| Connection lines | Graph edges with labels | SVG/Canvas (custom) | Custom SVG/graph lib | HIGH | Yes |
| Table | Dynamic tabular view | `@atlaskit/dynamic-table` | `@atlaskit/dynamic-table` | HIGH | No |
| Group rows | Nested table rows | Dynamic table grouping | Custom grouping logic | HIGH | No |
| Context menu | Card hover menu | `@atlaskit/dropdown-menu` | `@atlaskit/dropdown-menu` or custom | MEDIUM | No |
| Priority badge | Colored label | `@atlaskit/lozenge` | Custom badge | MEDIUM-HIGH | Maybe |
| Issue keys | Monospace links | Custom (Jira standard) | `JiraIssueTypeIcon` | HIGH | No |

---

## Atlaskit Packages to Install

**Required for implementation:**

```json
{
  "@atlaskit/modal-dialog": "^12.x",
  "@atlaskit/select": "^17.x",
  "@atlaskit/button": "^17.x",
  "@atlaskit/dynamic-table": "^14.x",
  "@atlaskit/lozenge": "^10.x",
  "@atlaskit/heading": "^1.x",
  "@atlaskit/dropdown-menu": "^12.x",
  "@atlaskit/popup": "^1.x",
  "@atlaskit/spinner": "^15.x",
  "@atlaskit/icon": "^22.x",
  "@atlaskit/tokens": "^1.x"
}
```

**Optional for enhanced features:**

```json
{
  "@atlaskit/editor-core": "^196.x",      // if rich text in dependency descriptions
  "@atlaskit/avatar": "^21.x",             // user avatars
  "@atlaskit/inline-message": "^12.x",     // validation messages
  "@atlaskit/pagination": "^12.x"          // if table needs pagination
}
```

---

## Gaps & Assumptions

1. **Async search optimization:** The source/target issue selectors need efficient search. Jira likely pre-filters by project scope. Catalyst must replicate this filtering.

2. **Relationship types:** Only "blocks" and "is blocked by" observed. Other types may exist (duplicates, relates to, etc.). Need confirmation.

3. **Graph rendering:** Timeline view uses SVG/Canvas for connections. Library choice (D3, ELK, Cytoscape, custom) not determined from screenshots.

4. **Permission model:** Who can add dependencies? Entire project or specific roles? Not visible in reference screenshots.

5. **Cyclic dependency detection:** Can user create A→B and B→A? Not visible in current UX flow.

6. **Data validation:** What prevents creating duplicate dependencies? Not visible.

7. **Responsive behavior:** How does the feature scale to mobile or narrow screens? Not visible in reference screenshots.

