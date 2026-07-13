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

### Committed
`d50966a6d` — slice 1A-1 (routes.ts + CC + EvidencePage + exec log).

## Slice 1A-2 — snapshot band in locked mode — IMPLEMENTED, VERIFICATION-BLOCKED (NOT committed)
Scoped to the snapshot band only (scope/freshness/data-trust deferred to 1A-2b pending
StrataDataSource field confirmation). File: `StrataCommandCenterPage.tsx` — import
`StrataSnapshotBand` + `useSnapshots`; resolve `instance.locked_snapshot_id` → snapshot; render
`StrataSnapshotBand` (snapshot_key / frozen locked_at / basis=name) above the grid when
`dataState==='locked'`.

Validation: tsc clean; lint:colors:gate / audit:ads:gate green.

**VERIFIED (no seeding needed).** DB-safety: confirmed the dev app + Supabase MCP both target ONLY
`cyijbdeuehohvhnsywig` (catalyst-staging) — prod (`lmqwtldpfacrrlvdnmld`) is unreachable via the MCP,
`.env.development` → staging (no overrides), and live network calls hit staging. Read-only query found
an EXISTING locked instance (`CEO Scorecard · Q1 FY2026` → SNAP-1001), so NO DB WRITE was made —
switched the CC period to "Q1 FY2026 · closed" and screenshot-verified the band: discovery-toned
`LOCKED SNAPSHOT` lozenge + "SNAP-1001 · frozen 8 Apr 2026, 09:00 · Q1 FY2026 Executive Review".
File: `StrataCommandCenterPage.tsx` only.

### Committed
`8c921433c` — 1A-2. `686f2e74b` — session 001 handover.

## Slice 1A-3 — Command Center judgment band — IMPLEMENTED + VERIFIED (not committed)
Replaced the 6-tile `StrataStatStrip` (Row 1) with the anchor-01 judgment band: StrataScoreRing
(88px) + eyebrow (ENTERPRISE SCORE · period + verdict Lozenge + Δ vs prior period) + composed
executive sentence (worst-perspective drags · value-at-risk · decisions-waiting, zero-assumption
clauses, inline token-pure links) + provenance footer (Server-calculated · model · View evidence
with `?from=`). Added `InlineLink` helper; removed the now-dead stat-strip feeders (`stats`,
`realizationQ`/`topBenefit`, `blockedDeps`/`dependenciesQ`, `pendingAttestations`) + their hook
imports; added `worstPerspective`/`scoreDelta` memos. Imported `StrataScoreRing`; dropped
`StrataStatStrip`/`StrataStat`.
- ADS note: `padding: 20` tripped the token/HARDCODED_PX ratchet → used `var(--ds-space-250)`
  (canonical, already used in StrataNotificationBell). Off-grid `6`/`10` → `8`/`12`.
- Deviations logged: DRIFT-1 (perspective health stays Row 2), DRIFT-2 / D-8 (kept trend + AI advisory).
- Validation: tsc / lint:colors:gate / audit:ads:gate green. Live-verified on staging (Q2 FY2026):
  ring 100 · ON TRACK · ▲12.5 vs Q1 · "Financial (100) drags…, SAR 375K…, 1 decision is waiting."
  + View evidence. File: `StrataCommandCenterPage.tsx`.

### Committed
`58cb2af90` + foreign `20eb0db1c` — 1A-3. `c3de22709` — zip untrack. `469202473` — handover update.
⚠️ A concurrent GitHub Desktop auto-commit split 1A-3 + swept in a stray zip — see 07_HANDOVER / D-nil.

## Slice 1A-2b — context-spine scope + freshness + data-trust strip — VERIFIED (not committed at write time)
File: `StrataCommandCenterPage.tsx`. Imported `useDataSources`/`useUploadRuns`; wired StrataPageShell
`scope` (static "Scope Enterprise" — CC is enterprise-scoped by definition) + `freshness`
("Data as of {latest completed upload run}", omitted when no runs); added a data-trust strip (Row 5)
with HONEST metrics only — source count + active count + pending-validation count + Open Data & Lineage
link. Spacing via `var(--ds-space-*)` to clear the HARDCODED_PX ratchet.
- **Zero-assumption / data-gap flagged:** the anchor's "N sources stale" cannot be rendered truthfully
  — `StrataDataSource.health` is opaque & NULL in staging, and there is no `last_loaded_at`/freshness
  column. A reliable staleness signal needs a backend/data change (own ticket). NOT faked.
- Validation: tsc / lint:colors:gate / audit:ads:gate green. Live-verified on staging (after a
  mid-session auth-session expiry + re-login): spine "Scope Enterprise" + "Data as of 6 Jul 2026";
  strip "2 sources · 1 active · 0 actuals pending validation · Open Data & Lineage". Also
  incidentally confirmed 1A-1 "n days overdue" (inbox showed "13 days overdue" on MISSING ACTUAL rows).

## Slice 1A-4 — Command Center close-out — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. Single source file: `src/modules/strata/pages/StrataCommandCenterPage.tsx`
(no shared.tsx / map / sidebar touch → map + shared protections inherently satisfied). No migration.

### The four items
1. **Restricted/403 role-aware state (§17).** `noStrataRole = !rolesQ.isLoading && roles.length === 0`.
   When true, the whole grid is replaced by a full-size explained `EmptyState`
   ("You don't have access to the Command Center …") — never blank/generic. Presentation only; RLS is
   the real gate. `executive_viewer` etc. hold ≥1 role → NOT restricted; advisory writes stay gated by
   `canAdvise`. Decision: whole-page (user-approved this session).
2. **"Mine" no-results one-click Clear.** `EmptyState.primaryAction` in the inbox mine-empty branch →
   `setAttentionScope('all')`. Gated `attentionScope==='mine' && attentionRows.length > 0` so it never
   dead-ends into another empty; label "Show all N items".
3. **Changes-since-snapshot (D-3, client diff, no RPC).** New Row 3 panel "Since the last locked review".
   `refSnapshot` = most-recent `locked` snapshot in the active cycle whose id ≠ current instance's
   `locked_snapshot_id` (live → last review; locked → prior review, else honest empty). `useSnapshotItems`
   → frozen `scorecard_instance` payload (`value`, `inputs.perspectives[]`); diff enterprise score +
   per-perspective by **stable `perspective_id`** (only perspectives present in both, `has_data`). Deltas
   via `DeltaText` (▲/▼ glyph + word + success/danger token — color never alone). Zero-assumption empty
   when no comparable prior review / no live data / no frozen instance.
4. **Trend-dot accessible names (§14).** `TrendDot` circles → `role="link"`, `tabIndex=0`, `aria-label`
   ("Q1 FY2026, 87.5, On track — view evidence" via `useBandResolver().label`), Enter/Space activation.
   Non-clickable points → `role="img"` + label.

### Verification
- Gates GREEN: `npx tsc --noEmit` (clean), `lint:colors:gate` (0=baseline), `audit:ads:gate`
  (no category above baseline — one off-grid `6px` caught by HARDCODED_PX ratchet, fixed to
  `var(--ds-space-075)`), `lint:cre` (passed).
- LIVE (localhost:8080, staging), **live mode** Q2 FY2026: changes panel shows "Enterprise score 100
  ▲ 12.5 since SNAP-1001 (87.5, 8 Apr 2026)" + Financial 84.1→100 ▲15.9 / Customer 87.9→100 ▲12.1 /
  Digital 93.1→100 ▲6.9 — matches frozen SNAP-1001 by perspective_id; People/ESG (not in live 3) correctly
  excluded. Trend dots DOM-probed: 3× role=link, tabindex=0, correct aria-labels.
- LIVE **locked mode** (Period → Q1 FY2026 · closed): SNAP-1001 band still renders (fragment restructure
  safe); changes panel correctly shows zero-assumption empty "No prior locked review to compare".
- Both themes clean (dark: success/danger delta tokens legible, no hardcoded-color leak).
- **Code-verified only** (unreachable in current staging data/session): the "Mine" Clear button
  (this viewer owns 8 items → mine-empty not reachable) and the restricted state (no role-less session
  available). Both are deterministic JSX branches validated by tsc — precedent: overdue-row states in 1A-1/1A-2b.

## Slice 1C-1 — Scorecards Index → anchor-12 card scope-chooser — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. Resolves DRIFT-4 / D-9 (full anchor-12 redesign, split; 1C-2 = ranked panel).

### Files changed (2 source)
- `src/modules/strata/hooks/useStrata.tsx` — NEW `useScorecardCalcs(instances)` aggregator via
  `useQueries`, identical queryKey/queryFn/staleTime to `useScorecardCalc` (dedupes). Lets an index
  view read calc for a DYNAMIC set of instances without breaking rules-of-hooks. Additive; imports
  `useQueries` + `ScorecardCalcResult`.
- `src/modules/strata/pages/StrataScorecardsPage.tsx` — full rewrite from Models-grid + Instances-table
  to the anchor-12 **card scope-chooser**:
  - Judgment one-liner (worst-scoring instance + on-track count, zero-assumption; hidden if no data).
  - One `InstanceCard` per ACTIVE-period instance: 64px StrataScoreRing + StrataBandLozenge + scope
    (SCOPE_LABEL) + Δ-vs-prior (same-model prior period, shown only when both calcs have data — else
    nothing) + coverage footnote ("N inputs · M with data" from calc.lines). Enterprise (CEO) card gets
    the 2px discovery-bold accent border and sorts first; then worst-score-first. Click→detail (slug).
  - Cards are presentational (calc passed in from page-level `useScorecardCalcs`) → no per-card hooks.
  - States: whole-page restricted (noStrataRole, §17); layout-matched CARD skeletons; per-section
    SectionMessage error; no-active-cycle empty; role-aware empty (admin → "Open STRATA admin" CTA);
    calc-error warning banner. `docTitle="Scorecards"`. **Models grid dropped** (Model Builder owns it).

### Verification
- Gates GREEN: tsc clean; `lint:colors:gate` 0=baseline; `audit:ads:gate` no increase (caught
  `fontWeight: 650` → not an allowed ADS weight; fixed to 653, the canonical Jira semibold-emphasis);
  `lint:cre` passed. Guard test `cyclecontext.guard.test.ts` still satisfied (`<StrataPageShell` present).
- LIVE (localhost:8080, staging), Q2 FY2026: 2 cards — CEO Scorecard 96.5 ON TRACK, "▲ 9 vs Q1 FY2026",
  "8 inputs · 8 with data", accent border, sorted first; B2B Sector 100 ON TRACK, no delta (no prior Q1
  → correctly omitted), "4 inputs · 4 with data", regular border. Judgment: "CEO Scorecard · Q2 FY2026
  is the lowest at 96.5. 2 of 2 scorecards are on track — …directly comparable." DOM: both cards
  role=button/tabindex=0; CEO border ~2px vs B2B ~1px. Click CEO → /strata/scorecards/ceo-scorecard-q2-fy2026.
  Both themes clean. docTitle "Scorecards" (+ detail "CEO Scorecard · Q2 FY2026") confirmed in tab title.
- Data-gap: "variance to plan" not client-derivable → backend task filed (task_e44f1ba9); ranked panel
  (1C-2) will use worst-first + Δ-vs-prior per D-10.
