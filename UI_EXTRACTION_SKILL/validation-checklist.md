# Validation Checklist — Final QA

**Run this checklist BEFORE marking extraction complete.**

---

## VISUAL ACCURACY (±5% tolerance)

### Layout & Spacing
- [ ] Page width: matches original (±10px)
- [ ] Section padding: consistent with Jira spacing (multiples of 4px/8px/16px)
- [ ] Table column widths: proportional to original (±10%)
- [ ] Dialog dimensions: matches original (±10%)
- [ ] Element alignment: left/center/right matches (visually verified)
- [ ] White space: gaps between sections match (±5%)

### Colors
- [ ] Primary brand color (buttons): verified with color picker
- [ ] Text color: #172B4D (ds-text) default
- [ ] Text color (secondary): #626F86 (ds-text-subtlest)
- [ ] Text color (danger/overdue): #AE2A19 (ds-text-danger) ✓
- [ ] Background color: #FFFFFF (ds-background) default
- [ ] Background color (subtle): #F1F2F4 (ds-background-neutral)
- [ ] Progress bar (completed): #216E4E (ds-background-success-bold) ✓
- [ ] Progress bar (remaining): #EBECF0 (ds-border)
- [ ] Border color: #DFE1E6 (ds-border)
- [ ] No hardcoded hex colors in code (all via tokens)

### Typography
- [ ] Page title: 32px bold (or equivalent heading)
- [ ] Section headings: 24px bold (or h2/h3)
- [ ] Body text: 14px regular
- [ ] Caption/small text: 12px regular
- [ ] Font family: matches original (system fonts)
- [ ] Line height: visually consistent

### Interactive Elements
- [ ] Button styling: appearance matches (primary blue, secondary grey, danger red)
- [ ] Button size: consistent (padding, height)
- [ ] Input fields: border, padding, focus ring match
- [ ] Dropdowns: open/closed states match
- [ ] Dialog backdrop: semi-transparent overlay matches
- [ ] Focus ring: visible on all interactive elements

---

## FUNCTIONALITY TESTING

### Core Features
- [ ] Search input: filters table in real-time
- [ ] Search input: case-insensitive matching works
- [ ] Search input: clearing search shows all items
- [ ] Status filter dropdown: changes table content
- [ ] Status filter dropdown: all options functional
- [ ] Pagination (if applicable): works correctly

### Buttons & Interactions
- [ ] All buttons clickable and responsive
- [ ] Create button: opens dialog
- [ ] Cancel button (dialog): closes dialog
- [ ] Submit/Create button (dialog): validates form
- [ ] Submit button: disabled if required fields empty
- [ ] Delete/destructive button: shows confirmation
- [ ] All buttons have hover visual feedback

### Forms & Dialogs
- [ ] Create dialog: opens when button clicked
- [ ] Create dialog: closes on Cancel
- [ ] Create dialog: closes on Escape key
- [ ] Create dialog: closes on backdrop click (if applicable)
- [ ] Create form: validates required fields
- [ ] Create form: shows error message on validation fail
- [ ] Create form: submits on success
- [ ] Form fields: placeholder text visible
- [ ] Form fields: can type/input text

### Data Display
- [ ] Table displays all mock data
- [ ] Table rows: correct column count and order
- [ ] Table data types: formatted correctly (dates, numbers, etc.)
- [ ] Progress bar: displays percentage accurately
- [ ] Progress bar: green fill matches completion (e.g., 90% filled for 90% complete)
- [ ] Status badges: colored appropriately per status
- [ ] Overdue dates: displayed in red (#AE2A19)
- [ ] Future dates: displayed in default color (#172B4D)
- [ ] Row hover: background color changes

### Keyboard Navigation
- [ ] Tab key: navigates through all interactive elements
- [ ] Tab order: logical (left-to-right, top-to-bottom)
- [ ] Focus ring: visible on every tabbed element
- [ ] Enter key: activates buttons
- [ ] Escape key: closes dropdowns
- [ ] Escape key: closes modals
- [ ] Arrow keys: navigate dropdown menu items
- [ ] Dropdown: can select item with arrow keys + Enter

---

## CODE QUALITY

### TypeScript & Types
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] All variables typed (no `any` types)
- [ ] All props typed (no implicit `any`)
- [ ] All state typed correctly
- [ ] Interfaces documented for data models
- [ ] Union types used for enums (e.g., 'RELEASED' | 'UNRELEASED')

### Code Structure
- [ ] Main component: `[PageName]Page.tsx`
- [ ] Sub-components: in `components/` folder
- [ ] Types: in `types.ts`
- [ ] Mock data: in `data/mockData.ts`
- [ ] Each file has single responsibility
- [ ] Components are reusable (ProgressBar, StatusBadge, DateCell)

### Imports & Dependencies
- [ ] All Atlaskit imports correct (from @atlaskit/*)
- [ ] Token imports: `import { token } from '@atlaskit/tokens'`
- [ ] No circular imports
- [ ] All required dependencies in package.json

### Styling
- [ ] All colors use tokens: `token('ds-...')`
- [ ] No inline color strings (hex, rgb, rgba)
- [ ] No Tailwind color classes
- [ ] Spacing follows 4px/8px/16px grid
- [ ] No hardcoded dimensions (use flex/grid)
- [ ] Hover states defined (transition: 100-300ms)
- [ ] Focus states defined (focus ring visible)

---

## ACCESSIBILITY (WCAG 2.1 AA)

### Semantic HTML
- [ ] Buttons are `<button>` (not `<div>`)
- [ ] Links are `<a>` (not `<div>`)
- [ ] Form inputs are `<input>`, `<select>`, `<textarea>`
- [ ] Headings are `<h1>`, `<h2>`, etc. (not `<div>`)
- [ ] Tables have `<thead>`, `<tbody>`, `<th>` with `scope`
- [ ] No empty `<div>` elements used as controls

### ARIA Attributes
- [ ] Buttons with aria-label (if icon-only)
- [ ] Inputs with labels (via `<label>` or aria-labelledby)
- [ ] Dialogs with aria-labelledby pointing to title
- [ ] Dropdowns with role="listbox" or role="combobox"
- [ ] All required fields marked (required attribute or aria-required)

### Focus Management
- [ ] Focus ring visible on all interactive elements
- [ ] Focus order logical (tab through page)
- [ ] Focus trapped in modals (can't tab outside)
- [ ] Focus moves to dialog title when opened
- [ ] Focus returns to trigger button when dialog closed

### Color Contrast
- [ ] Text color vs. background: ≥ 4.5:1 contrast ratio
- [ ] Button text: readable against background
- [ ] Links: distinguishable from body text

---

## INTEGRATION

### App.tsx
- [ ] Import added: `const [PageName]Page = lazy(() => import(...));`
- [ ] Route added: `<Route path="/catalyst/[page-name]" element={<S><[PageName]Page /></S>} />`
- [ ] Route placed inside protected shell (after ProtectedRoute)
- [ ] Lazy loaded with Suspense wrapper

### Testing Route
- [ ] Navigate to route in browser: `/catalyst/[page-name]`
- [ ] Page loads without errors
- [ ] Catalyst shell renders (header, sidebar visible)
- [ ] Component renders fully

---

## PERFORMANCE & OPTIMIZATION

### No Errors
- [ ] Console: zero errors on page load
- [ ] Console: zero warnings on page load (except expected Atlaskit warnings)
- [ ] Network: no failed requests
- [ ] TypeScript: zero compilation errors

### Rendering
- [ ] Page loads in < 2 seconds
- [ ] Interactions respond immediately (< 200ms)
- [ ] Search filters (no noticeable lag with 20+ items)
- [ ] Dialog animations smooth (no jank)

### Data Handling
- [ ] Mock data: 15+ items for testing
- [ ] Mock data: covers all data types
- [ ] Mock data: includes edge cases:
  - [ ] Empty fields (e.g., "No work items")
  - [ ] Overdue dates (past dates in red)
  - [ ] Complete items (100% progress)
  - [ ] Empty items (0% progress)
  - [ ] Various progress percentages (0%, 45%, 90%, 100%)

---

## COMPONENT-SPECIFIC CHECKS

### Progress Bar
- [ ] Renders correctly when progress exists
- [ ] Green fill color: #216E4E (ds-background-success-bold)
- [ ] Remaining fill color: #EBECF0 (ds-border)
- [ ] Percentage accurate: 90/100 = 90% green
- [ ] Renders "No work items" when count = 0

### Status Badge
- [ ] "Released": grey lozenge
- [ ] "Unreleased": grey lozenge
- [ ] "Archived": grey lozenge (or red if applicable)
- [ ] Badge color correct per status

### Date Cell
- [ ] Past dates: red text (#AE2A19)
- [ ] Future dates: default text (#172B4D)
- [ ] Date format: matches original (e.g., "May 29, 2026")

### Table
- [ ] Column headers: correct text and styling
- [ ] Column headers: white background (#FAFBFC)
- [ ] Table rows: white background
- [ ] Row border: bottom border (#EBECF0)
- [ ] Row hover: light background change
- [ ] Row alternating colors (if applicable): matches original

### Search Input
- [ ] Placeholder: "Search"
- [ ] Placeholder text visible
- [ ] Input accepts text
- [ ] Filters results in real-time
- [ ] Case-insensitive matching
- [ ] Clear: shows all results

### Dropdowns
- [ ] Closed state: shows selected value
- [ ] Open state: shows all options
- [ ] Options readable and clickable
- [ ] Selected option: highlighted
- [ ] Click outside: closes menu
- [ ] Escape key: closes menu
- [ ] Arrow keys: navigate menu items

### Dialogs
- [ ] Title visible and matches original
- [ ] Content area: readable
- [ ] Buttons: Cancel and Create visible
- [ ] Buttons: clickable and functional
- [ ] Backdrop: semi-transparent overlay
- [ ] Close on Escape: works
- [ ] Close on backdrop click: works (if applicable)

---

## SCREENSHOT EVIDENCE

### Required Screenshots
- [ ] Original Jira page (full screenshot)
- [ ] Catalyst implementation (default state)
- [ ] Catalyst implementation (search with results)
- [ ] Catalyst implementation (filtered by status)
- [ ] Catalyst implementation (create dialog open)
- [ ] Catalyst implementation (confirmation dialog open)
- [ ] Side-by-side comparison: Original vs. Catalyst

### Visual Diff Notes
- [ ] Spacing variance: ___% (target: ≤5%)
- [ ] Color accuracy: Pass / Fail
- [ ] Typography accuracy: Pass / Fail
- [ ] Element placement: Pass / Fail
- [ ] Hover states: Pass / Fail
- [ ] Focus ring visibility: Pass / Fail

---

## RED FLAGS (MUST FIX)

### Blocker Issues
- [ ] ❌ Hardcoded colors found — extract with tokens only
- [ ] ❌ HTML used as button (`<div onclick>`) — use `<button>`
- [ ] ❌ Form missing validation — add required field checks
- [ ] ❌ Hover states missing — add to every interactive element
- [ ] ❌ Console errors present — must be zero
- [ ] ❌ TypeScript errors present — must be zero
- [ ] ❌ Layout variance > 5% — must be pixel-perfect
- [ ] ❌ Mock data < 15 items — must have sufficient test data
- [ ] ❌ Micro-interactions mismatched — timing must match original
- [ ] ❌ Accessibility broken — tab order or focus ring missing
- [ ] ❌ Route not working — page doesn't load at /catalyst/[page-name]

---

## FINAL SIGN-OFF

**Before marking as COMPLETE, all checkboxes must be checked (✓).**

**Do NOT proceed with:**
- ❌ Outstanding code review issues
- ❌ Pending accessibility fixes
- ❌ Unresolved console errors
- ❌ Missing route integration
- ❌ Incomplete mock data

**IF ANY CHECKBOX IS UNCHECKED:**
1. Document the issue
2. Add to task list
3. Fix before marking complete
4. Re-validate after fix

---

## Sign-Off

**Extraction Status:** [ ] COMPLETE [ ] IN PROGRESS [ ] BLOCKED

**Completed by:** ___________________  
**Date:** ___________________  
**Notes:** ___________________

---

**Checkpoint:** Run this checklist at 50% completion and 100% completion.
**First pass:** You'll find ~10-20 issues (normal).  
**Second pass:** After fixes, you should hit 95%+ checkboxes checked.  
**Final pass:** 100% = ready to ship.
