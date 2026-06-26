# UI Extraction Protocol — Step-by-Step

**Use this document as your checklist during every extraction.**

See SKILL.md for overview. This document provides detailed actions for each of the 7 phases.

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
4. Copy 3-5 sample rows for mock data
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
  2. Document error messages
  3. Document success/confirmation messages
```

### 5.3 Content Inventory
```
Extract ALL visible text strings:
  - Page title
  - Section headers
  - Button labels
  - Placeholder text
  - Help text
  - Status labels
  - Error messages
  - Empty state messages
```

---

## PHASE 6: Component Architecture & Atlaskit Mapping

### 6.1 Component Breakdown
```
List EVERY visually distinct element.
Then for each, determine:
  1. Best Atlaskit match
  2. Props/variants available
  3. Custom CSS needed? (Yes/No)
  4. Confidence level: High/Medium/Low
```

### 6.2 Component Hierarchy
```
Build tree structure showing parent-child relationships
and data flow.
```

---

## PHASE 7: Implementation & Validation

### 7.1 Create File Structure
```
src/pages/[page-name]/
├── [PageName]Page.tsx
├── types.ts
├── data/mockData.ts
└── components/
    ├── [SubComponent1].tsx
    └── [SubComponent2].tsx
```

### 7.2 Implementation Checklist
```
TYPES.TS:
  ✅ All TypeScript interfaces defined
  ✅ No `any` types
  ✅ Proper union types for enums

MOCK DATA:
  ✅ 15-20 realistic items
  ✅ Covers all data types
  ✅ Includes edge cases

MAIN PAGE COMPONENT:
  ✅ useState hooks for filters, search, dialog states
  ✅ Filtering logic
  ✅ Event handlers

SUB-COMPONENTS:
  ✅ Properly typed props
  ✅ Use Atlaskit components
  ✅ Token-based styling
  ✅ Hover/focus states

STYLING:
  ✅ No hardcoded colors
  ✅ All colors use tokens
  ✅ Spacing consistent
```

### 7.3 Testing & Validation
```
FUNCTIONAL TESTING:
  ✅ Search filters results
  ✅ Dropdowns work
  ✅ Dialogs open/close
  ✅ Form validation works
  ✅ Buttons clickable

VISUAL TESTING:
  ✅ Layout matches original (±5%)
  ✅ Colors accurate
  ✅ Typography correct
  ✅ Spacing correct
  ✅ Hover states visible

KEYBOARD/ACCESSIBILITY:
  ✅ Tab navigation works
  ✅ Enter/Escape work
  ✅ Focus ring visible
  ✅ Semantic HTML

ERROR CHECKING:
  ✅ Console: zero errors
  ✅ TypeScript: zero errors
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

---

**Print this checklist before starting extraction. Tick off each item as you complete it.**
