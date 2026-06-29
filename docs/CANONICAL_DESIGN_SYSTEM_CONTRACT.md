# CATALYST CANONICAL DESIGN SYSTEM CONTRACT
## Complete Developer Specification v1.0

**Last Updated:** 2026-06-29  
**Status:** Active & Enforced  
**Enforcement:** Pre-commit hook + CI gate (fail-on-increase ratchet)

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [The Canonical Contract](#the-canonical-contract)
3. [Design System Hierarchy](#design-system-hierarchy)
4. [What Gets Blocked](#what-gets-blocked)
5. [Migration Guide for Tailwind Components](#migration-guide-for-tailwind-components)
6. [Component Reuse Checklist](#component-reuse-checklist)
7. [ADS Token Reference](#ads-token-reference)
8. [Common Migration Scenarios](#common-migration-scenarios)
9. [Validation & Testing](#validation--testing)
10. [Approval & Override Process](#approval--override-process)

---

## EXECUTIVE SUMMARY

### The Contract

**No developer may push code with:**
- Tailwind color utilities (`bg-slate-100`, `text-red-500`, etc.)
- Hard-coded hex colors (`#E9F2FE`, `#fff`, etc.)
- Raw `rgb()`, `rgba()`, `hsl()`, `hsla()` values
- Custom color constants or inline styles with colors
- Custom spacing or typography that violates ADS grid

### The Enforcement

| Layer | Mechanism | Enforcement |
|-------|-----------|-------------|
| **Local** | `.husky/pre-commit` | `npm run lint:colors:gate` — blocks commit |
| **CI** | `.github/workflows/ci.yml` | Same gates run on staging — blocks merge |
| **Ratchet** | Baseline tracking | Can only decrease; increases require approval |
| **Escape Hatch** | `/* ads-scanner:ignore-next-line */` | Documented only; no silent bypasses |

### Current State

- **Hard-coded colors baseline:** 76 (down from 709 in Phase 5)
- **Typography violations baseline:** 2,132
- **Spacing violations baseline:** 1,082
- **Tailwind utilities blocked:** ✅ All color + spacing + typography utilities

### Developer Responsibility

Before committing, run:

```bash
# Pre-commit runs automatically, but verify locally:
npm run lint:colors:gate
npm run audit:ads:gate

# View violations:
npm run lint:colors
npm run audit:ads
```

---

## THE CANONICAL CONTRACT

### Three Universal Rules

#### 1. **Component-First (Not Utility-First)**

You may **not** build UI bottom-up with utilities. You must build top-down using components.

```tsx
// ❌ BANNED: Utility-first (Tailwind mentality)
<div className="flex items-center gap-4 bg-slate-100 p-4 rounded border border-gray-300">
  <span className="text-sm font-medium text-gray-900">Status</span>
</div>

// ✅ CORRECT: Component-first (Catalyst mentality)
<CatalystStatusPill status={status} interactive={true} />
```

#### 2. **Canonical Hierarchy (Search Before Building)**

Before writing ANY component, primitive, hook, util, or wrapper — search in this order:

```
1. Existing Catalyst canonical component
   └─ Search: grep -r "<concept>" src/components src/lib src/hooks

2. Existing Catalyst wrapper
   └─ Wraps ADS + Catalyst styling

3. Catalyst Storybook component
   └─ Query: catalyst-storybook MCP

4. Atlassian Design System primitive
   └─ @atlaskit/* packages

5. Hand-rolled component
   └─ ONLY with written Vikram approval + documented proof of unsuitability
```

#### 3. **ADS Tokens Only (Hard Stop ⛔)**

**All color, spacing, typography decisions MUST use ADS tokens.**

```tsx
// ❌ BANNED
style={{ color: '#0C66E4', marginTop: '12px' }}
className="bg-blue-500 text-gray-800 p-3"
<div style={{ backgroundColor: 'rgb(229, 238, 255)' }}>

// ✅ CORRECT
style={{ color: 'var(--ds-text-brand)', marginTop: 'var(--ds-space-150)' }}
className="..." (no color/spacing utilities)
<div style={{ backgroundColor: 'var(--ds-background-neutral-subtle)' }}>
```

---

## DESIGN SYSTEM HIERARCHY

### Atlassian Design System (ADS) Foundation

Catalyst is built on **Atlassian Design System**, which provides:

- **Color tokens** (`var(--ds-text)`, `var(--ds-background-*)`, etc.)
- **Spacing tokens** (`var(--ds-space-025)` through `var(--ds-space-1000)`)
- **Typography** (via `@atlaskit/primitives/text`)
- **Components** (`@atlaskit/button`, `@atlaskit/modal-dialog`, etc.)

### Catalyst Canonical Components (Layer 1)

Catalyst adds **work-item-specific** components:

| Component | Purpose | Import |
|-----------|---------|--------|
| `JiraTable` | Work item / issue listing tables | `src/components/jira/JiraTable.tsx` |
| `CatalystStatusPill` | Status display with styling | `src/components/ui/StatusPill` |
| `StatusTransitionDropdown` | Status editing with dropdown | Built on `@atlaskit/dropdown-menu` |
| `CatalystViewBase` | Detail view shell (header + sidebar layout) | `src/components/shared/CatalystViewBase` |
| `JiraIssueTypeIcon` | Work item type icons | `src/lib/jira-issue-type-icons` |
| `EditableAssignee` | Inline editable assignee field | `src/components/ui/EditableAssignee` |
| `EditablePriority` | Inline editable priority field | `src/components/ui/EditablePriority` |
| `CatalystDueDateField` | Date picker + display | `src/components/ui/CatalystDueDateField` |
| `AIIntelligenceButton` | AI CTA with rainbow icon (signature) | `src/components/ui/AIIntelligenceButton` |
| `CatyRainbowCTA` | Rainbow-themed AI action button | `src/components/ui/CatyRainbowCTA` |
| `CatalystSidebarDetails` | Key details sidebar | `src/components/shared/CatalystSidebarDetails` |

### Atlassian Design System Primitives (Layer 2)

Fall back to ADS when no Catalyst wrapper exists:

| Need | Component | Package |
|------|-----------|---------|
| Button | `Button` | `@atlaskit/button` |
| Dropdown / Menu | `DropdownMenu` | `@atlaskit/dropdown-menu` |
| Select | `Select` | `@atlaskit/select` |
| Modal | `ModalDialog` | `@atlaskit/modal-dialog` |
| Tabs | `Tabs` | `@atlaskit/tabs` |
| Text Input | `Textfield` | `@atlaskit/textfield` |
| Avatar | `Avatar` | `@atlaskit/avatar` |
| Badge / Lozenge | `Lozenge`, `Badge` | `@atlaskit/lozenge`, `@atlaskit/badge` |
| Spinner | `Spinner` | `@atlaskit/spinner` |
| Tooltip | `Tooltip` | `@atlaskit/tooltip` |
| Popup | `Popup` | `@atlaskit/popup` |
| Text | `Text` | `@atlaskit/primitives` |
| Checkbox | `Checkbox` | `@atlaskit/checkbox` |
| Toast / Flag | `Flag` | `@atlaskit/flag` |
| Date Picker | `DatePicker` | `@atlaskit/datetime-picker` |
| Drawer | `DrawerDialog` | `@atlaskit/drawer` |

### Banned (Do Not Implement)

These MUST use canonical components or ADS. Do NOT hand-roll:

- ❌ Custom tables, CSS grid tables, flex-based tables
- ❌ Custom dropdowns, menus, select components
- ❌ Custom modals, drawers, popovers
- ❌ Custom tabs, buttons, checkboxes
- ❌ Custom date fields, time pickers
- ❌ Custom permission matrices
- ❌ Custom status pills, badges, lozenges
- ❌ Custom spinners, toasts, notifications
- ❌ Custom sidebars, navigation

**Two failed correction loops on a hand-rolled component = stop and rebuild from canonical.**

---

## WHAT GETS BLOCKED

### 1. Hard-Coded Colors (All Hex)

```tsx
// ❌ BLOCKED
<div style={{ color: '#E9F2FE' }}>
<div style={{ backgroundColor: '#0052CC' }}>
<div className="..." style={{ borderColor: '#fff' }}>
```

**Baseline:** 76 violations  
**Gate:** `npm run lint:colors:gate` (fail-on-increase)

### 2. Tailwind Color Utilities (All Variants)

```tsx
// ❌ BLOCKED — All variants
className="bg-slate-100"           // Tailwind bg-*
className="text-red-500"           // Tailwind text-*
className="border-gray-300"        // Tailwind border-*
className="text-xs text-sm"        // Tailwind text-{size}
className="p-4 m-2 gap-3"          // Tailwind spacing (if off-grid)
```

**Scanner regex:** Detects `bg-{color}-{shade}`, `text-{color}-{shade}`, `text-{size}`

**Gate:** `npm run audit:ads:gate` (typography + spacing categories)

### 3. Raw RGB / HSL Values

```tsx
// ❌ BLOCKED
style={{ color: 'rgb(255, 0, 0)' }}
style={{ background: 'rgba(0, 0, 0, 0.5)' }}
style={{ borderColor: 'hsl(0, 100%, 50%)' }}
```

**Gate:** `npm run lint:colors:gate`

### 4. Custom Spacing (Off-Grid)

```tsx
// ❌ BLOCKED — Not on 4/8/16/24/32/40/48px grid
style={{ marginTop: '13px' }}       // Off-grid
style={{ padding: '11px' }}         // Off-grid
style={{ gap: '15px' }}             // Off-grid
```

**Allowed grid:** 4, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, ...

**Gate:** `npm run audit:ads:gate` (spacing category)

### 5. Custom Typography (Off-Scale)

```tsx
// ❌ BLOCKED — Not on ADS type scale
style={{ fontSize: '13px' }}        // Off-scale
style={{ fontWeight: '500' }}       // Not in ADS
style={{ lineHeight: '1.4' }}       // Custom
```

**Gate:** `npm run audit:ads:gate` (typography category)

### 6. Inline Style Objects with Colors

```tsx
// ❌ BLOCKED
<div style={{ color: 'green', backgroundColor: '#eee' }}>
<span style={{ ...someObject, color: '#f00' }}>
```

---

## MIGRATION GUIDE FOR TAILWIND COMPONENTS

### Step 1: Identify Violations

```bash
# Find all Tailwind color utilities
npm run lint:colors

# View detailed violations with line numbers
npm run audit:ads

# Run both gates to see what will block
npm run lint:colors:gate
npm run audit:ads:gate
```

### Step 2: Understand Your Component

Map what the component is trying to do:

```tsx
// BEFORE (Tailwind)
<div className="flex items-center gap-4 bg-slate-100 p-4 rounded-lg border border-gray-300">
  <Icon className="w-5 h-5 text-blue-500" />
  <span className="text-sm font-semibold text-gray-900">Active Status</span>
</div>
```

**Questions to ask:**

1. Is this a known UI pattern in Catalyst? (Status pill, badge, etc.)
2. Does a canonical component already exist for this?
3. What is the semantic purpose? (e.g., "status indicator", "alert badge")
4. What data does it display? (e.g., status, count, type)

### Step 3: Search the Canonical Hierarchy

#### Option A: Catalyst Canonical Component Exists

```tsx
// AFTER (Catalyst canonical)
<CatalystStatusPill 
  status={status}              // Component owns styling
  interactive={true}           // Component handles interactivity
/>
```

**Why this works:**
- Color is owned by component (no style prop)
- Spacing/sizing is owned by component
- Accessibility is built-in
- Dark mode is already tested

#### Option B: ADS Component + Minimal Styling

```tsx
// AFTER (ADS component + tokens)
<Button
  appearance="primary"
  iconBefore={<Icon />}
>
  Active Status
</Button>

// If custom layout needed:
<Box as="div" padding="space.150" backgroundColor="background.neutral-subtle">
  {/* content */}
</Box>
```

**How to use ADS tokens:**
```tsx
import { token } from '@atlaskit/tokens';

const backgroundColor = token('color.background.neutral-subtle');
const textColor = token('color.text');
const spacing = token('space.150');

// In JSX:
<div style={{
  backgroundColor,
  color: textColor,
  padding: spacing,
}}>
```

#### Option C: Adapter Pattern (For Custom Data)

If you need a component to work with your data shape:

```tsx
// Create an adapter to map your data → component's expected props
const statusAdapter = (myData) => ({
  status: myData.state,        // Map myData.state → status prop
  interactive: myData.canEdit,  // Map myData.canEdit → interactive prop
});

// Use the canonical component with adapted data
<CatalystStatusPill {...statusAdapter(myData)} />
```

### Step 4: Replace Utilities with Tokens

| Tailwind | ADS Token | Variable Form |
|----------|-----------|----------------|
| `bg-slate-100` | Color background neutral subtle | `var(--ds-background-neutral-subtle)` |
| `bg-white` | Color surface | `var(--ds-surface)` |
| `text-gray-900` | Color text | `var(--ds-text)` |
| `text-gray-500` | Color text subtle | `var(--ds-text-subtle)` |
| `border-gray-300` | Color border | `var(--ds-border)` |
| `p-4` | Space 400 (16px) | `var(--ds-space-400)` |
| `gap-2` | Space 200 (8px) | `var(--ds-space-200)` |
| `text-sm` | Text small (ADS type scale) | Use `@atlaskit/primitives/text` |

### Step 5: Test in Light & Dark Mode

```bash
# Start dev server
npm run dev

# Reload in browser to test dark mode (NOT a runtime toggle)
# Check:
# 1. Colors render correctly
# 2. Contrast meets WCAG AA
# 3. No white-on-white or black-on-black
# 4. Icons are visible
# 5. Spacing is balanced
```

---

## COMPONENT REUSE CHECKLIST

### Before Building Any New Component

- [ ] I searched Catalyst canonical components: `grep -r "<concept>" src/components src/lib src/hooks`
- [ ] I checked Catalyst Storybook MCP for existing implementations
- [ ] I checked `@atlaskit/*` for primitive components
- [ ] I have determined which canonical component in the hierarchy best fits
- [ ] I can articulate why the canonical choice works (or why it doesn't)
- [ ] I have NO hard-coded colors, Tailwind utilities, or custom styling
- [ ] I used only ADS tokens for colors, spacing, typography
- [ ] My component is mounted from the canonical hierarchy (not hand-rolled)

### If No Canonical Component Exists

**You must provide:**
1. Component name and file path
2. API signature (props/interface)
3. Exact reason no canonical component fits (API gap, data shape, etc.)
4. Screenshot evidence (if visual)
5. Alternative candidate (next in hierarchy)
6. Written approval from Vikram

**Submit to Vikram in writing. Verbal "we need a custom component" is rejected.**

---

## ADS TOKEN REFERENCE

### Color Tokens

#### Text Colors
```css
var(--ds-text)                          /* Primary text */
var(--ds-text-subtle)                   /* Secondary text (hint, meta) */
var(--ds-text-subtlest)                 /* Tertiary text (placeholder) */
var(--ds-text-brand)                    /* Brand / link color */
var(--ds-text-danger)                   /* Error / danger text */
var(--ds-text-warning)                  /* Warning text */
var(--ds-text-success)                  /* Success text */
var(--ds-text-information)              /* Info text */
var(--ds-text-disabled)                 /* Disabled text */
```

#### Background Colors
```css
var(--ds-surface)                       /* Page background */
var(--ds-surface-sunken)                /* Sunken / alternate row background */
var(--ds-surface-raised)                /* Raised / card background */
var(--ds-background-neutral)            /* Neutral background */
var(--ds-background-neutral-subtle)     /* Subtle neutral (hover, inactive) */
var(--ds-background-selected)           /* Selected / active background */
var(--ds-background-brand)              /* Brand background (less bold) */
var(--ds-background-brand-bold)         /* Brand background (bold CTA) */
var(--ds-background-danger)             /* Danger background (danger action) */
var(--ds-background-warning)            /* Warning background (alert) */
var(--ds-background-success)            /* Success background */
var(--ds-background-information)        /* Info background */
```

#### Border Colors
```css
var(--ds-border)                        /* Default border */
var(--ds-border-bold)                   /* Bold / prominent border */
var(--ds-border-focused)                /* Focus ring / focused state */
var(--ds-border-danger)                 /* Danger border */
var(--ds-border-warning)                /* Warning border */
var(--ds-border-success)                /* Success border */
```

#### Icon Colors
```css
var(--ds-icon)                          /* Default icon */
var(--ds-icon-subtle)                   /* Subtle icon (disabled, hint) */
var(--ds-icon-danger)                   /* Danger icon */
var(--ds-icon-warning)                  /* Warning icon */
var(--ds-icon-success)                  /* Success icon */
var(--ds-icon-brand)                    /* Brand icon */
```

### Spacing Tokens

Grid: **4px base**

```css
var(--ds-space-025)    /* 1px */
var(--ds-space-050)    /* 2px */
var(--ds-space-075)    /* 3px */
var(--ds-space-100)    /* 4px */
var(--ds-space-150)    /* 6px */
var(--ds-space-200)    /* 8px */
var(--ds-space-250)    /* 10px */
var(--ds-space-300)    /* 12px */
var(--ds-space-400)    /* 16px */
var(--ds-space-500)    /* 20px */
var(--ds-space-600)    /* 24px */
var(--ds-space-800)    /* 32px */
var(--ds-space-1000)   /* 40px */
```

### Typography

Use `@atlaskit/primitives/text` or `token('font.*')`

```typescript
import { Text } from '@atlaskit/primitives';

<Text as="span" size="small">Small text</Text>
<Text as="p" size="body" weight="bold">Bold body</Text>
```

---

## COMMON MIGRATION SCENARIOS

### Scenario 1: Status Pill / Badge

**BEFORE (Tailwind):**
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm">
  <CheckIcon className="w-4 h-4" />
  Active
</div>
```

**AFTER (Canonical):**
```tsx
import { CatalystStatusPill } from 'src/components/ui/StatusPill';

<CatalystStatusPill 
  status="active"
  interactive={false}
/>
```

**Why:** Component owns all styling, colors, sizing, icons.

---

### Scenario 2: Form Field with Label

**BEFORE (Tailwind):**
```tsx
<div className="flex flex-col gap-2">
  <label className="block text-sm font-semibold text-gray-900">
    Assignee
  </label>
  <select className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900">
    <option>Select...</option>
  </select>
</div>
```

**AFTER (ADS):**
```tsx
import { Select } from '@atlaskit/select';
import { Text } from '@atlaskit/primitives';

<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-200)' }}>
  <Text as="label" size="small" weight="semibold">
    Assignee
  </Text>
  <Select
    options={options}
    inputId="assignee-select"
  />
</div>
```

**Why:** ADS `Select` component owns form styling, accessibility, and browser compatibility.

---

### Scenario 3: Alert / Notification Box

**BEFORE (Tailwind):**
```tsx
<div className="bg-yellow-50 border-l-4 border-yellow-300 p-4 rounded">
  <p className="text-sm font-medium text-yellow-800">
    Warning: This action cannot be undone.
  </p>
</div>
```

**AFTER (ADS Flag + tokens):**
```tsx
import { Flag } from '@atlaskit/flag';

<Flag
  appearance="warning"
  isDismissed={isDismissed}
  onDismiss={() => setIsDismissed(true)}
  icon={<WarningIcon label="Warning" />}
  title="Warning"
  description="This action cannot be undone."
/>
```

**Or (CSS + tokens):**
```tsx
<Box
  padding="space.400"
  borderLeftWidth="border.width.bold"
  borderLeftColor="border.warning"
  backgroundColor="background.warning"
>
  <Text size="small" weight="bold" color="text.warning">
    Warning: This action cannot be undone.
  </Text>
</Box>
```

---

### Scenario 4: Data Table

**BEFORE (Tailwind):**
```tsx
<table className="w-full border-collapse">
  <thead>
    <tr className="bg-gray-100">
      <th className="p-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
        Issue
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="p-3 text-sm text-gray-900">KEY-123</td>
    </tr>
  </tbody>
</table>
```

**AFTER (JiraTable canonical):**
```tsx
import { JiraTable } from 'src/components/jira/JiraTable';
import { makeKeyCell } from 'src/components/jira/cell-factories';

<JiraTable
  data={issues}
  columns={[
    { key: 'issueKey', header: 'Issue', cell: makeKeyCell() },
    // ... more columns
  ]}
/>
```

**Why:** `JiraTable` handles:
- Styling (ADS tokens)
- Sorting, filtering, row selection
- Dark mode
- Responsive behavior
- Accessibility (ARIA)

**Do NOT rebuild the table.** Extend `JiraTable` if it's missing a feature.

---

### Scenario 5: Inline Edit Field

**BEFORE (Tailwind):**
```tsx
<div className="inline-block group">
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
    placeholder="Enter value..."
  />
  <button className="ml-2 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
    Save
  </button>
</div>
```

**AFTER (ADS InlineEdit):**
```tsx
import { InlineEdit } from '@atlaskit/inline-edit';

<InlineEdit
  defaultValue={value}
  onConfirm={(newValue) => onSave(newValue)}
  editView={({ value }) => (
    <Textfield
      value={value}
      autoFocus
    />
  )}
/>
```

**Why:** `InlineEdit` handles focus management, confirmation, keyboard shortcuts (Esc, Enter).

---

### Scenario 6: Modal with Custom Content

**BEFORE (Tailwind):**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg p-6 shadow-2xl max-w-md w-full">
    <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm</h2>
    <p className="text-sm text-gray-700 mb-6">Are you sure?</p>
    <div className="flex gap-3 justify-end">
      <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded hover:bg-gray-200">
        Cancel
      </button>
      <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700">
        Delete
      </button>
    </div>
  </div>
</div>
```

**AFTER (ADS ModalDialog):**
```tsx
import { ModalDialog, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { Button } from '@atlaskit/button';

<ModalDialog isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <ModalTitle>Confirm</ModalTitle>
  </ModalHeader>
  <ModalBody>
    <p>Are you sure?</p>
  </ModalBody>
  <ModalFooter>
    <Button onClick={onClose}>Cancel</Button>
    <Button appearance="danger" onClick={onConfirm}>
      Delete
    </Button>
  </ModalFooter>
</ModalDialog>
```

**Why:** `ModalDialog` handles:
- Overlay + focus management
- Keyboard navigation (Esc to close)
- Accessibility (ARIA roles)
- Responsive sizing
- Dark mode

---

## VALIDATION & TESTING

### Pre-Commit Validation

Run before every commit:

```bash
# Run both gates (fails if baseline increases)
npm run lint:colors:gate      # Hard-coded colors
npm run audit:ads:gate        # Typography + spacing

# View detailed violations
npm run lint:colors           # Show all violations
npm run audit:ads             # Show all violations with categories
```

### Visual Validation

After migration, test the component:

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to your component in browser (localhost:5173)

# 3. Test light mode
#    - Colors render correctly
#    - Text has sufficient contrast (≥4.5:1 for normal, ≥3:1 for large)
#    - Icons are visible
#    - Spacing is balanced

# 4. Test dark mode
#    - Reload page (not runtime toggle)
#    - Same visual checks as light mode
#    - No white-on-white or black-on-black
#    - No white boxes floating in dark background

# 5. Test responsive
#    - Resize browser to tablet / mobile
#    - No layout breaks
#    - Touch targets are ≥44x44px
```

### DOM & Accessibility Validation

```bash
# 1. Open browser DevTools (F12)

# 2. Right-click component → Inspect

# 3. Check:
#    - No inline style={ color: '#xxx' } or backgroundColor: '#xxx'
#    - All tokens use var(--ds-*) or token('...')
#    - Semantic HTML (button, input, select, etc., not divs)
#    - ARIA labels present (aria-label, aria-labelledby, role)

# 4. Run accessibility audit (DevTools → Lighthouse)
#    - Target: 90+ for Accessibility

# 5. Test with screen reader (VoiceOver on macOS)
#    - Navigate with VO + arrow keys
#    - All interactive elements are reachable
#    - Labels are announced
```

### Test Command

```bash
# Run test suite
npm run test

# Watch mode
npm run test:watch

# Type check
npx tsc --noEmit -p tsconfig.app.json

# Lint
npm run lint
```

---

## APPROVAL & OVERRIDE PROCESS

### When You Can't Use Canonical

If you believe a canonical component is unsuitable:

#### Step 1: Document the Gap

**Create a new file:** `docs/CANONICAL_GAP_REPORT.md`

```markdown
## GAP REPORT: [Component Name]

**Date:** 2026-06-29  
**Submitted by:** Your Name  
**Feature:** [CAT-AREA-FEATURE-YYYYMMDD-###]

### Canonical Component Evaluated
- **Name:** JiraTable
- **Path:** src/components/jira/JiraTable.tsx
- **API:** [List props and interfaces]

### Proof of Unsuitability
1. **Missing Prop:** JiraTable does not support `allowCustomSort` prop
   - Requirement: Users must custom-sort by arbitrary field
   - JiraTable only supports standard Jira fields
   - Attempted workaround: Adapter pattern cannot map custom sort logic

2. **Incompatible Data Shape:** JiraTable expects `IssueData[]` with {key, type, status, ...}
   - My data source provides `TaskData[]` with {id, state, ...} (different schema)
   - Attempted workaround: Adapter would require 2 API calls (too slow)

3. **Visual Gap:** JiraTable renders checkboxes in first column
   - Requirement: No row selection UI (single-click select only)
   - JiraTable does not have option to hide checkboxes

### Alternative Proposed
- Use ADS `@atlaskit/table` with custom row templates
- Rationale: Handles arbitrary data shapes, full column customization

### Screenshot Evidence
[Attach screenshot of requirement vs JiraTable capability]

### Risk Assessment
- Risk of divergence from Catalyst canonical: MEDIUM
- Mitigation: Extract into new canonical component after proof-of-concept

### Requested Decision
- [ ] Approve hand-rolled table for this feature
- [ ] Request design review of alternative approach
- [ ] Require JiraTable extension instead (propose modifications)
```

#### Step 2: Submit to Vikram

```bash
git add docs/CANONICAL_GAP_REPORT.md
git commit -m "docs: Gap report for [component] — awaiting approval"

# OR in a PR comment:
# @Vikram-Indla please review docs/CANONICAL_GAP_REPORT.md
```

#### Step 3: Receive Decision

**Vikram will respond with one of:**

1. **"Use this canonical instead"** — Vikram proposes alternative
2. **"Extend this canonical"** — Add missing prop to existing component
3. **"Approved for hand-roll"** — Explicit written approval with conditions
   - Must include: issue CAT-ADS-XXXXX
   - Must include: "extract to canonical later" plan
   - Must include: "prove this is not general" (one-off vs platform need)

### Escape Hatch (Documented Exceptions Only)

If Vikram approves a hand-rolled component or hard-coded color, document it:

```tsx
/* ads-scanner:ignore-next-line — [issue-id] Jira-parity bypass, no ADS token exists for this color */
color: #ff991f;

// OR for multiple lines:
/* ads-scanner:ignore-line — [issue-id] Custom modal required for deep Jira-tree navigation */
<CustomTreeModal>
```

**Rules for escape hatches:**
- ✅ Must cite issue ID (CAT-ADS-XXXX)
- ✅ Must explain WHY (no token exists, Jira parity, etc.)
- ✅ Must be intentional (not a workaround for lazyness)
- ❌ Cannot hide real violations
- ❌ Cannot be used to bypass validation

---

## QUICK REFERENCE: BANNED → ALLOWED

| Banned | Allowed |
|--------|---------|
| `className="bg-slate-100"` | `className="..."` (no color utils) |
| `style={{ color: '#E9F2FE' }}` | `style={{ color: 'var(--ds-text)' }}` |
| `<div className="text-gray-900">` | `<Text>...</Text>` from `@atlaskit/primitives` |
| Custom `<button>` | `<Button>` from `@atlaskit/button` |
| Hand-rolled table | `<JiraTable>` or `<Table>` from Catalyst |
| `px-4 py-2` spacing | `padding: 'var(--ds-space-400) var(--ds-space-200)'` |
| Hex fallback in var | `var(--ds-text)` (no hex fallback allowed) |

---

## CONTACT & ESCALATION

### Questions?

- **Component unsuitability:** Create a gap report (see above)
- **Token/spacing guidance:** Ask in #design-system Slack
- **Migration help:** @claude-code in project
- **Bug in gate/scanner:** File issue in project

### Enforcement Status

- **Pre-commit:** ✅ Active (CAT-ADS-COMPLIANCE-20260627-001)
- **CI:** ✅ Active (fail-on-increase ratchet)
- **Baseline:** 76 hardcoded colors (down from 709)
- **Next review:** 2026-09-28

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-29 | Initial release: Full canonical contract, migration guide, token reference, approval process |

---

**Last Updated:** 2026-06-29  
**Maintained by:** Catalyst Design System Team  
**Owner:** Vikram-Indla

