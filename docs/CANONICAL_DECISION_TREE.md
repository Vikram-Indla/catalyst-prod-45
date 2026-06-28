# CANONICAL DECISION TREE
## Step-by-Step Guide for Common Decisions

Use this flowchart when you're unsure whether to use a canonical component or how to style something.

---

## DECISION 1: "I Need to Build a UI Component"

```
START: I need to build a new component
  ↓
  Question: Does a similar UI already exist in Catalyst?
  ├─ YES → Go to DECISION 2
  └─ NO → Go to DECISION 3
```

### DECISION 2: "A Similar Component Exists"

```
Question: Is it exactly what I need (same data shape, same props)?
  ├─ YES → ✅ USE THE CANONICAL COMPONENT
  │         └─ Import it, pass your data through an adapter if needed
  │           See: Migration Guide → Adapter Pattern
  │
  └─ NO → Question: Can I extend it with a new prop?
          ├─ YES → ✅ EXTEND THE CANONICAL COMPONENT
          │         └─ Add prop to existing component (not a fork)
          │           Discuss with Vikram if it's a major change
          │
          └─ NO → Go to DECISION 3
```

### DECISION 3: "No Canonical Exists or Doesn't Fit"

```
Question: Is this a standard UI pattern (button, dropdown, modal, table, etc.)?
  ├─ YES → Question: Does @atlaskit have it?
  │         ├─ YES → ✅ USE THE ADS COMPONENT
  │         │         └─ Import from @atlaskit/*, style with tokens
  │         │
  │         └─ NO → Go to DECISION 4
  │
  └─ NO → Go to DECISION 4
```

### DECISION 4: "No Canonical or ADS Exists"

```
⚠️  STOP — Do NOT start coding yet

Create a CANONICAL_GAP_REPORT:
  1. Document the exact requirement
  2. Prove why existing components don't fit
  3. Show evidence (API gaps, data shape mismatches)
  4. Propose alternative
  5. Submit to Vikram for approval

  Once approved, you may proceed with hand-rolled implementation
```

---

## DECISION TREE FOR STYLING

### When You Need to Add Color

```
START: I need to add a color to my component
  ↓
  Question: Is this color part of a component?
  ├─ YES (e.g., button, badge, status pill)
  │   └─ ✅ LET THE COMPONENT OWN THE COLOR
  │       └─ Do NOT add a color prop
  │         Component handles all color/styling
  │
  └─ NO → Question: Do you know which token to use?
          ├─ YES → ✅ USE var(--ds-*)
          │         Example: style={{ color: 'var(--ds-text-brand)' }}
          │
          └─ NO → See ADS Token Reference in CANONICAL_QUICK_REFERENCE.md
                  └─ Find the closest match
                  └─ If no match exists, ask Vikram for new token
```

### When You Need to Add Spacing

```
START: I need to add padding/margin/gap
  ↓
  Question: Is this spacing within a component?
  ├─ YES (e.g., Button, Modal, Card)
  │   └─ ✅ LET THE COMPONENT OWN THE SPACING
  │       └─ Do NOT override with style prop
  │
  └─ NO → Question: Is your value 4px, 8px, 12px, 16px, 24px, 32px, or 40px?
          ├─ YES → ✅ USE var(--ds-space-*)
          │         └─ padding: 'var(--ds-space-400)'  /* 16px */
          │
          └─ NO (e.g., 13px, 18px, 22px)
              └─ ⚠️  OFF-GRID SPACING
                  Question: Why this odd value?
                  ├─ Jira-parity requirement → Document escape hatch
                  ├─ Design comp shows this → Round to nearest grid
                  └─ Other reason → Ask Vikram
```

### When You Need to Add Typography

```
START: I need to set font-size, font-weight, or line-height
  ↓
  Question: Is this text inside a component?
  ├─ YES (e.g., Button, Badge, Text)
  │   └─ ✅ LET THE COMPONENT OWN THE TYPOGRAPHY
  │       └─ Do NOT override font-* styles
  │
  └─ NO → ✅ USE @atlaskit/primitives <Text> component
          └─ <Text size="small" weight="bold">My Text</Text>
          └─ Component handles ADS token mapping
```

---

## DECISION TREE: "Should I Use Tailwind?"

```
START: I want to use a Tailwind utility
  ↓
  └─ ❌ STOP — Do NOT use Tailwind
     ├─ Tailwind color utilities are blocked in pre-commit
     ├─ Commit will fail with: "Color gate failed"
     └─ Use ADS tokens instead
        └─ See ADS Token Reference
```

**Why Tailwind is Banned:**

1. **Theme mismatch** — Tailwind uses different color scales than ADS
2. **Dark mode unsupported** — Runtime toggles don't work; must reload
3. **Drift risk** — Teams diverge on spacing/color choices
4. **Accessibility** — No contrast validation in Tailwind setup
5. **Enforcement** — Blockers catch it at pre-commit/CI

---

## DECISION TREE: "Should I Use Hex Colors?"

```
START: I want to use a hex color (#E9F2FE, #0052CC, etc.)
  ↓
  └─ ❌ STOP — Do NOT use hex
     ├─ Hex colors are blocked in pre-commit
     ├─ Commit will fail with: "Color gate failed"
     └─ Use var(--ds-*) tokens instead
        └─ See ADS Token Reference
```

**Why Hex is Banned:**

1. **No dark mode support** — Hex values don't adapt to theme
2. **No accessibility validation** — No contrast checking
3. **Maintenance burden** — Hard-coded values can't be updated globally
4. **Jira divergence** — Hard-coded values may be Jira-specific (different brand)

---

## DECISION TREE: "Should I Create a Custom Component?"

```
START: I think I need a custom component
  ↓
  Question: Have you searched the canonical hierarchy?
  ├─ NO → Go search now (see DECISION 1)
  │       └─ grep -r <concept> src/components src/lib
  │       └─ Check catalyst-storybook MCP
  │       └─ Check @atlaskit/*
  │
  └─ YES → Question: Did you document WHY it's unsuitable?
          ├─ NO → Go create a gap report (see DECISION 4)
          │       └─ Submit to Vikram for approval
          │
          └─ YES → Question: Did Vikram approve it in writing?
                  ├─ NO → ⚠️  STOP — Get approval first
                  │       └─ Do NOT start coding without written approval
                  │
                  └─ YES → ✅ PROCEED — You have approval
                          └─ Implement custom component
                          └─ Add escape hatch comment with issue ID
                          └─ Plan to extract to canonical later
```

---

## DECISION TREE: "How Do I Migrate Existing Tailwind Code?"

```
START: I have existing Tailwind code to migrate
  ↓
  Step 1: Identify the pattern
  ├─ Status pill? → Use CatalystStatusPill
  ├─ Form field? → Use @atlaskit/textfield or @atlaskit/select
  ├─ Button? → Use @atlaskit/button
  ├─ Table? → Use JiraTable or @atlaskit/table
  ├─ Modal? → Use @atlaskit/modal-dialog
  └─ Unknown? → See "Common Migration Scenarios" in CANONICAL_DESIGN_SYSTEM_CONTRACT.md

  ↓
  Step 2: Replace Tailwind utilities
  ├─ Remove all className="bg-* text-* p-* m-* gap-*" utilities
  └─ Remove inline style={{ color: '#...', backgroundColor: '#...' }}

  ↓
  Step 3: Add ADS tokens
  ├─ Colors → var(--ds-text), var(--ds-background-*), etc.
  ├─ Spacing → var(--ds-space-200), var(--ds-space-400), etc.
  └─ Typography → <Text> component or token('font.*')

  ↓
  Step 4: Validate
  ├─ npm run lint:colors:gate (should pass)
  ├─ npm run audit:ads:gate (should pass)
  ├─ Test in light mode (colors correct? contrast ok?)
  └─ Test in dark mode (reload page, no white-on-black?)

  ↓
  ✅ DONE — Ready to commit
```

---

## SCENARIO-BASED DECISIONS

### Scenario: "I Need a Status Badge"

```
Question: Is this Jira status?
├─ YES → ✅ Use CatalystStatusPill
│         └─ Owns colors, icons, display
│         └─ Can be made interactive with StatusTransitionDropdown
│
└─ NO → Question: Is it a custom status for my feature?
        ├─ YES → Question: Can I map it to Jira status?
        │         ├─ YES → Use CatalystStatusPill (with adapter)
        │         └─ NO → Document gap, ask Vikram
        │
        └─ NO → Use @atlaskit/lozenge
                └─ Pass appearance prop (success, warning, etc.)
                └─ Lozenge owns colors, not you
```

---

### Scenario: "I Need a Form with Multiple Fields"

```
Question: Is this a Jira issue detail form?
├─ YES → Question: Do existing fields exist (assignee, status, priority)?
│         ├─ YES → Use EditableAssignee, StatusTransitionDropdown, EditablePriority
│         │         └─ Reuse canonical field components
│         │
│         └─ NO → Build new field following existing pattern
│                 └─ Look at src/components/ui/Editable* for examples
│
└─ NO → Build with @atlaskit/* primitives
        ├─ Textfield for text input
        ├─ Select for dropdowns
        ├─ DatePicker for dates
        └─ Wrap in container with var(--ds-space-*) spacing
```

---

### Scenario: "I Need a Table/List"

```
Question: Is this a Jira work item table?
├─ YES → ✅ Use JiraTable
│         └─ It has cell factories (makeKeyCell, makeStatusCell, etc.)
│         └─ It handles sorting, filtering, row selection
│         └─ Do NOT rebuild
│
└─ NO → Question: Is this an admin list (users, roles, permissions)?
        ├─ YES → Question: Can JiraTable work with adapter?
        │         ├─ YES → Use JiraTable + adapter
        │         └─ NO → Use @atlaskit/table or custom table (with approval)
        │
        └─ NO (domain-specific list)
            └─ Question: Can you use @atlaskit/table?
               ├─ YES → Use @atlaskit/table
               └─ NO → Create custom table (need gap report + approval)
```

---

### Scenario: "I Need a Modal / Drawer"

```
Question: What's the modal for?
├─ Confirmation dialog → Use @atlaskit/modal-dialog
├─ Form in modal → Use @atlaskit/modal-dialog + form fields
├─ Side detail panel → Use @atlaskit/drawer or CatalystViewBase sidebar
├─ Deep navigation tree → Document as gap (may need custom modal)
└─ Other → Use @atlaskit/modal-dialog as base

Always:
  ✅ Use ModalDialog, ModalHeader, ModalBody, ModalFooter
  ✅ Handle Esc key to close
  ✅ Test with keyboard navigation
  ✅ Test focus management
```

---

## PRE-COMMIT VALIDATION FLOW

```
Before you commit:
  ↓
  1. Have you tested in light mode?
     └─ Colors visible? Contrast ok? Icons clear?
  ↓
  2. Have you tested in dark mode?
     └─ Reloaded page (not runtime toggle)?
     └─ No white-on-black issues?
     └─ Contrast ok?
  ↓
  3. Run validators
     └─ npm run lint:colors:gate
     └─ npm run audit:ads:gate
  ↓
  4. All passing?
     └─ YES → ✅ Ready to commit
     └─ NO → Fix violations and re-run
```

---

## QUICK DECISION MATRIX

| I need... | Use this | Don't use this |
|-----------|----------|----------------|
| Status display | CatalystStatusPill | Custom div with colors |
| Button | @atlaskit/button | Hand-rolled button |
| Text input | @atlaskit/textfield | Custom input with styling |
| Dropdown select | @atlaskit/select | Hand-rolled select |
| Modal | @atlaskit/modal-dialog | Hand-rolled modal |
| Table (work items) | JiraTable | Custom table |
| Table (other) | @atlaskit/table | Custom table |
| Color | var(--ds-*) | Hex, rgb(), Tailwind |
| Spacing | var(--ds-space-*) | Custom px values |
| Typography | @atlaskit/primitives Text | Custom font-size |
| Icon | @atlaskit/icon or JiraIssueTypeIcon | Custom icon |

---

## WHEN TO ESCALATE TO VIKRAM

**Stop and ask Vikram before coding if:**

- [ ] You want to use Tailwind utilities
- [ ] You want to use hex or rgb colors
- [ ] You want to hand-roll a UI component
- [ ] You want to fork/copy an existing component
- [ ] No canonical component seems to fit
- [ ] A canonical component seems "overkill"
- [ ] You need a new ADS token
- [ ] You want off-grid spacing (not on 4px/8px/16px/24px/32px/40px grid)
- [ ] You want custom typography (not in ADS scale)

**Provide:**

1. Component name / feature name
2. Why canonical doesn't fit (API gaps, data shape, etc.)
3. What you propose instead
4. Screenshots (if visual)

**Do NOT proceed without written approval.**

---

## CHEAT SHEET: COPY-PASTE SOLUTIONS

### Add spacing between flex items

```tsx
<div style={{ display: 'flex', gap: 'var(--ds-space-200)' }}>
  {/* items */}
</div>
```

### Add padding to a card

```tsx
<div style={{ padding: 'var(--ds-space-400)', backgroundColor: 'var(--ds-surface-raised)' }}>
  {/* content */}
</div>
```

### Add color to text

```tsx
<div style={{ color: 'var(--ds-text-brand)' }}>
  {/* text */}
</div>
```

### Add border

```tsx
<div style={{ border: `1px solid var(--ds-border)` }}>
  {/* content */}
</div>
```

### Add focus ring

```tsx
<div style={{ outline: `2px solid var(--ds-border-focused)`, outlineOffset: '2px' }}>
  {/* interactive element */}
</div>
```

### Dark mode safe background

```tsx
<div style={{ backgroundColor: 'var(--ds-surface)' }}>
  {/* automatically adapts to light/dark */}
</div>
```

---

## SUPPORT & ESCALATION

| Question | Where to ask |
|----------|--------------|
| "Which canonical should I use?" | Ask in #design-system |
| "How do I migrate this?" | See CANONICAL_DESIGN_SYSTEM_CONTRACT.md |
| "My component looks wrong" | Check contrast in light + dark mode |
| "Gate is blocking my commit" | Run `npm run lint:colors` to see violations |
| "I think canonical is wrong fit" | Create gap report (see CANONICAL_DESIGN_SYSTEM_CONTRACT.md) |
| "I need a new token/color" | Ask Vikram (with use case) |

---

**Version:** 1.0  
**Last Updated:** 2026-06-29  
**Use this when you're unsure!**

