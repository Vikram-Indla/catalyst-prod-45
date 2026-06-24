# Design Review Checklist

**For:** Vikram (code reviewer) on any PR that touches UI components or styles.  
**When to use:** Before approving any PR that changes `.tsx`, `.css`, or component files.

---

## Pre-review (automated — must pass before manual review)

These are enforced by CI. If any fail, return the PR without reviewing.

- [ ] `🎨 Token Validator` job passed (≤ 600 violations, no new ones added)
- [ ] `🔍 Atlaskit Auditor` job passed (no buggy patterns without workaround)
- [ ] `Design System Compliance Check` (existing audit) passed
- [ ] `CI` build passed (TypeScript clean, no broken imports)

---

## 1. Handoff Spec

- [ ] Jira ticket has a comment containing `Figma:` with a valid Figma link
- [ ] Jira ticket has a comment containing `Handoff Spec:` with spec link or inline content
- [ ] Spec includes all 6 sections:
  - [ ] Components Used (every `@atlaskit/*` and Catalyst wrapper listed)
  - [ ] Tokens (no hardcoded hex — all `var(--ds-*)` or `var(--cp-*)`)
  - [ ] States (Default, Hover, Active, Disabled, Loading, Error, Empty documented)
  - [ ] Accessibility (WCAG 2.1 AA — keyboard nav, ARIA, focus management)
  - [ ] Jira Parity Notes (`jira-compare` run logged — pass or approved deviation)
  - [ ] Data & API (Supabase table, fields, RLS policy noted)

---

## 2. Component usage

- [ ] No hand-rolled dropdowns/menus — must use `@atlaskit/dropdown-menu` or portal pattern
- [ ] No `react-select` direct imports — must be `@atlaskit/select`
- [ ] No TipTap / contenteditable rich text — must be `@atlaskit/editor-core`
- [ ] No `sonner` or custom toast — must be `@atlaskit/flag`
- [ ] Work item tables use `JiraTable` — not raw `@atlaskit/dynamic-table` or `<table>`
- [ ] Status badges use `CatalystStatusPill` — not `<span>` with inline bg color
- [ ] Work item icons use `JiraIssueTypeIcon` — not colored dots or custom SVG
- [ ] Detail view shell uses `CatalystViewBase` — not bespoke modal layout
- [ ] No new `@atlaskit/popup` usage inside `overflow:hidden` (known empty-portal bug)
- [ ] No new `@atlaskit/dropdown-menu` inside `overflow:hidden` ancestor (Popper.js positioning bug)
- [ ] `@atlaskit/flag` imported correctly (`Flag` = default, `FlagGroup` = named)

---

## 3. Design tokens

- [ ] Zero hardcoded hex values in new/modified lines (`grep -n "#[0-9a-fA-F]{3,6}" <files>`)
- [ ] Zero raw `rgb()` / `rgba()` / `hsl()` as standalone values
- [ ] Zero Tailwind color utilities (`text-slate-*`, `bg-gray-*`, `bg-blue-*`, etc.)
- [ ] Spacing uses only `4 / 8 / 12 / 16 / 24 / 32 / 40 / 48px`
- [ ] No non-ADS fonts imported (`grep -n "fontsource\|googleapis\|typekit"`)
- [ ] `--ds-background-selected` used only for selection state — not as page background

---

## 4. Accessibility

- [ ] All interactive elements keyboard-accessible (Tab, Enter/Space, Escape)
- [ ] No hand-rolled menus without `role="menu"` + `role="menuitem"` ARIA
- [ ] Modal/drawer has focus trap — Escape closes without closing parent
- [ ] `disabled` buttons have `aria-disabled="true"` not just visual opacity
- [ ] Color contrast: text ≥ 4.5:1, large text/UI ≥ 3:1 (use Figma or browser DevTools)
- [ ] Destructive actions (Delete, Remove) have confirmation step

---

## 5. Enterprise UI rules

- [ ] No spinning/rotating containers (`transform: rotate()` with animation on wrapper)
- [ ] No animated conic-gradient borders (static rainbow on AI CTAs only)
- [ ] No pulsing glows, neon outlines, particle effects
- [ ] All labels sentence-case (no `text-transform: uppercase`)
- [ ] Loading state uses `@atlaskit/spinner` — not custom spinners or animated borders
- [ ] AI CTA rainbow border: static only (`animation: none`), `AIIntelligenceButton` pattern only

---

## 6. Data integrity (zero-assumption code)

- [ ] No typed domain fallbacks: `|| 'Story'`, `|| 'Epic'`, `|| 'todo'`, `|| 'Medium'`
- [ ] No `JiraIssueTypeIcon` with `||` fallback type string
- [ ] Raw DB rows accessed with `snake_case` fields (not camelCase)
- [ ] `WorkItem` objects accessed with `camelCase` fields
- [ ] New field access verified to exist in DB (`information_schema.columns` checked)
- [ ] New entity lookups handle the "not synced yet" case gracefully (dash, empty, not lie)

---

## 7. Git hygiene

- [ ] No `git add -A` or `git add .` in commit scripts (explicit paths only)
- [ ] File deletions committed atomically with removal of all their imports
- [ ] No stale `.fuse_hidden*` or lock files staged
- [ ] Commit message is imperative, < 72 chars, references Jira key

---

## 8. Visual regression (only for PRs labelled `visual`)

- [ ] `📸 Visual Regression Check` job passed
- [ ] If drift detected: artifact reviewed, confirmed intentional, reference snapshots updated
- [ ] Key surfaces spot-checked in dev browser: `localhost:8080`

---

## Approval criteria

**Approve** when all checked boxes are green.

**Request changes** if any of these are unchecked:
- Any item in Pre-review (automated)
- Handoff Spec missing or incomplete
- Hardcoded colors / banned components / WCAG failure
- Typed domain fallbacks in data-rendering code

**Do NOT approve** to unblock a deploy deadline — the checklist exists precisely for that situation.

---

## Quick commands for review

```bash
# Run audit on changed files only
git diff --name-only origin/main | grep "\.tsx\|\.ts\|\.css" | xargs node design-governance/rules/audit.js

# Grep for hardcoded hex in PR diff
git diff origin/main -- '*.tsx' '*.ts' '*.css' | grep "^+" | grep -E "#[0-9a-fA-F]{6}"

# Check for typed domain fallbacks
git diff origin/main -- '*.tsx' | grep "^+" | grep -E "\|\| '(Story|Epic|Task|Bug|Feature|todo|done|Medium|High|Low)'"

# Check for direct react-select
git diff origin/main -- '*.tsx' | grep "^+" | grep "from 'react-select'"
```
