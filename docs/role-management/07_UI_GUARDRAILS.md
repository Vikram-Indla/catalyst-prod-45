# 07. UI Guardrails — Hard Rules

**Status:** Approved  
**Last Updated:** 2026-06-24

---

## MUST USE

- ✅ Existing Catalyst shell (AdminLayout, TopNavigation)
- ✅ Flat Admin sidebar (no nested pages)
- ✅ Atlassian Design System tokens (var(--ds-*))
- ✅ Atlassian Button, Select, Modal, Dropdown components
- ✅ JiraTable for all tables
- ✅ Compact enterprise layout (48–56px rows)
- ✅ Sticky headers and first columns in matrices
- ✅ Neutral surfaces and borders
- ✅ Blue for primary actions only
- ✅ Red for destructive actions only
- ✅ Amber for warnings/locked/expiry only
- ✅ Green for success/active only
- ✅ Readable text contrast (WCAG AA minimum)
- ✅ Form labels above inputs
- ✅ Helper text below inputs
- ✅ 240px fixed sidebar
- ✅ 24px page padding
- ✅ 16px section spacing
- ✅ Dynamic role dropdown (loads from roles table)
- ✅ Sticky save bar (only when unsaved changes)

---

## MUST NOT USE

- ❌ Lime or bright yellow
- ❌ Rainbow colors or gradients
- ❌ Random purple or decorative colors
- ❌ Playful or consumer SaaS UI
- ❌ Oversized cards or padding
- ❌ Excessive gray-out or faded controls
- ❌ Placeholder pages
- ❌ "Coming soon" or "Under construction" text
- ❌ Empty tabs or disabled shells
- ❌ Fake data marked as production
- ❌ Skeleton-only implementations
- ❌ Buttons that do nothing
- ❌ Full-page horizontal scrolling
- ❌ Clipped dropdowns at viewport edges
- ❌ Inconsistent spacing
- ❌ Hardcoded roles in Create Access modal
- ❌ Duplicate save buttons (header + footer + sticky bar)
- ❌ Non-sticky matrix first columns
- ❌ Ungrouped 120+ field grids
- ❌ Unreadable row heights
- ❌ Hidden overflow
- ❌ Modals smaller than 480px
- ❌ Drawers wider than approved spec

---

## Exact Measurements

| Measurement | Value | Notes |
|---|---|---|
| Top nav height | 56px | Fixed |
| Sidebar width | 240px | Fixed, no collapse in Phase 1 |
| Page padding | 24px | All sides |
| Section spacing | 16px | Between sections |
| Field spacing | 16px | Between form fields |
| Table row height | 48–56px | Includes padding |
| Tab bar height | 44px | Sticky below title |
| Modal width | 480px | Minimum, standard 480–600px |
| Drawer width | 540px | Right-side panels |
| Matrix cell padding | 12px left/right, 8px top/bottom | Compact tables |

---

## Typography Scale (Exact)

| Component | Size | Weight | Color |
|---|---|---|---|
| Page title | 28px | 600 | primary |
| Page subtitle | 14px | 400 | subtle |
| Section heading | 18px | 600 | primary |
| Tab label | 14px | 500 | primary |
| Form label | 14px | 500 | primary |
| Table header | 12px | 600 | primary (sentence-case) |
| Table body | 14px | 400 | primary |
| Helper text | 12px | 400 | subtle |
| Button text | 14px | 500 | based on button |

---

## Color Rules (ADS Tokens Mandatory)

**Every color must be a CSS variable. Hardcoded hex is banned.**

```css
/* Primary text */
color: var(--ds-text, #172B4D);

/* Subtle secondary text */
color: var(--ds-text-subtle, #42526E);

/* Link blue (primary action color) */
color: var(--ds-link, #0052CC);

/* Success green (active status, checkmarks) */
color: #216E4E; /* via success token */

/* Warning amber (locked, expiry, warnings) */
color: #974F0C; /* via warning token */

/* Danger red (delete, errors, destructive) */
color: #AE2A19; /* via danger token */

/* Page background */
background-color: var(--ds-surface, #FFFFFF);

/* Subtle surface for alternate rows */
background-color: var(--ds-background-neutral-subtle, #F7F8F9);

/* Selection highlight */
background-color: var(--ds-background-selected, #E9F2FE);

/* Borders */
border: 1px solid var(--ds-border, #DFE1E6);
```

---

## Status Badges

| Status | Background | Text | Icon |
|---|---|---|---|
| Active | Green light | Green dark | ✓ |
| Pending | Amber light | Amber dark | ⧗ |
| Dormant | Amber light | Amber dark | (warning) |
| Inactive | Gray light | Gray dark | — |
| Locked | Gray light | Gray dark | 🔒 |
| Banned | Neutral | Dark | 🔒 + "Banned" |

---

## Interaction Rules

- Hover: subtle bg `rgba(9,30,66,0.04)` (neutral gray 4%)
- Focus: blue border + box-shadow (via ADS token)
- Disabled: `opacity: 0.5` or gray text, `cursor: not-allowed`
- Locked: lock icon + gray, no interaction
- Loading: Spinner from @atlaskit/spinner
- Error: red border + red text helper
- Success: green checkmark + green text helper

---

## Empty States & Errors

- Empty list: "No X found" + "Create X" CTA
- Empty table: EmptyState component with icon + action
- Error: Toast via Flag from @atlaskit/flag (red, 5s auto-close)
- Success: Toast via Flag (green, 5s auto-close)
- Confirmation: Modal with [Confirm] and [Cancel]

---

## Responsive Breakpoints (Phase 1 Desktop Only)

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop | 1200px+ | Full layout |
| Tablet | 768–1199px | Sidebar collapses to icons |
| Mobile | <768px | NOT SUPPORTED (admin desktop-only) |

---

## Accessibility (WCAG AA)

- ✅ Text contrast minimum 4.5:1
- ✅ Form labels associated with inputs
- ✅ Error messages linked to fields
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators visible
- ✅ ARIA labels on icon buttons
- ✅ Disabled state clearly indicated
- ✅ No color-only information (use icon + label + color)
- ✅ Modal focus trap (Esc closes)
- ✅ Semantic HTML (buttons, links, tables)

---

**Violations of these rules block code review. Zero exceptions.**
