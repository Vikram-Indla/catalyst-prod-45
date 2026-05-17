# Catalyst Design System Primer for Claude Sessions

**Read this file at the start of every session to understand Catalyst's design system enforcement.**

---

## Context: You Are Bound to Atlassian Design System v4

When generating code for Catalyst, you are operating under a **enforced design system governance model**. This is not optional. Every line of code you write will be validated against these rules at the GitHub Actions CI gate. PRs that violate these rules cannot merge to main.

---

## Three Enforcement Points (All Active)

### 1. GitHub Actions CI Gate (BLOCKS PRs)
- Workflow: `.github/workflows/design-system-audit.yml`
- Trigger: Every push/PR to main
- Action: `node design-governance/rules/audit.js src/`
- Outcome: 
  - Violations found → exit code 1 → PR merge BLOCKED
  - No violations → exit code 0 → PR can merge
- **You cannot bypass this gate.**

### 2. Pre-Commit Hook (Local)
- File: `.husky/pre-commit`
- Runs before commits on developer machines
- Informational (does not block), but flags violations
- **You must run this before committing.**

### 3. CLI Tool (Manual Validation)
- Command: `node design-governance/cli/index.js audit src/`
- Validates source files
- Shows violations with file, line, type, and fix
- **You should run this before writing code and after writing code.**

---

## The Five Absolute Rules

### Rule 1: Use @atlaskit/* Components Exclusively

**This is non-negotiable.** Every interactive element must be from `@atlaskit/*`. If Atlaskit has the primitive, you use it. If Atlaskit doesn't have it, you ask Vikram before rolling your own.

**Examples of what you MUST use:**
```typescript
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Modal, { ModalBody, ModalHeader } from '@atlaskit/modal-dialog';
import TextField from '@atlaskit/textfield';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
```

**Examples of what you MUST NOT use:**
```typescript
// ❌ BANNED
import { Button } from 'react-ui-lib';
import Select from 'react-select';
import { Modal } from 'react-modal';
import Dropdown from 'react-dropdown';
import { Button } from 'my-custom-button';  // Hand-rolled
```

**If you see a `classNamePrefix="custom-"` in the codebase, that is fine** — it's `@atlaskit/select` with a custom style prefix, not a hand-rolled alternative.

### Rule 2: Use var(--ds-*) ADS Tokens Exclusively

**Every color, spacing, and typographic value must come from ADS tokens.** No hardcoded hex, no Tailwind, no raw RGB.

**Examples of what you MUST use:**
```css
/* Colors */
color: var(--ds-text);
background-color: var(--ds-background-information-bold);
border-color: var(--ds-border-neutral);

/* Spacing */
padding: 8px;
margin: 16px;
gap: 4px;

/* Typography */
font-size: 14px;
font-weight: 400;
```

**Examples of what you MUST NOT use:**
```css
/* ❌ BANNED */
color: #292A2E;  /* Hardcoded hex */
background: rgb(41, 42, 46);  /* Raw RGB */
color: red;  /* CSS color name */
padding: 12px;  /* Not in grid (4/8/16/24/32) */
margin: 18px;  /* Not in grid */
font-weight: 700;  /* Use 400/500/600/700 only */
font-family: 'Arial', sans-serif;  /* Use system fonts or Atlassian Sans */
```

**Spacing grid (ONLY these values allowed):**
- 4px (xs)
- 8px (sm)
- 16px (md)
- 24px (lg)
- 32px (xl)

### Rule 3: Never Render Permanently Banned Components/Fields

These are **permanently banned from Catalyst** for every issue type, every surface, every scenario. No exceptions, no per-type asks override this.

**Banned components:**
- Story Points (`CatalystStoryPointsField`)
- MDT Ref (`CatalystMDTRefField`)
- Assessment Feature (`CatalystAssessmentFeatureField`)
- Service Now# (`CatalystServiceNowDisplay`)
- Catalyst Intelligence / AI Sparkles inline button (in `CatalystQuickActions`)

**Banned columns (from JiraTable):**
- Standalone Type column (`id: '__type'` or icon-only `id: 'type'`) — type icon goes INSIDE Key cell
- Category column
- Space URL column
- Templates column

**Banned custom fields:**
- Custom field columns that don't appear in Jira's screen scheme for that issue type

**If you see these in the codebase, do NOT add them to new surfaces. Do NOT use them in new views.**

### Rule 4: Use Sentence-Case Labels Only

**Never use `text-transform: uppercase`.** All labels must be sentence-case (capitalize first letter, rest lowercase).

**Examples of what you MUST use:**
```
"Create issue"
"Edit assignment"
"Delete project"
"View details"
```

**Examples of what you MUST NOT use:**
```
"CREATE ISSUE"  // ❌ All caps
"Create Issue"  // ❌ Title case
"create issue"  // ❌ All lowercase
```

**CSS rule:** If you see `text-transform: uppercase` anywhere, remove it. Use `text-transform: none`.

### Rule 5: Respect Jira as Source of Truth

**Before rendering ANY field, ask: Does this field appear in Jira's screen scheme for this issue type?**

If yes → render it
If no → don't render it
If unsure → run `getJiraIssueTypeMetaWithFields` to check the schema

**Example:**
- Story type: has `timetracking`, `labels`, `fixVersions`
- Task type: has `timetracking`, `labels`, `fixVersions`
- Epic type: has `duedate`, `labels`, `fixVersions` (no `timetracking`)
- Production Incident: has `duedate`, `serviceNowRef` (Jira-specific, banned in Catalyst)

**Anti-pattern #18 (in CLAUDE.md):** Never add a field to CatalystSidebarDetails without checking Jira's screen scheme first. Catalyst-specific custom fields require explicit per-type asks from Vikram.

---

## Workflow: Before Generating Code

### Step 1: Load Design System Configuration
```bash
node design-governance/cli/index.js info
```

This shows:
- Canonical ADS token mapping
- Spacing grid rules
- Required Atlaskit components
- Banned patterns

### Step 2: Write Component Using ADS + Atlaskit ONLY

Example component:
```tsx
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';

export function MyComponent() {
  return (
    <div style={{ padding: '16px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ds-text)' }}>
        Create issue
      </h2>
      <Select options={[]} />
      <Button appearance="primary" onClick={handleCreate}>
        Create
      </Button>
    </div>
  );
}
```

### Step 3: Validate Before Commit
```bash
node design-governance/cli/index.js audit src/components/MyComponent.tsx
```

If violations found:
```
❌ Hardcoded color: #FF0000 at src/components/MyComponent.tsx:12
   Fix: Replace with var(--ds-text-danger)

❌ Invalid spacing: 12px (not in 4/8/16/24/32 grid) at src/components/MyComponent.tsx:8
   Fix: Use 8px or 16px instead
```

**Regenerate the code with fixes. Do NOT commit if violations exist.**

### Step 4: Commit and Push
- Pre-commit hook runs audit (informational)
- Push to branch
- GitHub Actions CI runs full audit
- If violations → PR merge blocked
- If clean → PR can merge

---

## Violation Detection

The validators scan for:

### ADS Token Scanner
- ✅ Detects hardcoded hex colors: `#FF0000`, `#292A2E`, etc.
- ✅ Detects hardcoded px spacing: `padding: 12px`, `margin: 18px`, `gap: 6px`
- ✅ Detects Tailwind classes: `text-slate-500`, `bg-slate-700`, `border-slate-200`
- ✅ Detects banned component imports: `react-select`, `react-modal`, `react-dropdown`

### Typography Enforcer
- ✅ Validates h1/h2/h3 match ADS specs (h1: 28px/600, h2: 20px/600, h3: 16px/600)
- ✅ Enforces body text (14px/400, 12px/400 for small)
- ✅ Detects `text-transform: uppercase` on labels
- ✅ Flags hardcoded font-size without ADS tokens

### Spacing Grid Validator
- ✅ Enforces 4/8/16/24/32px grid exclusively
- ✅ Scans padding, margin, gap, gutter properties
- ✅ Flags any px value not in valid spacing array

---

## What You Cannot Do

1. **Cannot use hardcoded colors.** Every color must be `var(--ds-*)`.
2. **Cannot use hand-rolled components.** Use `@atlaskit/*` only.
3. **Cannot use arbitrary spacing.** Must be 4/8/16/24/32px grid.
4. **Cannot use `text-transform: uppercase`.** Must be sentence-case.
5. **Cannot render banned fields.** No Story Points, MDT Ref, Assessment Feature, Service Now#.
6. **Cannot bypass CI validation.** Violations block PR merge.

---

## How This Protects Catalyst

- ✅ **Consistency**: Every component looks and works the same
- ✅ **Maintenance**: All code uses the same libraries and patterns
- ✅ **Accessibility**: Atlaskit components are WCAG-tested
- ✅ **Brand compliance**: Jira parity is enforced automatically
- ✅ **No regressions**: CI catches violations before they reach main

---

## Questions?

If you need to:
- **Add a field**: Check Jira's screen scheme first, then ask Vikram
- **Use a component**: Check `@atlaskit/*` first, then ask Vikram if it doesn't exist
- **Use a color**: Use ADS token, then ask Vikram if the token doesn't match what you need
- **Use custom spacing**: Use 4/8/16/24/32px, then ask Vikram if you need something else

**Never:** Write code first, ask for permission later. Always validate against the design system constraints BEFORE generating code.

---

## Reference Files

- **Governance Policy**: `design-governance/GOVERNANCE_POLICY.md`
- **CLI Tool**: `node design-governance/cli/index.js [info|audit|validate]`
- **Audit Rules**: `design-governance/rules/audit.js`
- **Config**: `design-governance/core/ads-config.json`
- **Rollout Plan**: `design-governance/reports/ROLLOUT_PLAN.md`

---

**This primer is read at the start of every Catalyst session. Bookmark it.**
