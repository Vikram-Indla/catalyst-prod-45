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

## Slice 1C-2 — Scorecards Index ranked-variance panel — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. Completes anchor-12 (D-9); ranked basis per D-10.

### File changed (1 source)
- `src/modules/strata/pages/StrataScorecardsPage.tsx` — added the "Where attention pays" ranked panel
  below the cards (anchor-12 "JiraTable idiom"). Canonical `JiraTable` in a `StrataPanel` (noPadding),
  columns Scorecard · Score(+band) · Since prior(Δ) · Where attention pays(weakest perspective).
  `rankedRows` = active-period instances sorted worst-score-first (nulls last); `DeltaSpan` helper
  (▲/▼ + word + success/danger token, color never alone). Row click → scorecard detail. "Variance to
  plan" NOT used (not client-derivable — backend task_e44f1ba9); interim basis = score + Δ-vs-prior (D-10).

### Verification
- Gates GREEN: tsc clean; colors 0=baseline; audit no-increase (tokens 19966/19966); CRE passed.
- LIVE (localhost:8080, staging) Q2 FY2026: panel "Where attention pays (2)" + subcaption "Lowest score
  first · same model & thresholds, directly comparable". Rows worst-first: CEO 96.5 ON TRACK · ▲ 9 vs
  Q1 FY2026 · "Digital & Innovation 86.7 — weakest perspective"; B2B Sector 100 ON TRACK · "—" (no prior,
  zero-assumption) · "Financial 100 — weakest perspective". DOM: JiraTable, 2 rows, brand-link names,
  row-click wired. Both themes clean.

## Slice 1D — Scorecard Detail close-out — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. Anchor 13 read in full at slice start: the page already matches its
structure (verdict hero → grouped decomposition → commentary), so Plan-Lock 1D items are genuine
incremental gaps, NOT a structural drift. Anchor extras (composed verdict sentence, contribution
column, roll-up footer) noted as optional polish — not silently absorbed, offered as follow-up.

### Files changed (3 source)
- `src/modules/strata/domain/index.ts` — `scorecardApi.instanceBySlug` → **dual-mode (D-6, CRE F4)**:
  a UUID-shaped param queries `id`, else `slug`. EvidencePage benefits automatically.
- `src/modules/strata/pages/StrataEvidencePage.tsx` — `strataOriginLabel()` prefix resolver: after the
  exact-path table misses, `/strata/scorecards/<slug>` → "Scorecard" (detail-page origins carry a slug).
- `src/modules/strata/pages/StrataScorecardDetailPage.tsx` —
  - **?from= (P0):** `originPath` = this detail page; threaded through the Evidence header button,
    line-ⓘ KPI evidence, and the scorecard-evidence fallback.
  - **Role-gated Recalculate (P1, §17):** hidden unless viewer holds RECALC_ROLES
    (strategy_office/vmo_validator/strata_admin — same convention as CC advisory); the calc RPC
    persists provenance, so it is a write. DB remains the real gate.
  - **Layout-matched skeletons (P1):** DetailSkeleton (hero ring + tiles + table block) replaces the
    page Spinner; LinesSkeleton (grouped rows) + commentary line skeletons replace panel Spinners.
    Spinner import dropped.
  - **Restricted (P1):** whole-page explained EmptyState when roles resolve to zero (matches 1A-4/1C-1).
  - **Partial label (P2):** "Partial — N of M lines have data" (warning token) beside the band lozenge
    when the calc is data-bearing but incomplete; zero-assumption (absent when complete/no data).
  - **D-6 canonical redirect:** UUID param + resolved instance → `navigate(slug, {replace:true})`.

### Verification
- Gates GREEN: tsc clean; colors 0=baseline; audit no-increase; CRE passed.
- LIVE (localhost:8080, staging):
  - Evidence button → `/strata/scorecards/ceo-scorecard-q2-fy2026/evidence?from=%2Fstrata%2Fscorecards%2F…`
    and the page renders "← Back to Scorecard".
  - Line ⓘ (B2B Revenue Growth) → `/strata/kpis/b2b-revenue-growth/evidence?from=…` + "← Back to Scorecard".
  - **D-6:** `/strata/scorecards/a5a1a000-0000-4000-8000-000000001512` resolved + URL replaced with the
    canonical slug.
  - Recalculate visible for this admin viewer (canRecalculate=true); hidden-branch is deterministic JSX.
  - Detail renders hero 96.5 ON TRACK, honest "—/No data" Network & Infrastructure tile. Both themes clean.
- **Code-verified only:** restricted page (no role-less session), partial label (CEO Q2 = 8/8 lines with
  data → not present, correct), skeletons (flash too fast to screenshot; deterministic JSX).

## Follow-up — scorecard plan-variance backend (task_e44f1ba9, D-11) — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. First migration of this feature (Plan Lock stop-condition honored:
degenerate-design finding raised to Vikram BEFORE any DDL; uncapped-rollup design approved).

### Migration (staging APPLIED, ledger 1:1)
- `supabase/migrations/20260713100000_strata_scorecard_plan_variance.sql` —
  `strata_kpi_plan_achievement(p_kpi,p_period)` (read-only replica of the engine's achievement math:
  same target/actual selection, direction cases, [0,150] clamp — NO capped score, NO provenance
  INSERT) + `strata_calc_scorecard_plan_variance(p_instance)` (same line/perspective/model weight
  rollup as the instance calc over uncapped achievements; returns plan_index, variance=plan_index−100,
  has_data, covered/total_lines; locked → 'locked_snapshot' null; benefit lines excluded). GRANT to
  authenticated; strata_calc_guard() kept. Applied to staging `cyijbdeuehohvhnsywig` via MCP
  execute_sql + explicit ledger INSERT (version 20260713100000 = committed file, 1:1). Prod NOT
  applied (unreachable via MCP — apply on next prod migration run).
- **RPC verified on staging:** CEO Q2 → variance +0.18 (plan_index 100.18, 8/8 lines); B2B Q2 →
  +6.42 (106.42, 4/4); locked CEO Q1 → has_data=false reason='locked_snapshot'. Non-degenerate,
  signed, positive-capable (what the capped score can never show: CEO reads 96.5 capped yet is
  +0.18 vs plan).

### UI wiring (4 source files)
- `types.ts` — `ScorecardPlanVariance` interface.
- `domain/index.ts` — `scorecardApi.planVariance(instanceId)` via typedRpc.
- `hooks/useStrata.tsx` — `useScorecardPlanVariances(instances)` batch (useQueries, mirrors
  useScorecardCalcs).
- `StrataScorecardsPage.tsx` — ranked panel re-based per D-11: primary sort = vs-plan variance asc
  (furthest below plan first, nulls last), tie → score; new "Vs plan" column (signed +/−, "On plan"
  band, partial-coverage sub-note "N of M lines"); caption "Furthest below plan first"; Δ-vs-prior
  column retained.

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase / CRE.
- LIVE Q2 FY2026: CEO "+0.2 vs plan" (ranked first, 0.2 < 6.4) · B2B "+6.4 vs plan"; DOM-probed rows
  match RPC output; both themes clean. Locked/uncovered "—" branch code-verified (deterministic).

## Follow-up — Scorecard Detail anchor-13 polish — IMPLEMENTED + VERIFIED (not committed at write time)
Branch: `strata/impl-phase01`. The 3 optional items offered after 1D (composed verdict, contribution
column, roll-up footer) — Vikram "do the anchor-13 polish". Single file: `StrataScorecardDetailPage.tsx`.

### Changes
- **Composed verdict sentence (hero, anchor-13 "headline IS the finding"):** worst-scoring perspective
  + its below-target measures (band moved/removed via `useBandResolver`), measure names are
  `VerdictLink`s to KPI evidence carrying `?from=` (thread origin); "all measures on/above target"
  fallback; total **Δ-vs-prior** (same-model prior-period instance via `useScorecardInstances` +
  `useScorecardCalc`, shown only when both calcs have data). Footer enriched to "Calculated … · N
  lines, M with data". Eyebrow → "TOTAL SCORE".
- **Contribution column (Measures-by-perspective table):** per-line share of the total score =
  perspective weight-share × line weight-share × line score ("N pts"); "—" when no data. Panel
  retitled "Measures by perspective" + caption "Contribution = share of the total score".
- **Roll-up mechanics footer:** sunken strip below the table — "Total = Σ perspective weight ×
  perspective score; perspective score = Σ measure weight × measure score. {model} v{ver} · {rollup}
  rollup." One reveal away, never competing with the verdict.

### Bug caught + fixed during live verify
- **TDZ:** the `failingMeasures` memo referenced `refNameFor` (a `const` declared later) → runtime
  "Cannot access 'refNameFor' before initialization" (tsc can't catch const TDZ). Fixed by hoisting
  `refNameFor` above the derivation block. This is why live verification is mandatory — gates were
  green but the page white-screened until the move.

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase (weight 653 not 650) / CRE.
- LIVE (localhost:8080, staging; re-auth mid-session): verdict "Digital & Innovation (86.7) is the
  weakest perspective — Network Availability is below target" + "▲ 9 vs Q1 FY2026" + "8 lines, 8 with
  data"; Network Availability is a link. Contribution column DOM-probed — **Σ contributions = 96.5 =
  total score** (B2B Revenue Growth 20 · Cost to Serve 13.1 · Churn 15.3 · NPS 12.5 · Digital Rev 13.3
  · Network Avail 5.9 · Employee Eng 16.4 · CO2 —). Roll-up footer present. Both themes clean.

## PHASE 2 · Slice 2A — StrataChainStrip (new canonical component) — IMPLEMENTED (gates green; live-verify at 2B)
Branch: `strata/impl-phase01`. Plan Lock: `03_PLAN_LOCK_PHASE2.md` (APPROVED — "implement full Phase 2").

### File changed (1 source)
- `src/modules/strata/components/shared.tsx` — NEW `StrataChainStrip` (+ `StrataChainSegment`/`StrataChainLink`
  types). Canonical compact "IN THE CHAIN" strip (anchors 06/14/02): sunken box + heading + per-segment
  lines (icon glyph + label + linked items). Zero-assumption: empty segment → `emptyText`, never invented.
  `tone:'danger'` = broken/blocked link (color + weight, never color alone). Token-pure; `var(--ds-space-*)`.
  Resolves D-7. Distinct from the richer EvidencePage lineage panel (EvidenceRow-based) — that is NOT
  refactored (behavior-preserving: forcing it into the compact strip would regress its detail). D-7 note
  "refactor EvidencePage to consume it" reinterpreted: EvidencePage keeps its rich chain; StrataChainStrip
  is the detail-page strip. Logged as a scope refinement, not a drift.

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase / CRE. No map/sidebar/shared-consumer touch.
- Live verification DEFERRED to 2B first mount (KPI Detail chain strip) — same pattern as 0B
  StrataSnapshotBand → 1A-2. Pure presentational component, deterministic.

## PHASE 2 · Slice 2B-1 — KPI Detail verdict band + chain strip + trust strip (anchor 06) — IMPLEMENTED + VERIFIED
Branch: `strata/impl-phase01`. File: `StrataKpiDetailPage.tsx` (single source). First live mount of
StrataChainStrip (2A verified).

### Changes
- Chain/trust data sourced from **`useKpiEvidenceChain(kpi.id, activePeriod.id)`** (`strata_kpi_evidence_chain`
  RPC → elements/projects/benefits/formula_version/lineage). Decision A (see session 006).
- **Verdict band** (replaces the plain StrataStatStrip hero; 5fr): "{period} VERDICT" eyebrow + band
  lozenge (achievement.status_key) + validation lozenge (current-period actual); big actual value
  (`var(--ds-font-size-700)`) + "vs target X" + "▲/▼ Δ vs {prior period}" (from trendRows); achievement
  bar (StrataBandBar); footer "Achievement N% · Confidence · Formula {type} v{n}". Verdict → trust order.
- **Trend** (7fr) — existing recharts Actual/Target panel, moved into the verdict/trend grid (kept as-is;
  band-toned dots + per-point evidence-drill are an anchor enhancement → 2B-2/polish).
- **StrataChainStrip** (7fr): ↑ Objective (elements, linked to element detail via elementById slug map),
  ▦ Delivery (projects; "N blocked" danger meta/tone), ◇ Value (benefits, plain — no slug loaded).
  Scorecards segment OMITTED (not in the RPC — zero-assumption, not invented).
- **Trust strip** (5fr): Source (actual.entry_method) · Last run (upload_run → runKey) · Formula
  (chain.formula_version) · Validation (ValidationLozenge). All honest "—" when absent.
- Everything below (Ownership, Formula versions, Strategy links, Lineage, Commentary, all governance
  modals) PRESERVED unchanged — 2B-2 handles the actuals/validation table + commentary column.

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase / CRE.
- LIVE (localhost:8080, staging) b2b-revenue-growth Q2 FY2026: verdict "Q2 FY2026 VERDICT · ON TRACK ·
  VALIDATED · 8.9% vs target 8% · ▲ 2.7% vs Q1 · Achievement 111.3% · Confidence 95% · Formula Ratio to
  target v1". Chain: ↑ B2B Growth Engine + Grow B2B Revenue (linked); ▦ CPQ & Sales Enablement (1 blocked,
  danger) + Enterprise Care Desk; ◇ B2B Revenue Uplift + Cost-to-Serve Reduction. Trust: Upload / RUN-1001
  / Ratio to target v1 / VALIDATED. DOM-probed. Both themes clean. StrataChainStrip (2A) live-verified.

## PHASE 2 · Slice 2B-2 — KPI Detail Actuals & validation table (anchor 06) — IMPLEMENTED + VERIFIED
Branch: `strata/impl-phase01`. File: `StrataKpiDetailPage.tsx`. Completes anchor-06 KPI Detail.

### Changes
- Unified **"Actuals & validation"** JiraTable (replaces the old "Lineage" panel): columns
  **Period · Actual · Target · Band · Validation · Commentary · Lineage** (anchor 06). Commentary is a
  COLUMN tied to its period (strata_commentary has `period_id`) — the orphaned "Commentary" panel is
  REMOVED. Per-period joins: `targetByPeriodId` (approved-latest), `bandByPeriodId` (from
  `detailQ.data.calc` = calcValues status_key; empty where a period wasn't calc'd — zero-assumption),
  `commentaryByPeriodId`. Lineage cell links `upload_run → RUN-key` (run detail) else entry_method.
- **Role-gated Validate:** pending actuals show a "Validate" button ONLY when `canValidate`
  (`VALIDATE_ROLES` = vmo_validator/data_steward/strategy_office/strata_admin) → existing attest
  decision flow (`strata_attest_actual`, submitter≠validator server-enforced). Viewer sees no ghost (§17).
- Removed now-unused `lineageColumns` + `commentary` var. Formula versions / Strategy links / Ownership
  panels + all governance modals PRESERVED.

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase / CRE.
- LIVE (localhost:8080, staging) b2b-revenue-growth: table headers exactly Period·Actual·Target·Band·
  Validation·Commentary·Lineage (DOM-probed). Q2 6.2%→8.9%, Band ON TRACK (Q2; Q1 empty = not calc'd,
  honest), VALIDATED, Lineage RUN-1001. Commentary panel confirmed removed. Both themes clean.

## PHASE 2 · Slice 2C-1 — KPI & OKR Library verdict-first columns (anchor 16) — IMPLEMENTED + VERIFIED
Branch: `strata/impl-phase01`. File: `StrataKpiLibraryPage.tsx`.

### Changes
- Replaced the field-dump KPI columns (unit/direction/frequency/entry_method/status/validator/data_source)
  with anchor-16 **verdict-first columns**: KPI (+ governed-status lozenge) · Achievement (%+band+bar) ·
  Actual / Target · Trend (StrataTrendSpark, band-toned, higherIsBetter by direction) · Validation
  (per-actual lozenge) · Owner (accountable_owner, avatar) · Freshness (latest actual date).
- Per-row data: Achievement + Actual/Target from `useKpiAchievement` (existing per-row RPC);
  Trend/Validation/Freshness from a per-row `useKpiActualsLite` (`kpiApi.actuals`) — same queryKey across
  a row's cells so React Query dedupes to ONE fetch. Zero-assumption: no actuals → "—" everywhere.
- Removed orphaned helpers `DirectionCell`, `ValidatorCell`, `dataSourceNameById` (dead after the column
  swap). OKR accordion (OkrPanel/OkrRow/KeyResultsList) + search + status filter PRESERVED.
- **Deferred to 2C-2:** BulkFooterBar (row selection + bulk verbs) + saved views (`strata_saved_views`
  migration, P2-D2).

### Verification
- Gates GREEN: tsc / colors 0=baseline / audit no-increase / CRE (re-run after dead-code removal).
- LIVE (localhost:8080, staging) 17 KPIs Q2 FY2026: verdict-first columns render — e.g. B2B Revenue
  Growth 111.3% ON TRACK · 8.9%/8% · rising spark · VALIDATED · 5 Jul; Network Availability 66.7% WATCH ·
  99.4%/99.9% · RED declining spark; Cost to Serve "SAR 97 / SAR 95". KPIs without actuals → "—". Owner
  avatars (Vikram Indla, Jahanara Khan). Both themes clean.

---

## Slice 2C-2a — KPI Library backend: strata_saved_views + governed bulk RPC (session 007, 2026-07-14)
**Migration:** `20260713110000_strata_saved_views_and_bulk_kpi_update.sql` (staging-applied; prod parked).

### Discovery (staging probe)
- Owner = `strata_kpis.accountable_owner_id`; threshold = `threshold_scheme_id`. Governance is
  **version-based** (`status` draft→pending_approval→approved→superseded; `strata_submit_record` /
  `strata_approve_record`, segregation of duties enforced), NOT a change-request queue.
- **KEY GAP (session-007 decision):** `strata_update_kpi` (the only owner/scheme path) **refuses approved
  KPIs** — "retire and recreate to change an approved KPI". No `strata_revise_kpi` / superseding-version
  RPC exists. Library is mostly approved (staging 10 approved / 6 draft / 1 pending). Vikram chose the
  **honest loop** over building a versioning subsystem: bulk RPC loops the existing `strata_update_kpi`.

### Built
- **`strata_saved_views`** — per-user private view configs (`user_id`/`entity`/`name`/`config` jsonb/
  `is_default`; unique(user,entity,name); entity CHECK 'kpi'). RLS: 4 policies all `user_id = auth.uid()`.
  `strata_touch_updated_at` trigger. **NOT URL-navigated → no slug contract** (documented on the table).
- **`strata_bulk_update_kpis(p_kpi_ids uuid[], p_accountable_owner uuid, p_threshold_scheme uuid,
  p_reason text) → jsonb`** — role-gated (`strategy_office`/`kpi_owner`/admin, fail-fast); per-KPI
  subtransaction loops `strata_update_kpi` so one blocked row never aborts the batch; returns
  `{applied, failed, results:[{kpi_id, ok, error?}]}`; one `RPC:bulk_update_kpis` audit event.

### Verification (raw)
- Objects: table 1 · policies 4 · touch trigger 1 · fn 1 · RLS on · ledger row 20260713110000 (1:1 file).
- **Functional (simulated strategy_office user, rolled back — zero mutation):** bulk over [draft,
  approved] → `applied:1, failed:1`; draft `ok:true`; approved `ok:false, error:"only draft or pending
  KPIs can be edited (current: approved); retire and recreate…"`. Role gate passes; batch not aborted.
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799, typography 1366) · CRE.
- No TS/UI change this commit — types land with consumers in 2C-2c/2C-2d.

---

## Slice 2C-2b — KPI Library verdict columns to anchor 16 (DRIFT-5) (session 007, 2026-07-14)
**File:** `src/modules/strata/pages/StrataKpiLibraryPage.tsx` (only source file).

### Changes (DRIFT-5 = "match anchor exactly")
- **Dropped the Trend spark column** (`KpiTrendCell` + `StrataTrendSpark` import removed — trend lives on
  KPI Detail; library is verdict-scan).
- **Split "Actual / Target"** into two columns (`KpiValueCell` param'd by `field`): Actual (bold, text) ·
  Target (subtle). Both from the per-row achievement RPC.
- **Added Δ column** (`KpiDeltaCell`): actual vs the prior period's actual (from `useKpiActualsLite`, sorted
  by submitted_at; current = active-period actual). Arrow (▲/▼) carries the sign (grayscale-safe); color is
  direction-aware (higher_better ↑=success; lower_better ↓=success; band/manual neutral). Rendered only when
  both current + prior values exist (zero-assumption); Δ=0 → subtle "0".
- **Objective-ancestry sub-line** on the KPI cell ("↑ {objective}") from `useElementKpis` ⋈
  `useStrategyElements` (objectives win, themes fallback); no link → no sub-line (never invented). Column
  relabelled "KPI · objective". Governed-status lozenge kept inline (additive to the anchor).
- **Freshness → staleness glyph** (`KpiFreshnessCell`): ● fresh ≤2d (success) / ◐ aging 3–5d (warning) /
  ○ stale >5d (danger, "stale Nd") + relative time; absolute date on hover (Tooltip). Replaces the plain date.
- **Owner NO-OWNER → "— no owner"** value (never blank), per anchor.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799, typography 1366) · CRE.
- LIVE (localhost:8080, staging, 17 KPIs Q2 FY2026) **light + dark**: header now
  `KPI·objective · Achievement · Actual · Target · Δ · Validation · Owner · Freshness` (no Trend). e.g.
  B2B Revenue Growth "↑ Grow B2B Revenue" · 111.3% ON TRACK · 8.9% / 8% · ▲2.7 (green) · VALIDATED · ○ stale 8d;
  Churn Rate ▼0.5 GREEN (lower_better) · Cost to Serve "SAR 97 / SAR 95" ▼4 green. "— no owner" values;
  empty rows all dashes. Both themes token-clean. (Floating pink FAB = global "Open messages" button, not this change.)

---

## Slice 2C-2c — KPI Library BulkFooterBar + governed bulk write (session 007, 2026-07-14)
**Files:** `StrataKpiLibraryPage.tsx`, `domain/index.ts` (+`kpiApi.bulkUpdate`), `types.ts`
(+`StrataBulkUpdateResult`), `JiraTable/BulkFooterBar.tsx` + `index.ts` (additive `actions`/`note`/`BulkAction`).

### Changes
- **BulkFooterBar extended additively** (canonical, reused): optional `actions?: BulkAction[]` (generic
  verbs, rendered left) + `note?: ReactNode` (right-aligned governance note). Existing built-in
  verbs (Delete/Move/Transition) + the 4 consumers (BacklogPage + 3 stories) untouched. `BulkAction`
  exported from the JiraTable index.
- **JiraTable selection wired**: `selectable` + `selection`/`onSelectionChange` on the KPI table → the
  anchor-16 leading checkbox column. Footer shows on selection with verbs **Change owner… · Assign
  threshold scheme… · Export** + note "Bulk changes are governed — owner changes route through approval".
  Write verbs gated to `canAuthor` (strategy_office/kpi_owner/admin); Export always available.
- **Export** = client-side CSV of selected rows (name/status/unit/direction/frequency/owner) via Blob —
  read-only, no server call.
- **Change owner / Assign scheme** = `StrataFormModal` (user / scheme-select) → `kpiApi.bulkUpdate`
  (`strata_bulk_update_kpis`). Result surfaced in a `SectionMessage` banner (applied/failed + the honest
  approved-KPI rejection message). Selection clears + query invalidates on completion.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase · CRE.
- LIVE (localhost:8080, staging) **light + dark**: selected 2 approved KPIs → footer renders (2 selected +
  3 verbs + governance note); "Change owner…" modal + person picker; submit → banner **"Bulk update — 0
  applied, 2 not applied · approved KPIs can't be edited in place. Retire and recreate…"** (RPC honest
  rejection, §17), owners unchanged, selection cleared. Both themes token-clean. (Footer full-width fixed
  overlaps the sidebar Configuration label — pre-existing canonical BulkFooterBar behavior, as on BacklogPage.)

---

## Slice 2C-2d-1 — KPI Library filters + worst-first sort + summary bar (session 007, 2026-07-14)
**File:** `StrataKpiLibraryPage.tsx` only. (2C-2d split: 2C-2d-1 = filters/sort/summary; 2C-2d-2 = Validation filter + saved views.)

### Changes (anchor 16 filter row + summary bar)
- **Page-level achievement batch** via `useQueries` (one query per KPI, SAME queryKey as the row cells →
  React Query dedupes to one fetch each). Powers the Band filter + worst-first sort without a new RPC.
- **Filter toolbar** (canonical `StrataChipMenu`): **Status · Band · Perspective · Owner** (Status moved
  out of the header into the toolbar). Band options = All · **Below threshold** (config-driven: band
  appearance ∈ {removed, moved}) · each governed band (from threshold schemes, sorted by min_score).
  Perspective from `usePerspectives` via element_kpis→element.perspective_id. Owner = distinct
  accountable owners present + "No owner" bucket.
- **Worst-first default sort** — `sortKey` defaults to `'achievement'` ASC (nulls last); Achievement
  column made sortable so a header click toggles best/worst-first; other columns keep field sort.
- **Filter summary bar**: "Showing N of M — filtered to … · Clear filters · [right] Sorted by
  achievement, worst first". Clear filters resets search + all 4 chips.
- Spacing uses `var(--ds-space-*)` (audit ratchet caught an off-grid 10px → tokenized to space-150/200).

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799 after tokenizing spacing) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: worst-first order confirmed (Network Availability 66.7%
  WATCH at top → B2B 111.3% → no-data KPIs last). Band "Below threshold" → "Showing 1 of 17 — filtered to
  below-threshold bands" (only the WATCH KPI). Band menu lists scheme labels (On track/Watch/At risk).
  Clear filters → back to 17 of 17. Both themes token-clean.

---

## Slice 2C-2d-2 — KPI Library Validation filter + Saved views (session 007, 2026-07-14) — anchor 16 COMPLETE
**Files:** `StrataKpiLibraryPage.tsx`, `domain/index.ts` (+3 saved-view methods), `types.ts`
(+`StrataSavedView`), `hooks/useStrata.tsx` (+`useSavedViews`).

### Changes
- **Validation filter chip** — page-level actuals batch via `useQueries` (SAME queryKey as the row
  cells → deduped) → current-period validation status per KPI. Options: All · Validated · Pending ·
  Rejected · Quarantined · No data (no actuals). Applied in the filtered memo + summary bar.
- **Saved views (per-user, `strata_saved_views` from 2C-2a)** — "Saved views ▾" selector (right of the
  toolbar): built-in **"My exceptions"** (applies Band = Below threshold) + user views + "Save current
  view…" + "Delete this view" (when a user view is active). Config persisted = {search, statusFilter,
  bandFilter, perspectiveFilter, ownerFilter, validationFilter, sortKey, sortOrder} jsonb.
  Client: `kpiApi.savedViews/createSavedView/deleteSavedView` (direct `typedQuery`, RLS-scoped to auth.uid()).
  `useSavedViews('kpi')` hook. Save modal = `StrataFormModal` (name).

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase · CRE.
- LIVE (localhost:8080, staging) **light + dark**: Validation "No data" → "Showing 8 of 17 — filtered to
  no reported data" (the 8 actual-less KPIs). Saved views: "My exceptions" → Band Below-threshold (1 of 17);
  **"Save current view" → DB row confirmed** (`Board exceptions`, config jsonb exact) + chip reflects it;
  **"Delete this view" → DB row removed** (remaining=0, test row cleaned up). Both themes token-clean.

### ✅ Anchor 16 (KPI & OKR Library) COMPLETE — all of 2C-2 (a·b·c·d-1·d-2) shipped.

---

## Slice 2D-1 — Strategy Room: view toggle + Direction-readiness band (anchor 02) (session 007, 2026-07-14)
**File:** `StrataStrategyRoomPage.tsx` only. **Map component NEVER touched** (hard gate).
2D split for the 2h rule: 2D-1 = toggle + readiness band; 2D-2 = JiraTable grouped structure tree
(Element·Owner·Health·KPIs·Cards·Benefits + gap chips + show-gaps-only); 2D-3 = inspector rail; 2D-4 = Narrative body.

### Decisions (Vikram, session 007)
- **P2-D5 Health source = derive from linked-measure bands** (labeled) — no element-health column/RPC exists
  (`strata_strategy_elements` has only stage/status). Applied in 2D-2 (the tree's Health column).
- **P2-D4 Narrative = 3-way toggle now, body later (2D-4)** — Narrative has no anchor chrome; 2D-1 ships the
  toggle + a "coming soon" placeholder; approach shown before building the body.

### Changes
- **View toggle** (`ViewToggle`, anchor 02): Structure / Map / Narrative. Structure = this authoring surface;
  **Map → `navigate(Routes.strata.strategyMap())`** (protected canvas, never imported — toggle only routes);
  Narrative → local `viewMode` placeholder. Replaces the old "Open Strategy Map" header button.
- **Direction-readiness band** (`ReadinessBand`, 4 tiles, replaces the old StrataStatStrip): OBJECTIVES WITH
  MEASURES · WITH OWNERS · EXECUTION COVERAGE · DRAFT ELEMENTS — all client-derived from elements +
  element_kpis + project cards (`objective_element_id`). Gaps carry a worded badge (N GAPS / DRAFT), color never alone.
- Removed dead `bandStats` memo + StrataStatStrip import. Existing tree + authoring modals + promote PRESERVED
  (no regression); filters hidden in Narrative mode.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799 after tokenizing 2 off-grid px) · CRE.
- **MAP BASELINE** (before 2D): `/strata/strategy/map` = 18 React-Flow nodes · dashed edges · 4 zoom controls · legend.
- LIVE (localhost:8080, staging) **light + dark**: readiness band renders (Measures 5/7·2 GAPS, Owners 2/7·5
  GAPS, Execution 4/7·3 GAPS danger, Draft 4). Narrative → "coming soon" placeholder, filters hidden. **Map
  toggle → navigates to the map, VISUALLY IDENTICAL to baseline** (nodes/edges/legend/controls unchanged);
  `git status` confirms ONLY the Room page changed — map component + deps byte-untouched. ZERO-CHANGE GATE PASS.

---

## Slice 2D-2 — Strategy Room: JiraTable structure tree (anchor 02) (session 007/008, 2026-07-14)
**File:** `StrataStrategyRoomPage.tsx` only. **Map component NEVER touched** (re-probed — zero change).

### Changes
- **Replaced the hand-rolled recursive `renderNode` tree with a canonical `JiraTable`** (flat
  hierarchy-ordered rows + `getRowDepth` for indent — the Backlog "All Work" pattern). Columns:
  **Element** (chevron collapse + type chip + name link + DRAFT lozenge + gap chip, indented) · **Owner** ·
  **KPIs** (element_kpis count; objective with 0 → warning-toned+bold) · **Cards** (project cards by
  `objective_element_id`; a theme rolls up its descendants) · **Actions** (Promote + Actions menu).
- **Gap chips** on objective rows: NO MEASURES (0 KPIs) / NO OWNER (no owner_id), anchor 02.
- **"Show coverage gaps only"** toggle (panel header) — filters to gap rows + their ancestor themes.
- Panel retitled "Strategic structure". **Dropped the KPI-coverage + Cause & effect panels** (subsumed by
  the tree's KPIs column + the readiness band; cause-and-effect lives in the Map view — anchor-faithful,
  same pattern as 1C dropping the Models grid). Expand/collapse + all authoring modals + promote PRESERVED.
- Removed now-dead: `renderNode`, `objectives`/`kpiLinksByElement`/`kpiById` memos, `TREE_CSS`, `useMapEdges`/
  edges, `CatalystTag`/`fmtRatioPct`/`Network`/`MoveRight` imports.
- **Health + Benefits columns → slice 2D-2b** (Health = derived rollup via useQueries; Benefits = multi-hop).

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: tree renders indented (themes→objectives→sub-objectives),
  chevron collapse, NO MEASURES/NO OWNER chips, DRAFT lozenges, KPIs (orange 0 gaps)/Cards counts (B2B theme
  Cards=3 rollup), Promote+Actions. "Show coverage gaps only" → drops non-gap themes (Digital Market
  Leadership, ZZTEST), keeps gap objectives + ancestors. **MAP re-probed → visually identical to baseline;
  git shows ONLY the Room page changed. ZERO-CHANGE GATE PASS.**

---

## Slice 2D-2b — Strategy Room tree: Health (derived) + Benefits (multi-hop) columns (session 008, 2026-07-14)
**File:** `StrataStrategyRoomPage.tsx` only. Map re-probed → zero change. Completes the anchor-02 structure tree.

### Changes
- **Health column (derived, P2-D5)** — no element-health calc exists, so rolls up linked KPIs' governed
  achievement bands: page-level `useQueries` over distinct linked KPI ids in the active period (`kpiApi.
  achievement`, same queryKey shape as elsewhere → deduped), objective = worst band of its measures, theme =
  worst of its objectives. Rendered as a band Lozenge + Tooltip "derived from the worst band of linked
  measures". No measures → "—" (zero-assumption).
- **Benefits column (multi-hop)** — element → Project Cards (`objective_element_id`) → benefit↔card links
  (`useBenefitProjectCards`) → distinct benefits; themes roll up descendants.
- Column order now matches anchor 02: **Element · Owner · Health · KPIs · Cards · Benefits · Actions**.
- **Folded Promote into the row Actions menu** (draft/proposed) so the tree needs no wide inline-button
  column — fixes the 7-column width squeeze; anchor says actions are "reachable from row menus".

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: Health shows ON TRACK (B2B Growth Engine, Grow B2B
  Revenue), WATCH (Network Excellence), "—" for 0-measure objectives + themes with no measured objectives
  (Investor Journey Transformation). Benefits multi-hop counts (B2B Growth Engine 2, Investor Journey 1).
  Actions dropdown fits; Promote in the menu. **MAP re-probed → identical to baseline; git shows only the
  Room page changed. ZERO-CHANGE GATE PASS.** ✅ Anchor-02 structure tree COMPLETE (2D-2 + 2D-2b).

---

## Slice 2D-3 — Strategy Room inspector rail (anchor 02) (session 008, 2026-07-14)
**File:** `StrataStrategyRoomPage.tsx` only. Map re-probed → zero change.

### Changes
- **360px inspector rail** in a 2-col grid beside the tree (P2-D1: reproduce the ViewBase "body + 360px
  rail" anatomy via a grid, not CatalystViewBase). Selected element shows: type chip + "Open full page →"
  + close; name + description; **`StrataChainStrip`** (↑ Theme parent · ◎ Measures = linked KPIs · ▦
  Delivery = Project Cards · ◇ Value = benefits, all real, links where a route exists); Owner/Lifecycle/
  Health(derived)/Perspective field grid; a **derived attention callout** (health warning/danger, else
  coverage gap); "…→ element detail" link. Placeholder when nothing selected.
- **Shared selection** — row-click + name-click **select** (set `selectedId`), they no longer navigate;
  selected name renders brand-toned; navigation moves to the rail's "Open full page →".
- **Esc closes** the rail (deselect). **<1280 → overlay drawer** (fixed right, dimmed blanket) via a
  window-width listener (`isNarrow`); ≥1280 = sticky rail column.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: selecting "Grow B2B Revenue" → rail shows chain
  (↑ B2B Growth Engine, ◎ B2B Revenue Growth, ▦ 3 cards, ◇ 2 benefits — matches the Cards=3/Benefits=2
  columns), ACTIVE lifecycle, ON TRACK health, "Coverage gap: no owner" attention. Esc → placeholder.
  **Resized to 1120px → rail becomes an overlay drawer over a blanket** (tree full-width). **MAP re-probed
  → identical to baseline; git shows only the Room page changed. ZERO-CHANGE GATE PASS.**
- NB: JiraTable has no single-row highlight hook, so selection feedback is the brand-toned name + the rail
  (no full-row background tint). NB: dev session had logged out mid-slice; Vikram re-authenticated to finish verification.

---

## Slice 2D-4 — Strategy Room Narrative view (P2-D4, approach approved) (session 008, 2026-07-14) — 2D COMPLETE
**File:** `StrataStrategyRoomPage.tsx` only. Map re-probed → zero change.

### Changes
- Replaced the "coming soon" placeholder with a **grounded executive narrative** (`renderNarrative`).
  Per strategy theme: a **composed verdict sentence** from real counts ("{Theme} spans N objectives:
  X/N measured and Y/N owned. Worst measure signal across the theme is {band}.") + a health lozenge
  (derived) + "Open →". Then each objective as a one-liner: name — {derived health or "not yet measured"};
  {measures} measures · {cards} cards · {benefits} benefits · {gap}. **No invented content** — every value
  comes from already-loaded data (elements, element_kpis, project cards, benefit↔card, achievement rollup).

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: Narrative tab → "B2B Growth Engine spans 5 objectives:
  3/5 measured and 0/5 owned. Worst measure signal … is on track." + objective lines with counts + inline
  "no owner"/"no measures" warnings; "Investor Journey Transformation spans 2 objectives: 0/2 measured and
  2/2 owned. No objective is measured yet." **MAP re-probed → identical to baseline; git shows only the Room
  page changed. ZERO-CHANGE GATE PASS.**

### ✅ 2D Strategy Room (anchor 02) COMPLETE — 2D-1 · 2D-2 · 2D-2b · 2D-3 · 2D-4 all shipped.
