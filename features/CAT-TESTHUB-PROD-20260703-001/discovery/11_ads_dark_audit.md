# R4+R5 — ADS Token & Dark-Mode Audit (TestHub scope)

Feature: CAT-TESTHUB-PROD-20260703-001 · Discovery agent output · 2026-07-03
Scope: `src/pages/testhub/` (30 files), `src/components/testhub/` (35), `src/components/test-plans/` (12), `src/components/test-cycles/` (36), `src/features/test-cycles/` (11), `src/styles/testhub.css` (1861 lines), `src/components/catalyst-detail-views/test-case/`, `.../test-cycle/`.

## 0. Headline numbers (command evidence)

| Probe | Command (scoped to paths above) | Count |
|---|---|---|
| Bare hex `#RRGGBB` | `grep -E "#[0-9a-fA-F]{3,8}\b"` | **0** ✅ |
| Raw `rgba()/hsl()` incl. var-fallbacks | CLAUDE.md grep | **46** |
| — of which `var(--ds-*, rgba(...))` fallbacks | `grep -E "var\(--ds-[a-z-]+,\s*rgba?\("` | 39 |
| — of which raw `rgba()` NOT inside var() | manual triage | 3 (`testhub.css:771,772,1539`) |
| — of which `hsl(var(--shadcn))` | CoverageRing.tsx | 4 |
| `var(--ds-*, #hex)` fallbacks | `grep -E "var\(--ds-[a-z-]+,\s*#"` | **0** ✅ |
| Tailwind color utilities | CLAUDE.md tailwind grep | **95** |
| `npm run lint:colors` | full run | **0 violations** ("Design system is clean") |
| `catalyst-detail-views/test-case`, `test-cycle` | all greps | **0** ✅ clean |

**Why lint:colors passes while 141 patterns exist:** `scripts/no-hardcoded-colors.cjs:53-66` runs in "fallback-pragmatic mode" — it explicitly ALLOWS `var(--ds-token, rgba(...))` fallbacks and `hsl(var(...))`, and it does not scan Tailwind color utilities at all (that's `npm run audit:ads`'s job). So the ratchet gate is blind to the two biggest problem classes in TestHub. The scanner's own comment (line 54) contradicts CLAUDE.md's "no fallback" law.

## 1. Tailwind color utilities — 95 hits (all banned by CLAUDE.md)

### 1a. `AddTestCasesToCycleDialog/` — 49 hits, ZERO `dark:` variants (worst offender)

`grep -c "dark:"` on index.tsx, utils.ts → 0. Entire dialog is a hand-painted light-only surface.

| file:line | pattern | ADS fix |
|---|---|---|
| `src/components/test-cycles/AddTestCasesToCycleDialog/index.tsx:111,118,138,151,197` | `border-slate-200`, `bg-slate-50` | `var(--ds-border)`, `var(--ds-surface-sunken)` |
| `index.tsx:117,150` | `bg-white` panels | `var(--ds-surface-raised)` |
| `index.tsx:120,121,125,154,158,164-167,173-183` | `text-slate-{300..700}` | `var(--ds-text)` / `var(--ds-text-subtle)` / `var(--ds-text-subtlest)`, icons `var(--ds-icon-subtle)` |
| `index.tsx:153` | `text-teal-600` | `var(--ds-icon-success)` |
| `index.tsx:175,183` | `text-red-500 hover:text-red-700` | `var(--ds-text-danger)` or `<Button appearance="danger">` |
| `utils.ts:94-119` | color-constant maps returning `bg-red-100 text-red-700 border-red-200` etc. | replace with `@atlaskit/lozenge` appearance mapping (`removed`/`moved`/`default`/`inprogress`) — delete the map |
| `FolderTree.tsx:71,79,86,88,91,156-158,180-183` | slate/blue palette | tokens as above; folder icon `var(--ds-icon)` |
| `TestCaseRow.tsx:39-68` | `hover:bg-blue-50`, `bg-blue-50` selected, slate text | `var(--ds-background-selected)` selected, `var(--ds-background-neutral-subtle-hovered)` hover |
| `SelectionSummary.tsx:31-43` | `bg-slate-50`, `text-slate-900`, `text-red-600 hover:bg-red-50` | `var(--ds-surface-sunken)`, `var(--ds-text)`, danger Button |
| `FilterBar.tsx:100,145,186,205` | `hover:bg-slate-50`, `text-slate-500` | `var(--ds-background-neutral-subtle-hovered)`, `var(--ds-text-subtle)` |

### 1b. Calendar suite (`components/test-cycles/calendar/`) — hardcoded `bg-white`, ZERO `dark:` variants

| file:line | pattern | ADS fix |
|---|---|---|
| `CycleCalendarView.tsx:70,88` | `bg-white` root containers | `var(--ds-surface)` |
| `DayView.tsx:53`, `MonthView.tsx:38`, `WeekView.tsx:37` | `bg-white` | `var(--ds-surface)` |
| `CalendarHeader.tsx:41` | `bg-white` header bar | `var(--ds-surface)` |
| `CalendarHeader.tsx:65,90-91` | `text-white`, `hover:bg-white` on segmented control | `@atlaskit/button` selected state / `var(--ds-background-selected)` |
| `CalendarDayCell.tsx:54` | `text-white` on brand pill | `var(--ds-text-inverse)` |
| `DayDetailPanel.tsx:59` | `bg-white shadow-xl` fixed right panel — textbook white-pill+shadow light metaphor | `var(--ds-surface-overlay)` + `box-shadow: var(--ds-shadow-overlay)` |
| `DayDetailPanel.tsx:186`, `RescheduleModal.tsx:194` | `text-white` on brand CTA | `<Button appearance="primary">` owns color |

### 1c. `components/testhub/versioning/VersionDiffView.tsx` — 8 hits (HAS dark: variants, still banned utils)

| line | pattern | ADS fix |
|---|---|---|
| 41,76 | `border-amber-300 bg-amber-50/50 dark:...` changed-block | `var(--ds-background-warning)` + `var(--ds-border-warning)` — one token, both themes |
| 47,75 | `bg-red-50 ... border-red-200 dark:...` removed | `var(--ds-background-danger)` + `var(--ds-border-danger)` |
| 50,74 | `bg-green-50 ... border-green-200 dark:...` added | `var(--ds-background-success)` + `var(--ds-border-success)` |
| 179,182 | `text-red-600 dark:text-red-400`, `text-green-600 dark:...` | `var(--ds-text-danger)`, `var(--ds-text-success)` |

### 1d. `components/testhub/AIGenerateTestCasesDialog.tsx` — 10 hits incl. banned gradients

| line | pattern | ADS fix |
|---|---|---|
| 186,330,387,583 | `bg-gradient-to-r from-blue-600 to-blue-500 hover:...` gradient CTAs | Gradient CTAs are banned outside `AIIntelligenceButton`/`CatyRainbowCTA`. Use `AIIntelligenceButton` (this IS an AI control) or `<Button appearance="primary">` |
| 187 | `text-white` on gradient chip | component-owned |
| 354 | `text-blue-500` sparkle | `var(--ds-icon-information)` |
| 389,390,530 | `bg-green-100 dark:bg-green-900/30`, `text-green-600 dark:text-green-400` | `var(--ds-background-success)`, `var(--ds-text-success)` / `var(--ds-icon-success)` |
| 447 | `border-gray-300` checkbox | `@atlaskit/checkbox` |

### 1e. `components/test-cycles/assignment-table/` — 8 hits

| file:line | pattern | ADS fix |
|---|---|---|
| `AssignmentRow.tsx:78` | zebra `bg-slate-50/50` | `var(--ds-surface-sunken)` |
| `AssignmentRow.tsx:245` | `text-red-600` menu item | `@atlaskit/dropdown-menu` danger item / `var(--ds-text-danger)` |
| `AssignmentTableView.tsx:207` | `hover:bg-slate-100` sortable header | `var(--ds-background-neutral-subtle-hovered)` |
| `BulkActionsBar.tsx:54,64,69,94,208` | `bg-white/20`, `text-white`, `bg-red-500/20` on floating bar | rebuild on `var(--ds-surface-overlay)`+tokens or ADS pattern; danger = `var(--ds-background-danger)` |
| `TableToolbar.tsx:155`, `ColumnCustomizer.tsx:72`, `DatePickerCell.tsx:49` | `hover:bg-slate-100/50`, `hover:text-red-500` | hovered token, `var(--ds-icon-danger)` |

### 1f. `notifications/NotificationItem.tsx:22-26` — color-constant map (doubly banned)

`{ icon: 'text-teal-600', bg: 'bg-teal-50' }` etc., no dark variants → replace map values with token pairs: success `var(--ds-icon-success)`/`var(--ds-background-success)`, warning, information equivalents.

### 1g. `features/test-cycles/components/` — 7 hits

| file:line | pattern | ADS fix |
|---|---|---|
| `CycleConfigPanel.tsx:93` | `text-emerald-600` stat | `var(--ds-text-success)` |
| `CycleTimeline.tsx:130-146` | `bg-emerald-500`, `bg-amber-500`, `text-white` milestone dots | `var(--ds-background-success-bold)`+`var(--ds-text-inverse)`, warning-bold equivalents; or `@atlaskit/progress-tracker` |
| `MilestoneEditor.tsx:121,133` | `bg-emerald-50 border-emerald-200 dark:...`, `text-emerald-600` | `var(--ds-background-success)`, `var(--ds-border-success)`, `var(--ds-icon-success)` |

## 2. rgba() fallbacks & raw rgba — 42 hits

### 2a. SEMANTIC TOKEN MISUSE — `--ds-shadow-raised` used as a COLOR (functional bug, 10 sites)

ADS `--ds-shadow-raised` resolves to a full multi-part shadow string (`0 1px 1px #..., 0 0 1px #...`), not a color. Where it's interpolated as a color, the declaration becomes invalid at computed-value time and the scrim/shadow silently disappears; today these surfaces only work because the rgba fallback fires when the token is present-but-unusable is NOT the case — if the token IS defined the property is invalid. Verify live; either way it is the wrong token.

| file:line | usage | fix |
|---|---|---|
| `src/pages/testhub/cycles/CycleDetailPage.tsx:638` | `background: var(--ds-shadow-raised, rgba(9,30,66,0.25))` blanket | `@atlaskit/blanket` or `var(--ds-blanket)` |
| `CycleDetailPage.tsx:642` | `boxShadow: -4px 0 24px var(--ds-shadow-raised, ...)` | `box-shadow: var(--ds-shadow-overlay)` (full value, not color) |
| `src/pages/testhub/repository/CaseDrawer.tsx:182` | same boxShadow pattern | `var(--ds-shadow-overlay)` |
| `src/pages/testhub/sets/SetDetailPage.tsx:155` | blanket background | `var(--ds-blanket)` |
| `SetDetailPage.tsx:166,324` | boxShadow color | `var(--ds-shadow-overlay)` |
| `src/pages/testhub/sets/TestSetsPage.tsx:193` | boxShadow color | `var(--ds-shadow-overlay)` |
| `src/styles/testhub.css:930` | `background: var(--ds-shadow-raised, rgba(0,0,0,0.4))` modal blanket | `var(--ds-blanket)` |
| `testhub.css:949,1591` | `box-shadow: 0 20px 60px var(--ds-shadow-raised, ...)` | `var(--ds-shadow-overlay)` |

### 2b. Background token misused as shadow/box-shadow color

`--ds-background-information` is a subtle blue FILL, not a shadow color — focus rings/shadows go blue-tinted-wrong in dark:

- `testhub.css:65,75` — card hover `box-shadow: ... var(--ds-background-information, rgba(37,99,235,.18))` → `box-shadow: var(--ds-shadow-raised)` (full value)
- `testhub.css:473,871,890,910,1183` — focus ring `0 0 0 3px var(--ds-background-information, ...)` → `0 0 0 2px var(--ds-border-focused)`
- `TestSetsPage.tsx:328` — `boxShadow: 0 4px 12px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))` → `var(--ds-shadow-raised)`

### 2c. BOLD background tokens under normal-contrast text — badge unreadability (both themes)

`--ds-background-*-bold` are SOLID saturated fills meant for `--ds-text-inverse`. When tokens resolve, these badges render green-on-green / blue-on-blue (same defect class as the ON HOLD pill fixed in 677b167fb):

| file:line | pattern | fix |
|---|---|---|
| `testhub.css:766,774` | `.th-badge-approved/.th-badge-automated` bg `var(--ds-background-success-bold, rgba(16,185,129,.1))` + green text | `background: var(--ds-background-success); color: var(--ds-text-success)` — or replace all `.th-badge-*` with `@atlaskit/lozenge` |
| `testhub.css:769,1537` | `.th-badge-regression` bg discovery-bold + purple text (also `color: var(--cp-purple-60,...)` = bg token as text) | `var(--ds-background-discovery)` + `var(--ds-text-discovery)` |
| `testhub.css:772` | `.th-badge-performance` raw `rgba(215,119,6,.1)` bg + `color: var(--ds-background-warning-bold)` (bg token as TEXT) | `var(--ds-background-warning)` + `var(--ds-text-warning)` |
| `testhub.css:771,1539` | `.th-badge-integration` raw `rgba(6,182,212,.1)` — no token at all; note `var(--ds-link, var(--ds-link))` self-referential fallback | `var(--ds-background-information)` + `var(--ds-text-information)` |
| `testhub.css:1533,1543` | dark overrides use `--ds-background-information-bold` + `--cp-blue` text → solid-blue-on-blue in dark | subtle bg + text token; delete override once base is token-correct |

### 2d. Legitimate-token-wrong-law fallbacks (mechanical cleanup)

`testhub.css:264,268,765,775,1256,1460,1461,1469,1476` and `TestSetsPage.tsx:198,204,210,447` use correct-ish tokens (`--ds-background-information`, `--ds-background-danger`, `--ds-background-neutral-subtle-hovered`) but carry rgba fallbacks banned by CLAUDE.md ("token-only, no fallback"). Fix = strip the fallback. Note `1460/1461/1469` use `--ds-background-information` as a BORDER color → `var(--ds-border-information)`... UNKNOWN if that token exists in this ADS version; if not, `var(--ds-border-brand)`.

### 2e. shadcn tokens in `CoverageRing.tsx:38-40,56`

`hsl(var(--success))`, `hsl(var(--warning))`, `hsl(var(--destructive))`, `hsl(var(--border))` — shadcn palette, not ADS. Also a threshold color-map (banned pattern). Fix: `var(--ds-icon-success)`, `var(--ds-icon-warning)` (UNKNOWN if defined — else text-warning), `var(--ds-icon-danger)`, `var(--ds-border)`. Dark behavior depends on whether index.css flips `--success` in `.dark` — UNKNOWN, verify.

## 3. `--cp-*` bridge palette — heavy but sanctioned-ish

~450 usages across scope (top: `--cp-bg-sunken` ×81, `--cp-bg-elevated` ×69, `--cp-workstream-catalyst-primary` ×39, `--cp-ink-1/2/3` ×77). These are defined in `src/styles/theme-tokens.css` (light block line 33, dark block line 131) as aliases of `--ds-*` tokens, so they are theme-aware — BUT `src/styles/catalyst-ads-parity.css:188` defines `--cp-bg-sunken: #161A1D` (bare hex) meaning cascade order decides which wins. Recommendation for the revamp: migrate TestHub `--cp-*` → direct `--ds-*` (mechanical, the mapping already exists in theme-tokens.css).

## 4. testhub.css dual-theme maintenance debt

`testhub.css:1318-1861` (~540 lines) is a hand-written `.dark , [data-theme="dark"]` override block re-theming the whole module. This exists only because the base rules use fallback-laden/wrong tokens. Every new class needs a twin dark rule or it ships light-metaphor into dark (the exact trap in memory `dark-mode-light-metaphor-trap`). Token-only base rules would let most of this block be deleted.

## 5. Dark-mode risk list (ranked)

1. **P0 — AddTestCasesToCycleDialog (6 files, 49 utils, zero `dark:`)**: solid white dialog, slate borders, near-black text → white-glare unreadable panel in dark mode.
2. **P0 — Calendar suite `bg-white` roots (6 files, zero `dark:`)**: entire calendar surface stays white in dark; `DayDetailPanel.tsx:59` is white-pill+shadow-xl light metaphor.
3. **P0 — `.th-badge-*` bold-bg + colored-text combos** (`testhub.css:765-775,1533-1543`): green-on-green / blue-on-blue whenever ADS tokens resolve; dark overrides make it worse (information-bold solid blue).
4. **P1 — `--ds-shadow-raised` as color (10 sites)**: drawers/modal scrims may render with NO blanket and NO shadow when the token resolves to a shadow list — floating white panels in dark with no elevation cue.
5. **P1 — Focus rings from `--ds-background-information`** (5 sites): focus indication nearly invisible in dark (subtle dark-blue fill as ring).
6. **P1 — assignment-table zebra `bg-slate-50/50` + `hover:bg-slate-100`**: light rows/hover in dark table.
7. **P2 — NotificationItem `-50`-shade bg map**: pastel chips glare in dark.
8. **P2 — BulkActionsBar `bg-white/20 text-white`**: legibility depends on unverified host-bar color per theme.
9. **P2 — CoverageRing shadcn `--success/--warning/--destructive`**: dark values UNKNOWN — verify or migrate.
10. **P2 — VersionDiffView / MilestoneEditor / AIGenerate dialog**: have `dark:` twins so functional in dark, but banned utils; migrating to single semantic tokens removes 30+ class pairs.
11. **P2 — Gate blindness**: `lint:colors` and its ratchet pass this entire debt (fallback-pragmatic mode + no Tailwind scan); only `audit:ads` sees the 95 Tailwind hits, ratcheted at current baseline — new TestHub work can silently add same-class debt within baseline noise.

## 6. Clean areas (evidence of zero hits)

- `src/components/catalyst-detail-views/test-case/`, `.../test-cycle/` — 0 hits on every probe.
- No bare hex anywhere in scope; no `var(--ds-*, #hex)` fallbacks.
- `src/pages/testhub/` TSX is Tailwind-color-free (inline styles use tokens, albeit with rgba fallbacks and the shadow-raised misuse).
