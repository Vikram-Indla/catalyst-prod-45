# CATALYST CANONICAL QUICK REFERENCE
## Developer Cheatsheet (Keep Open While Coding)

**Full spec:** [CANONICAL_DESIGN_SYSTEM_CONTRACT.md](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md)

---

## THE THREE RULES (TL;DR)

| Rule | ❌ BANNED | ✅ ALLOWED |
|------|----------|-----------|
| **1. No Tailwind** | `className="bg-slate-100 text-red-500"` | `className="..."` (no colors) |
| **2. No Hex Colors** | `style={{ color: '#E9F2FE' }}` | `style={{ color: 'var(--ds-text)' }}` |
| **3. Use Canonical** | Hand-rolled `<div className="...">` | `<CatalystStatusPill>` or `<Button>` |

---

## BEFORE YOU CODE: SEARCH CHECKLIST

```bash
# 1. Search Catalyst
grep -r "StatusPill\|MyComponent" src/components src/lib

# 2. Check Storybook MCP
# ToolSearch → catalyst-storybook → search component name

# 3. Check @atlaskit
ls node_modules/@atlaskit/ | grep <concept>
```

**If found → use it. If not found → ask Vikram.**

---

## ADS TOKEN QUICK LOOKUP

### Colors (Most Common)

```css
/* Text */
var(--ds-text)                  /* Normal text */
var(--ds-text-subtle)           /* Secondary / disabled */
var(--ds-text-brand)            /* Link / brand */
var(--ds-text-danger)           /* Error */

/* Background */
var(--ds-background-neutral-subtle)  /* Light gray bg */
var(--ds-surface)               /* Page bg */
var(--ds-surface-raised)        /* Card bg */

/* Border */
var(--ds-border)                /* Default border */
var(--ds-border-focused)        /* Focus ring */
var(--ds-border-danger)         /* Error border */
```

[Full color reference →](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#ads-token-reference)

### Spacing (Grid: 4px)

```css
var(--ds-space-100)    /* 4px */
var(--ds-space-200)    /* 8px */
var(--ds-space-300)    /* 12px */
var(--ds-space-400)    /* 16px */
var(--ds-space-600)    /* 24px */
var(--ds-space-800)    /* 32px */
```

---

## COMPONENT QUICK LOOKUP

### Need a Status Pill?

```tsx
import { CatalystStatusPill } from 'src/components/ui/StatusPill';

<CatalystStatusPill 
  status="active"      // Component owns color
  interactive={false}
/>
```

### Need a Button?

```tsx
import { Button } from '@atlaskit/button';

<Button appearance="primary">Click me</Button>
```

### Need a Dropdown / Select?

```tsx
import { Select } from '@atlaskit/select';

<Select options={opts} inputId="select-1" />
```

### Need a Modal?

```tsx
import { ModalDialog, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@atlaskit/modal-dialog';

<ModalDialog isOpen={open} onClose={close}>
  <ModalHeader><ModalTitle>Title</ModalTitle></ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>{/* actions */}</ModalFooter>
</ModalDialog>
```

### Need a Table?

```tsx
import { JiraTable } from 'src/components/jira/JiraTable';
import { makeKeyCell, makeStatusCell } from 'src/components/jira/cell-factories';

<JiraTable
  data={issues}
  columns={[
    { key: 'key', header: 'Issue', cell: makeKeyCell() },
    { key: 'status', header: 'Status', cell: makeStatusCell() },
  ]}
/>
```

### Need a Form Field?

```tsx
import { Textfield } from '@atlaskit/textfield';
import { Text } from '@atlaskit/primitives';

<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-200)' }}>
  <Text as="label" weight="bold">Label</Text>
  <Textfield placeholder="Enter text..." />
</div>
```

### Need Spacing / Layout?

```tsx
// Use tokens, NOT Tailwind or custom px
<div style={{
  display: 'flex',
  gap: 'var(--ds-space-200)',           // 8px
  padding: 'var(--ds-space-400)',       // 16px
  backgroundColor: 'var(--ds-background-neutral-subtle)',
}}>
  {children}
</div>
```

---

## WHAT WILL BLOCK YOUR COMMIT

```bash
# Run this before committing
npm run lint:colors:gate      # ← Fails if you added hard-coded colors
npm run audit:ads:gate        # ← Fails if you added off-grid spacing

# View violations
npm run lint:colors           # See all hard-coded colors
npm run audit:ads             # See all typography/spacing violations
```

### Common Blockers

| Blocker | Fix |
|---------|-----|
| `#E9F2FE` in your code | Replace with `var(--ds-background-neutral-subtle)` |
| `bg-slate-100` in className | Remove (no color utils) |
| `style={{ marginTop: '13px' }}` | Use `var(--ds-space-300)` (12px) or `var(--ds-space-400)` (16px) |
| `text-gray-900` in className | Remove; use `<Text>` component instead |

---

## COMMON MISTAKES & FIXES

### ❌ Mistake #1: Using Tailwind Colors

```tsx
<div className="bg-slate-100 text-gray-900 border border-gray-300">
```

**Fix:**
```tsx
<div style={{
  backgroundColor: 'var(--ds-background-neutral-subtle)',
  color: 'var(--ds-text)',
  border: `1px solid var(--ds-border)`,
}}>
```

### ❌ Mistake #2: Using Hex Colors

```tsx
<div style={{ color: '#E9F2FE', backgroundColor: '#fff' }}>
```

**Fix:**
```tsx
<div style={{
  color: 'var(--ds-text)',
  backgroundColor: 'var(--ds-surface)',
}}>
```

### ❌ Mistake #3: Custom Spacing

```tsx
<div style={{ padding: '12px', marginBottom: '15px' }}>
```

**Fix:**
```tsx
<div style={{
  padding: 'var(--ds-space-300)',        // 12px (on-grid)
  marginBottom: 'var(--ds-space-400)',   // 16px (on-grid)
}}>
```

### ❌ Mistake #4: Hand-Rolling a Component

```tsx
<div className="flex gap-2 p-3 bg-gray-100 rounded">
  <span className="text-sm font-bold text-gray-900">Status</span>
</div>
```

**Fix:** Find the canonical component

```tsx
// Search: grep -r "Status" src/components
// Found: CatalystStatusPill

<CatalystStatusPill status={status} />
```

### ❌ Mistake #5: Forking a Component

```tsx
// DON'T: Create MyStatusPill by copying JiraTable
export const MyStatusPill = ({ data }) => (
  <div className="...">...</div>
)
```

**Fix:** Parameterize via adapter prop

```tsx
// DO: Extend canonical with adapter
<CatalystStatusPill {...adapter(myData)} />
```

---

## VALIDATION CHECKLIST

Before committing:

- [ ] `npm run lint:colors:gate` passes (no new hard-coded colors)
- [ ] `npm run audit:ads:gate` passes (no off-grid spacing/typography)
- [ ] Component is from canonical hierarchy (grepped + verified)
- [ ] No `className="bg-*"` or `className="text-*"` Tailwind utilities
- [ ] No `style={{ color: '#...' }}` or hex values
- [ ] Tested in light mode (colors correct, contrast ✓)
- [ ] Tested in dark mode (reloaded page, no white-on-black issues)
- [ ] No inline `style` objects with hard-coded values
- [ ] All colors use `var(--ds-*)` or component-owned colors
- [ ] All spacing uses `var(--ds-space-*)` or component-owned spacing

---

## COMMON COMPONENTS CHEAT SHEET

| Need | Use | Import |
|------|-----|--------|
| Status display | `CatalystStatusPill` | `src/components/ui/StatusPill` |
| Status interactive | `StatusTransitionDropdown` | Built on `@atlaskit/dropdown-menu` |
| Button | `Button` | `@atlaskit/button` |
| Text | `Text` | `@atlaskit/primitives` |
| Dropdown / Select | `Select` | `@atlaskit/select` |
| Modal | `ModalDialog` | `@atlaskit/modal-dialog` |
| Tabs | `Tabs` | `@atlaskit/tabs` |
| Table | `JiraTable` | `src/components/jira/JiraTable` |
| Icon | `Icon` | `@atlaskit/icon` or `src/lib/jira-issue-type-icons` |
| Avatar | `Avatar` | `@atlaskit/avatar` |
| Badge | `Lozenge` | `@atlaskit/lozenge` |
| Checkbox | `Checkbox` | `@atlaskit/checkbox` |
| Textfield | `Textfield` | `@atlaskit/textfield` |
| Tooltip | `Tooltip` | `@atlaskit/tooltip` |
| Toast | `Flag` | `@atlaskit/flag` |
| Date Picker | `DatePicker` | `@atlaskit/datetime-picker` |
| Drawer | `DrawerDialog` | `@atlaskit/drawer` |
| Spinner | `Spinner` | `@atlaskit/spinner` |

---

## ESCAPE HATCH (For Approved Exceptions Only)

**Only use if Vikram has explicitly approved in writing.**

```tsx
/* ads-scanner:ignore-next-line — CAT-ADS-12345 Jira-parity: no ADS token for this shade */
color: #ff991f;

// OR for multiple lines:
/* ads-scanner:ignore-line — CAT-ADS-12345 Custom tree modal (approved) */
<CustomTreeModal>...</CustomTreeModal>
```

**Rules:**
- ✅ Must have issue ID (CAT-ADS-XXXX)
- ✅ Must explain WHY
- ❌ Cannot hide real violations
- ❌ Cannot be used casually

---

## WHEN TO ASK VIKRAM

**Ask before coding if:**

- Canonical component seems "overkill" → **ask first**
- You want to hand-roll a component → **ask first**
- No canonical fits your data shape → **ask first** (create gap report)
- You need to extend a canonical → **ask first** (may already exist)
- You need a new token/color → **ask first**

**Do NOT code without approval for any of the above.**

---

## QUICK LINKS

- [Full Specification](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md)
- [Migration Guide](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#migration-guide-for-tailwind-components)
- [ADS Token Reference](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#ads-token-reference)
- [Component Lookup](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#common-migration-scenarios)
- [Approval Process](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#approval--override-process)

---

## SUPPORT

- **Questions:** Ask in #design-system
- **Gap Report:** See [Approval Process](./CANONICAL_DESIGN_SYSTEM_CONTRACT.md#approval--override-process)
- **Bug in gate:** File issue in project
- **Need migration help:** @claude-code

---

**Version:** 1.0  
**Last Updated:** 2026-06-29  
**Keep this open while coding!**

