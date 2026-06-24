# Phase 2: Behavior State Map

## Captured States (All Verified via MCP)

### STATE 1: EMPTY STATE (Initial Load)
**Screenshot**: `01-empty-state_initial-load.jpeg`
**User Action**: Navigate to `/jira/plans/1/scenarios/1/dependencies`
**Visual Elements**:
- Page title: "Tahommena" plan header
- Navigation tabs: Summary, Timeline, Program, Calendar, Teams, Releases, **Dependencies** (active)
- Center content area:
  - Illustrative graphic (dependency diagram visual)
  - Heading: "Plan and prioritize around dependencies"
  - Subheading: "Map connected work to avoid costly delays."
  - Primary CTA button: "Add a dependency" (blue button, 14px/500)
  - Help link: "Read about dependency mapping" (blue link)
- Sidebar: Left navigation visible

**Interaction**: Page is idle, no dependencies exist

---

### STATE 2: ADD DEPENDENCY BUTTON - HOVER
**Screenshot**: `02-button-hover_add-dependency.jpeg`
**User Action**: Hover mouse over "Add a dependency" button
**Visual Elements**:
- Button shows hover state (cursor changes to pointer)
- Button maintains primary blue background (rgb(24, 104, 219))
- No visible change in styling (hover effect is subtle or CSS-only)

**Interaction**: User can click button

---

### STATE 3: ADD DEPENDENCY MODAL - OPENED
**Screenshot**: `03-modal-open_empty-form.jpeg`
**User Action**: Click "Add a dependency" button
**Visual Elements**:
- Modal overlay with backdrop (semi-transparent grey)
- Modal dialog (400px wide, white background, role="dialog")
- Box shadow: two-layer elevation (rgba(30, 31, 33, 0.15) 8px/12px + rgba(30, 31, 33, 0.31) 0px/1px)
- Border-radius: 3px
- Header: "Add dependency" (title in black)
- Close button (X) in top-right corner
- Description text: "Dependencies in your plan help you sequence work in the right order."
- Three form fields:
  1. "Choose a work item..." dropdown (source issue)
  2. "blocks" dropdown (dependency type)
  3. "Choose a work item..." dropdown (target issue)
- Two action buttons:
  - "Cancel" button (white, not disabled)
  - "Add" button (grey/disabled, requires form completion)

**Interaction**: Modal has focus, fields are interactive

---

### STATE 4: WORK ITEM PICKER - DROPDOWN OPEN
**Screenshot**: `04-issue-select_search-dropdown.jpeg`
**User Action**: Click first "Choose a work item..." dropdown
**Visual Elements**:
- Dropdown opens below the field (blue border on focused field)
- Dropdown list shows:
  - Multiple issues with icons (different colored icons: green, red, etc.)
  - Issue key (MMS-14, MMS-13, MMS-125, etc.)
  - Issue title ("NIC integration", "MOJ integration", "Nafath - User", etc.)
  - Scrollbar visible (list is scrollable)
  - Dropdown appears to be ~300px wide with scroll area
- List items:
  - MMS-14 NIC integration (green icon)
  - MMS-13 MOJ integration (green icon)
  - MMS-125 Nafath - User (green icon)
  - MMS-66 Multiple Companies - Offeror (red icon)
  - MMS-76 Gaps (green icon)
  - MMS-54 Separate databases (red icon)
  - MMS-205 CR number 703 - user (green icon)
  - MMS-57 Companies Dictionary (red icon)
  - MMS-36 About page content (red icon)
  - MMS-72 C4C Migration (green icon)

**Interaction**: User can click item to select, or scroll to see more options

---

### STATE 5: DEPENDENCY TYPE SELECTOR - OPEN
**Screenshot**: `05-type-select_blocks-option.jpeg`
**User Action**: Click "blocks" dropdown (middle field)
**Visual Elements**:
- Dropdown opens with two options:
  1. "blocks" (selected, shown with light blue background)
  2. "is blocked by"
- Dropdown appears inline below the field
- Selected item highlighted

**Interaction**: User can click to change dependency type

---

### STATE 6: FORM PARTIALLY FILLED
**Screenshot**: `06-form-partial_source-selected.jpeg`
**User Action**: Select MMS-14 NIC integration from first dropdown
**Visual Elements**:
- Source field now shows: "MMS-14 NIC integration" (with icon)
- Dependency type still shows: "blocks"
- Target field still shows: "Choose a work item..."
- "Add" button is STILL DISABLED (grey) because target is empty

**Interaction**: Form is incomplete, submit not allowed

---

### STATE 7: FORM FILLED COMPLETELY
**Screenshot**: `07-form-complete_all-fields.jpeg`
**User Action**: Select MMS-125 Nafath - User for target field
**Visual Elements**:
- Source field: "MMS-14 NIC integration"
- Dependency type: "blocks"
- Target field: "MMS-125 Nafath - User"
- "Add" button is NOW ENABLED (bright blue) and clickable
- "Cancel" button remains enabled

**Interaction**: User can click "Add" to create dependency, or "Cancel" to close

---

### STATE 8: POPULATED DEPENDENCIES VIEW - DIAGRAM
**Screenshot**: `08-dependencies-view_diagram-layout.jpeg`
**User Action**: Click "Add" button to create dependency
**Visual Elements**:
- Modal closes
- Page now shows dependency diagram/graph layout
- Left card (blue border):
  - Icon: Green square (work item type)
  - Issue key: "MMS-14" (blue link)
  - Title: "NIC integration"
  - Dates: "Start date: -" / "End date: -"
  - Status: "TO DO" (white badge)
  - Three-dot menu button
  - Card has blue left border (selected/focused)
- Connector arrow:
  - Arrow points right: "blocks"
  - Blue arrow color
- Right card:
  - Icon: Green square
  - Issue key: "MMS-125" (blue link)
  - Title: "Nafath - User"
  - Dates: "Start date: 10/14/2025" / "End date: 10/15/2025"
  - Status: "IN REVIEW" (light blue badge)
  - Three-dot menu button
- Toolbar above diagram:
  - "Roll-up to" dropdown
  - "Group by" dropdown
  - "Space" dropdown
  - "Sprint" dropdown
  - "Work item" dropdown
  - "Issue link type" dropdown
  - "+ Add dependency" button (right side, primary blue)
- Bottom controls:
  - "Zoom on scroll" checkbox
  - Zoom in/out buttons
  - "Fit" button
  - "Reset" button
  - Fullscreen button

**Interaction**: User can add more dependencies, click cards, use context menus

---

### STATE 9: CARD CONTEXT MENU
**Screenshot**: `09-card-menu_hover-options.jpeg`
**User Action**: Click three-dot menu on MMS-14 card
**Visual Elements**:
- Context menu appears (below the menu button)
- Menu items:
  1. "Add dependency" (with + icon)
  2. "Filter by this work item"
  3. "Highlight related work item" (with arrow indicating submenu)
  4. "Locate work item in timeline"
- Menu has white background, subtle border/shadow
- Items are clickable

**Interaction**: User can perform card-specific actions

---

## Unobserved States (Not yet captured)

- [ ] Delete dependency flow (confirm modal if present)
- [ ] Edit dependency type (after created)
- [ ] "Filter by this work item" result
- [ ] "Highlight related work item" submenu options
- [ ] Responsive state (narrow viewport)
- [ ] Multiple dependencies (more complex diagram)
- [ ] Error state (invalid selection, server error, etc.)
- [ ] Loading state (async data fetch)

## Key Observations

### Form Structure
- **Required fields**: Source, Type, Target (all must be filled before submit is enabled)
- **Field types**: Searchable dropdowns with scrollable lists
- **Dependency types**: "blocks" and "is blocked by" (at minimum; may be more)
- **Validation**: Implicit (Add button disabled until complete), no error messages observed yet

### Diagram Layout
- **Type**: Graph/network visualization (not a list or table)
- **Cards**: Individual work items rendered as bordered boxes with metadata
- **Connectors**: Arrows showing dependency direction and type
- **Interaction**: Cards have context menus and are clickable
- **Filtering/grouping**: Toolbar controls suggest multiple view options

### Accessibility Markers
- Modal has `role="dialog"`
- Buttons are actual `<button>` elements
- Dropdowns appear to use standard select/combobox pattern
- Blue focus states visible on form fields

### Visual Design
- **Color scheme**: Primary blue (rgb(24, 104, 219)), white backgrounds, grey text
- **Typography**: 14px/500 for buttons, consistent with Jira Design System
- **Spacing**: ~6px vertical padding on buttons, consistent grid
- **Shadows**: Two-layer elevation on modal (typical ADS pattern)
- **Status badges**: White for "TO DO", light blue for "IN REVIEW"

## Navigation Path
```
Empty State
  ↓ (click "Add a dependency")
Modal Open
  ↓ (select source issue)
Form Partial
  ↓ (select dependency type - default: "blocks")
Form Partial
  ↓ (select target issue)
Form Complete
  ↓ (click "Add")
Populated View (Diagram)
```

## Next Phase
DOM/CSS inspection required for:
- Exact component identification (@atlaskit/select, @atlaskit/modal-dialog, etc.)
- All computed styles per state
- Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Hover/Focus pseudo-class styles
- Accessibility tree (ARIA roles, labels)
