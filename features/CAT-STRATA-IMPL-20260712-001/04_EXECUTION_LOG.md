# 04 — Execution Log

## Slice 0A — Foundations: sidebar IA + context spine + JiraTable overflow prop
Branch: `strata/impl-phase01` (off `main`). Status: **implemented + verified, NOT yet committed** (awaiting Vikram commit approval per COMMIT GATE).

### Files changed (5)
- `src/components/layout/EnterpriseSidebar.tsx` — `strataSidebarConfig` regrouped to the anchor-11
  task-sequence IA (Direction/Measurement/Delivery/Value/Governance). Labels/grouping only; routes,
  icons, styling unchanged. Item relabels: KPI & OKR Library → "KPIs & OKRs"; Portfolio & Value →
  "Portfolio & Benefits". My Work item intentionally deferred to slice 1B (with its route).
- `src/components/layout/__tests__/EnterpriseSidebar.areas.test.tsx` — updated CANONICAL_AREAS to the
  5 new groups + banned-label test flipped to reject the pre-rename v1 labels.
- `src/modules/strata/components/shared.tsx` — `StrataContextToolbar` + `StrataPageShell` gain
  optional `scope?` and `freshness?` slots (§18 "one new freshness slot, no new primitive").
  Additive; default undefined → identical render for every existing caller.
- `src/components/shared/JiraTable/types.ts` + `JiraTable.tsx` — opt-in `overflowX?: 'hidden'|'auto'`
  prop. No default → zero change for existing callers; applied as a conditional inline style so it
  overrides only the x-axis when passed. StrataPageShell `<style>` hack LEFT IN PLACE (removal +
  per-page migration deferred — removing it now would regress 9 pages; see refinement note).

### Scope refinement (logged, within approved plan intent)
Plan said "remove the StrataPageShell hack" in 0A. Kept it: the hack forces `overflow-x:auto` on
`.jira-table-grid` for 9 STRATA pages; removing it requires migrating all 9 to `overflowX="auto"`
(blast radius overlapping slices 1A/1C). Prop is upstreamed now (Phase-0 goal met); hack removal +
migration is a later cleanup. Non-regressing.

### Validation (raw)
- `npx tsc --noEmit` → **No errors found**.
- `npm run lint:colors:gate` → ✅ 0 = baseline 0.
- `npm run audit:ads:gate` → ✅ no category above baseline (tokens 19966, typography 1366, spacing 0).
- `npm run lint:cre` → ✅ chokepoint gate passed.
- Vitest → **CANNOT RUN** (rolldown/node `styleText` Startup Error — toolchain, not this change;
  matches known "Vitest can't run" memory). Sidebar test updated by inspection, not executed.
- Live (localhost:8080, Chrome MCP):
  - `/strata` sidebar shows the new IA exactly (Direction/Measurement/Delivery/Value/Governance),
    same styling/icons/spacing — no restyle. Context spine renders identically (Cycle/Period/LIVE).
  - `/strata/strategy/map` renders fully intact — graph, Theme/Objective nodes, Drives/Contributes/
    Enables edges + ≥85% dashed animation, filters, legend, zoom/lock. Strategy Room highlights
    under Direction. **Map zero-change confirmed** (post-change visual + code-level additive guarantee;
    map file untouched, shared.tsx changes additive).

### Map-baseline caveat (honest)
No pre-0A pixel baseline was captured before editing. Zero-change is evidenced by (a) map source file
untouched, (b) shared.tsx changes strictly additive (map passes no scope/freshness), (c) post-change
live render identical. A pre/post pixel diff was not performed.

### Committed
`d4367b163` — slice 0A (5 source files + feature folder). Pre-commit gates passed.

## Slice 0B — StrataSnapshotBand (new canonical component)
Status: **implemented + gates green, NOT yet committed** (awaiting commit approval).

### Scope change vs plan (logged as D-7)
Plan 0B = StrataChainStrip + StrataSnapshotBand. **StrataChainStrip DEFERRED to Phase 2** — anchor 01
has no chain strip; it is a Phase-2 detail-page component (KPI/Element detail) with existing inline
prior art in `StrataEvidencePage.tsx:106-338`. No Phase-1 consumer. Same defer-until-consumed rule as
D-4 (stepper). So 0B ships **StrataSnapshotBand only**.

### Files changed (1 source)
- `src/modules/strata/components/shared.tsx` — added `StrataSnapshotBand` (locked-mode chrome band,
  proposal §18 / anchor 01 locked): discovery-toned band, `Lozenge appearance="new" isBold` badge
  (canonical — no hand-rolled badge, no off-grid spacing), snapshot key + frozen timestamp + basis +
  right-aligned `actions` slot. Tokens only. Consumed by Command Center locked mode in slice 1A.

### Validation (raw)
- `npx tsc --noEmit` → **No errors**.
- `npm run lint:colors:gate` → ✅ 0 = baseline 0.
- `npm run audit:ads:gate` → ✅ no category above baseline (spacing 0/0). NOTE: first attempt used a
  hand-rolled badge with `padding:'3px 8px'`/`borderRadius:3` → tripped the off-grid-spacing ratchet;
  fixed by switching to canonical `Lozenge appearance="new" isBold`.
- No live visual (no consumer yet) — visual proof deferred to slice 1A.

### Committed
`d479cce5d` — slice 0B (shared.tsx + feature docs). Phase 0 foundations complete.

## Slice 1A — Command Center (SPLIT into sub-slices per 2h rule)
Anchor-01 redesign is far larger than one 2h slice. Sub-slices:
- **1A-1** (this): `?from=` origin threading (nav contract §5, P0) + "n days overdue" (P1).
- **1A-2** (next): snapshot band (locked) + context-spine scope/freshness + data-trust strip.
- **1A-3**: judgment-band redesign (score ring + composed copy) replacing the stat strip.
- **1A-4**: restricted/403 state, "Mine" no-results clear, changes-since-snapshot (client diff), trend-dot a11y.

### 1A-1 — implemented + verified, NOT yet committed
Files (3): `src/lib/routes.ts` (scorecard/kpi/portfolio Evidence builders gain optional `from?`),
`StrataCommandCenterPage.tsx` (`daysOverdue` helper; Due column → "n days overdue"/"Due today" in
danger; 3 evidence call sites pass `Routes.strata.root()`), `StrataEvidencePage.tsx`
(`STRATA_ORIGIN_LABELS` + `?from=` read + "← Back to [origin]" subtle Button). EvidencePage is a
Phase-2 page but the change is the minimal consumer side of the §5 nav contract, not a redesign.

Validation: tsc clean; lint:colors:gate / audit:ads:gate green. Live: `?from=` round-trip verified
(CC → scorecard evidence `?from=%2Fstrata` → "← Back to Command Center" → CC). "n days overdue"
code-verified only — current data has no overdue inbox rows to render it.
