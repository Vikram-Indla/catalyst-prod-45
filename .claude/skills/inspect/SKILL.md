---
name: inspect
description: >-
  React + Design System inspection skill for Catalyst component developers. 
  Two modes: (1) `/inspect fix` — identify DOM/CSS/styling deviations from ADS,
  apply fixes, update canonical components, cascade across codebase; (2) `/inspect audit` — 
  given a surface URL, enumerate all atomic/molecule/organism components, compare each 
  against Jira + ADS, report P0/P1 deviations, suggest fixes.
  Pairs with design-critique (UX heuristics), jira-compare (pixel parity), and design-intelligence.
  Triggers on: "inspect", "inspect fix", "inspect audit", "component audit", "design system audit".
version: 1.0.0
author: React Council × Design Systems × Claude, 2026-05-19
metadata:
  category: design-system-enforcement
  tags: [react, components, design-system, ads, audit, fix, canonical, cascade, dom-probe, jira-parity]
  maturity: stable
  companion_skills: [design-critique, jira-compare, design-intelligence, preflight]
---

# INSPECT — React Component Design System Auditor & Fixer

## Purpose

Empower React developers to audit and fix component deviations from Atlassian Design System (ADS) 
at the DOM/CSS/React level. Two complementary modes:

- **`/inspect fix`** — Fix a specific component: identify CSS/DOM/styling issues, apply 
  canonical fixes, update design-system admin panel, cascade fixes across all usages.
- **`/inspect audit`** — Audit an entire surface: enumerate components, compare each against 
  Jira + ADS, produce P0/P1 violation report with suggested fixes.

Designed for React architects + frontend specialists working together in a council model.

---

## Two Modes

### Mode 1: `/inspect fix <component-name>`

**Trigger:** `inspect fix BacklogTable` or `inspect fix CatalystStatusPill`

**Flow:**
1. **DOM Probe** → Chrome MCP `read_page` + `javascript_tool` to inspect element hierarchy, 
   computed styles, className patterns, data-testid attributes
2. **Jira Reference Probe** → Navigate to Jira equivalent and capture same component state
3. **ADS Spec Lookup** → Check atlassian.design for the canonical spec (colors, spacing, 
   typography, states)
4. **Deviation Analysis** → Produce visual before/after comparison showing:
   - Dimensions (width, height, padding, margin, gap)
   - CSS (colors, fontWeight, fontsize, textTransform, borders, radius)
   - React props (appearance, size, isDisabled, etc.)
5. **P0/P1 Triage** → List showstoppers (P0) separate from polish (P1)
6. **Fix Application** → Minimal code change to canonical component file
7. **Cascade** → Find all usages of this component via grep; ensure all call sites work with the fix
8. **Design-System Admin Update** → Register the fix in `/admin/design-system` with new version + date
9. **Commit** → Single logical change per fix with message: `fix: {component name} — {spec deviation}, align to ADS`

**Output:** 
- Before/after screenshots with annotated arrows (color/spacing/typography diffs)
- Commit hash + PR ready for review

---

### Mode 2: `/inspect audit <surface-url>`

**Trigger:** `inspect audit http://localhost:8080/project-hub/BAU/boards`

**Flow:**
1. **Surface Enumeration** → Walk the DOM, identify and categorize every component:
   - **Atomic** (Button, Input, Icon, Badge, Lozenge, Chip)
   - **Molecules** (ButtonGroup, FieldRow, StatusPill, WatchersChip, etc.)
   - **Organisms** (Table, Modal, Sidebar, DetailView, FilterPanel, etc.)
2. **Per-Component Comparison** → For each component found:
   - Screenshot from Catalyst
   - DOM probe (className, data-testid, computed styles)
   - Navigation to Jira equivalent (if exists) and screenshot
   - ADS spec lookup
   - Deviation detection
3. **Violation Report** → Table with:
   - Component name + location (file path or DOM selector)
   - Issue type (color, spacing, typography, disabled-state, hover-state, etc.)
   - Severity (P0 blocker | P1 next-release | omit P2/P3)
   - ADS spec reference (link to atlassian.design)
   - Current vs. expected (visual comparison)
   - Fix suggestion
4. **Blast Radius Analysis** → For each violation, grep the codebase to find all usages
5. **Audit Summary** → 
   - Total components audited: N
   - P0 blockers: N (must fix before ship)
   - P1 issues: N (fix next release)
   - Top offenders: {component} has M violations

**Output:**
- Audit report (table + markdown)
- Annotated screenshots with red arrows on each violation
- `inspect-audit-{surface}-{YYYY-MM-DD}.md` document with full findings + fix recommendations

---

## Council Model — 5 React Specialist Lenses

When this skill activates, consult the following perspectives in parallel:

| Specialist | Perspective | Example |
|---|---|---|
| **Component Architect** | "Does this component match Atlaskit's API surface? Are all supported props wired?" | If `@atlaskit/button` supports `appearance="primary" \| "secondary"` but Catalyst Button only uses `appearance="primary"`, flag the incomplete API |
| **CSS/Styling Expert** | "Are all colors from ADS token() palette? Is spacing grid-based (4/8/16/24/32)? Is typography from the 12/14/16/20/24px stack?" | Hardcoded hex `#FF0000` → P0. `padding: 12px` (off-grid) → P1 |
| **DOM/A11y Specialist** | "Does the DOM hierarchy match Atlaskit reference? Are ARIA labels present? Is keyboard nav available?" | Missing `role="button"` on custom button → P0. Missing `aria-label` on icon button → P1 |
| **React Patterns Specialist** | "Is the component using hooks correctly? Are prop types precise? Is the component composable (not monolithic)?" | Using `useState` for controlled input when `@atlaskit/textfield` is available → refactor suggestion |
| **Jira Parity Specialist** | "Does this match Jira's rendering? Are interactive states (hover, focus, disabled, loading) identical?" | Jira button has 32px height, Catalyst has 36px → P0 |

**Activation:** Before writing code, pause and ask each lens: "What issues would YOU see in this component?" Document their answers.

---

## Canonical Component Update Protocol

When a component is fixed, it becomes the **canonical** for all future usages. Update the 
design-system admin panel (`/admin/design-system`) with:

```
## [Component Name] — Canonical v{N}
- **Updated:** {ISO date}
- **Version:** {N} (increment from prior)
- **Issue:** {what was wrong}
- **Fix:** {what changed}
- **ADS Spec:** {link to atlassian.design spec}
- **Files affected:** {N} files cascaded
- **PR:** {GitHub link}
```

Example:
```
## CatalystStatusPill — Canonical v2
- **Updated:** 2026-05-19
- **Version:** 2 (prior: v1 had uppercase text)
- **Issue:** Status pill text was 11px/700/uppercase; should be 14px/400/sentence-case per Jira probe
- **Fix:** Updated css.ts to use fontSize 14, fontWeight 400, removed textTransform: uppercase
- **ADS Spec:** https://atlassian.design/components/lozenge/
- **Files affected:** 12 usages cascaded (BacklogPage, AllWorkTable, KanbanBoard, ...)
- **PR:** #1234
```

**Rule:** Canonical updates are IMMUTABLE once merged to main. New fixes create v{N+1}, never 
backpatch v{N}. Users can track version history of each canonical.

---

## Cascade Protocol

After applying a fix to a canonical component, the blast radius must be verified:

1. **Find all usages:**
   ```bash
   grep -r "CatalystStatusPill\|from.*CatalystStatusPill" src/ --include="*.tsx" --include="*.ts"
   ```

2. **Per-usage validation:**
   - Verify the component mounts correctly at each callsite
   - Test with the same props used in real surfaces
   - Screenshot each surface post-fix
   - Confirm no regressions

3. **Automated check:**
   - Run `npm test` for any related component tests
   - Run `npm run type-check` to confirm TypeScript still clean
   - Run design-governance audit: `node design-governance/cli/index.js audit src/`

4. **Document cascade:**
   ```
   ## Cascade — CatalystStatusPill v2
   - AllWorkTable: ✅ 4 rows tested, pill height now 28px (was 32px), text readable
   - BacklogPage: ✅ group headers now styled correctly
   - KanbanBoard: ✅ card status display matches Jira
   - DetailView: ✅ sidebar status pill syncs with header
   - ... (14 total surfaces)
   ```

**Rule:** No component fix is complete until the cascade is tested and documented. A fix that 
breaks even ONE downstream surface is a revert + redesign.

---

## Best Practices — 10 Patterns From Leading React/Design Teams

### 1. **Atlaskit-First Principle**
When adding a new component, ALWAYS check Atlaskit first:
- ✅ Need a button? Use `@atlaskit/button`
- ✅ Need a modal? Use `@atlaskit/modal-dialog`
- ❌ DON'T roll your own dropdown; `@atlaskit/dropdown-menu` exists

**Why:** Atlaskit components are battle-tested, A11y-compliant, and receive security updates. 
Hand-rolled = technical debt.

### 2. **Token-Over-Hardcoded**
Every color, spacing, and typography value comes from a token:
```tsx
// ✅ CORRECT
<div style={{ color: 'var(--ds-text-subtle)', padding: '8px 16px' }} />

// ❌ WRONG
<div style={{ color: '#505258', padding: '12px' }} />
```

Token fallbacks (`var(--ds-text, #505258)`) are the canonical pattern for browser compatibility.

### 3. **Spacing Grid Discipline**
All spacing is a multiple of 4px:
```
✅ 4px, 8px, 12px, 16px, 20px, 24px, 28px, 32px, 40px, 48px
❌ 5px, 13px, 18px, 22px (random off-grid values)
```

Maintain a spacing constant file for reuse:
```typescript
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
} as const;
```

### 4. **Component Composition > Monolithic Mega-Components**
Break large components into smaller, reusable pieces:
```tsx
// ✅ Composable
<Table>
  <TableHead>
    <TableRow>
      <TableCell>Name</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {rows.map(r => <TableRow key={r.id}>{r.name}</TableRow>)}
  </TableBody>
</Table>

// ❌ Monolithic
<MegaTable data={rows} columns={['name']} ... />
```

### 5. **Prop Types > TypeScript Interfaces Alone**
Use both TypeScript AND prop validation for consumer clarity:
```typescript
interface ButtonProps {
  appearance?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isDisabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

// Document EVERY prop
/**
 * @param appearance Visual prominence. Default: 'secondary'
 * @param size Button height. Default: 'medium' (32px). Small=24px, Large=40px.
 * @param isDisabled Disables interaction and greys appearance.
 * @param onClick Fired on left-click. Required.
 */
export function Button(props: ButtonProps) { ... }
```

### 6. **CSS-in-JS > Inline Styles > Tailwind for Component Primitives**
For reusable components, prefer CSS modules or styled-components over inline objects:
```typescript
// ✅ CSS Module (single source of truth for visual)
import styles from './Button.module.css';
<button className={styles.primary}>Click me</button>

// ⚠️ Inline styles (gets verbose, hard to maintain)
<button style={{ background: 'blue', padding: '8px 12px' }}>Click me</button>

// ❌ Tailwind utilities (couples styling to component—hard to update globally)
<button className="bg-blue-500 px-3 py-2">Click me</button>
```

Tailwind is fine for ONE-OFF utilities in pages; never in reusable components.

### 7. **Storybook = Living Documentation**
Every component must have a Storybook story showing:
- Default state
- All supported prop combinations
- Empty state
- Loading state
- Error state
- Disabled state

```typescript
export const Default = () => <Button>Click me</Button>;
export const Disabled = () => <Button isDisabled>Disabled</Button>;
export const Danger = () => <Button appearance="danger">Delete</Button>;
```

### 8. **Accessibility From Day One**
- ✅ Semantic HTML (`<button>`, `<input>`, `<label>`)
- ✅ ARIA labels and roles where needed
- ✅ Keyboard navigation (Tab, Escape, Enter)
- ✅ Focus visible (`:focus-visible` or similar)
- ❌ `<div role="button">` when `<button>` works
- ❌ `onclick` handlers without keyboard support

Test with: keyboard navigation, screen reader (NVDA/JAWS), axe DevTools, WAVE.

### 9. **Responsive by Default**
All components must work on mobile (320px), tablet (768px), desktop (1280px):
```tsx
// ✅ Responsive
<div className={`flex flex-col gap-4 md:flex-row md:gap-8`}>
  <Sidebar className="w-full md:w-64" />
  <Main className="flex-1" />
</div>

// ❌ Desktop-only
<div className="flex gap-8">
  <Sidebar className="w-64" />
  <Main />
</div>
```

### 10. **Component Tests > Manual Testing**
For every component, write unit tests that verify:
- Renders without crashing
- Props passed correctly
- Event handlers fire
- Disabled state works
- ARIA attributes present

```typescript
describe('Button', () => {
  it('renders with primary appearance', () => {
    const { getByRole } = render(<Button appearance="primary">Click</Button>);
    const btn = getByRole('button');
    expect(btn).toHaveClass('appearance-primary');
  });

  it('disables on isDisabled=true', () => {
    const { getByRole } = render(<Button isDisabled>Click</Button>);
    expect(getByRole('button')).toBeDisabled();
  });

  it('fires onClick when clicked', () => {
    const onClick = jest.fn();
    const { getByRole } = render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

---

## Investigation Tools

### Chrome MCP (DOM inspection)
```javascript
// Inspect element hierarchy, computed styles, data-attributes
chrome.read_page() → get accessibility tree
chrome.javascript_tool() → run queries like:
  - document.querySelectorAll('[data-testid="my-component"]')
  - getComputedStyle(el).color, fontSize, fontWeight
  - el.getBoundingClientRect() for dimensions
```

### Atlassian Rovo MCP (Jira + ADS data)
```
Rovo searches:
- "CatalystStatusPill equivalent in Jira"
- "ADS Button component spec: appearance, size, states"
- "Atlaskit Lozenge colors in design tokens"
```

### Computer Use (visual comparison)
Open Catalyst and Jira side-by-side:
- Screenshot Jira component → save
- Screenshot Catalyst component → save
- Use Diff tool or side-by-side viewer to spot deviations

---

## Example Workflow — Fixing CatalystStatusPill

**Trigger:** `/inspect fix CatalystStatusPill`

**Step 1 — DOM Probe (Chrome MCP)**
```javascript
// In-browser:
const pills = document.querySelectorAll('[data-testid="catalyst-status-pill-trigger"]');
pills.forEach(p => {
  const cs = getComputedStyle(p);
  console.log({
    innerText: p.innerText,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    backgroundColor: cs.backgroundColor,
    color: cs.color,
    padding: cs.padding,
  });
});
// Result: fontSize: "11px", fontWeight: "700", backgroundColor: "rgb(148,199,72)"
```

**Step 2 — Jira Reference (screenshot)**
Navigate to https://digital-transformation.atlassian.net/browse/BAU-5748
- Status pill in header shows: fontSize 14px, fontWeight 400, text "Done"
- Probed spec: `<span style="background: #94C748; color: #292A2E; fontWeight: 500;">Done</span>`

**Step 3 — ADS Spec**
Check https://atlassian.design/components/lozenge/
- "Lozenge" component shows sentence-case text only, no uppercase
- Default variant: background subtle, foreground text secondary

**Step 4 — Deviation Analysis**
| Property | Current Catalyst | Jira | ADS Spec | Deviation | Severity |
|---|---|---|---|---|---|
| fontSize | 11px | 14px | 14px | 3px smaller | P1 |
| fontWeight | 700 | 400 | 400 | too heavy | P1 |
| textTransform | uppercase | none | none | unnecessary uppercase | P1 |
| color | white (inferred) | #292A2E | var(--ds-text) | should be dark text | P0 |

**Step 5 — Fix Code**
File: `src/components/shared/CatalystStatusPill.tsx`
```tsx
// Before
const styles = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'white',
};

// After
const styles = {
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--ds-text, #292A2E)',
  // no textTransform
};
```

**Step 6 — Test Cascade**
```bash
grep -r "CatalystStatusPill" src/ --include="*.tsx"
# Results: 12 files
# Test each: AllWorkTable, BacklogPage, KanbanBoard, etc.
```

**Step 7 — Update Canonical**
Navigate to `/admin/design-system` and register:
```
## CatalystStatusPill — Canonical v2
- **Updated:** 2026-05-19
- **Version:** 2
- **Issue:** Text was 11px/700/uppercase; should match Jira (14px/400/sentence-case)
- **Fix:** Updated css.ts: fontSize→14px, fontWeight→400, removed textTransform, color→var(--ds-text)
- **ADS Spec:** https://atlassian.design/components/lozenge/
- **Files affected:** 12 surfaces tested ✅
- **PR:** #1234
```

**Step 8 — Commit**
```bash
git commit -m "fix: CatalystStatusPill — align typography to Jira (14px/400/sentence-case)"
```

---

## Audit Example — /project-hub/BAU/boards

**Trigger:** `/inspect audit http://localhost:8080/project-hub/BAU/boards`

**Output:**
```
### SURFACE AUDIT: BAU Kanban Board
URL: http://localhost:8080/project-hub/BAU/boards
Date: 2026-05-19
Components audited: 47

### ATOMIC COMPONENTS
- Button ✅ (3 instances, all primary/secondary variants correct)
- Icon ✅ (12 instances, all using JiraIssueTypeIcon correctly)
- Badge ❌ (4 instances in swimlane headers)
  - P1: text should be 11px/600, currently 12px/400
  - Locations: swimlane-header×4
  - Fix: Update .swimlane-header-badge CSS

### MOLECULE COMPONENTS
- StatusPill ✅ (8 instances, v2 canonical applied, all correct)
- WatchersChip ❌ (6 instances)
  - P0: avatar dropdown portal clips behind swimlane (z-index: 1000 insufficient)
  - P1: "Watching" label should be smaller (11px, currently 12px)
  - Locations: card×6
  - Fix: Increase portal z-index to 10000; update label font-size

### ORGANISM COMPONENTS
- KanbanBoard (swimlane-based) ✅
  - Columns: Story, In Progress, Done
  - Grouping works correctly
  - Drag-drop: functional
- SwimlaneHeader ❌
  - P1: "+Create" button should be hover-only, currently always visible
  - Fix: Update CSS to opacity: 0 on idle, opacity: 1 on :hover

### P0 BLOCKERS (must fix before ship)
1. WatchersChip portal z-index causes dropdown to disappear behind swimlane

### P1 ISSUES (fix next release)
1. Badge typography 12px→11px in swimlane headers (4 instances)
2. WatchersChip "Watching" label 12px→11px (6 instances)
3. SwimlaneHeader "+Create" button should be hover-only (1 instance)

### BLAST RADIUS
- Fix P0 (WatchersChip z-index): cascades to 18 surfaces using WatchersChip
- Fix P1 (Badge): cascades to 3 surfaces
- Fix P1 (SwimlaneHeader): only this surface (1 file)

### AUDIT SUMMARY
- Total components: 47
- P0 blockers: 1 (must fix)
- P1 issues: 3 (fix next release)
- Coverage: 87% ADS-compliant (up from 76% last audit 2026-05-10)
```

---

## Hard Rules

1. **Always read CLAUDE.md first** — banned columns, ADS token rules, 
   jira-compare lessons are non-negotiable.

2. **P0 = shipping blocker** — Never merge a fix that introduces a P0.

3. **Canonical is immutable** — Once v{N} is merged, all future fixes 
   create v{N+1}. Never backpatch.

4. **Cascade is mandatory** — No component fix is complete until all 
   downstream usages are tested and documented.

5. **Design-system admin is authoritative** — Update it with every canonical 
   change. It's the single source of truth for component versions.

6. **Atlaskit-first always** — If Atlaskit has it, use it. Hand-rolled 
   is a revert.

---

## References

- **CLAUDE.md** — Project guardrails, banned columns, design-system rules
- **Atlassian Design System** — https://atlassian.design/
- **Atlaskit Components** — https://atlassian.design/components/
- **jira-compare skill** — Pixel parity audits (use for every new feature)
- **design-critique skill** — UX heuristic scoring
- **design-intelligence skill** — 500-IQ design council

---

## Activation Checklist

When `/inspect` or `/inspect audit` fires:

- [ ] Read CLAUDE.md (banned columns, token rules, jira-compare lessons)
- [ ] Load Chrome MCP for DOM inspection
- [ ] Load Atlassian Rovo for Jira/ADS reference data
- [ ] Identify React specialist council (Component Architect, CSS Expert, 
      DOM/A11y, React Patterns, Jira Parity)
- [ ] Capture before/after screenshots with annotated arrows
- [ ] Document P0 vs P1 violations
- [ ] Apply minimal fixes to canonical component
- [ ] Grep for cascade (all usages)
- [ ] Update `/admin/design-system` with new canonical
- [ ] Commit with clear message
- [ ] Report back with blast radius analysis
