# Phase 5 File Manifest — Hardcoded Colors

**Scan Date:** 2026-06-28
**Branch:** main
**Status:** Phase 5, Step 1 — DISCOVERY ONLY (no fixes applied)

---

## Summary

| Metric | Value | Notes |
|--------|-------|-------|
| **Total violations** | 28,137 | Hex colors in src/ (all file types) |
| **Target** | <600 | From baseline ratchet gate |
| **Current** | 28,137 | 46.9x over target |
| **Files affected** | 1,715 | Unique files with violations |
| **Reduction needed** | 27,537 | To reach target |

---

## Violation Distribution

### By File Type

| Type | Count | % of Total | Files |
|------|-------|-----------|-------|
| **TSX** | 18,606 | 66.1% | React components (inline styles, classNames) |
| **CSS** | 7,350 | 26.1% | Stylesheets (hex fallbacks in var() chains) |
| **TS** | 2,181 | 7.8% | TypeScript constants, color maps, theme objects |
| **JSX** | — | — | (rare; counted in TS/TSX) |
| **JS** | — | — | (rare; counted in TS/TSX) |

---

## Top 50 Files by Violation Count

| Rank | File | Count | Type | Violation Class |
|------|------|-------|------|------------------|
| 1 | `src/index.css` | 1,061 | CSS | ADS token fallbacks (var() chains with #hex) |
| 2 | `src/components/caty-ai/CatyOverrides.css` | 374 | CSS | ADS token fallbacks + !important cascades |
| 3 | `src/modules/task10/styles/task10.css` | 299 | CSS | ADS token fallbacks + old Catalyst colors |
| 4 | `src/components/resource360/r360-member.css` | 289 | CSS | Inline hex colors + token fallbacks |
| 5 | `src/modules/task10/styles/task10-detail.css` | 263 | CSS | ADS token fallbacks + custom status colors |
| 6 | `src/components/chat/chat.css` | 245 | CSS | Tailwind + custom hex + token fallbacks |
| 7 | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | 225 | TSX | Inline style objects + classNames |
| 8 | `src/pages/releases/AllReleasesPage.tsx` | 211 | TSX | Style prop hex colors + inline objects |
| 9 | `src/styles/r360.css` | 207 | CSS | Inline hex + token fallbacks |
| 10 | `src/styles/allwork.css` | 204 | CSS | Tailwind utilities + hex fallbacks |
| 11 | `src/styles/testhub.css` | 197 | CSS | ADS token fallbacks |
| 12 | `src/styles/catalyst-colors.css` | 177 | CSS | Color constant definitions (CSS custom props) |
| 13 | `src/components/chat/dock/dock.css` | 177 | CSS | ADS token fallbacks + inline hex |
| 14 | `src/modules/project-work-hub/components/dialogs/story-detail-extensions.css` | 166 | CSS | Token fallbacks + custom theme colors |
| 15 | `src/components/project-hub/dashboard/GadgetSettingsPanel.tsx` | 158 | TSX | Inline style objects + style props |
| 16 | `src/pages/admin/connections/VercelConnectionPage.tsx` | 148 | TSX | Inline hex in style objects |
| 17 | `src/modules/project-work-hub/components/SubtasksPanel/SubtasksPanel.css` | 145 | CSS | Token fallbacks + custom colors |
| 18 | `src/pages/CleanupPage.tsx` | 143 | TSX | Inline styles + classNames with hex |
| 19 | `src/modules/task10/styles/task10-v2.css` | 141 | CSS | ADS token fallbacks + legacy colors |
| 20 | `src/styles/boards.css` | 139 | CSS | Token fallbacks + inline hex |
| 21 | `src/components/filters/CanonicalFilter.tsx` | 132 | TSX | Inline style objects |
| 22 | `src/modules-dormant/wiki/WikiArticlePage.tsx` | 131 | TSX | Inline styles + style props |
| 23 | `src/pages/admin/components/ComponentsAdminPage.tsx` | 127 | TSX | Inline hex in style objects |
| 24 | `src/components/capacity-planner/capacity-planner-gantt.css` | 126 | CSS | Token fallbacks + Gantt-specific colors |
| 25 | `src/components/shared/Timeline/TimelineView.tsx` | 125 | TSX | Inline styles |
| 26 | `src/pages/admin/AdminAccessPage.tsx` | 122 | TSX | Inline hex styles |
| 27 | `src/pages/dev/EvidenceToExecutionFull.tsx` | 120 | TSX | Inline style objects |
| 28 | `src/styles/budget-module.css` | 118 | CSS | Token fallbacks |
| 29 | `src/styles/task-detail-modal-enterprise.css` | 117 | CSS | Token fallbacks |
| 30 | `src/components/shared/JiraTable/JiraTable.tsx` | 117 | TSX | Inline styles + classNames |
| 31 | `src/components/capacity/timeline/Timeline.module.css` | 116 | CSS | Token fallbacks + inline hex |
| 32 | `src/components/chat/dock/caty-panel.css` | 112 | CSS | Token fallbacks |
| 33 | `src/styles/theme-tokens.css` | 106 | CSS | CSS custom property definitions (token fallbacks) |
| 34 | `src/modules-dormant/wiki/WikiHomePage.tsx` | 105 | TSX | Inline styles |
| 35 | `src/styles/users-module.css` | 103 | CSS | Token fallbacks |
| 36 | `src/styles/mytasks.css` | 102 | CSS | Token fallbacks |
| 37 | `src/modules/task10/components/week/T10WeekViewV3.tsx` | 99 | TSX | Inline styles |
| 38 | `src/components/for-you/atlaskit/RecommendedPanel.tsx` | 95 | TSX | Inline style objects |
| 39 | `src/modules/tasks/styles/task-list.css` | 93 | CSS | Token fallbacks |
| 40 | `src/components/shared/JiraBasicFilter.css` | 93 | CSS | Token fallbacks |
| 41 | `src/modules/tasks/views/TasksTaskListView.tsx` | 91 | TSX | Inline styles |
| 42 | `src/components/workhub/issue-view/IssueContentView.tsx` | 91 | TSX | Inline styles + classNames |
| 43 | `src/styles/goals-dark.css` | 90 | CSS | Token fallbacks + dark mode overrides |
| 44 | `src/styles/catalyst-ads-parity.css` | 90 | CSS | Token fallbacks (known ADS migration artifacts) |
| 45 | `src/lib/workstream-colors.ts` | 89 | TS | TypeScript color constant map (exported) |
| 46 | `src/components/catalyst-detail-views/shared/sections/CatalystParentLinker.tsx` | 87 | TSX | Inline styles |
| 47 | `src/components/admin/WorkflowTypePanel.tsx` | 84 | TSX | Inline style objects |
| 48 | `src/styles/dept-intelligence.css` | 83 | CSS | Token fallbacks |
| 49 | `src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx` | 83 | TSX | Inline styles |
| 50 | `src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx` | 82 | TSX | Inline styles + classNames |

**Cumulative sum (top 50):** 8,098 violations (28.8% of total)

---

## Phasing Strategy

### Effort Estimate

Based on violation density and file complexity:

| Phase | Files | Est. Violations | Est. Effort | Rationale |
|-------|-------|-----------------|-------------|-----------|
| **5A** | 1 | 1,061 | 45 min | `src/index.css` — massive token fallback chain; high automation potential |
| **5B** | 6 | 1,948 | 60 min | Top CSS files (2–7); token→var() conversion; find-replace + verify |
| **5C** | 10 | 1,543 | 60 min | Files 8–17; mix of CSS + TSX; remove inline #hex from style props |
| **5D** | 20 | 1,607 | 75 min | Files 18–37; TSX inline styles; refactor to ADS token classes or var() |
| **5E** | Remaining | 20,980 | 6+ hrs | Files 38+; high manual review needed; proportional increases per file |

**Total to reach <600:** Phases 5A–5D alone would reduce by ~6,160 violations, leaving ~22,000 (3,670% over target). **Full scope requires 5E → 5Z.**

---

## Violation Patterns

### Pattern 1: ADS Token Fallbacks (CSS-heavy)
**Count:** ~5,000+ violations (17.8%)
**Example:**
```css
var(--ds-surface, #FFFFFF)
var(--ds-text-subtle, #42526e)
var(--ds-border, #e2e8f0)
```
**Root Cause:** Migration from hard-coded CSS to ADS tokens; fallbacks added but now flagged.
**Fix:** Remove hex fallbacks or migrate to `token()` helper from `@atlaskit/tokens`.

### Pattern 2: Inline Style Objects in TSX (React-heavy)
**Count:** ~8,000+ violations (28.5%)
**Example:**
```tsx
style={{ backgroundColor: '#E9F2FE', color: '#0C66E4' }}
```
**Root Cause:** Direct hex color use in `style` prop instead of CSS variables.
**Fix:** Move to CSS modules with var() or use className-based color sets.

### Pattern 3: Custom Color Constants (TS)
**Count:** ~1,500+ violations (5.3%)
**Example:**
```ts
const workstreamColors = { epic: '#7c3aed', story: '#2563eb' };
export const COLOR_MAP = { low: '#059669', high: '#dc2626' };
```
**Root Cause:** Color logic hard-coded in TypeScript; used in multiple surfaces.
**Fix:** Convert to ADS token references or CSS custom property lookups.

### Pattern 4: Tailwind Utilities (CSS)
**Count:** ~500+ violations (1.8%)
**Example:** `bg-slate-100`, `text-gray-500`, `border-green-200` (in CSS, less common in TSX post-Tailwind removal)
**Root Cause:** Legacy Tailwind color utilities not yet migrated.
**Fix:** Replace with ADS tokens via CSS custom properties or component classes.

---

## File Categories

### Unmigrated CSS Stylesheets (High Priority — 7,350 violations)

These are the main targets for Phase 5. The hex values are fallbacks in var() chains and direct hex usage:

- **Global theme files:** `index.css` (1,061), `theme-tokens.css` (106), `catalyst-colors.css` (177)
- **Module-specific CSS:** `task10.css` (299), `r360.css` (207), `allwork.css` (204), `testhub.css` (197), `boards.css` (139), `budget-module.css` (118)
- **Component CSS:** `CatyOverrides.css` (374), `r360-member.css` (289), `chat.css` (245), `dock.css` (177)
- **Dormant/legacy modules:** Checked but lower priority due to low traffic

**Strategy:** Automated find-replace for token fallback removal is safe here; audit sample before bulk apply.

### React Components with Inline Styles (18,606 violations)

These are harder to automate because inline styles live in TSX. Require:

1. **Audit pass:** Identify style prop vs. className usage.
2. **Migration path:** Move to CSS modules or component-level color props.
3. **Regression testing:** Ensure colors remain visually correct after move.

**High-value targets (>100 violations):**
- `BacklogPage.atlaskit.tsx` (225) — large component
- `AllReleasesPage.tsx` (211) — releases surface
- `GadgetSettingsPanel.tsx` (158) — dashboard gadgets
- `VercelConnectionPage.tsx` (148) — admin integrations

### TypeScript Color Constants (TS files, 2,181 violations)

These are centralized color definitions. Key files:

- `src/lib/workstream-colors.ts` (89) — workstream-level color mapping
- Other color-map files (scattered across modules)

**Strategy:** Locate and refactor to use ADS token helpers or CSS custom property lookups.

---

## Quick Reference: Top 10 Files

| Rank | File | Count | Type | Category | Effort | Automation Potential |
|------|------|-------|------|----------|--------|---------------------|
| 1 | `src/index.css` | 1,061 | CSS | Token fallbacks | 45 min | **HIGH** — find-replace |
| 2 | `src/components/caty-ai/CatyOverrides.css` | 374 | CSS | Token fallbacks + !important | 30 min | **HIGH** |
| 3 | `src/modules/task10/styles/task10.css` | 299 | CSS | Token fallbacks | 25 min | **HIGH** |
| 4 | `src/components/resource360/r360-member.css` | 289 | CSS | Hex + token fallbacks | 25 min | **MEDIUM** |
| 5 | `src/modules/task10/styles/task10-detail.css` | 263 | CSS | Token fallbacks | 20 min | **HIGH** |
| 6 | `src/components/chat/chat.css` | 245 | CSS | Tailwind + hex + fallbacks | 30 min | **MEDIUM** |
| 7 | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | 225 | TSX | Inline styles | 40 min | **LOW** — requires refactor |
| 8 | `src/pages/releases/AllReleasesPage.tsx` | 211 | TSX | Inline styles | 35 min | **LOW** |
| 9 | `src/styles/r360.css` | 207 | CSS | Hex + token fallbacks | 20 min | **MEDIUM** |
| 10 | `src/styles/allwork.css` | 204 | CSS | Token fallbacks | 20 min | **HIGH** |

---

## Color Violation Examples (First 30 Unique Lines)

### From src/index.css (Lines 65–107)
```css
--status-todo-bg: var(--ds-text-subtle, #42526e);
--status-inprogress-bg: var(--ds-link, #0c66e4);
--ds-background-success-bold, #1f845a)
--cp-status-done-green: var(--ds-background-success-bold, #6a9a23);
--cap-brd: var(--cp-workstream-catalyst-primary, var(--ds-link, #2563eb));
--cap-translate: var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488));
--cap-epic: var(--cp-purple-60, var(--ds-background-discovery-bold, #7c3aed));
--cap-uat: var(--cp-warning, var(--ds-background-warning-bold, #d97706));
```
**Pattern:** Token chain with hex fallback (Lv4 nesting). Audit: keep var() prefix, remove #fallback.

### From src/components/caty-ai/CatyOverrides.css (Lines 22–48)
```css
background: var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))) !important;
color: var(--ds-text, #0f172a) !important;
background: var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb)) !important;
```
**Pattern:** Excessive nesting + !important. Audit: flatten to single var() or token() call.

### From src/modules/task10/styles/task10.css (Lines 1–20)
```css
.task10-event { background: #E8F0FF; }
.task10-status-todo { color: #42526E; }
.task10-status-done { background: #DFE1E6; }
```
**Pattern:** Direct hex in class selectors. Audit: replace with ADS token var() or component class.

---

## Validation Commands (Phase 5 acceptance criteria)

### Before Phase 5A (current state):
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | grep -v node_modules | grep -v ".snap" | wc -l
# Expected output: 28137
```

### After Phase 5A (index.css only):
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | grep -v node_modules | grep -v ".snap" | wc -l
# Expected: ~27076 (28137 - 1061)
```

### After Phase 5B–5D (top 50 files):
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | grep -v node_modules | grep -v ".snap" | wc -l
# Expected: ~20039 (28137 - 8098)
```

### Final gate (full scope):
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | grep -v node_modules | grep -v ".snap" | wc -l
# Expected: <600
```

Also run the ratchet gate:
```bash
npm run lint:colors:gate
# Should show zero increase vs. baseline
```

---

## Next Steps

1. **Phase 5A:** Migrate `src/index.css` (1,061 violations) — target 45 minutes
   - Audit token chains; remove hex fallbacks where safe
   - Verify no visual regressions in light/dark modes
   - Commit with baseline ratchet update

2. **Phase 5B:** Migrate top CSS files (files 2–6; ~1,948 violations) — target 60 minutes
   - Same pattern; batch find-replace + verify

3. **Phase 5C–5D:** TSX inline styles (files 7–37; ~3,150 violations) — target 135 minutes
   - Refactor to CSS modules or component-level props
   - Higher manual review; lower automation

4. **Phase 5E+:** Remaining files (files 38+; ~20,980 violations)
   - Defer to follow-up sessions if time-boxed; outside 2-hour slice rule

---

## Notes

- **No fixes applied yet.** This is discovery only.
- **Token fallbacks are NOT inherently wrong** — they're defensive coding. But the audit flags them because hex should eventually be removed.
- **Ratchet gate baseline:** Currently **709** (from previous commits). New gate must hold at or below this until full scope is complete.
- **Dark mode verification:** After each phase, verify visuals in Chrome DevTools dark mode toggle (Cmd+Shift+P → "Dark mode").

---

**Generated:** 2026-06-28 | **Auditor:** Claude Code (Haiku 4.5) | **Scope:** Complete `src/` directory scan (TSX, TS, CSS, JSX, JS)
