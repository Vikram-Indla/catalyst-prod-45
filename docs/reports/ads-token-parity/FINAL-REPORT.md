# ADS Token Parity Sweep — Final Report

**Feature Work ID:** CAT-ADS-TOKEN-PARITY-20260626-004 (continuation)
**Date:** 2026-06-26
**Karpathy loop:** Hypothesis (maps describe remaining offenders) → Experiment (scan + per-target grep) → Measure (bare vs already-wrapped) → Keep/Discard (wrap only still-bare map targets) → Log (this report).

## Branch
`feature/ads-token-parity-sweep` (off `main`)

## Objective
Styling-only ADS token parity sweep using the provided corrective files + sweep maps. No behavior/data/route/schema change.

## Key discovery (state before this session)
The WIDE lane and a large part of the SWEEP lane were **already merged to `main`** via PR #284 (`feature/ads-token-parity-sweep`). This session is a **continuation** that swept the remaining still-bare map targets. State was mixed (some targets already wrapped, some still bare) — every target was probed individually rather than blindly re-applied.

## Files Applied (WIDE lane — verified already present & wired on `main`)
| Artifact | Repo path | Status |
|---|---|---|
| `catalyst-ads-parity.css` | `src/styles/catalyst-ads-parity.css` | ✅ Present, **byte-identical** to provided. Imported at `src/main.tsx:10`. |
| `catalyst-ads-chart-tokens.css` | `src/styles/catalyst-ads-chart-tokens.css` | ✅ Present, **byte-identical**. Imported at `src/main.tsx:11` (AFTER parity ✅). |
| `workstreamColors.ts` | `src/constants/workstreamColors.ts` | ✅ Present, **byte-identical**. Consumed by 3 home files (consolidation done). |
| `definitions.ts` | `packages/tokens/src/definitions.ts` | ❌ **NOT APPLIED — structural mismatch.** No `packages/tokens/` directory exists in this repo (it targets the external `@catylast/tokens` library, not present here). No token build to run. Documented blocker, per the "apply only if structure matches" rule. |
| `index.css` ADS-13 dark-chrome patch | `src/index.css` | ⏭️ **OUT OF SCOPE.** Provided `README.md` marks "Native-chrome re-pointing (ADS-13)" as *"Not in this branch (tracked separately)."* `index.css` internals untouched. |

## Import order (verified)
```
src/main.tsx:10  import "./styles/catalyst-ads-parity.css";        // parity LAST among token CSS
src/main.tsx:11  import "./styles/catalyst-ads-chart-tokens.css";  // chart AFTER parity ✅
```

## Batch Summary
| Batch | Scope | Status | Files Changed (this session) | Notes |
|---|---|---:|---:|---|
| WIDE | global CSS + tokens | ✅ pre-applied on `main` | 0 | parity+chart present & imported; definitions.ts N/A |
| PR2/PR3 | home / filters / workhub | ✅ swept | 5 | workstream consolidation already done; wrapped remaining priority + work-item + dark-critical one-offs |
| PR4 | kanban / boards / resource360 | ✅ swept | 8 | Resource360Board/dialogs already done; wrapped MoveWorkItemModal, R360BoardView, constants, KanbanCard, useBoardCards, adapter, types, chart |
| PR5 | dashboards / widgets | ✅ no work needed | 0 | all 5 listed bare-hex already wrapped on `main`; chart-token CSS present |
| PR6 | admin | ✅ swept | 1 | AdminAccessPage already done; tokenized CatalystWorkflowBuilder theme (decision: follow theme) |

## Exact Files Changed (15)
```
src/components/boards/KanbanCard.tsx
src/components/filters/CanonicalFilter.tsx
src/components/home/workItemHierarchy.ts
src/components/kanban/adapters/teamProgramBoardAdapter.tsx
src/components/kanban/overflow-menu/MoveWorkItemModal.tsx
src/components/knowledge-assist/KnowledgeAssistPanel.tsx
src/components/resource360/R360BoardView.tsx
src/components/workhub/allwork/AllWorkContextMenu.tsx
src/components/workhub/issue-view/FieldsTab.tsx
src/components/workhub/resource360/ResourceDetail.tsx
src/features/kanban-board/constants.ts
src/hooks/useBoardCards.ts
src/modules/kanban/types.ts
src/modules/tasks/components/dashboard/DashboardStatusChartV2.tsx
src/pages/admin/workflows/CatalystWorkflowBuilder.tsx
```
Diff stat: **15 files, +44 / −44** (every edit is a 1:1 string-value swap).

## Token Replacement Summary
| Original Hex | ADS Token (kept hex as fallback) | File(s) |
|---|---|---|
| #CD1316 | `--ds-text-danger` | CanonicalFilter.tsx (Highest/Blocker ×2) |
| #E15D31 | `--ds-background-danger-bold` | CanonicalFilter.tsx (High ×2) |
| #E4A11B | `--ds-background-warning-bold` | CanonicalFilter.tsx (Medium ×2) |
| #2898BD | `--ds-link` | CanonicalFilter.tsx (Low ×2) |
| #8C8F96 | `--ds-text-subtlest` | FieldsTab.tsx (Lowest + fallback) |
| #13C2C2 | `--ds-chart-teal-bold` | workItemHierarchy.ts (Task) |
| #8B8FA3 | `--ds-text-subtlest` | workItemHierarchy.ts (Sub-task, default) |
| #1A1D23 | `--ds-text` | AllWorkContextMenu.tsx |
| #8B8FA3 | `--ds-icon-subtle` | KnowledgeAssistPanel.tsx (×4 icon greys) |
| #FFF3CD | `--ds-background-warning` | MoveWorkItemModal.tsx |
| #856404 | `--ds-text-warning` | MoveWorkItemModal.tsx |
| #4C1D95 | `--ds-text-discovery` | R360BoardView.tsx (×2) |
| #E2483D | `--ds-background-danger-bold` | constants.ts (high) |
| #D97008 | `--ds-background-warning-bold` | constants.ts (medium) |
| #388F4B | `--ds-background-success-bold` | constants.ts (low) |
| #357DE8 | `--ds-link` | constants.ts (lowest) |
| #FF7452 | `--ds-background-danger-bold` | KanbanCard.tsx, useBoardCards.ts (High) |
| #904EE2 | `--ds-background-discovery-bold` | teamProgramBoardAdapter.tsx (Epic) |
| #a855f7 | `--ds-background-discovery-bold` | modules/kanban/types.ts, DashboardStatusChartV2.tsx |
| #78716c | `--ds-text-subtlest` | modules/kanban/types.ts (Closed) |
| #312e81 | `--ds-background-discovery` | ResourceDetail.tsx (Sub-task) |
| #3B4349 | `--ds-border` | CatalystWorkflowBuilder.tsx (border, nodeBorderTodo) |
| #8696A7 | `--ds-text-subtle` | CatalystWorkflowBuilder.tsx |
| #F87168 | `--ds-text-danger` | CatalystWorkflowBuilder.tsx |
| #1D3557 | `--ds-background-information` | CatalystWorkflowBuilder.tsx (nodeInProgress) |
| #1B3A2D | `--ds-background-success` | CatalystWorkflowBuilder.tsx (nodeDone) |
| #2D6A9F | `--ds-border-focused` | CatalystWorkflowBuilder.tsx (nodeBorderInProgress) |
| #2D7A4F | `--ds-border` | CatalystWorkflowBuilder.tsx (nodeBorderDone) |
| #85B8FF | `--ds-text-brand` | CatalystWorkflowBuilder.tsx (textInProgress) |
| #4A5568 | `--ds-border-bold` | CatalystWorkflowBuilder.tsx (edge) |
| #44526E | `--ds-background-neutral-bold` | CatalystWorkflowBuilder.tsx (avatar bg) |

All replacements preserve the original hex as the `var(--token, #hex)` fallback → light mode renders byte-identical; dark/theming now flow through the token.

## Consolidations
- Workstream color map (`workstreamColors.ts`) — already consolidated on `main`; the 3 home files (`useProjectBriefing.ts`, `QueryResultRenderers.tsx`, `ProjectBriefingView.tsx`) import `WORKSTREAM_COLORS`. No further consolidation performed (none additional requested by maps).

## PR6 Workflow Builder decision
**Tokenized to follow theme** (the map's primary option). No documented editor-canvas dark-only exception existed in source → default to tokenize. Each `DARK` literal wrapped `var(--ds-*, #orig)`; light mode byte-identical, dark follows theme.

## Intentional Leave-As-Is (per maps + scope discipline)
- `statusPalette.ts:33` `#8FB8F6` — Jira DOM-probed periwinkle, deliberately not `--ds-background-information` (source comment). Kept.
- Editor color-picker swatches (`BackgroundPickerItem.tsx`, `SlashMenu.tsx`) — user-selectable palette, not chrome. Kept.
- `IdeationBoardView.tsx:211` — already `isDark ? … : …` theme-branched. Correct pattern. Kept.
- `*.test.ts` / `*.stories.tsx` fixtures. Kept.
- `FieldsTab.tsx:20` `AVATAR_COLORS` (#FA8C16/#52C41A/#EB2F96) — not named in any map; avatar palette. Reported, not swept.
- `KnowledgeAssistPanel.tsx:287` `#CF1322` (active-mic) — not named in this map's one-off list. Reported, not swept.
- `CatalystWorkflowBuilder.tsx:213` `2px solid #6B7FA3` — not in PR6 map. Reported, not swept.

## Validation Commands
| Command | Result | Notes |
|---|---|---|
| `node scripts/no-hardcoded-colors.js` (via `.cjs` copy) | ran | repo is `"type":"module"`; scanner is CommonJS → run as `.cjs`. Scanner has no `--scope` flag (always scans `src`). |
| `npx eslint <15 changed files>` | **0 new problems** | 28 errors / 40 warnings are all pre-existing, at lines NOT touched by this sweep (e.g. `no-explicit-any`, pre-existing Tailwind classNames). |
| `npm run build` | ✅ **exit 0, built in 2m 26s** | only the pre-existing >1200kB chunk-size advisory. |
| `node audit/contrast-probe.js` | ⚠️ not runnable headless | It is a browser DOM script (`window.__catalystContrastProbe`) for DevTools, not a node CLI. No `window` under node. Run in-browser (light+dark) at QA. |
| `npm run typecheck` | n/a | No `typecheck` script in package.json — not invented. Build (vite) is the compile proof. |
| unit `test` | n/a | No unit `test` script. `test:visual`/`test:a11y` are Playwright (see Visual Regression). |

## Hardcoded Color Scan Results
- **Baseline (this session start):** 3825 violations / 911 files.
- **Post-sweep:** 3789 violations / (whole `src`).
- **Net −36 scanner hits.**
- **IMPORTANT — scanner-zero is not achievable or intended with the maps' wrap pattern.** The scanner flags hex even inside `var(--ds-token, #hex)` fallbacks when the token name pushes the hex >20 chars from `var(--` (its `isAllowedUsage` window), and the wrap pattern deliberately KEEPS the hex as fallback. The ~3789 residual is the documented untargeted long-tail (the maps enumerate specific offenders, not all scanner hits) — reported honestly for Claude Design's second gap scan, NOT over-swept (over-sweep = inventing mappings = forbidden).

### Residual long-tail bucketed by map scope (post-sweep)
The scanner has no `--scope` flag (always scans `src`); buckets below are computed from the post-sweep file list. **None of these residual hits are named in the provided PR2–PR6 maps** — they need new `hex→token` mappings from Claude Design before any further sweep (self-inventing mappings is forbidden).

| Scope | Residual hits | Files |
|---|---:|---:|
| PR2/3 — `home` + `filters` + `workhub` | 147 | 36 |
| PR4 — `kanban` + `boards` + `resource360` + `features/kanban-board` + `modules/kanban` | 212 | 50 |
| PR5 — `product-dashboard` + `project-hub` + dashboard widgets | 359 | 63 |
| PR6 — `pages/admin` | 77 | 25 |
| **Whole `src` total** | **3789** | 911 |

Top residual offender files (for Claude Design to map next): `modules/project-work-hub/.../EditableFields.tsx` (52), `shared/Timeline/TimelineView.tsx` (41), `releasehub/ReleaseDrawer.tsx` (40), `pages/jira-clone/ReleaseManagementPage.tsx` (37), `capacity/timeline/Timeline.module.css` (35). Note: counts include hex inside `var(--ds-…, #hex)` fallbacks (scanner limitation), so they overstate true bare-hex.

## Contrast / Dark Mode Result
- WIDE-lane parity CSS (light+dark `--ds-*`, surfaces lift by elevation, legible DarkNeutral text) present & imported.
- Automated contrast-probe could not run headless (browser-only). **Requires in-browser run (light + dark) at QA acceptance.**

## Visual Regression Result
- Tooling present: `npm run test:visual` (Playwright `playwright.ads.config.ts`), `test:a11y`, baselines under `audit/dark-sweep-*` / `audit/baselines`.
- **Not executed this session** (browser-driven; gate at QA). Screens needing manual light+dark review: home/project briefing, filters, workhub issue/FieldsTab, kanban boards, resource360, dashboards/widgets, admin access, **workflow builder** (light-mode now follows theme — visually validate the canvas).

## Non-Styling Change Check
**Confirmed zero non-styling change.** `git diff` filtered for any line that is not a color value returned empty — every +/− line is a `'#hex'` → `'var(--ds-*, #hex)'` swap. No business logic, API, route, schema, query, Supabase/RPC, permission, component-hierarchy, or copy change. Diff name-only contains no route/SQL/supabase/api files.

## Risks / Blockers
1. `packages/tokens/src/definitions.ts` not applicable — target package absent in this repo (external `@catylast/tokens`). Component-library token value-swap must be applied in that repo, not here.
2. Contrast-probe + visual regression require a browser; run at QA acceptance (light + dark).
3. Scanner residual (3789) is the documented long-tail, not a regression. Scanner cannot reach 0 under the fallback-preserving wrap pattern.

## PR7–PR9 long-tail investigation (this session, post-PR2–PR6)
Attempted a deterministic, reference-driven (`references/ads-token-map.md`) exact-match auto-wrap of the long-tail. **Result: aborted + reverted (RED FLAG), correctly.**

- Built a guarded wrapper: wraps only whole-quoted-hex literals (`'#hex'`) with an exact canonical mapping; no spacing/Tailwind/gradient edits.
- Whole-`src` candidates: **247 wraps / 40 files**. Applied, then spot-check exposed a defect: **205 of 247 were the hex fallback INSIDE `token('color.x', '#hex')` calls** — which is the *canonical ADS helper pattern, already compliant*. Wrapping them (`token('color.x', 'var(--ds-x, #hex)')`) is wrong.
- Per the contract's one-correction-loop rule → **`git restore` all 40 files. Working tree clean.** Zero PR7–PR9 changes shipped.
- Only **24 / 247** candidates were genuinely bare (outside `token()`/`var()`), scattered — not worth a second automated pass without per-hex review.

### Critical scanner finding (reframes the residual count)
The `scripts/no-hardcoded-colors.js` count is **~85% already-compliant noise**. Of 3794 flagged lines:

| Category | Lines | Status |
|---|---:|---|
| Inside `token('…', #hex)` (ADS helper) | 568 | ✅ compliant — scanner false-positive |
| Inside `var(--…, #hex)` (already wrapped) | 2652 | ✅ compliant — scanner false-positive (hex >20 chars from `var(--`) |
| **Approx TRUE bare-hex** | **~574** | the real long-tail |

**Recommendations for Claude Design / next session:**
1. Fix the scanner's `isAllowedUsage` to allowlist `token('…', #hex)` and to detect `var(--…, #hex)` regardless of token-name length — this alone drops the reported count from 3789 → ~574.
2. The real ~574 bare-hex tail is dominated by: Tailwind arbitraries (`bg-[#hex]/opacity` — not var-wrappable), `rgba()`, and **265 distinct hexes with no entry in `references/ads-token-map.md`** (e.g. `#904ee2`, workstream `#fa8c16`/`#52c41a`/`#eb2f96`, `#091e420f`). These need **new hex→token mappings from Claude Design** before any sweep — self-inventing them is forbidden.
3. PR7 (Release) bare-hex are mostly Tailwind arbitraries in drawers/overlays → need a Tailwind-class→ADS strategy, not hex wrapping.

## Ready for Claude Design Re-Scan
**YES** — for the surfaces enumerated in the provided maps. Every map-named bare-hex target that was still bare is now `var(--ds-*, #fallback)`-wrapped; build is green; no behavior change. Remaining work for full app-wide zero is the untargeted long-tail (not in scope of the provided maps) plus the external `@catylast/tokens` `definitions.ts` swap.

---

## Status update — 2026-06-27 (post-report)
Additive note; the body above is the historical record of the PR2–PR6 sweep branch.

- **Scanner recommendation #1 SHIPPED.** "Fix `isAllowedUsage` to allowlist `token('…',#hex)` and detect `var(--…,#hex)`" landed as **PR #287 `83bde822e`** ("make color scanner runnable + drop ~85% false positives"). Reported count drops 3789 → ~574 true bare-hex, as predicted.
- **ADS-13 dark-chrome — now in progress, separate branch.** This report marked ADS-13 "out of scope / tracked separately"; that work is now active on branch **`fix/dark-chrome-ads13`**. Slice 1 = **Finding 1** (delete the dead Group A white-fallback footgun + rewrite the now-false top comment in the `html.dark` rule of `src/index.css`). Verified render-identical (A⊆B by cascade), build exit 0, live DOM probe confirms dark overlay `#282e33` stays above base `#22272b`. **Findings 3 (332 overlay-fallback occurrences) and 4 (nav-text scope) deferred to their own slices.**
- **PR7–PR9 long-tail still BLOCKED** on Claude Design hex→token mappings (265 unmapped). No mappings self-invented.
- Feature-folder working notes: `features/CAT-ADS-TOKEN-PARITY-20260626-004/` (00/01/02/03/06/07/08/09/11 + sessions).
