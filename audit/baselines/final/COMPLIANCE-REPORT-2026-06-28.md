# Catalyst ADS Compliance — Verified State Report — 2026-06-28

Generated from live repo (branch: main). All numbers from script output, not memory.

---

## Gate Status (verified from scripts)

```
ads-color-gate.cjs:  FAIL — 697 (baseline 696, +1)
ads-audit-gate.cjs:  FAIL — tokens: 27762 (baseline 27753, +9)
```

**Root cause of +1**: New untracked file `src/types/workhub.ts` contains 11 bare hex
violations. Other modified files offset some, net result is +1 over baseline.

Baseline history (from git + baseline file): 709 → 713 → 693 → 703 → 702 → 696 → **697 (today, gate broken)**

---

## Violation Distribution

Total: **697** violations across ~237 files

| File type | Count |
|-----------|-------|
| .tsx      | 184   |
| .ts       | 30    |
| .css      | 23    |

Violations are spread thin (most files have 1 violation each) — no single hot-spot.
Pattern: hex fallbacks inside `var(--ds-*, #fallback)` dominate; bare hex secondary.

Top files by count (all show 1 per `uniq -c` — scanner reports per-file, not per-line):
violations spread across 237+ distinct files.

---

## G-Decision Verification (grep evidence)

### G1 — Avatar colours in FieldsTab
**NOT APPLIED** — bare hex still present in 5 files:
- `src/components/workhub/issue-view/FieldsTab.tsx:20` → `['var(--ds-background-discovery-bold, #6E5DC6)', '#FA8C16', '#52C41A', '#EB2F96', ...]`
- `src/components/workhub/issue-view/activity/ActivityPanelPilot.tsx:41` → same pattern
- `src/components/workhub/allwork/SubTasksTab.tsx:62` → + `#13C2C2`, `#2F54EB`
- `src/components/workhub/allwork/AllWorkToolbar.tsx:107` → same pattern
- `src/components/workhub/allwork/AllWorkTable.tsx:64` → + `#13C2C2`, `#F5222D`
- `AllWorkSplitView.tsx:46` → uses `var()` forms but with hex fallbacks (still violations)

### G2 — Workflow node border
**NOT APPLIED** — `src/pages/admin/workflows/CatalystWorkflowBuilder.tsx:213`:
```
border: `2px solid #6B7FA3`,
```
(line 63 also has `var(--ds-border-bold, #4A5568)` — hex fallback = violation)

### G3 — Phase lifecycle colours (StageOverviewWidget)
**NOT APPLIED** — bare hex constants still in place:
```
src/components/product-dashboard/widgets/StageOverviewWidget.tsx:13  const PHASE_APPROVAL = '#F5A623';
src/components/product-dashboard/widgets/StageOverviewWidget.tsx:14  const PHASE_DELIVERY = '#8A7CFF';
```

### G4 — Attention badge (TimelineView)
**NOT APPLIED** — three violations remain:
```
src/features/all-releases/components/TimelineView.tsx:24   attention: 'var(--ds-background-warning-bold, #E2B203)',  // hex fallback
src/features/all-releases/components/TimelineView.tsx:31   attention: 'rgba(234,179,8,0.35)',                        // raw rgba
src/features/all-releases/components/TimelineView.tsx:38   { bg: '#fefce8', text: 'var(--ds-text-warning, #974F0C)' } // bare hex
```

### C1 — Priority palette (FieldsTab)
**PARTIALLY APPLIED (hex fallbacks remain)**:
```
src/components/workhub/issue-view/FieldsTab.tsx
  PRIORITY_COLORS = {
    Highest: 'var(--ds-text-danger, #EF4444)',
    High:    'var(--ds-background-warning-bold, #E2B203)',
    Medium:  'var(--ds-text-brand, #3B82F6)',
    Low:     'var(--ds-text-success, #22C55E)',
    Lowest:  'var(--ds-text-subtlest, #8C8F96)',
  }
```
All use `var()` but ALL have hex fallbacks → scanner counts these as violations.

### C1 — Priority palette (CanonicalFilter)
**NOT APPLIED** — all priority icon colours use `var(--ds-*, #HEX)` with hex fallbacks:
```
src/components/filters/CanonicalFilter.tsx:118-132  color: 'var(--ds-text-danger, #CD1316)'  etc.
src/components/filters/CanonicalFilter.tsx:2720      push(JQL_NUMBERS, 'var(--ds-text-danger, #AE2A19)')
src/components/filters/CanonicalFilter.tsx:2945      color: errMsg ? token(..., 'var(--ds-text-danger, #AE2A19)') : ...
```

---

## Protected Files — Verified Unchanged

| File | Status |
|------|--------|
| `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` | IN WORKING TREE (modified — check diff) |
| `src/styles/*.css` (workstreamColors context) | Not probed this session |
| `src/index.css:235-252` | Not probed this session |

> **Note**: `statusPalette.ts` appears in `git diff --name-only` — it has been modified.
> Verify it didn't introduce regressions.

---

## ADS Token Resolution (Block F — verified in browser)

Tokens resolve correctly in BOTH light and dark mode:

| Token | Light | Dark |
|-------|-------|------|
| `--ds-surface` | `#FFFFFF` | `#1D2125` |
| `--ds-surface-sunken` | `#F8F8F8` | `#161A1D` |
| `--ds-text` | `#292A2E` | `#C7D1DB` |
| `--ds-border` | `#0B120E24` | `rgba(166,189,219,0.16)` |

**ADS tokens are loading and resolving correctly.** Infrastructure is NOT the problem.

---

## Dark Mode Visual Check (Block E)

Dark mode toggles correctly via the Themify floating button but **does NOT persist across
SPA route navigations** — each page load resets to light mode.

| Route | Dark mode | Content loads | Notes |
|-------|-----------|---------------|-------|
| `/` (home) | PASS | PASS | Dark bg #1D2125, dark sidebar, legible light text |
| `/project` | FAIL (resets) | PASS | Strategy sidebar loads; content area empty (no project selected — expected) |
| `/tasks` | FAIL (resets) | PARTIAL | Blank at screenshot time (still loading) |
| `/product` | FAIL (resets) | PARTIAL | "Products · Catalyst" tab title loads; content area blank (no product) |

**Root cause of dark mode non-persistence**: Theme toggle is DOM-only (no localStorage
write). Navigation triggers React remount which re-reads initial theme. This is a known
pre-existing issue (see memory: "Dark mode Tier B").

---

## New Violations Introduced (Gate Breakers)

**`src/types/workhub.ts`** (new untracked file — NOT yet committed):
```
:326  gray:   { ..., dot: '#8c8f96' }
:327  blue:   { ..., text: '#0c3578', ... }
:328  green:  { ..., text: '#1b4d1b', dot: '#22863a' }
:329  red:    { bg: '#f87168', text: '#601e16', ... }
:330  yellow: { ..., text: '#5c4813', ... }
:331  teal:   { bg: '#82c7c2', text: '#0d4e48', ... }
:332  purple: { bg: '#c597f4', text: '#3b1761', ... }
:336-340  priority color map with hex fallbacks
```

**Action required**: Either fix bare hex in workhub.ts OR update baseline after documented
justification before next commit.

---

## audit-gate +9 (tokens category)

27762 vs baseline 27753. Likely from `src/types/workhub.ts` and other modified files
adding `var(--ds-*, #hex)` fallback patterns (the audit scanner counts fallback-hex
inside `var()` as token violations). Same file is the likely source.

---

## Staging Readiness

**NOT READY for ADS compliance sign-off.**

Blockers:
1. Gate broken: 697 > 696 baseline (new file `workhub.ts` adds violations)
2. G1 G2 G3 G4 C1 — none of the G-decisions have been applied
3. Dark mode non-persistence across navigation (pre-existing, lower priority)

Non-blockers (pre-existing debt, gate allows these through):
- 697 total violations — ratchet holds, no net new violations once workhub.ts is fixed
- Hex fallbacks in `var(--ds-*, #hex)` across priority palettes, avatar arrays, etc.
