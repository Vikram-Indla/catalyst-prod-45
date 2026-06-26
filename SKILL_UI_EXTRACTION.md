# UI Extraction & React Replication Skill

**Purpose:** Take a screenshot + URL of any page (Jira, web app, etc.) and produce exact, functional React component implementations using Catalyst/Atlaskit with zero prototype code.

**Scope:** Full extraction pipeline — DOM inspection, interaction mapping, data modeling, and implementation.

---

## Skill Activation

```
/ui-extract
```

**Required inputs:**
1. Screenshot of the target page
2. URL to the live page
3. (Optional) Specific regions to prioritize or exclude

---

## Extraction Pipeline (7 Phases)

### Phase 1: Visual Inventory & Layout Mapping
**Duration:** 15-20 min | **Output:** Layout document + screenshots of regions

**Actions:**
- Take full-page screenshot (mark coordinates)
- Take region-specific zoomed screenshots:
  - Global header/navigation
  - Toolbar/filters
  - Main content area
  - Table/list (if exists)
  - Dialogs/modals (if triggered)
  - Floating elements (buttons, tooltips)
  - Footer (if relevant)
- Document approximate dimensions and positioning
- Identify sticky/fixed elements
- Note responsive behavior (if testable)

**Output file:** `01-visual-inventory.md`
- Region listing with coordinates
- Screenshot references
- Layout grid (flex/grid detection)
- Spacing/padding estimates

---

### Phase 2: DOM & Accessibility Inspection
**Duration:** 10-15 min | **Output:** Structure document

**Actions:**
- Open DevTools → Elements tab
- Inspect each interactive element:
  - Buttons: `aria-label`, `type`, classes
  - Inputs: `placeholder`, `type`, `aria-label`
  - Tables: semantic `<table>`, `<thead>`, `<tbody>`, roles
  - Dropdowns: `role="listbox"`, menu items
  - Dialogs: `role="dialog"`, `aria-labelledby`
  - Links: `href` patterns, target
- Extract role attributes, ARIA labels
- Note event listeners (hover, click, focus)
- Capture data attributes (if present)

**Output file:** `02-dom-structure.md`
- Semantic HTML hierarchy
- Role/ARIA attributes
- Accessibility tree
- Event listener map

---

### Phase 3: Computed Styles & Design Tokens
**Duration:** 15-20 min | **Output:** Styles document

**Actions:**
- DevTools → Computed Styles for each unique element:
  - Colors: `color`, `background-color`, `border`
  - Typography: `font-size`, `font-weight`, `line-height`, `font-family`
  - Spacing: `padding`, `margin`, `gap`
  - Sizing: `width`, `height`, `min-width`, `max-width`
  - Display: `display`, `flex-direction`, `align-items`, `justify-content`
  - Borders: `border-radius`, `border-width`, `border-style`
  - Shadows: `box-shadow`
  - Hover/focus states: DevTools → `:hov` pseudo-class selector
- Map colors to Atlaskit tokens (if Jira/Atlassian product)
- Identify design system patterns

**Output file:** `03-computed-styles.md`
- CSS property map per element type
- Color palette with hex values
- Typography scale
- Spacing units
- Hover/focus state styles

---

### Phase 4: Interaction & Behavior Mapping
**Duration:** 20-30 min | **Output:** Interaction model

**Actions:**
- Click each button/link → note state changes:
  - URL change (navigation)
  - Modal/dialog open
  - Dropdown expand
  - State toggle (selected, disabled)
  - Tooltip appear
- Type in search/input fields → observe:
  - Real-time filtering
  - Debounce behavior
  - Error messages
  - Validation rules
- Hover elements → check:
  - Background color change
  - Tooltip appearance
  - Icon change
  - Underline/highlight
- Tab through page → verify:
  - Focus order (logical, left-to-right, top-to-bottom)
  - Focus ring visibility
  - Keyboard shortcuts
- Open dialogs → test:
  - Form validation
  - Submit behavior
  - Cancel behavior
  - Escape key close
  - Backdrop click close
- Open dropdowns → test:
  - Arrow key navigation
  - Enter to select
  - Escape to close
  - Click outside to close

**Output file:** `04-interaction-model.md`
- Interaction flow per element (trigger → response → state)
- Keyboard behavior
- Validation rules
- Error/success states
- Loading states (if present)

---

### Phase 5: Data Model & Content Extraction
**Duration:** 10-15 min | **Output:** Data model + content inventory

**Actions:**
- If table/list visible:
  - Inspect row structure: how many columns, what data types
  - Note sorting/pagination controls
  - Copy 3-5 row examples into mock data
- If form visible:
  - List all fields: label, type, required, placeholder
  - Document validation messages
  - Note any dependent fields
- Extract all visible text:
  - Button labels
  - Header/title text
  - Placeholder text
  - Help text
  - Error messages
  - Status badges/labels
- Note any dynamic content indicators (loading spinners, "No results" messages, etc.)

**Output file:** `05-data-model.md`
- TypeScript interface definitions (Release, User, Item, etc.)
- Mock data (15-20 items)
- Content strings (all visible text)
- Data transformation rules (if any filtering/sorting)

---

### Phase 6: Component Architecture & Atlaskit Mapping
**Duration:** 15-20 min | **Output:** Component map

**Actions:**
- List every visual distinct element:
  - Header
  - Navigation/tabs
  - Toolbar (search, filters, buttons)
  - Table/list
  - Row components
  - Modal dialogs
  - Dropdowns
  - etc.
- For EACH element, determine:
  - Best Atlaskit component match
  - Props/variants available
  - Custom wrapper needed?
  - Styling approach (tokens, inline, CSS-in-JS)
- Identify reusable sub-components:
  - RowActions (kebab menu pattern)
  - ProgressBar (custom or Atlaskit)
  - StatusBadge (Lozenge)
  - DateCell (conditional color)
- Document component hierarchy (tree structure)

**Output file:** `06-component-map.md`
- Component list with:
  - Atlaskit package
  - Import statement
  - Props/variants
  - Confidence level (High/Medium/Low)
  - Custom CSS needed (Yes/No)
- Component tree/hierarchy
- Reusable sub-components

---

### Phase 7: Implementation & Validation
**Duration:** 60-90 min | **Output:** Complete React implementation

**Actions:**
- Create file structure:
  ```
  src/pages/[page-name]/
  ├── [PageName]Page.tsx (main component)
  ├── types.ts
  ├── data/mockData.ts
  └── components/
      ├── [SubComponent1].tsx
      ├── [SubComponent2].tsx
      └── ...
  ```
- Implement main page component:
  - State management (filters, search, dialog visibility)
  - Data filtering logic
  - Event handlers
- Implement sub-components:
  - Props typing
  - Atlaskit usage
  - Token-based styling
  - Hover/focus states
- Implement dialogs:
  - Form validation
  - Submit/cancel handlers
- Add route to App.tsx (if applicable)
- Test all interactions:
  - Search/filter real-time updates ✓
  - Dialog open/close ✓
  - Form validation ✓
  - Button actions ✓
  - Keyboard navigation ✓
- Screenshot comparison:
  - Visual diff against original
  - Color accuracy check
  - Spacing/alignment check
  - Element placement check

**Output files:**
- Full React component set
- Type definitions
- Mock data
- App.tsx route addition (if needed)
- Implementation evidence (screenshots)

---

## Key Extraction Rules

### Colors
- **Always map to Atlaskit tokens first:**
  ```
  ds-text-neutral: #172B4D
  ds-text-danger: #AE2A19
  ds-background-success-bold: #216E4E
  ds-border-neutral: #EBECF0
  ```
- If Atlaskit token unavailable, use CSS variable with fallback
- Never hardcode hex colors directly

### Typography
- Extract font-family, font-size, font-weight, line-height
- Use Atlaskit heading/text components where possible
- Document any custom font sizes

### Spacing
- Identify grid unit (usually 4px, 8px, or 16px)
- Use consistent spacing scale
- Document all margin/padding patterns

### Interactive States
- **Every element needs:** default, hover, focus, active, disabled
- Use DevTools → `:hov` pseudo-class to inspect hover
- Use DevTools → `:foc` to inspect focus
- Document all state transitions

### Accessibility
- Preserve `aria-label`, `role`, `aria-selected`, etc.
- Ensure semantic HTML (`<button>` not `<div onclick>`)
- Test tab order
- Verify focus ring visibility

### Micro-Interactions
- Search debounce timing
- Dialog animation (if any)
- Hover state delay (usually instant or 100-200ms)
- Tooltip delay (usually 300-500ms)
- Transition duration (usually 100-300ms)

---

## Validation Checklist

Before marking extraction complete, verify:

- [ ] Visual layout matches (±5% spacing tolerance)
- [ ] All colors accurate (use color picker tool)
- [ ] Typography sizes correct (font-size, weight, line-height)
- [ ] All buttons functional (click handlers work)
- [ ] Search/filter real-time (instant or <500ms debounce)
- [ ] Dialogs open/close smoothly
- [ ] Form validation works (required fields, error messages)
- [ ] Hover states visible and correct color
- [ ] Focus ring visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Status badges/colors accurate
- [ ] Progress bars render correctly
- [ ] Dates formatted consistently
- [ ] Overdue/past dates styled in red (if applicable)
- [ ] All row actions responsive
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Atlaskit package versions compatible
- [ ] Mock data sufficient for testing (15+ items)
- [ ] No hardcoded colors (all tokens/variables)
- [ ] All micro-interactions match original (timing, smoothness)

---

## Common Patterns to Extract

### Tables
- Column headers (sortable?)
- Row structure (number of columns, data types)
- Row hover state
- Row actions (kebab menu, buttons)
- Progress bars (if data visualization)
- Status badges
- Link navigation
- Pagination/infinite scroll

### Forms
- Field types (text, email, date, select, checkbox, radio)
- Validation (required, pattern, min/max length)
- Error messages (inline, toast, modal)
- Submit button (disabled state)
- Cancel button

### Dialogs
- Modal vs. non-modal
- Close buttons (X, Cancel, Escape)
- Backdrop click behavior
- Form inside modal (submit/cancel)
- Confirmation dialogs (with destructive action styling)

### Dropdowns/Menus
- Trigger element (button, link, icon)
- Menu items (icon, text, keyboard shortcut)
- Dividers between groups
- Destructive items (red text)
- Disabled items (grey, no click)
- Hover state (background highlight)

### Search/Filter
- Debounce timing (usually 200-300ms)
- Clear button
- Real-time results
- "No results" state
- Search icon

---

## Output Deliverables

When extraction is complete, deliver:

1. **Extraction docs** (6 markdown files):
   - 01-visual-inventory.md
   - 02-dom-structure.md
   - 03-computed-styles.md
   - 04-interaction-model.md
   - 05-data-model.md
   - 06-component-map.md

2. **React implementation** (in `/src/pages/[page-name]/`):
   - [PageName]Page.tsx
   - types.ts
   - data/mockData.ts
   - components/*.tsx (sub-components)

3. **Evidence**:
   - Original screenshot
   - Implementation screenshot(s)
   - Visual diff comparison

4. **Route integration**:
   - Updated App.tsx with new route
   - Route: `/catalyst/[page-name]` (test route)

---

## Anti-Patterns (What NOT to do)

❌ Hardcode colors: `style={{ color: '#AE2A19' }}`  
✅ Use tokens: `style={{ color: token('ds-text-danger') }}`

❌ Use HTML `<table>` without semantic structure  
✅ Use `<thead>`, `<tbody>`, proper `scope` attributes

❌ Missing hover states  
✅ Every interactive element has `:hover`, `:focus`, `:active`

❌ No form validation  
✅ Required fields, error messages, success states

❌ Hardcode text strings scattered in JSX  
✅ Extract to types/constants or mock data

❌ Mix Atlaskit with custom components randomly  
✅ Use Atlaskit-first, custom only when Atlaskit unavailable

❌ Accessibility ignored (missing aria-labels, roles)  
✅ Preserve all ARIA attributes and semantic HTML

❌ No mock data or data model  
✅ TypeScript interfaces + 15+ mock items for testing

---

## Time Estimates

| Phase | Duration | Complexity |
|-------|----------|-----------|
| Visual Inventory | 15-20 min | Low |
| DOM Inspection | 10-15 min | Low |
| Styles Collection | 15-20 min | Medium |
| Interaction Mapping | 20-30 min | Medium |
| Data Modeling | 10-15 min | Low-Medium |
| Component Architecture | 15-20 min | Medium |
| Implementation | 60-90 min | High |
| **TOTAL** | **145-190 min** | **~3 hours** |

---

## Success Criteria

A successful extraction results in:

✅ **Pixel-perfect match** — Layout, spacing, colors within 2-3% tolerance  
✅ **Functional parity** — All interactions work (search, filter, dialogs)  
✅ **Type-safe** — Full TypeScript, no `any` types  
✅ **Atlaskit-native** — 90%+ Atlaskit components, no custom reinvention  
✅ **Accessible** — Passes WCAG 2.1 AA (focus, keyboard nav, contrast)  
✅ **Testable** — Mock data sufficient to verify all features  
✅ **No errors** — Zero console errors, zero TypeScript errors  
✅ **Maintainable** — Clear component structure, well-documented  

---

## When to Use This Skill

✅ Replicate Jira UI surfaces (Releases, Backlog, Board, etc.)  
✅ Clone internal admin pages (Settings, Config, Analytics)  
✅ Port designs from Figma to working React  
✅ Build parity implementations of legacy systems  
✅ Extract patterns from competitor UIs (for research)  

❌ Do NOT use for:  
- One-off simple forms (overkill — just code directly)  
- Pixel-perfect creative designs with custom animations (use Figma → designer → code path)  
- Pages with heavy video/media content (focus on interactive UI only)  

