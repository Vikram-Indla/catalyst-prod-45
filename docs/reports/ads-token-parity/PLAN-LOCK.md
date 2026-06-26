# ADS Token Parity Sweep — PLAN LOCK

**Feature Work ID:** CAT-ADS-TOKEN-PARITY-20260626-004
**Branch:** `feature/ads-token-parity-sweep` (off `main`)
**Type:** Styling-only ADS token parity sweep. No behavior/data/route/schema change.
**Source of truth:** `~/Downloads/feature-branch/` (provided maps + corrective files). Not reinterpreted.

## Files to apply (WIDE lane — DONE in this session before sweeps)
- `src/styles/catalyst-ads-parity.css` — copied. Imported LAST via `src/main.tsx` (after index.css + all token CSS).
- `src/styles/catalyst-ads-chart-tokens.css` — copied. Imported AFTER parity CSS in `main.tsx`.
- `src/constants/workstreamColors.ts` — copied (consolidation source for PR2/PR3 home maps).
- `packages/tokens/src/definitions.ts` — **NOT APPLIED.** No `packages/tokens/` dir exists in this repo (it is the `@catylast/tokens` component-library package, not present here). Structure does not match → documented blocker, not applied. No token build to run.
- `src/index.css` ADS-13 dark-chrome patch — **OUT OF SCOPE.** README marks "Native-chrome re-pointing (ADS-13)" as *"Not in this branch (tracked separately)."* index.css internals left untouched; only the two new CSS files wired via main.tsx.

## Wrap pattern (exact, from maps)
`'#HEX'` → `'var(--ds-token-name, #HEX)'`. Preserve original hex as fallback. Use exact token from the map. No approximate colors, no invented `--catalyst-*`/Tailwind-arbitrary, no fallback removal.

## Batch order (PR order)
1. PR2/PR3 — shared palette maps (`color-sweep-map.md`): workstream (consolidate 3 home files → workstreamColors.ts), priority (CanonicalFilter + FieldsTab), work-item-type (workItemHierarchy.ts), 5 dark-critical one-offs.
2. PR4 — Kanban/boards (`PR4-kanban-sweep-map.md`): Resource360Board theme, overflow dialogs, R360BoardView, priority/card maps, status/type accents.
3. PR5 — dashboards/widgets (`PR5-widgets-sweep-map.md`): wire chart series to `--ds-chart-*`, 5 bare-hex.
4. PR6 — admin (`PR6-admin-sweep-map.md`): CatalystWorkflowBuilder (decision below), AdminAccessPage info-bg + inverse chip text.

## PR6 Workflow Builder decision
Tokenize to follow theme (map's primary option) — wrap each literal with `var(--ds-*, #orig)` so light mode is byte-identical and dark follows theme. No documented editor-canvas exception exists in the source → default = tokenize, per map.

## Forbidden (hard stop, revert if seen)
No redesign/layout/spacing/hierarchy/route/rename/query/Supabase-RPC/copy change. No new colors. No new CSS vars outside provided parity/chart files. Do not touch: `statusPalette.ts:33` periwinkle, editor color-picker swatches (BackgroundPickerItem, SlashMenu), test/story fixtures, `IdeationBoardView.tsx` (already theme-branched).

## Validation commands (only those that exist)
- Scan: `node /tmp/nhc.cjs` (scanner copy — committed scanner breaks under repo `"type":"module"`; runs whole `src`, filter per scope).
- Lint: `bun run lint` (eslint .)
- Build: `bun run build`
- Contrast: `node audit/contrast-probe.js`
- No package `typecheck`/unit `test` script → not invented. `test:visual`/`test:a11y` (playwright) = visual lane if baselines present.

## Scope-zero caveat (documented, not a drift)
Provided maps enumerate SPECIFIC offenders, not all 3836 scanner hits. WIDE-lane CSS covers the structural bulk via `--ds-*` resolution. Untargeted long-tail in scope is reported honestly for Claude Design's second gap scan — NOT over-swept (over-sweep = inventing mappings = forbidden).

## Expected report
`docs/reports/ads-token-parity/FINAL-REPORT.md`
