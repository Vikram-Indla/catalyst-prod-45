# Component-Level ADS Token Migration Guide

After Phase 1 (root CSS fixed), remaining violations: ~17,500 across component files.

**Top 20 offenders = ~2,700 violations = ~15% of remaining.**

---

## Running the Fixer on CSS Files

`fix-root-css.sh` accepts any CSS file via `--file`:

```bash
# Fix a single CSS file
python3 fix-root-css.sh --file src/modules/task10/styles/task10.css

# Dry-run preview
python3 fix-root-css.sh --dry-run --file src/components/capacity/timeline/Timeline.module.css

# Fix all top CSS offenders at once
python3 fix-root-css.sh --file src/modules/task10/styles/task10.css \
  && python3 fix-root-css.sh --file src/components/capacity/timeline/Timeline.module.css \
  && python3 fix-root-css.sh --file src/components/resource360/r360-member.css \
  && python3 fix-root-css.sh --file src/modules/project-work-hub/components/dialogs/story-detail-extensions.css \
  && python3 fix-root-css.sh --file src/styles/dept-intelligence.css \
  && python3 fix-root-css.sh --file src/styles/allwork.css \
  && python3 fix-root-css.sh --file src/styles/budget-module.css \
  && python3 fix-root-css.sh --file src/components/caty-ai/CatyOverrides.css \
  && python3 fix-root-css.sh --file src/styles/users-module.css \
  && python3 fix-root-css.sh --file src/modules/task10/styles/task10-v2.css \
  && python3 fix-root-css.sh --file src/components/capacity-planner/capacity-planner-gantt.css
```

---

## Top 20 Offenders — Fix Priority

| Rank | File | Violations | Type | Fix Method |
|------|------|-----------|------|------------|
| 1 | `src/modules/task10/styles/task10.css` | 215 | CSS | `--file` flag |
| 2 | `src/components/capacity/timeline/Timeline.module.css` | 207 | CSS | `--file` flag |
| 3 | `src/pages/project/FeatureViewPage.module.css` | 186 | CSS Module | HSL special — see below |
| 4 | `src/pages/dev/EvidenceToExecutionFull.tsx` | 179 | TSX | See TSX inline styles |
| 5 | `src/components/resource360/r360-member.css` | 174 | CSS | `--file` flag |
| 6 | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | 166 | TSX | See TSX inline styles |
| 7 | `src/components/roadmap/RoadmapEngine.tsx` | 138 | TSX | HSL + inline styles |
| 8 | `src/theme/tokens.ts` | 138 | TS | See tokens.ts section |
| 9 | `src/pages/admin/components/ComponentsAdminPage.tsx` | 138 | TSX | Inline styles |
| 10 | `src/modules/project-work-hub/components/dialogs/story-detail-extensions.css` | 128 | CSS | `--file` flag |
| 11 | `src/components/filters/CanonicalFilter.tsx` | 127 | TSX | Inline styles |
| 12 | `src/components/for-you/atlaskit/RecommendedPanel.tsx` | 105 | TSX | Inline styles |
| 13 | `src/modules-dormant/wiki/WikiArticlePage.tsx` | 103 | TSX | Dormant — deprioritise |
| 14 | `src/styles/dept-intelligence.css` | 99 | CSS | `--file` flag |
| 15 | `src/styles/allwork.css` | 96 | CSS | `--file` flag |
| 16 | `src/styles/budget-module.css` | 94 | CSS | `--file` flag |
| 17 | `src/components/caty-ai/CatyOverrides.css` | 89 | CSS | `--file` flag |
| 18 | `src/styles/users-module.css` | 88 | CSS | `--file` flag |
| 19 | `src/components/reqAssist/RAJiraSidePanel.tsx` | 88 | TSX | Inline styles |
| 20 | `src/modules/task10/styles/task10-v2.css` | 88 | CSS | `--file` flag |

---

## Category A: Pure CSS Files (Auto-fixable)

All `.css` and `.module.css` files with no HSL violations — run fixer directly.

```bash
# Verify before running:
python3 fix-root-css.sh --dry-run --file <path>

# Apply:
python3 fix-root-css.sh --file <path>

# Verify after:
node design-governance/rules/audit.js <path>
```

**CSS files from top 20:**
- `task10.css` (215 violations — 194 hex, 21 rgba)
- `Timeline.module.css` (207 — 88 hex, 119 rgba)
- `r360-member.css` (174 — 134 hex, 40 rgba)
- `story-detail-extensions.css` (128 — 85 hex, 43 rgba)
- `dept-intelligence.css` (99 — 76 hex, 23 rgba)
- `allwork.css` (96 — 76 hex, 20 rgba)
- `budget-module.css` (94 — 56 hex, 38 rgba)
- `CatyOverrides.css` (89 — 77 hex, 12 rgba)
- `users-module.css` (88 — 54 hex, 34 rgba)
- `task10-v2.css` (88 — 26 hex, 62 rgba)

---

## Category B: HSL-heavy Files (Semi-manual)

`FeatureViewPage.module.css` (155 HSL violations) and `RoadmapEngine.tsx` (105 HSL) have many `hsl(...)` complete-value violations.

### HSL complete values — mapping table

```
hsl(0, 0%, 100%)       → var(--ds-surface, #FFFFFF)
hsl(0, 0%, 98%)        → var(--ds-surface-sunken, #F7F8F9)
hsl(0, 0%, 96%)        → var(--ds-background-neutral-subtle, #F7F8F9)
hsl(220, 9%, 46%)      → var(--ds-text-subtlest, #626F86)
hsl(215, 16%, 47%)     → var(--ds-text-subtle, #44546F)
hsl(222, 47%, 11%)     → var(--ds-text, #172B4D)
hsl(219, 71%, 47%)     → var(--ds-link, #2563eb)
hsl(0, 84%, 60%)       → var(--ds-background-danger-bold, #ef4444)
hsl(142, 71%, 45%)     → var(--ds-background-success-bold, #1F845A)
hsl(38, 92%, 50%)      → var(--ds-background-warning-bold, #E2B203)
hsl(220, 14%, 96%)     → var(--ds-surface-sunken, #F7F8F9)
hsl(220, 14%, 91%)     → var(--ds-border, #DFE1E6)
```

**Semi-automated approach:**

```bash
# For FeatureViewPage.module.css — convert complete HSL to nearest ADS token
# Run audit to see exact HSL values on each line:
node design-governance/rules/audit.js src/pages/project/FeatureViewPage.module.css 2>&1 | grep HARDCODED_HSL

# Then search-replace per value:
# sed -i '' 's/hsl(0, 0%, 100%)/var(--ds-surface, #FFFFFF)/g' src/pages/project/FeatureViewPage.module.css
```

**NOTE:** `hsl(var(--primary))` is NOT a violation — it's already using a CSS variable. Scanner falsely flags it.  
Only `hsl(n, n%, n%)` complete values are violations.

---

## Category C: TSX Inline Styles

For React inline styles, hex values are JS strings: `backgroundColor: '#fff'`.

The fixer handles these because it replaces `#fff` → `var(--ds-surface, #FFFFFF)` regardless of CSS or JS context. The resulting `'var(--ds-surface, #FFFFFF)'` is valid React inline style.

**Run fixer on TSX files:**

```bash
python3 fix-root-css.sh --file src/pages/dev/EvidenceToExecutionFull.tsx
python3 fix-root-css.sh --file src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
python3 fix-root-css.sh --file src/pages/admin/components/ComponentsAdminPage.tsx
python3 fix-root-css.sh --file src/components/filters/CanonicalFilter.tsx
python3 fix-root-css.sh --file src/components/for-you/atlaskit/RecommendedPanel.tsx
python3 fix-root-css.sh --file src/components/reqAssist/RAJiraSidePanel.tsx
```

**Post-fix TypeScript check (catch any broken string literals):**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

**TSX-specific patterns that need manual fix (fixer misses these):**

```tsx
// Pattern: ternary with hex → fix manually
backgroundColor: isActive ? '#0C66E4' : '#DFE1E6'
// →
backgroundColor: isActive ? 'var(--ds-link, #0C66E4)' : 'var(--ds-border, #DFE1E6)'

// Pattern: template literal
const style = `color: #172B4D; background: #F7F8F9;`
// → (fixer handles this)
const style = `color: var(--ds-text, #172B4D); background: var(--ds-surface-sunken, #F7F8F9);`

// Pattern: JS object spread (fixer handles)
const styles = { color: '#172B4D' }
```

---

## Category D: `src/theme/tokens.ts` (138 violations)

This file defines Catalyst's design token layer. It has 75 HSL + 49 hex + 14 rgba violations.

**Special handling required** — this is a token DEFINITION file, not a usage file. Each value here ripples to many consumers. Fix strategy:

1. For hex/rgba values: run fixer (`python3 fix-root-css.sh --file src/theme/tokens.ts`)
2. For HSL values: replace with ADS token equivalents where possible, or `/* ads-scanner:ignore */` comment for intentional Tailwind HSL triplets
3. After: run audit to verify 0 violations

**HSL in tokens.ts are likely Tailwind component tokens:**
```ts
// Pattern (Tailwind compat format):
const tokens = {
  background: 'hsl(0 0% 100%)',    // ← violation
  foreground: 'hsl(222 47% 11%)',  // ← violation
}
// Fix:
const tokens = {
  background: 'var(--ds-surface, #FFFFFF)',
  foreground: 'var(--ds-text, #172B4D)',
}
```

---

## Batch Fix Script — All CSS Components

```bash
#!/bin/bash
# Run this to fix all pure-CSS component files
set -e
ROOT=$(git rev-parse --show-toplevel)

CSS_FILES=(
  "src/modules/task10/styles/task10.css"
  "src/components/capacity/timeline/Timeline.module.css"
  "src/components/resource360/r360-member.css"
  "src/modules/project-work-hub/components/dialogs/story-detail-extensions.css"
  "src/styles/dept-intelligence.css"
  "src/styles/allwork.css"
  "src/styles/budget-module.css"
  "src/components/caty-ai/CatyOverrides.css"
  "src/styles/users-module.css"
  "src/modules/task10/styles/task10-v2.css"
  "src/components/capacity-planner/capacity-planner-gantt.css"
  "src/styles/caty.css"
  "src/styles/capacity-module.css"
)

for f in "${CSS_FILES[@]}"; do
  echo "Fixing $f..."
  python3 "$ROOT/fix-root-css.sh" --file "$ROOT/$f"
done

echo ""
echo "Running audit on fixed files..."
for f in "${CSS_FILES[@]}"; do
  node "$ROOT/design-governance/rules/audit.js" "$ROOT/$f" 2>&1 | tail -3
done
```

---

## Estimated Impact After Top-20 Fix

| Phase | Files | Violations | After Fix |
|-------|-------|-----------|-----------|
| Phase 1 (done) | index.css + catalyst-colors.css | ~1,438 | ~14 spacing only |
| Phase 2 CSS batch | ~11 CSS files | ~1,200 | ~0 |
| Phase 2 TSX batch | ~9 TSX files | ~1,100 | ~50 (HSL + manual) |
| Phase 2 tokens.ts | tokens.ts | 138 | ~20 (HSL) |
| **Remaining** | ~490 files | ~14,900 | ~14,900 |

**To reach <500 total:** Need to fix ~14,400 more violations in the remaining ~490 files. Run `node design-governance/rules/audit.js src/` after each batch to track progress.

---

## Quick Wins — 4 More CSS Files for Immediate Impact

```bash
# These are imported by index.css — fixing them gets picked up automatically
python3 fix-root-css.sh --file src/styles/caty.css
python3 fix-root-css.sh --file src/styles/capacity-module.css
python3 fix-root-css.sh --file src/styles/budget-module.css
python3 fix-root-css.sh --file src/styles/users-module.css
python3 fix-root-css.sh --file src/styles/allwork.css
```

---

## Verification After Each File

```bash
# Check violation count
node design-governance/rules/audit.js <path> 2>&1 | grep 'violations\|PASS\|FAIL'

# TypeScript still compiles
npx tsc --noEmit 2>&1 | grep -v node_modules | grep error | head -10

# Dev server still starts (spot-check)
# curl http://localhost:8080 -s -o /dev/null -w '%{http_code}'
```

---

## Scanner Suppressions (Last Resort)

For intentional non-ADS colors (preview gallery hex samples, color picker demos):

```css
/* ads-scanner:ignore-next-line */
background: #FF0000; /* intentional red for color picker preview */
```

Support for `// ads-scanner:ignore-next-line` in TSX:

```tsx
{/* ads-scanner:ignore-next-line */}
const previewColor = '#FF0000'; // color picker preview — intentional
```

**Use sparingly.** Each suppression is permanent documentation that the value is intentional.
