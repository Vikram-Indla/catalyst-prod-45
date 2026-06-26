# UI Extraction Protocol — Step-by-Step

**Use this document as your checklist during every extraction.**

---

## PHASE 1: Visual Inventory & Layout Mapping

### 1.1 Full Page Screenshot
```
Action: Open target URL in browser (full-screen)
Take full-page screenshot
Document: 
  - Overall dimensions (width × height)
  - Page structure (header, main, sidebar, footer)
  - Sticky/fixed elements
  - Color scheme overview
  - White space patterns
```

### 1.2 Region-by-Region Screenshots
```
For EACH major region, take zoomed screenshot:

HEADER/NAVIGATION
  - Position (top: fixed or static)
  - Logo, title, navigation items
  - Color, spacing, font sizes
  - Responsive behavior (if testable)

TOOLBAR/FILTERS
  - Search input: placeholder text, width, styles
  - Dropdown menus: options, trigger button
  - Filter buttons: appearance, selected state
  - Action buttons: labels, colors, sizing

MAIN CONTENT AREA
  - Table/list structure: columns, rows, spacing
  - Item styling: background, borders, hover state
  - Data visualization (progress bars, charts): colors, sizing
  - Empty states: messaging, styling

DIALOGS/MODALS (if visible)
  - Trigger button (label, color)
  - Dialog title
  - Form fields (labels, types, validation)
  - Buttons (Cancel, Submit/Save/Create)
  - Escape/backdrop close behavior

FLOATING ELEMENTS
  - Floating action buttons
  - Tooltips
  - Notifications/toasts
  - Position (fixed, absolute)
```

### 1.3 Layout Grid Analysis
```
Document:
  - Flex vs. Grid usage
  - Gap/spacing between elements (px)
  - Max-width of containers
  - Padding on major sections
  - Alignment (left, center, right)
```

---

## PHASE 2: DOM & Accessibility Inspection

### 2.1 Semantic HTML Audit
```
Using DevTools → Elements:

BUTTONS
  - Element: <button> or <a role="button"> or <div>?
  - aria-label: present?
  - type: "button", "submit", "reset"?
  - disabled attribute?
  
INPUTS
  - Element: <input>, <textarea>, <select>?
  - type: text, email, date, checkbox, etc.
  - placeholder: present?
  - aria-label: present?
  - required attribute?
  
TABLES
  - Element: <table> with <thead>, <tbody>?
  - <th> elements with scope?
  - role attributes?
  - aria-label on sortable columns?
  
DROPDOWNS
  - role="listbox" or role="combobox"?
  - aria-expanded: present?
  - aria-selected on items?
  
DIALOGS
  - role="dialog"?
  - aria-labelledby on title?
  - aria-modal="true"?
  
LINKS
  - <a href> with href value?
  - target="_blank" if external?
  - aria-label if icon-only?
```

### 2.2 ARIA & Accessibility Attributes
```
Extract ALL aria-* attributes:
  - aria-label: {text}
  - aria-labelledby: {element-id}
  - aria-selected: true/false
  - aria-expanded: true/false
  - aria-live: polite/assertive
  - aria-describedby: {element-id}
  - role: {role}
```

### 2.3 Event Listeners & Data Attributes
```
For each interactive element, document:
  - data-testid (if present)
  - data-* custom attributes
  - Event handlers (hover, click, focus)
  - Keyboard events (Enter, Escape, Arrow keys)
```

---

## PHASE 3: Computed Styles & Design Tokens

### 3.1 Color Extraction
```
For EACH unique visual element, copy from DevTools → Computed:
  - color (text color)
  - background-color
  - border-color
  - Hover color (use :hov pseudo-class selector)
  - Focus color (use :foc pseudo-class selector)
  
Record as:
  - Element name
  - State (default, hover, focus, disabled)
  - Hex value
  - Atlaskit token (if known): ds-text-danger, ds-background-success-bold, etc.
```

### 3.2 Typography Extraction
```
For EACH element with text:
  - font-family (e.g., "Segoe UI", "-apple-system", sans-serif)
  - font-size (px value)
  - font-weight (400, 500, 600, 700, etc.)
  - line-height (px or unitless)
  - text-transform (uppercase, lowercase, capitalize)
  - letter-spacing (if non-zero)
  
Create typography scale:
  - Display/Heading: 32px, 600 weight
  - Section heading: 24px, 600 weight
  - Body: 14px, 400 weight
  - Caption/small: 12px, 400 weight
```

### 3.3 Spacing & Layout Extraction
```
For EACH section/component:
  - padding: top, right, bottom, left
  - margin: top, right, bottom, left
  - gap: (between flex/grid items)
  - width/height constraints
  - min-width / max-width
  
Identify spacing unit:
  - Is padding always multiples of 4px? 8px? 16px?
  - Document the base unit
```

### 3.4 Borders & Shadows
```
For EACH element:
  - border: width, style (solid, dashed), color
  - border-radius: px value
  - box-shadow: (if present) — copy entire value
  - Example: 0 20px 32px rgba(9, 30, 66, 0.25)
```

---

## PHASE 4: Interaction & Behavior Mapping

### 4.1 Button Clicks
```
For EACH button:
  1. Click it
  2. Document:
     - State change: URL change? Modal open? Dropdown expand? State toggle?
     - Visual feedback: color change? Loading spinner? Disabled state?
     - Timing: immediate or delayed response?
```

### 4.2 Search/Input Behavior
```
For EACH input field:
  1. Type slowly: "test"
  2. Observe:
     - Real-time filtering happens? (How fast? Debounce?)
     - Clear button appears?
     - Error message on invalid input?
     - Placeholder text disappears?
  3. Type special characters, numbers, long strings
  4. Test empty input (if applicable)
```

### 4.3 Dropdown Behavior
```
For EACH dropdown:
  1. Click to open
  2. Test:
     - Arrow keys (↑↓) navigate? Highlight visual?
     - Enter key selects? 
     - Escape key closes?
     - Click outside closes?
     - Keyboard type filters (if searchable)?
  3. Hover over items: color change?
```

### 4.4 Table Row Hover
```
1. Hover over table row
2. Document:
   - Background color change? (light highlight)
   - Cursor style: pointer?
   - Row actions appear (buttons, kebab menu)?
```

### 4.5 Keyboard Navigation
```
1. Tab through page from top to bottom
2. Document:
   - Focus order logical? (left-to-right, top-to-bottom)
   - Focus ring visible on all interactive elements?
   - Tab into modals/dropdowns traps focus?
3. Test Escape key: closes dropdowns? Closes modals?
```

### 4.6 Dialog Behavior
```
For EACH modal/dialog:
  1. Click trigger button → dialog opens
  2. Test:
     - Close button (X) works?
     - Escape key closes?
     - Backdrop click closes (if applicable)?
     - Focus trapped inside modal?
  3. Fill form fields (if present)
  4. Click Submit/Save:
     - Validation works (required fields)?
     - Error messages appear inline?
     - Success message appears?
     - Dialog closes on success?
  5. Click Cancel:
     - Dialog closes?
     - Changes discarded?
```

### 4.7 Timing & Animation
```
For animations/transitions:
  - Hover effect duration: instant or delayed? (usually 100-300ms)
  - Tooltip delay: how long before appearing? (usually 300-500ms)
  - Dialog fade-in: duration? (usually 150-300ms)
  - Search debounce: how long after user stops typing? (usually 200-300ms)
  
Tools:
  - Slow-mo recordings (60fps) to measure transitions
  - Browser DevTools → Performance tab to measure
```

---

## PHASE 5: Data Model & Content Extraction

### 5.1 Table Structure
```
1. Inspect <table> or table-like structure
2. Count columns
3. For EACH column, document:
   - Header text
   - Data type (text, number, date, status, etc.)
   - Width: fixed or flex?
   - Sortable? (arrow icon on header?)
   - Format: e.g., dates as "May 29, 2026" or "2026-05-29"
4. Copy 3-5 sample rows:
   - First row (fresh/new item)
   - Middle row (typical item)
   - Last row
   - Any special rows (empty state, loading, error)
```

### 5.2 Form Fields
```
For EACH form:
  1. List all fields in order:
     - Field label
     - Input type: text, email, date, select, checkbox, radio, textarea
     - Placeholder text
     - Required? (asterisk, aria-required)
     - Validation rule: regex pattern, min/max length, specific format?
  2. Document error messages:
     - Required field: "This field is required"
     - Invalid email: "Please enter a valid email address"
     - Min length: "Must be at least 3 characters"
  3. Document success/confirmation messages
```

### 5.3 Content Inventory
```
Extract ALL visible text strings:
  - Page title: "Senaei BAU"
  - Section headers: "Releases", "Related issues"
  - Button labels: "Create Release", "Release", "Cancel"
  - Placeholder text: "Search", "Enter release name"
  - Help text: "This space has 47 releases"
  - Status labels: "Released", "Unreleased", "Archived"
  - Error messages: (if any visible)
  - Empty state: (if applicable) "No releases found"
```

### 5.4 Data Example Extraction
```
For tables/lists, copy actual row data:

Release Name | Status | Progress | Start | Release | Work Items
Refactor-4.2 | Unreleased | 90% | - | July 10 | 45

Use this as basis for mock data (15-20 items)
```

---

## PHASE 6: Component Architecture & Atlaskit Mapping

### 6.1 Component Breakdown
```
List EVERY visually distinct element:
  - Header with title
  - Navigation tabs
  - Toolbar with search input
  - Status filter dropdown
  - Release count text
  - Action buttons (Give feedback, Create release)
  - Table container
  - Table header
  - Table rows
  - Progress bar (within row)
  - Status badge
  - Date cell (with color coding)
  - Row actions button (kebab menu)
  - Create Release dialog
  - Release Confirmation dialog
  - Rovo floating button
```

### 6.2 Atlaskit Component Matching
```
For EACH component, determine:

1. Best Atlaskit match:
   - Button → @atlaskit/button (Button, ButtonGroup)
   - Search input → @atlaskit/textfield
   - Dropdown → @atlaskit/dropdown-menu or select
   - Status badge → @atlaskit/lozenge
   - Modal → @atlaskit/modal-dialog
   - Table → JiraTable (Catalyst canonical) or @atlaskit/table

2. Props/variants available:
   - Button variant: default, primary, danger
   - Button size: small, medium, large
   - Lozenge appearance: default, success, warning, danger

3. Custom CSS needed? (Yes/No)
   - Can Atlaskit component match the visual without custom styling?

4. Confidence level:
   - High: Exact Atlaskit component available
   - Medium: Atlaskit component with minor customization
   - Low: Custom component needed (need explicit approval)
```

### 6.3 Reusable Sub-Components
```
Identify patterns that repeat:
  - RowActions: Kebab menu with delete, edit, etc.
  - ProgressBar: Dual-color (completed + remaining)
  - StatusBadge: Colored lozenge for status
  - DateCell: Text with conditional red color if past

Create sub-components for each pattern.
```

### 6.4 Component Hierarchy
```
Build tree structure:

ReleasePage
├── Header (title)
├── Tabs
├── Toolbar
│   ├── SearchInput
│   ├── StatusFilter
│   ├── ReleaseCount
│   └── ActionButtons
├── ReleasesTable
│   ├── TableHeader
│   └── TableBody
│       ├── ReleaseRow (×18)
│       │   ├── ReleaseName
│       │   ├── StatusBadge
│       │   ├── ProgressBar
│       │   ├── DateCell
│       │   └── RowActions
├── CreateReleaseDialog
├── ReleaseConfirmDialog
└── RovoButton
```

---

## PHASE 7: Implementation & Validation

### 7.1 File Structure Creation
```
Create directory:
src/pages/[page-name]/
├── [PageName]Page.tsx
├── types.ts
├── data/mockData.ts
└── components/
    ├── [SubComponent1].tsx
    ├── [SubComponent2].tsx
    ├── [SubComponent3].tsx
    └── ...
```

### 7.2 Implementation Checklist
```
TYPES.TS:
  ✅ All TypeScript interfaces defined (Release, ReleaseStatus, etc.)
  ✅ No `any` types
  ✅ Proper union types for enums (e.g., 'RELEASED' | 'UNRELEASED')

MOCK DATA:
  ✅ 15-20 realistic items
  ✅ Covers all data types in table
  ✅ Includes edge cases (empty fields, overdue dates, 100% complete, 0% complete)

MAIN PAGE COMPONENT:
  ✅ useState hooks for filters, search, dialog states
  ✅ Filtering logic (search + status filter)
  ✅ Event handlers (create, release, cancel)
  ✅ Render toolbar, table, dialogs

SUB-COMPONENTS:
  ✅ Properly typed props (no `any`)
  ✅ Use Atlaskit components where available
  ✅ Token-based styling (no hardcoded colors)
  ✅ Hover/focus states

STYLING:
  ✅ No hardcoded hex colors
  ✅ All colors use Atlaskit tokens or CSS variables
  ✅ Spacing consistent with Jira (4px/8px/16px grid)
  ✅ Borders, shadows match original
```

### 7.3 Integration
```
APP.TSX:
  ✅ Import added
  ✅ Route added: /catalyst/[page-name]
  ✅ Lazy loading with Suspense
```

### 7.4 Testing & Validation
```
FUNCTIONAL TESTING:
  ✅ Search filters results in real-time
  ✅ Dropdown filter changes table content
  ✅ Create dialog opens/closes
  ✅ Create dialog validates (prevents empty submission)
  ✅ Release confirmation dialog works
  ✅ Row actions menu (placeholder is acceptable)
  ✅ All buttons clickable
  ✅ All links navigable

VISUAL TESTING:
  ✅ Layout matches original (±5% tolerance)
  ✅ Colors accurate (use color picker to verify)
  ✅ Typography correct (font-size, weight, line-height)
  ✅ Spacing correct (padding, margin, gaps)
  ✅ Table row hover state visible
  ✅ Progress bars render correctly
  ✅ Status badges colored appropriately
  ✅ Dates colored red if past

KEYBOARD/ACCESSIBILITY:
  ✅ Tab navigation works (all interactive elements reachable)
  ✅ Enter key on buttons works
  ✅ Escape closes dialogs
  ✅ Focus ring visible on all elements
  ✅ Semantic HTML (no <div> for buttons)

ERROR CHECKING:
  ✅ Console: zero errors
  ✅ TypeScript: zero errors
  ✅ Network: no failed requests (if mocked, that's fine)
```

### 7.5 Screenshot Evidence
```
Capture for final validation:
  1. Full page (default state)
  2. With search term entered
  3. With status filter changed
  4. Create dialog open
  5. Confirmation dialog open
  6. Table row hover state (if visible)
  
Create side-by-side comparison:
  - Original Jira screenshot
  - Catalyst implementation screenshot
  - Visual diff notes (any variance > 5%?)
```

---

## RED FLAG CHECKLIST

Stop extraction immediately if:

❌ **Hardcoded colors found** — extract must use tokens only
❌ **HTML <div> used as button** — must be semantic <button>
❌ **No form validation** — required fields must be validated
❌ **Hover states missing** — EVERY interactive element needs hover
❌ **Console errors present** — must be zero errors
❌ **TypeScript errors present** — must be zero errors
❌ **Mock data insufficient** — must be 15+ items
❌ **Layout >5% off** — spacing/alignment must be pixel-perfect
❌ **Micro-interactions mismatched** — timing/animation must match
❌ **Accessibility broken** — tab order, focus ring must work

---

**Print this checklist before starting extraction. Tick off each item as you complete it.**
