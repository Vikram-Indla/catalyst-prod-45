# Validation Checklist — Final QA

**Run this checklist BEFORE marking extraction complete.**

See SKILL.md for overview. This document provides detailed validation criteria.

---

## VISUAL ACCURACY (±5% tolerance)

### Layout & Spacing
- [ ] Page width matches original (±10px)
- [ ] Section padding consistent (multiples of 4px/8px/16px)
- [ ] Table column widths proportional (±10%)
- [ ] Dialog dimensions match (±10%)
- [ ] Element alignment correct (left/center/right)
- [ ] White space gaps match (±5%)

### Colors
- [ ] Primary brand color verified with color picker
- [ ] Text color: #172B4D (ds-text)
- [ ] Secondary text: #626F86 (ds-text-subtlest)
- [ ] Danger text: #AE2A19 (ds-text-danger)
- [ ] Success background: #216E4E
- [ ] No hardcoded colors in code (all tokens)

### Typography
- [ ] Page title: 32px bold
- [ ] Section headings: 24px bold
- [ ] Body text: 14px regular
- [ ] Caption: 12px regular
- [ ] Font family matches
- [ ] Line height consistent

### Interactive Elements
- [ ] Button styling matches
- [ ] Input fields styled correctly
- [ ] Dropdowns open/close properly
- [ ] Dialog backdrop visible
- [ ] Focus ring visible on all elements

---

## FUNCTIONALITY TESTING

### Core Features
- [ ] Search filters in real-time
- [ ] Search is case-insensitive
- [ ] Status filter changes content
- [ ] All filter options work

### Buttons & Interactions
- [ ] All buttons clickable
- [ ] Create button opens dialog
- [ ] Cancel closes dialog
- [ ] Submit validates form
- [ ] Buttons have hover feedback

### Forms & Dialogs
- [ ] Create dialog opens on button click
- [ ] Dialog closes on Cancel
- [ ] Dialog closes on Escape
- [ ] Dialog closes on backdrop click
- [ ] Form validates required fields
- [ ] Error messages show on invalid input
- [ ] Form submits on success

### Data Display
- [ ] Table displays all mock data
- [ ] Columns correct count and order
- [ ] Data formatted correctly (dates, numbers)
- [ ] Progress bars accurate
- [ ] Status badges colored per status
- [ ] Overdue dates red
- [ ] Row hover state visible

### Keyboard Navigation
- [ ] Tab navigates all elements
- [ ] Focus order logical
- [ ] Focus ring visible on tabbed elements
- [ ] Enter activates buttons
- [ ] Escape closes dropdowns/modals
- [ ] Arrow keys navigate dropdowns

---

## CODE QUALITY

### TypeScript & Types
- [ ] Zero TypeScript errors
- [ ] All variables typed (no `any`)
- [ ] All props typed
- [ ] All state typed
- [ ] Interfaces documented
- [ ] Union types for enums

### Code Structure
- [ ] Main component: [PageName]Page.tsx
- [ ] Sub-components in components/ folder
- [ ] Types in types.ts
- [ ] Mock data in data/mockData.ts
- [ ] Single responsibility per file
- [ ] Reusable sub-components (ProgressBar, StatusBadge, etc.)

### Styling
- [ ] All colors use tokens: token('ds-...')
- [ ] No inline color strings
- [ ] No Tailwind color classes
- [ ] Spacing follows grid (4px/8px/16px)
- [ ] Hover states defined
- [ ] Focus states defined

---

## ACCESSIBILITY (WCAG 2.1 AA)

### Semantic HTML
- [ ] Buttons are `<button>`
- [ ] Links are `<a>`
- [ ] Form inputs are `<input>`, `<select>`, `<textarea>`
- [ ] Headings are `<h1>`, `<h2>`, etc.
- [ ] Tables have `<thead>`, `<tbody>`, `<th scope>`

### ARIA Attributes
- [ ] Buttons have aria-label (if icon-only)
- [ ] Inputs have labels
- [ ] Dialogs have aria-labelledby
- [ ] Dropdowns have role attributes
- [ ] Required fields marked

### Focus Management
- [ ] Focus ring visible on all interactive elements
- [ ] Tab order logical
- [ ] Focus trapped in modals
- [ ] Focus moves to dialog on open
- [ ] Focus returns to trigger on close

### Color Contrast
- [ ] Text vs. background: ≥4.5:1 contrast
- [ ] Button text readable
- [ ] Links distinguishable

---

## INTEGRATION

### App.tsx
- [ ] Import added
- [ ] Route added: /catalyst/[page-name]
- [ ] Route in protected shell
- [ ] Lazy loaded with Suspense

### Testing Route
- [ ] Route loads without errors
- [ ] Catalyst shell renders
- [ ] Component renders fully

---

## PERFORMANCE & OPTIMIZATION

### No Errors
- [ ] Console: zero errors
- [ ] TypeScript: zero errors
- [ ] Network: no failed requests

### Rendering
- [ ] Page loads in < 2 seconds
- [ ] Interactions respond < 200ms
- [ ] Search filters smoothly
- [ ] Dialogs animate smoothly

### Data
- [ ] Mock data: 15+ items
- [ ] Covers all data types
- [ ] Includes edge cases:
  - [ ] Empty fields
  - [ ] Overdue dates
  - [ ] 100% complete items
  - [ ] 0% complete items
  - [ ] Various progress percentages

---

## RED FLAGS (MUST FIX)

- [ ] ❌ Hardcoded colors found
- [ ] ❌ HTML used as button
- [ ] ❌ Form missing validation
- [ ] ❌ Hover states missing
- [ ] ❌ Console errors present
- [ ] ❌ TypeScript errors present
- [ ] ❌ Layout variance > 5%
- [ ] ❌ Mock data < 15 items
- [ ] ❌ Micro-interactions mismatched
- [ ] ❌ Accessibility broken
- [ ] ❌ Route not working

---

## FINAL SIGN-OFF

**Before marking COMPLETE: ALL checkboxes must be checked (✓)**

**Do NOT proceed with:**
- Outstanding code review issues
- Pending accessibility fixes
- Unresolved console errors
- Missing route integration
- Incomplete mock data

**IF ANY CHECKBOX IS UNCHECKED:**
1. Document the issue
2. Fix before marking complete
3. Re-validate after fix

---

**Extraction Status:** [ ] COMPLETE [ ] IN PROGRESS [ ] BLOCKED

**Completed by:** ___________________  
**Date:** ___________________

---

**Run this checklist at 50% and 100% completion.**
