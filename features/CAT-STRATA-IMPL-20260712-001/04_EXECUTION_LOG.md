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

---

## Slice 2E-1 — Element Detail: 2-col ViewBase restructure + rail (anchor 14) (session 008, 2026-07-14)
**File:** `StrataStrategyElementDetailPage.tsx` only. 2E split: 2E-1 layout; 2E-2 health verdict + chain
strip; 2E-3 charter/OKR restyle + promote + states.

### Changes
- Converted the auto-fit multi-panel grid to the anchor-14 **2-col ViewBase anatomy**: left analytical body
  (`minmax(0,1fr)`, flex column) + **360px sticky right rail**.
- **Right rail** (new): **Details** field rows (Type · Lifecycle lozenge · Owner · Perspective · Parent link ·
  Charter status for themes) — absorbs the old "Summary" panel; **History** — the audit events, moved out of
  the standalone "Audit" panel.
- Left body keeps every existing panel (Charter, Objectives, OKR Performance, Project Cards, Execution
  Summary, Governance, Strategy relationships) — **no regression**; the rich Theme features aren't in the
  anchor but stay (same "keep working features" rule as prior drifts). Removed the standalone Summary + Audit panels.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: objective (`grow-b2b-revenue`) → left body OKR Performance
  + relationships; rail Details (Objective · ACTIVE · Financial · Parent B2B Growth Engine) + History.
  Theme (`profitable-growth-proof`) → left body Charter/Objectives/OKR/… ; rail Details (Theme · DRAFT ·
  Root-level · Charter None) + History; header Edit/Charter/Add-Objective preserved. Both themes clean.

---

## Slice 2E-2 — Element Detail: Health verdict (derived) + StrataChainStrip (anchor 14) (session 008/009, 2026-07-14)
**File:** `StrataStrategyElementDetailPage.tsx` only.

### Changes
- **Health verdict** section now LEADS the left body (anchor 14): "{period} HEALTH" + derived band lozenge
  + "derived from linked measures" + a composed grounded sentence. Health = P2-D5 derived rollup — page-level
  `useQueries` over the element's linked KPI ids in the active period (`kpiApi.achievement`), worst governed
  band wins; verdict cites measure count, below-target count, and delivery-card count. No measures → "Not yet measured".
  useQueries placed before the early returns (rules of hooks).
- **StrataChainStrip** below the verdict: Theme (parent) · Measures (linked KPIs) · Delivery (Project Cards
  by objective_element_id / theme_id) · Value (multi-hop benefit↔card) · Decisions (strata_decisions by
  element_id). Links where a route exists; honest emptyText per segment.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: `grow-b2b-revenue` → "Q2 FY2026 HEALTH · ON TRACK ·
  derived from linked measures" + "Health is on track — derived from 1 linked measure, across 3 delivery
  cards."; chain = ↑ B2B Growth Engine · ◎ B2B Revenue Growth · ▦ 3 cards · ◇ 2 benefits · ⚖ no linked
  decisions. Both themes clean.

---

## Slice 2E-3 — Element Detail: Promote + charter restyle + responsive (anchor 14) (session 008/009, 2026-07-14) — 2E COMPLETE
**File:** `StrataStrategyElementDetailPage.tsx` only.

### Changes
- **Promote to active** — primary header action for draft/proposed elements (canAuthor-gated) + confirm modal;
  calls `strategyApi.promoteElement` (server-validated), lists the requirements, and surfaces the server
  rejection verbatim (§17). Restricted read-only is already handled (all edit affordances gate on canAuthor).
- **Charter restyle** — the theme charter panel now renders the anchor's INTENT (value_thesis/hypothesis) +
  SCOPE & ASSUMPTIONS (scope) prose with a charter-owner footnote, replacing the field dump.
- **Responsive** — `<1100` (isNarrow resize listener) folds the 360px rail below the left body (single column).

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) light + responsive: draft theme `profitable-growth-proof` → "Promote to
  active" button; modal → server rejection surfaced verbatim ("relation public.strata_play_charters does not
  exist" — a PRE-EXISTING backend bug in `strata_promote_element` for legacy elements, flagged as task_65642237;
  the UI handles it gracefully per §17). Resized <1100 → rail folds to a single column. Health/chain dark
  verified in 2E-2 (same components).

### ✅ 2E Element Detail (anchor 14) COMPLETE — 2E-1 · 2E-2 · 2E-3.
### Deferred (honest, noted): OKR anchor-table restyle (OkrRow accordion is functional); locked-snapshot band (nice-to-have).

---

## Slice 2F — Evidence: trust-story paragraph + locked-snapshot band (anchor 15) (session 009, 2026-07-14) — PHASE 2 COMPLETE
**File:** `StrataEvidencePage.tsx` only. Anchor 15 read in full at slice start.

### Changes (anchor 15 "trust story first, tables second" — polish; page already rich)
- **Trust-story paragraph** — a composed plain-language provenance sentence below the hero, grounded in the
  chain/calc data: "This {metric} figure of {value}, against a target of {target}, was calculated under
  formula v{n}, from upload run {run}, submitted by {who} on {date}. {validation clause}." Validation clause
  from actual.validation_status (validated/pending/rejected). Non-KPI kinds compose from the latest calc.
  Falls back to the generic one-liner when no calc. Nothing invented.
- **Locked-snapshot band** — `StrataSnapshotBand` renders above the content when the latest calc is frozen in
  a governance snapshot (`snapshot_id` → `strata_snapshots.locked_at`), and the trust paragraph appends
  "These facts are frozen as of {locked_at}." (live evidence shows no band).
- Existing hero, evidence chain, history chart, calculations dossier, `?from=` "Back to [origin]", and
  loading/error/empty states PRESERVED (already anchor-faithful "every step inspectable"). Deferred nice-to-
  have: exact Step/Fact lineage-table restyle (the richer chain panel already covers it) + "differs from live" markers.

### Verification (raw)
- Gates GREEN: tsc no errors · colors 0=baseline · audit no-increase (tokens 19799) · CRE.
- LIVE (localhost:8080, staging) **light + dark**: `b2b-revenue-growth` evidence (`?from=/strata/kpis`) →
  "← Back to KPIs & OKRs"; hero 111.3 ON TRACK; trust paragraph "This achievement pct figure of 8.9%,
  against a target of 8%, was calculated under formula v1, from upload run RUN-1001. Independently validated.";
  evidence chain intact. Both themes clean.

### ✅ 2F Evidence COMPLETE — and ✅✅ PHASE 2 (measure & direction) COMPLETE: 2A · 2B · 2C · 2D · 2E · 2F all shipped + merged.

---

## PHASE 3 (delivery & value) — Plan Lock `03_PLAN_LOCK_PHASE3.md` APPROVED (Vikram 2026-07-14, P3-D1…D8 confirmed, P3-D3 scoped-down)

### ⏳ Slice 3A-1a — Project Cards List canonical table (anchor 17) — DONE, gates green, live-verified; PENDING commit approval
- File: `src/modules/strata/pages/StrataExecutionPage.tsx` (only src file touched).
- Replaced hand-rolled card tiles (`CardGrid`/`ProjectCardItem`/`MilestonesSubtable` — banned hand-rolled UI)
  with a canonical grouped **`JiraTable`** (`ProjectCardsTable`) carrying anchor-17 strategic-contribution
  columns: **Card · source** (name + source_system·source_key·synced) · **↑ Objective** (objective_element_id
  → element name; dash when none) · **Health** (`StrataExecutionHealthLozenge`, faithful band-key map, P3-D4)
  · **Forecast Δ** (`forecast_variance_days`, signed, danger/success tone, tabular; "on hold"/dash) ·
  **Blockers** (open `is_blocker` count + worst OVERDUE age from `due_date` — no fabricated age, zero-assumption).
- Single flex column (Card·source) — JiraTable reserves a 640px floor per flex col, so Objective/Health/
  Forecast/Blockers are fixed widths + `overflowX="auto"`; table fits the panel (root-caused the 2-flex overflow).
- Row-click → full-page detail via `openCard`; added `?from=/strata/execution` to the detail suffix (origin
  preservation for anchor-07 back-link, consumed in 3A-2). GroupStatRow rollups + all 6 views + filters +
  dependency accountability + authoring modals **PRESERVED** (no regression).
- **Inline milestones RESTORED** (Vikram, DRIFT-7 reversed): canonical JiraTable **tree rows** — card row
  expands (chevron) to indented milestone child rows (name + status lozenge + due), `getRowDepth`/
  `getRowHasChildren`/`expandedRowIds`; `milestonesByCard` built once from `allMilestonesQ` (no per-row query).
  Hit a stale-HMR crash mid-edit (Fast Refresh saw the new prop undefined) — cleared by full reload; verified clean.
- GATES: `tsc` clean · `lint:colors:gate` 0=baseline · `audit:ads:gate` 19799/19799 (no category up) · `lint:cre` pass.
- LIVE (localhost:8080, staging) **light + dark**: theme-grouped tables render all 5 columns in-panel; source
  lines ("Jira · SLM · synced 10d ago", "Upload · PRJ-TEST-001", "Manual"); ↑ objective ancestry + "—" for
  unknown; health word-lozenges + tones; Forecast Δ "+20/+58/+92 days" danger + "—"; "1 open" blocker.
  Row-click → `/strata/execution/care-app-v3?…&from=%2Fstrata%2Fexecution`. Only console noise = pre-existing
  @atlaskit/select legacy-context warning (not this change). MAP file untouched.
### ⏳ Slice 3A-1b — Benefit-at-stake column (anchor 17, completes 3A-1) — DONE, gates green, live-verified; PENDING commit
- File: `src/modules/strata/pages/StrataExecutionPage.tsx` (only src file).
- Added the 6th anchor-17 column **Benefit at stake** (SAR, `fmtSarCompact`, between Forecast Δ and Blockers).
- **Page-level batch** (no per-row query): `useBenefitProjectCards()` (all links) → distinct linked benefit_ids
  for in-scope cards → `useQueries` over `valueApi.benefitValues(id)` → `plannedByBenefit` (the benefit's
  'planned' value for the active period, else its first planned row; memo keyed on resolved-count + period,
  KPI-library pattern) → `stakesByCard` = Σ over a card's links of `planned × (attribution_share ?? 1)`.
  Threaded `stakeByCard` through GroupedCardsSection → ProjectCardsTable. **Zero-assumption:** dash when a card
  has no linked benefit with a planned value. Objective width trimmed 20→16 so all 6 columns fit in-panel.
- GATES: `tsc` clean · colors 0=baseline · audit 19799/19799 · CRE pass.
- LIVE (localhost:8080, staging) **light + dark**: Care App v3 SAR 760M · Investor Journey Product SAR 1.2M ·
  IR Platform SAR 800K · CPQ/Enterprise/MIM "—" (no planned-linked benefit). Values read faithfully from
  `strata_benefit_values` (magnitudes are seed data, not fabricated). All 6 columns fit; Blockers visible.
- **✅ 3A-1 (anchor 17 Project Cards List) COMPLETE** — 3A-1a + 3A-1b. NEXT: **3A-2** (anchor 07 Project Card Detail).

### ⏳ Slice 3A-2a — Project Card Detail layout + rail (anchor 07) — DONE, gates green, live-verified; PENDING commit
- File: `src/modules/strata/components/ProjectCardDetailView.tsx` (only src file).
- Restructured to CatalystViewBase anatomy (reproduced via a 2-col grid, per P2-D1 — no CatalystViewBase fork):
  **strategic-role panel FIRST** (real prose from value_hypothesis/scope/business_case + chain links ↑Objective /
  ◈Theme / ◎Affects-KPIs) → **2-col grid** (left `minmax(0,1fr)` + **360px sticky rail**, collapses to 1-col <1100).
  Left body: **Health & forecast** panel (Progress / Baseline end / Forecast end w/ danger +Nd / Variance /
  Forecast source + ProgressBar + health_reason) → the EXISTING Tabs (Overview/Scope/Delivery) preserved verbatim.
  Right rail: **Details** field-rows (owner/PM/LeadBU/team/stage/budget/on-hold-derived, config-gated sponsor/budget) +
  **Source System** (system/reference/last-synced + "View reconciliation →" → executionImport + "STRATA summarizes and
  links" note). Replaced `StrataStatStrip` (counts now in tab titles). New helpers `DetailPanel`/`RailField`/`useIsNarrow`.
- Zero-assumption: dash for missing rail fields; no "Open in Jira" button (no real external URL stored — omitted, not faked).
- Preservation: all tabs + authoring modals + config-gating intact (2E precedent — anchor on top, rich panels kept).
- GATES: `tsc` clean · colors 0=baseline · audit 19799/19799 (fixed a +5 off-grid-spacing regression by tokenizing
  to `var(--ds-space-*)`) · CRE pass. LIVE **light + dark**: strategic role, health panel (Forecast +20 days danger),
  rail, Delivery tab (milestones table + authoring) all render; sticky rail; `?from=` breadcrumb back-nav.
### ⏳ Slice 3A-2b — Project Card Detail threats + value (anchor 07, completes 3A-2) — DONE, gates green, live-verified; PENDING commit
- File: `src/modules/strata/components/ProjectCardDetailView.tsx` (only src file).
- **Unified "What threatens the forecast"** left-body panel: merges milestones-at-risk (forecast slip / overdue) +
  dependencies + blockers (open, due-date overdue) + risks (open/mitigating) into one list, kind lozenge
  (MILESTONE/DEPENDENCY/BLOCKER/RISK), ranked by **client-derived schedule impact** (no `schedule_impact` column —
  milestone slip / dependency overdue days; risks carry no schedule date → rank last with impact level, never a
  fabricated day count). Full inventories stay in the Delivery tab (anchor: "reachable"), so no removal.
- **Value Contribution** rail panel: `useBenefitProjectCards` ⋈ `useQueries(valueApi.benefitValues)` × attribution
  share (active period else first) → Planned/Forecast/Realized SAR; **completion ≠ benefit** danger callout shown
  ONLY when realized=0 & progress>0 (Care App v3 has realized 749M → callout correctly omitted). Zero-assumption
  dash per kind; panel hidden when the card has no linked benefit.
- Light trim: removed Source System / Source Reference Key from the Overview tab (now in the rail SOURCE SYSTEM).
- GATES: `tsc` clean · colors 0=baseline · audit 19799/19799 · CRE pass. LIVE **light + dark**: threats "· 3"
  (2 milestones +20 days danger, 1 dependency open), value SAR 760M/184M(danger)/749M; sticky rail; tabs intact.
- **✅ 3A-2 (anchor 07 Project Card Detail) COMPLETE** — 3A-2a + 3A-2b. **✅✅ SLICE 3A (delivery detail spine) COMPLETE.**
  NEXT per Plan Lock order: **3B-0** (StrataValueBar hero + small-multiple variants) → 3B-1 Benefit Detail →
  3B-2 Portfolio Detail (new route) → 3B-3 Portfolio Index → 3C Import (scoped-down P3-D3).

---

## PHASE 3B (value spine)

### ⏳ Slice 3B-0 — StrataValueBar hero + small-multiple variants (P3-D5) — DONE, gates green; PENDING commit
- File: `src/modules/strata/components/shared.tsx` (only).
- Additive `variant?: 'default'|'hero'|'multiple'` prop on `StrataValueBar` (default = existing single overlaid
  bar + legend, byte-unchanged path — existing consumer `StrataPortfolioVmoPage` passes no variant → no visual
  change, confirmed live). **hero** = labelled stacked rows (Planned/Forecast/Realized/Validated + amounts,
  leakage on the Forecast row) for anchors 08/21. **multiple** = compact 3-bar stack (planned · forecast+leakage ·
  validated) on shared scale, no labels, for anchor-22 small multiples. Safe token palette only (border-bold,
  background-information, background-success, background-success-bold, background-danger, background-neutral);
  spacing tokenized `var(--ds-space-*)`.
- GATES: `tsc` clean · colors 0=baseline · audit 19799/19799 · (CRE unaffected — no page/route change).
  Hero/multiple have no consumer yet → live-verified when consumed in 3B-1/2/3. Default consumer unchanged (verified).
- NEXT: **3B-1** Benefit Detail (anchor 21) — consumes hero variant.

### ⏳ Slice 3B-1 — Benefit Detail signature (anchor 21) — DONE (focused), gates green, live-verified; PENDING commit
- File: `src/modules/strata/pages/StrataPortfolioVmoPage.tsx` (`BenefitDetailSection`).
- Delivered anchor-21 **signature** elements: (1) **verdict band** — "VALUE POSITION · {period}" + value-position
  prose (`value_hypothesis`) + "{X} awaits attestation" warning lozenge (sum of realized values not yet
  finance-validated; hidden when 0, zero-assumption); (2) **hero value stages** — switched `StrataValueBar` to
  `variant="hero"` (Planned/Forecast/Realized/Validated labelled rows + amounts, leakage on the forecast row).
- Preserved: value-profile table (period/validation/Validate), value thesis, assumptions (status lozenges per DB
  value, P3-D6), attribution, gates, and the `validateBenefitValue` SoD attestation modals.
- GATES: `tsc` clean · colors 0=baseline · audit 19799/19799 · (CRE unchanged). LIVE **light + dark** (Enterprise
  Revenue Uplift: Planned SAR 8M / Realized+Validated SAR 6.5M hero bars; verdict prose; PENDING+Validate).
- **PARTIAL vs Plan Lock 3B-1:** the fuller 2-col restructure — a 360px rail with **IN THE CHAIN** (objective/
  delivery/measured-by/gate links) + **Confidence** panel, and attestation-history-as-timeline — was NOT done in
  this focused pass (Confidence stays in the Value-thesis panel; attestation state stays in the value table).
  Flagged as remaining anchor-21 polish. NEXT: **3B-2** Portfolio Detail (new route, consumes hero).

### ⏳ Slice 3B-2 — Portfolio Detail (anchor 08) — NEW route — DONE, gates green, live-verified; PENDING commit
- Anchor 08 (`08 Portfolio & Benefit Realization.dc.html`) re-read in FULL via DesignSync — **no drift** vs Plan Lock 3B-2.
- **Route split (P3-D7), surgical + shadow-checked:** `src/lib/routes.ts` → `strata.portfolioDetail(slug, from?)`;
  `src/modules/strata/StrataRoutes.tsx` → lazy `PortfolioDetailPage` + `<Route path="portfolio/:slug">` placed
  AFTER `portfolio/benefits/:slug`. React-Router specificity keeps `benefits/:slug` (static seg) and
  `:slug/evidence` (3 seg) ahead of `:slug` — **verified live: no shadow** (benefit deep link → VMO benefit
  detail; evidence → EvidencePage; `/strata/portfolio` index → untouched VMO page). `usePortfolioBySlug` now consumed.
- **New page `src/modules/strata/pages/StrataPortfolioDetailPage.tsx`** (anchor-08 anatomy):
  (1) **value-position leakage hero** — leakage headline lozenge + **grounded verdict sentence** composed only from
  real Σaggregates (top-2 leaking benefits named; realized/validated/awaits-attestation clause) + `StrataValueBar
  variant="hero"` waterfall; (2) **benefits JiraTable, leakage-sorted** — Benefit (brand link + "via N cards"
  subline) · Planned · Forecast (danger-toned when leaking) · Realized · Validated · Confidence (level·%, e.g.
  "High · 80%") · Attestation lozenge (Validated/Pending/Not due); row → `Routes.strata.benefit`; (3) **Gates —
  decision-context list** (stage badge + benefit name + status lozenge + stage criteria + due/`N days overdue` +
  role-gated `Decide` → `StrataDecisionModal` → `valueApi.decideGate`); (4) **"completion ≠ benefit"** footer.
- **P3-D2 client-derive, NO migration:** `useQueries` over each benefit's `valueApi.benefitValues`; per benefit
  pick active-period-else-latest snapshot; Σ per kind across benefits; **validated = Σ realized rows where
  `validation_status==='validated'`** (there is no `validated` value kind). Zero-assumption: dash where a kind is
  absent; leakage = Σplanned − Σforecast only when forecast < planned.
- **Header:** matched sibling detail pattern (KPI/Scorecard/Element) — `ProjectPageHeader` H2 = `title ?? routeWord`
  and routeWord = hub label "Portfolio & VMO", so pass trail = section back-link only + `title={portfolio.name}`.
  (Caught in live-verify: initial two-crumb trail left the H2 as the hub label.)
- GATES: `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` 19799/19799 (fixed 2 new offenders in-file:
  `'12px 0'`→`var(--ds-space-150)`, `marginTop:2`→`var(--ds-space-025)`) · `lint:cre` passed. LIVE
  **light + dark** on `/strata/portfolio/transformation-portfolio-fy2026` — no console errors; states
  grayscale-distinguishable. **Map zero-change** (git diff empty). Changed set: routes.ts, StrataRoutes.tsx,
  StrataPortfolioDetailPage.tsx (new), session 012 log.
- **DEFERRED:** objective-hop subline ("↑ objective", multi-hop benefit→card→objective) — "via N cards" shown
  instead. NEXT: **3B-3** Portfolio Index (anchor 22) — repurpose `/strata/portfolio`, consumes `variant="multiple"`.

### ⏳ Slice 3B-3 — Portfolio Index (anchor 22) — repurpose `/strata/portfolio` — DONE, gates green, live-verified; PENDING commit
- Anchor 22 re-read in FULL via DesignSync — **no drift** vs Plan Lock 3B-3.
- **`StrataValueBar scaleOverride?` (shared.tsx, additive):** default = self max (behavior-preserving; hero/default
  consumers unaffected — verified live). Lets several `multiple` bars share ONE scale (anchor-22 planned=100%).
- **New `src/modules/strata/pages/StrataPortfolioIndexView.tsx`** (anchor-22): subtitle (N portfolios · Σplanned ·
  attribution rules v2) · grounded **leakage-concentration sentence** (top portfolio's share of the total gap,
  composed from real aggregates) · **value-by-stage small multiples** ("SHARED SCALE · PLANNED = 100%",
  `StrataValueBar variant="multiple" scaleOverride={globalMaxPlanned}`, ranked order, "No claims yet" empty) ·
  **ranked-by-leakage JiraTable** (Portfolio + "owner · N benefits" · Planned · Forecast · Leakage[danger if the
  row owns ≥50% of the total gap, else warning] · Validated · Weakest link) → row → `Routes.strata.portfolioDetail
  (slug, from?)`; top-leakage row focused · **comparability footer** (attribution-rules-v2 statement + open-gate
  exposure count). States: loading · error · empty(canAuthor→create) · per-panel value-load error.
- **P3-D2 aggregation:** one `useBenefits()` (all benefits, carry `portfolio_id`) + `useQueries` per benefit
  `benefitValues`; per benefit active-period-else-latest snapshot; Σ per portfolio; validated = Σ realized·validated;
  weakest-link client-derived (max-leakage benefit else lowest-confidence). Committed-spend SAR NOT rendered (no field).
- **Dispatcher (`StrataPortfolioVmoPage.tsx`):** existing body renamed `StrataPortfolioManageView` (byte-identical);
  new default export dispatches bare `/strata/portfolio` (no `?portfolio=`, no benefit slug) → `StrataPortfolioIndexView`,
  else → `StrataPortfolioManageView`. Dispatcher keeps a stable hook list (each branch a whole child component) →
  no rules-of-hooks violation. Preserves `?portfolio=` management (3B-2 "Manage benefits") + `/benefits/:slug`.
- GATES: `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` 19799/19799 (no new offenders, first pass) ·
  `lint:cre` passed. LIVE **light + dark** on `/strata/portfolio` — index renders; **shared-scale confirmed**
  (Investor Experience 3.1M bar ~10% vs Transformation 27M full bar); leakage danger(−8.6M, 91% of gap) vs
  warning(−750K); top row focused; grounded sentence; comparability footer; no console errors. **Dispatcher
  verified:** row → 08 detail; `?portfolio=…` → ManageView (switcher/stat strip/members/register unbroken);
  `/benefits/…` → ManageView benefit detail with **hero bar unchanged** (14M/13.8M/12.5M/12.5M). **Map zero-change.**
- Changed set (4 files): shared.tsx, StrataPortfolioVmoPage.tsx, StrataPortfolioIndexView.tsx (new), session 013 log.
- **DEFERRED:** <1100 responsive column-drop (small multiples already `auto-fit`); committed-spend SAR (no field).
  NEXT: **3C** Import & Reconciliation (anchor 18, P3-D3 scoped) — last Phase-3 slice.

### ⏳ Slice 3C — Import & Reconciliation (anchor 18, P3-D3 scoped) — DONE, gates green; PENDING commit — PHASE 3 COMPLETE
- Anchor 18 re-read in FULL via DesignSync. Anchor depicts the full Jira reconciliation engine (Matched/Conflict/
  Unmatched, both-sides diff, 24h undo, run log) — **none of that backend exists** (P3-D3, not a drift).
- **Reality:** `importApi.importExecutionBatch` = Excel batch dry-run/apply → `ExecutionImportResult` (per-sheet
  `ExecutionImportRowResult[]` with `status:valid|error`, `action:create|update`, errors/warnings + `summary
  {total,created,updated,rejected}`). Current page = 6-step wizard (Upload→Classify→Map→Preview→Confirm→Summary)
  with per-row validation tables already honest.
- **Surgical redesign (`StrataExecutionImportPage.tsx`, +54/−14; steps 0–2 untouched):**
  (1) **Preview step** — DRY RUN `Lozenge` + filename line + Download-error-report; **`StrataStatStrip`** summary
  (WILL CREATE[success-tinted] · WILL UPDATE[info] · REJECTED[danger when >0] · WRITTEN 0 "nothing is written until
  you apply") mapped honestly from `summary`; pass/fail `SectionMessage`; per-row `ResultTable`s kept.
  (2) **Confirm step** — honest **COMMITMENT** band (sunken): apply writes in one batch; re-import idempotent
  (matched-by-reference updates in place, never duplicates); history in upload run + audit; **NO 24h undo** (no
  revert RPC). (3) Primary buttons **role-gated** (`!hasImportRole` disables Preview & validate + Apply); CTA
  relabelled **"Apply import"**. Added `StrataStatStrip` import.
- GATES: `tsc` clean · colors 0=0 · audit 19799/19799 · `lint:cre` passed. LIVE upload step **light + dark**
  (wizard shell/stepper unregressed, no console errors). **⚠️ Preview/confirm steps NOT screenshotted** — behind a
  file upload; Chrome MCP `file_upload` only accepts user-shared paths, rejects scratchpad files (env limit, like
  Vitest). Verified via tsc + gates + code review (all canonical components). **Vikram: commit + merge with this
  verification (2026-07-15).** Map zero-change. Changed set: StrataExecutionImportPage.tsx + session 014 log.
- **✅ PHASE 3 COMPLETE** (3A·3B-0·3B-1·3B-2·3B-3·3C). NEXT = Phase 4 (governance & data) — own Plan Lock required.

### ⏳ Slice 4A — StrataLifecycleStepper (canonical, §18) — DONE (component only), gates green; PENDING commit
- **New canonical `StrataLifecycleStepper`** in `src/modules/strata/components/shared.tsx` (P4-D0). API:
  `{ steps:StrataLifecycleStep[]{id,label,state:'done'|'current'|'todo'|'failed',note?}, variant:'full'|'dots',
  ariaLabel, testId }`. `variant='full'` = numbered circles (✓ done / n current+todo / ! failed) + label + optional
  per-step note (anchors 09 run detail / 20 upload wizard); `variant='dots'` = compact 10px filled circles for
  in-table review lifecycle (anchors 23 registry / 10 cockpit). Token-pure (done=success-bold, current=warning,
  failed=danger, todo=neutral/border); a11y per-step `aria-label="{label}: {state word}"`, glyph+label carry state
  (never colour alone). Circle 26px, connector success-bold when prior done.
- **DRIFT-8 (RAISED):** consumer refactors (`StrataDataPipelinePage`/`StrataUploadWizardPage`) DEFERRED to redesign
  slices 4E/4F/4B/4C — no behavior-preserving swap exists (anchor current=warning ≠ existing brand/info; DataPipeline
  stepper is icon-dot and removed by anchor 19). Component ships alone (3B-0 precedent).
- GATES: `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` 19799/19799 (fixed off-grid `marginTop:13`→`12`) ·
  `lint:cre` passed. No live surface yet (unconsumed) → live-verified when first consumed (4B/4E). **Map zero-change.**
  Changed set: shared.tsx + feature docs. NEXT: **4B** Reviews Index (anchor 23) — first `variant='dots'` consumer.

## Slice 4B — Reviews Index (anchor 23), StrataReviewsPage index branch — BUILT + verified (session 016)
- **Redesigned the `!isDetail` branch** of `StrataReviewsPage.tsx` to anchor 23; gated the existing cockpit detail
  column to `isDetail` (fixed `selected = snapshots[0]` index leak — `/strata/reviews` no longer rendered a full cockpit).
- **Index surface:** NOW band (derived most-consequential fact + Open cockpit →) → **Review registry** JiraTable
  (Review [name+locked date] · Stage lozenge [Closed if period closed else In progress] · Lifecycle
  `StrataLifecycleStepper variant="dots"` 5-stage readiness/snapshot/decisions/actions/pack · Snapshot key · Decisions
  ["N recorded · M open"] · Follow-ups [X of Y closed · Z overdue, danger]; row→cockpit) → **Snapshot registry**
  JiraTable (Snapshot [struck-through if superseded] · Frozen [locked_at] · Basis of [name + decision-record count] ·
  Supersedes [reverse `superseded_by_id` scan]).
- **Derived-review model (P4-D1 / DRIFT-9):** review == current non-superseded snapshot; all lifecycle/stage/counts
  composed client-side over snapshots+decisions+actions+board-packs. Cadence subtitle CUT; StatStrip dropped (subsumed).
- **Preserved** the governed Close-period ritual (`periodGovernancePanel`) below the registries (Regression rule — not
  in anchor 23 but a working feature; relocated, not deleted). Removed orphaned `governanceBand` memo.
- **New (thin, no migration):** `governanceApi.boardPacksAll` + `useAllBoardPacks` (plain select) for the pack-stage dot.
- GATES: `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` tokens 19799/19799 (fixed a NOW-band off-grid
  `10px`→`12px`) · `lint:cre` passed. Live-verified localhost:8080 **light + dark** (lifecycle dots honest, not
  flat-done); detail branch `/SNAP-1001` cockpit UNCHANGED; map `/strata/strategy/map` zero-change (0 map files); no
  console errors. Changed set: StrataReviewsPage.tsx + domain/index.ts + hooks/useStrata.tsx + feature docs. NEXT: **4C**.

## Slice 4C-1 — Decision Cockpit context layer (anchor 10), StrataReviewsPage detail branch — BUILT + verified (session 017)
- Detail branch (`isDetail`) gains the anchor-10 governance-context layer, ABOVE the preserved evidence/decision panels:
  1. **Header review-stage lozenge** (CLOSED / IN PROGRESS, derived from period.close_status via `selectedStage` memo)
     beside the existing snapshot-state lozenge.
  2. **Snapshot identity band** — reused `StrataSnapshotBand` (shared.tsx:539; `basis` is a ReactNode so NO component
     change): `{snapshot_key} · frozen {locked_at} · {items.length} frozen records · {kpiItemCount} KPIs ·
     {benefitItemCount} benefits · every number below is snapshot truth`. Counts derived from snapshot_items entity_type.
  3. **Review lifecycle strip** — `StrataLifecycleStepper variant="full"` with per-step notes; `selectedLifecycle` memo
     derives 5 stages (readiness/snapshot/decisions/actions/pack) for the selected snapshot from snapshots+decisions+
     actions+board-packs (same honest derivation family as 4B's registry dots).
- Corrected a pre-existing FactChip mislabel the band surfaced: `configCount` was labeled "frozen records" (it counts
  config-version domains = 3, contradicting the band's true 30) → relabeled "config version(s)".
- Preserved 01 Key metrics / 02 Frozen evidence / Decisions&actions / Board packs / Audit below (no regression).
- GATES: tsc clean · lint:colors 0=0 · audit:ads 19799/19799 · lint:cre passed. Live-verified light+dark on SNAP-1001
  (rich) + SNAP-1 (sparse, honest todo states); index branch unbroken; only StrataReviewsPage.tsx touched (map
  zero-change); no console errors. NEXT: **4C-2** (decision + actions registers, verdict band, compare-with-live) → 4G.

## Slice 4C-2 — Decision + Actions registers (anchor 10), StrataReviewsPage detail branch — BUILT + verified (session 017)
- "03 Decisions & actions" restructured into the anchor-10 **2-col 7fr/5fr** register layout (flex-wrap responsive).
- **Decision register** (left) — `renderDecision` reworked from chevron-expand into always-visible cards: status lozenge
  + key + title + snapshot-evidence prose + **verdict-record band** (decided/closed: status-as-verdict + "Recorded by
  {decided_by ?? —} · {decided_at} · against {snapshot_key}") + evidence-ref tags + governed authoring preserved
  (Mark decided / Close decision / New action). Removed `expandedDecisionId` state + ChevronDown/Right imports.
- **Actions register** (right) — NEW `renderActionRow` + `snapshotActions` memo: flat list of this snapshot's actions,
  each carrying "from {decision_key}" ancestry + owner + due tone (overdue→danger) + status + Start/Done/Cancel;
  footer "Follow-ups: N of M closed · K overdue".
- Honest deviation: no dead "Evidence →" link (no single per-decision evidence route; evidence_refs shown as tags).
- Runtime TDZ bug caught in live verify (tsc green): `todayISO` used by `snapshotActions` before its declaration →
  relocated above the first consumer. (Lesson: tsc misses const-before-decl inside a memo dep array; live load catches it.)
- GATES: tsc clean · lint:colors 0=0 · audit:ads 19799/19799 (fixed off-grid `marginTop:2`) · lint:cre passed.
  Live-verified light+dark on SNAP-1001 (DEC-1001 card + verdict band + 2-action register + footer); index unbroken;
  only StrataReviewsPage.tsx touched (map zero-change); no console errors. NEXT: compare-with-live/present/export (→4G) or 4D.

## Slice 4C-3 — Compare-with-live (anchor 10, P4-D5), StrataReviewsPage cockpit — BUILT + verified (session 017)
- Identity band `actions` slot gains a **"Compare with live"** toggle → a Snapshot-vs-live panel. Client diff of each
  frozen KPI's snapshot value (`snapshot_items.payload.value`/`status_key`) vs its LIVE `strata_calc_kpi_achievement`
  recalc over the snapshot's OWN period (`selected.period_id`, NOT activePeriod). No RPC/migration.
- Batched `useQueries` over frozen KPIs (mirrors StrataKpiLibraryPage), `enabled` gated on the toggle so the RPC batch
  fires only when opened. Dedup frozen kpi items by `entity_id`; names resolved via `useKpis`. `KpiAchievementPayload`
  client cast. Restatement = |Δ achievement %| > 0.05 OR band flip; panel shows only restated rows + a "N compared ·
  M restated" summary, or "Snapshot matches live" when 0.
- New imports: `useQueries` (@tanstack/react-query), `kpiApi` (domain), `useKpis` (hooks).
- GATES: tsc clean · lint:colors 0=0 · audit:ads 19799/19799 · lint:cre passed. Live-verified SNAP-1001 (closed period)
  light+dark: 8 KPIs compared · 0 restated → "Snapshot matches live" (honest; locked period live == frozen). Only
  StrataReviewsPage.tsx touched (map zero-change); fresh-reload console clean (a transient HMR stale-ref error during the
  edit sequence cleared on reload). **Decision Cockpit anchor-10 COMPLETE (4C-1+4C-2+4C-3).** NEXT: 4D (anchor 19).

## Slice 4D — Data & Lineage Landing (anchor 19), StrataDataPipelinePage landing branch — BUILT + verified (session 018)
- **P4-D8:** promoted `StrataFreshnessGlyph` to `shared.tsx` (timestamp-based; KPI-library thresholds/glyphs/tokens
  replicated exactly; library consumer not refactored — DRIFT-8 precedent).
- Guarded the lifecycle stepper to run-detail-only (landing carried a neutral 8-dot stepper; anchor 19 has none).
- Judgment sentence (`DataLandingJudgment`, derived) + Sources table (`buildSourceRows`, consequence-ranked from
  last-run freshness since `health` is null; freshness glyph; contract from last run's template_version; downstream KPIs
  backward-derived via `strata_kpis.data_source_id`, P4-D4, with scorecard/snapshot forward impact a labeled gap;
  last-run stacked; derived Stale/Aging/Healthy status) + Recent runs table (Run·What[file+owner+date]·Rows·Status·
  Waiting-on-it[danger when runNeedsResolution]). Source→detail NOT built (no route/page; deferred). Run→09 preserved.
- New hooks: `useKpis`, `useProfileNames`. GATES: tsc · colors 0=0 · audit 19799/19799 · CRE all green. Live-verified
  light+dark; only shared.tsx + StrataDataPipelinePage.tsx touched (map untouched); fresh-reload console clean. NEXT: 4E.

## Slice 4E — Run Detail (anchor 09), StrataDataPipelinePage RunDetailSection — BUILT + verified (session 019)
- 7-step lifecycle stepper via canonical `StrataLifecycleStepper` (adopts 4A; `runLifecycleSteps` from run.status+rejects);
  removed the old 8-stage PipelineStepper + machinery + page-level mount.
- 2-way validation summary (P4-D3, no quarantine tile) + clustered errors (`clusterErrors`, GROUP BY error_code+field_name,
  message+suggested_fix; honest empty-state when rejected>0 without detail). Commit panel: promote (existing RPC) + honest
  reversibility (P4-D7) + client Download-rejected CSV. Downstream rail (P4-D4 backward-derived KPIs + honest forward gap) +
  contract/lineage field rows. Kept staged-rows table + attestation modal (attestation quarantine verdict preserved).
- Removed dead: errorColumns, entityCounts, PipelineStepper/PIPELINE_STAGES/stageStates/StageDot, rowNumberByStagingId,
  unused imports. GATES: tsc · colors 0=0 · audit 19799/19799 (fixed marginTop:2→4) · CRE green. Live-verified light+dark
  (RUN-1001 full experience: 2 clusters, 3 dependent KPIs, lineage; RUN-9 honest empty-state). Only StrataDataPipelinePage.tsx
  touched (map untouched). NEXT: 4F Upload Wizard (anchor 20).

## Slice 4F — Upload Wizard (anchor 20), StrataUploadWizardPage — BUILT + verified (session 020)
- Replaced the hand-rolled stepper with canonical `StrataLifecycleStepper` (7-step lifecycle; wizard owns Contract/Upload/
  Map, rest todo → run detail 09). Step model → 3 (Contract/Upload/Map); Preview+Submit replaced by a MAP step (`MapStep`)
  with AUTO/CONFIRM/DECIDE mapping table (`buildMapRows` client name-match heuristic — mapping_rules empty) + monospace
  Your-column + real Sample values + per-row ADS Select over column_schema + "Leave unmapped" + Match lozenge + honest
  MAPPING MEMORY band. Continue gated on no unresolved DECIDE; "Continue to validation" stages remapped raw + →run detail.
- Deviations (honest): role gate kept as 4-role warning (anchor data_steward-only) — no hard block, DB enforces; no
  "Save & exit" draft (no persistence path). Removed dead PreviewStep/precheckRows/RowCheck/summaryRow/PREVIEW_CAP.
- GATES: tsc · colors 0=0 · audit 19799→19798 (baseline ratcheted down) · CRE green. Live-verified light+dark (CSV paste →
  MAP step: 3 AUTO + 1 DECIDE, Continue disabled→enabled on DECIDE resolve). Only StrataUploadWizardPage.tsx + audit
  baseline touched (map untouched); console clean. NEXT: 4G Board Pack (anchor 24) + cockpit present/export.

## Slice 4G — Board Pack + Present mode (anchor 24), NEW route + StrataBoardPackPage — BUILT + verified (session 021) — PHASE 4 COMPLETE
- NEW `Routes.strata.boardPack(snapshotKey)` → `/strata/reviews/:snapshotKey/pack` + `StrataRoutes` registration; new
  `StrataBoardPackPage` (resolves via `useSnapshotByKey`). Editorial-arc preview (Cover + Condition/Explanation/Value/
  Decisions/Follow-through page cards) with GROUNDED narrative from snapshot items/decisions/actions (KPI band tally,
  benefit-count honest gap, per-page snapshot stamp) + LOCKED SNAPSHOT band. Present mode `?present`/`?section` overlay
  (16:9, ←/→/Esc). Print/PDF reuses `generateBoardPackPdf`. Cockpit detail header gains a "Board pack" action.
- Deferred P4-D2 (no fabrication): editorial builder + Issue + draft numbers + compare-since-freeze.
- GATES: tsc · colors 0=0 · audit 19798/19798 · CRE green. Live-verified light+dark (editorial arc grounded, present-mode
  nav + Esc). Map untouched; console clean. **PHASE 4 (governance & data) COMPLETE — anchors 23·10·24·09·19·20 + 4A.**

---

# R0 · P0-A — approved-model aggregate immutability (D-1) · migration `20260716160000`
**Session 026 · branch `strata/measures-2b` · target `catalyst-staging` (cyijbdeuehohvhnsywig, ACTIVE_HEALTHY, verified)**

## What shipped
1. **RLS** — `strata_scorecard_model_perspectives_write` and `strata_model_measures_write` rewritten to
   `strata_has_role(['strategy_office']) AND EXISTS(parent WHERE status='draft')`, stated in **both** USING and
   WITH CHECK (covers INSERT/UPDATE/DELETE per E-4). The measures policy previously had `with_check` NULL.
2. **RPC** — `strata_set_model_measures` gains a parent-status guard. Body otherwise byte-identical to `20260716150000`.
3. **Client** — `configApi.setModelPerspectiveWeights` now throws when an UPDATE matches zero rows.
4. **UI** — `canAuthor = hasAuthorRole && m.status === 'draft'`; approved models render a visible immutability reason.
5. **Tests** — AC-6 fixture corrected to `draft` (DRIFT-11); new `p0-approved-model-immutable.test.tsx` (4 tests).

## Why BOTH layers (neither is redundant — each is the sole guard for one writer)
- Perspective weights have **no RPC**: `domain/index.ts:159` does a raw `.update()` as `authenticated`. **RLS is the
  only enforcement point for that path.**
- `strata_set_model_measures` is **SECURITY DEFINER** → runs as table owner → **bypasses RLS**. **The in-RPC guard is
  the only enforcement point for that path.**

## The silent-failure hazard this slice had to close
An RLS-filtered UPDATE matches **zero rows and raises nothing**. Without the row-count check, `setModelPerspectiveWeights`
would have reported success having written nothing — the UI would lie about a governed write. The count is load-bearing.

## Scope correction
`strata_element_kpis` is **excluded** from the draft-gate — see **F-8** / **DRIFT-10**. Gating it would break every KPI
link (`strata_link_element_kpi` requires `approved`).

## Status
✅ **DONE** — applied to staging, ledger 1:1, gates green, AC-1 (§8.1) proven at RLS **and** RPC with a positive control.
**Follows immediately: P0-B / A3 revision RPCs (F-4 — A2→A3 back-to-back; until A3 lands, no model is editable,
because both staging models are approved. That freeze is correct and intended, and A3 restores the path via versioning.)**

---

# R0 · P0-B / A3a — scorecard-model governed revision (D-2) · migration `20260716170000`
**Session 026 · `strata_create_model_draft_version(p_model uuid, p_reason text) RETURNS uuid`**

## What shipped
RPC + `configApi.createModelDraftVersion` + a "Create new version" CTA on approved models (reusing the
existing Retire modal pattern — reason required, stated before the round trip) + 6 tests.

## Reuse — the supersession half already worked; this is the missing WRITER
`supersedes_id` exists on 9+ tables and was **never written**; `strata_approve_record` is its only reader and
**already** flips the predecessor to `superseded` + `effective_to=now()`. **`strata_approve_record` is NOT modified.**
SoD comes free: `created_by` defaults to `auth.uid()`, so a draft's author cannot approve it — proven below.
The slug trigger (`strata_generate_slug`, BEFORE INSERT) dedupes to `-2`, so the clone passes `slug=NULL` and the
slug contract holds without special-casing.

## Design choices (derivable; no new product decision)
- **`p_reason` REQUIRED** — D-2 says the revision "records actor/reason"; a NULL reason records nothing.
- **One open successor per predecessor** — two concurrent drafts would both carry `supersedes_id = p_model`, and
  approving both would supersede the same predecessor twice, the second silently overriding the first.
- **Revising a draft is refused** — a draft is already editable; cloning one forks the lineage for nothing.
- **CTA gated on `isScorecardModel`** — only the model RPC exists at A3a. Offering it for KPI/threshold would promise
  a verb the server cannot perform (A3b/A3c).

## Test correction worth recording
The first acceptance run drove `UPDATE … SET status='pending_approval'` directly and was refused by RLS
(`strata_scorecard_models_update` WITH CHECK is `status='draft'`). **The test was wrong, not the code** — submission is
RPC-only (`strata_submit_record`). Re-run through the real governed lifecycle: draft → submit → approve.

## Status
✅ **DONE** — applied to staging, ledger 1:1, gates green, §8.2 proven in full with the predecessor byte-identical.
**F-4 is now discharged: A2→A3 landed back-to-back, and the E-2 v2 clone path is unblocked.**

---

# R0 · P0-C / E-4 — governed-child auditability · migration `20260716180000`

## Census FIRST (verified against pg_trigger + information_schema — this shrank the slice)
| | tables |
|---|---|
| Already have `updated_at` + touch trigger + **`strata_audit` trigger** | **10** — kpi_actuals · kpi_targets · kpi_formula_versions · scorecard_lines · key_results · gate_model_stages · scorecard_instances · theme_charters · upload_runs · benefit_values |
| Have **none** of the three | **4** — model_perspectives · model_measures · element_kpis · initiative_kpis |

**Blueprint §13.2 is WRONG:** it says the 10 "already have `updated_at` — **triggers still required**". They already
have the triggers too. Nothing was done to them. E-4's real scope is exactly §13.1's 4 tables.

## Reuse — E-4 needed almost no new code
- **`strata_audit()` is already exactly what E-4 specifies**: `(entity_table, entity_id, TG_OP, auth.uid(),
  before=to_jsonb(OLD), after=to_jsonb(NEW))`, generic over any table with an `id`. The **parent** travels inside the
  payload (`model_id`/`kpi_id`/`element_id`), so "capture … parent" needs no extra column.
- **`strata_audit_events` already has `before` + `after` jsonb.** §13.3's "extend it rather than mint a second audit
  store" is satisfied by the shipped shape — no ALTER, no second store.
- **`strata_touch_updated_at()` reused verbatim** (§13.3 explicitly requires this).
- **One** new function: `strata_touch_updated_by()`. It is deliberately NOT folded into
  `strata_touch_updated_at` — that function is shared by 10 tables with no `updated_by` column, and assigning
  `NEW.updated_by` there would break every one of them.

## F-5 honoured mechanically, not just documented
`ADD COLUMN updated_at timestamptz` (no default) → existing rows **NULL**; `ALTER … SET DEFAULT now()` afterwards →
only NEW rows stamped. Same for `created_by`. A single `ADD COLUMN … DEFAULT now()` would have backfilled `now()` onto
all 8 legacy rows — asserting a change time that never happened, on the very rows under investigation. A
`COMMENT ON COLUMN` on each table carries F-5's marker: **NULL means UNKNOWN, never UNCHANGED.**

## Consequence for the register (§13.4)
The register is a LOWER BOUND **for everything before 2026-07-16** and becomes a true census **prospectively only**.
It can never retroactively recover the undetectable past. That wording stays mandatory on every run.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6. The in-place child UPDATE that was undetectable is now
captured with old+new values, parent, actor and timestamp.

---

# R0 · P0-D / A1 — integrity-exception register (E-1/E-2) · migration `20260716190000`
**`strata_integrity_exceptions` — append-only. TABLE SHIPPED · THE THREE RECORDS ARE BLOCKED ON F-1.**

## What this register does and does not do
It is **additive and append-only**. It touches no snapshot, no `snapshot_items.payload`, no model, no calculated
value. That is the whole point: §3.6 established the **numbers are safe** (the payload is frozen at lock and
`calcResult` reads the frozen payload), so what is broken is **resolution**, not values. The register **qualifies the
provenance claim** and leaves the official numbers exactly where they are. **The locked payload is never modified.**

## Shape (§3.8) + the two classes
`exception_class ∈ snapshot_provenance | model_approval_provenance` — E-2's B2B record is a **model** exception, not a
snapshot one, so a CHECK enforces that a snapshot record HAS a snapshot and a model record does NOT. `values_changed`
is a column, not an assumption (FALSE for both known records — but a future exception might not be so lucky).
`detection_is_lower_bound` is NOT NULL DEFAULT true per §3.7/§13.4.

## Append-only enforced, not intended
SELECT + INSERT policies only; **no UPDATE policy, no DELETE policy**, plus an explicit
`REVOKE UPDATE, DELETE … FROM authenticated`. Proven: both return **permission denied**. An accountability record that
can be edited or deleted is not evidence of anything. SELECT is `current_user_is_approved()` (not strategy_office):
§3.8/F-3 require the qualification to be visible wherever the qualified numbers appear, which a
strategy_office-only register could not satisfy.

## ⛔ F-1 — the ONE thing blocking the three records
`strategy_office_owner` is **NOT NULL by design**. E-1 mandates the field; an owner names a **person who accepts
accountability** and cannot be inferred from schema. **The table ships empty.** That is the honest state: zero rows
reads as "not yet recorded", whereas rows carrying a guessed or NULL owner would be a **fabricated audit trail** — the
exact failure this register exists to document. The three records (SNAP-1, SNAP-1001, B2B v1) are one INSERT away the
moment a name is given; their content is already written and evidenced in blueprint §3.8.

## Status
✅ **TABLE DONE** — applied, ledger 1:1, gates green, suite 2,434/6. ⛔ **RECORDS PENDING F-1.**

---

# R0 · P0-D2 — F-1 correction + the three exception records · migration `20260716200000`
**Alignment with the approved F-1 ruling. Not a new product decision.**

## What changed
`owner_role` (NOT NULL, DEFAULT `strategy_office`, CHECK over the six shipped roles — vocabulary copied from
`strata_role_assignments`' own CHECK, not invented) · `strategy_office_owner` → **renamed** `assigned_owner_id` and
made **nullable** · `status` (open|in_progress|closed) + `due_on` added alongside the existing `resolution` ·
`UNIQUE … NULLS NOT DISTINCT` · **the three records filed**.

## The correction
Session 026 modelled the owner as a required individual and left the register empty, calling F-1 a blocker. The ruling
is the opposite: the **role** is accountable. The register was blocked **by its own schema**, not by a missing fact.
Safe to restructure because the table was empty (0 rows), so the rename lost nothing and needed no backfill.

## Records filed (all `owner_role='strategy_office'`, `assigned_owner_id=NULL`, `detection_is_lower_bound=true`)
| class | subject | v | status | resolution |
|---|---|---|---|---|
| snapshot_provenance | SNAP-1 · CEO Enterprise Scorecard | 1 | open | preserved_with_qualification |
| snapshot_provenance | SNAP-1001 · CEO Enterprise Scorecard | 1 | open | preserved_with_qualification |
| model_approval_provenance | B2B Sector Scorecard (approved_at NULL) | 1 | open | superseded_prospectively |

**Every figure re-probed 2026-07-16, not copied from prose:** SNAP-1 → 1 post-lock perspective row; SNAP-1001 → 5;
both stamp CEO model **v1**. B2B → 3 perspective weights + 2 measures after it became effective.
`created_by` is NULL by design: these were filed **by a migration, not a person**. Do not stamp an actor who did not file them.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6. **F-1 is discharged and is no longer a blocker.**

---

# R1 · A3c — threshold-scheme governed revision (D-2) · migration `20260716210000`
**`strata_create_threshold_draft_version(p_scheme uuid, p_reason text) RETURNS uuid`**

## Why A3c was safe to land ahead of A3b (probed, not assumed)
`strata_threshold_schemes` has **no aggregate children**: its bands are a **`bands` jsonb column ON the scheme row**
(`[{key,label,min_score,appearance}, …]`), and the only FKs pointing at it (`strata_kpis.threshold_scheme_id`,
`strata_scorecard_models.threshold_scheme_id`) **reference** a scheme — they are not part of its definition. So the
clone is parent-only. **That is exactly what makes A3b different**: a KPI has relationship AND measurement children
(F-9). D-2 names all three RPCs in one breath, which implies one shape; **there are two**.

## The full definition is copied — bands, tolerance, confidence_threshold, escalation_rules
Omitting any would silently produce a v2 that rates differently from v1 for reasons nobody chose: **bands decide every
rating**, and tolerance/confidence gate whether a value counts.

## UI — a lookup, not a second boolean
`REVISION_RPC: Record<table, rpc>` drives the "Create new version" CTA, replacing A3a's `isScorecardModel` flag. The
CTA now appears **only where a revision RPC exists** (models, threshold schemes), so no table can be offered a verb the
server cannot perform. **`strata_kpis` is absent on purpose** — it joins when A3b lands.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6, §8.2 proven in full with the predecessor byte-identical.

---

# R0/R1 · A3b-1 — stable logical KPI lineage (F-9) · migration `20260716220000`

## Why lineage exists (the F-9 problem, restated)
A revision creates a NEW ROW with a NEW id. Without a stable identity, every relationship and fact still points at
v1; once v1 is superseded (E-7: superseded ⇒ historical only), **v2 would have no links and no actuals and every
objective would silently lose its measure.** `lineage_id` is the stable identity that makes revision survivable.
`id` identifies a **version** (a governed definition); `lineage_id` identifies the **KPI as a continuing concept**.

## Probe first — it made the backfill trivial
**17 KPIs · `supersedes_id` used ZERO times · every version = 1 · 10 approved (1 with `effective_from` NULL).**
No chains exist, so the backfill is one lineage per KPI. **The chain-aware recursive walk was written anyway** (the
ruling requires it, and it degenerates exactly to one-per-KPI with no chains) — correct today, correct later. Proven
against a simulated `v1←v2←v3`: **1 root, 3 rows**.

## Row IDs preserved — proven by checksum, not asserted
| | before | after |
|---|---|---|
| `md5(id set)` | `e7928cf9548900b1606277825b8b2ac0` | **identical** |
| `md5(id:version:status)` | `5e226ea9b071d2d4b7e0af6ef2529e62` | **identical** |
The migration only ADDS a column. No id rewritten, no row recreated, no FK repointed.

## Non-overlap is DECLARATIVE, not a trigger
`EXCLUDE USING gist (lineage_id WITH =, tstzrange(effective_from, effective_to, '[)') WITH &&) WHERE (status='approved')`
via `btree_gist` (available 1.7; installed here). A BEFORE-trigger check has a **race window** where two concurrent
approvals both see no conflict and both commit; an EXCLUDE constraint cannot be raced. Only `approved` rows
participate — drafts/pending/superseded/retired may overlap freely, which is precisely what lets a successor be
drafted while the predecessor is still live.
**Critical control proven: ADJACENT approved versions are ALLOWED.** Had the constraint rejected `[a,b)` followed by
`[b,∞)`, it would have forbidden the very supersession it exists to support.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6. **Next: the canonical effective-version resolver**
(step 4) — no UI surface may invent its own version resolution.

---

# R1 · A3b-2 — canonical KPI effective-version resolver (F-9) · migration `20260716230000`
**"Do not allow different UI surfaces to invent their own version resolution."** This is that single rule.

## Surface
| function | use |
|---|---|
| `strata_resolve_kpi_version(lineage, as_of)` | resolve from a lineage |
| `strata_resolve_kpi_effective(kpi_id, as_of)` | **resolve from ANY version's row id** — the relationship entry point |
| `strata_kpi_effective_at(as_of)` → TABLE | set-based, for calculations/joins (per-row calls don't belong in a calc) |
| `strata_kpi_current_effective` (view) | the common "as of now" case |

## The compatibility design (ruling-sanctioned, taken deliberately)
Relationship tables **keep their existing `kpi_id` FK**, now read as a **lineage entry point** rather than "the
version this relationship is about": the resolver hops `kpi_id → lineage_id → effective version`. **Nothing is
repointed, no FK changes** — the ruling's stated condition for this route. Indexes added on all three
(`element_kpis`, `initiative_kpis`, `model_measures`).

## Zero-assumption at the resolution point
NULL when nothing approved is effective. **Not** "fall back to latest", **not** "fall back to a draft". A caller that
gets NULL renders **Missing**. `status='approved'` is filtered here, at the single resolution point, so **no official
calculation can reach a draft by construction** (E-7 / DEF-010).
Overlapping matches **RAISE** rather than picking one — unreachable while the EXCLUDE constraint holds, but if it is
ever dropped, silently picking one version would be an invisible wrong number.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6. Proves 3 of the ruling's required tests outright:
present-day resolves v2 · historical still resolves v1 · drafts never resolve.

---

# R1 · A3b — KPI governed revision + revision materiality (D-2/D-3, F-9) · migration `20260716240000`
**`strata_create_kpi_draft_version(p_kpi, p_reason, p_revision_class) RETURNS uuid`**

## The line this RPC draws — the entire point of F-9
| | tables | action |
|---|---|---|
| **definition** (what the KPI IS) | KPI definition columns · `strata_kpi_formula_versions` | **CLONE** |
| **facts** (what was MEASURED) | `kpi_actuals` · `kpi_targets` · `key_results` · `scorecard_lines` | **NEVER clone, never repoint** |
| **relationships** (continuing intent) | `element_kpis` · `initiative_kpis` · `model_measures` | **NEVER clone** — they resolve through the lineage |
Cloning either non-definition class would fabricate history: an actual submitted against v1 **was** submitted against
v1, and duplicating a link would **double-count** the KPI in its objective. v2 inherits relationships **without a
single row being rewritten**, via `strata_resolve_kpi_effective()`.

## Two details that are easy to get wrong
- **`version = max(version)+1 across the LINEAGE**, not `v_src.version+1` — the source may not be the highest (e.g.
  revising a superseded version), and `(lineage_id, version)` is UNIQUE.
- **One open successor per LINEAGE**, not per row — two drafts anywhere in the lineage would both claim the next
  version number and collide on approval.

## Revision materiality — REQUIRED, never defaulted
`revision_class ∈ non_material | material`, enforced **at the DB** (`supersedes_id IS NULL OR revision_class IS NOT
NULL`) as well as in the RPC — proven: an unclassified revision is rejected even by a direct INSERT. **NULL ⇔ not a
revision**; it never means "unclassified".
**Why required:** defaulting it would be the system asserting *"this change is safe to trend through"* on behalf of an
author who never said so — a comparability lie, and the most expensive kind, because it is invisible in the number.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6.
**Proves 5 of the ruling's required tests:** lineage retained + version incremented · predecessor byte-identical ·
formula definitions clone · **facts do not clone** · draft versions never resolve into official calculations.

---

# Step 6a · calc-engine lineage resolution + full provenance (F-9 + B1) · migration `20260717100000`

## Done together, on purpose
The F-9 ruling's provenance list (KPI row id · lineage id · KPI version · formula version · target version ·
model-measure/config version · effective context) **IS** what B1 §4 needs captured. Capturing it twice would guarantee
two dictionaries that drift.

## 🔴 F-10 — the finding that decided this slice
Naive date-aware resolution would have made **3,210 of 3,212** existing KPI calculated values **Missing**, because
`effective_from` holds the **approval timestamp**, not a business-effective date (8 KPIs: `effective_from` ==
`approved_at` == `2026-07-04 22:56:51`, while their periods end 2026-03-31…2026-06-30). Resolved by **backward
extension of the earliest approved version** — see `09_DECISIONS.md` → F-10. **After: 3,212/3,212 resolve to their own
version; 0 become Missing.**

## What changed in `strata_calc_kpi_achievement`
1. **Resolves the version** at the **period's end date** (the date the result is ABOUT, not when someone presses
   recalculate) via the canonical resolver — never a hand-rolled predicate.
2. **E-7 condition 1 enforced at calc time in its own right:** a draft KPI resolves to NULL → `no_effective_kpi_version`.
   Previously an approved actual belonging to a draft KPI would have counted. Proven.
3. **Complete provenance** in `config_context`: `kpi_id · kpi_lineage_id · kpi_version · kpi_revision_class ·
   formula_version(+id) · target_version(+id) · actual_id · threshold_scheme_id · **threshold_scheme_version** ·
   resolved_as_of · requested_kpi_id`. The scheme **version** is captured because §3 proved an id + a static version
   number cannot re-resolve a configuration — and bands decide every rating.
4. `requested_kpi_id` vs `kpi_id` differ **iff** a revision occurred — the version switch is provable after the fact.

## The maths is untouched
Same direction cases, same clamps, same confidence damping, same zero-assumption early return. **18/18 results
byte-identical to the pre-migration baseline.**

## Blueprint correction
**§2.1's "calcs filter `validation_status='validated'` — a WHITELIST" is FALSE.** `strata_calc_kpi_achievement`
prefers validated and then **falls back to `pending`** (confidence × 0.6). The *conclusion* survives (quarantined
matches neither branch, so it is still excluded), but **pending actuals count today**, which is a real gap against
E-7's condition 3 ("validated **or** accepted-with-exception"). **Left for G1/E-6** — closing it here would change live
numbers outside this slice's scope. Logged, not silently adapted.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6, **zero numbers moved**.
**Next:** B1's other half — `strata_lock_snapshot.config_versions` completeness (§4) + `strata_calc_scorecard_instance`.

---

# Step 6b · B1 — snapshot config-version completeness (§4) · migration `20260717110000`

## The gap, verified in the shipped body
`config_versions` recorded only `{perspectives, threshold_schemes, scorecard_models}` — and each sub-select was
`WHERE status='approved'` with **no link to the snapshot**, i.e. it stamped **every approved config in the system**,
not the ones this snapshot used. KPIs, formula versions and measures were absent entirely. §4: *"today's blob
over-claims"*. Confirmed.

## Why this was only possible after step 6a
`snapshot_items` freezes `to_jsonb(cv)`, and 6a made every calculated value carry its complete provenance in
`config_context`. So **"the configs USED" is no longer a guess — it is read back from what actually happened.**
That is why `config_versions` is now written **after** the items are frozen.

## Now recorded
`used.{kpis (id+version+lineage+revision_class) · kpi_formula_versions · kpi_targets · threshold_schemes **with
version** · model_measures · resolved_as_of}` · `selection_semantics: used_only` · `draft_kpi_exclusion` (the rule +
the count actually excluded — **proves** the exclusion was applied rather than asserting it) ·
`provenance_completeness`. The legacy blob is **retained and relabelled** `all_approved_at_lock` (it is genuinely
useful as "what else existed then", and the two existing snapshots are annotated against it) — but it can never again
be mistaken for "what this snapshot used".

## A defect in my own migration, caught by testing it
The first version produced `threshold_schemes: [{id, version: null}, {id, version: "1"}]` — **the same scheme twice**.
Cause: `strata_calc_scorecard_instance` still writes a `config_context` with a scheme id but no version (only
`strata_calc_kpi_achievement` was wired in 6a), so a naive `DISTINCT` read one config as two.
**Deduping the null away would have over-claimed completeness — the exact fault §4 exists to fix.** Instead `used` is
derived ONLY from items carrying full provenance, and the rest are **counted**:
`provenance_completeness: {items_with_full_provenance: 8, items_without_full_provenance: 20, note: "LOWER BOUND …"}`.
The snapshot **declares itself a lower bound**, mirroring the §3.7 register discipline. **The count is also the to-do
list for step 6c.**

## Forward-only (§8.3) — proven
`md5` over all locked snapshots: **`128b14afc429bc18ad5dc14563edf3d3` before AND after.** No existing snapshot row is
touched; the two locked ones are annotated in `strata_integrity_exceptions` (E-1), never rewritten.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite 2,434/6.
**⚠️ Step 6c REMAINS:** `strata_calc_scorecard_instance` · `strata_calc_period` · `strata_calc_benefit_realization`
are **not yet wired** to the canonical resolver — that is exactly the 20 items counted above. Until they are, every new
snapshot's `used` block is honestly a LOWER BOUND.

---

# Step 6c · wire the remaining calcs (F-9 step 6 COMPLETE) · migration `20260717120000`
`strata_calc_period` · `strata_calc_scorecard_instance` · `strata_calc_benefit_realization`
(+ `strata_calc_kpi_achievement` and `strata_lock_snapshot` re-declared, see below)

## Closed the gap 6b measured
Every new snapshot said `items_with_full_provenance: 8 / items_without_full_provenance: 20`. **That count was the
to-do list, and it is now 42 / 1.** Per entity type: kpi **20/20** · scorecard_line **12/12** · scorecard_instance
**2/2** · perspective **8/9**. The single remainder is **genuinely stale data, not an unwired calc**: the two live
instances' models carry 5 + 3 = **8** perspectives, so every perspective that is actually calculated is covered; the
9th is a pre-6c row from an instance that no longer calculates. The metric correctly reports **LOWER BOUND** rather
than claiming completeness — it is doing its job, not decorating.

## 🔴 Latent bug fixed in `strata_calc_period`
It iterated `WHERE k.status='approved'` and joined targets on `t.kpi_id = k.id`. Once a lineage has v1 (superseded) +
v2 (approved), an **OLD period whose target sits on v1 finds no target on v2 → the KPI is never iterated → that
period's number SILENTLY VANISHES on recalc.** Harmless today (no lineage has >1 version) and fatal the moment one
does. Now iterates by **lineage**, resolves the version effective at the period end, and calculates that.

## A flaw in 6b's own metric, fixed here
6b keyed completeness on `config_context->>'kpi_version' IS NOT NULL` — **KPI-centric**. A benefit calculated value has
no KPI, so it would have counted as "incomplete" **forever**, even fully wired: the metric could never reach zero and
would have quietly stopped meaning anything. Every calc now stamps **`provenance_schema: 1`** and completeness keys on
that. It is a **version number, not a boolean**, so a future provenance change is detectable rather than silent.
`strata_calc_kpi_achievement` was re-declared to carry the marker — **not** by editing `20260717100000`, which shipped
and was applied; rewriting an applied migration breaks the file↔ledger contract.

## What each calc now records
- **scorecard_line** — model id+version+rollup, scheme id **+version**, resolved_as_of, ref_type, line weight, the
  full **`kpi_provenance`** block from 6a (so a line is traceable to the exact KPI version), and for objective lines
  **`objective_kpis`** = every linked KPI with its **resolved** version. Without that the roll-up is a number with no
  way back to its inputs.
- **perspective** — + `model_perspective_weight`: **the exact child value §3 proved can move under a static model version**.
- **scorecard_instance** — + the **resolved child aggregate** (`model_perspectives`, `model_measures` with weights and
  aggregation) that §4 requires, because version alone is unreliable.
- **benefit** — it wrote **no config_context at all**. Now records the assurance rule, the period cutoff rule,
  resolved_as_of and **exactly which benefit_values counted, with their validation_status**.

## Deliberately NOT changed (out of scope, would move live numbers)
`strata_calc_benefit_realization` still counts **only** `validation_status='validated'`. **F-7 rules that
`owner_confirmed` COUNTS**, which widens this whitelist and **will** move live numbers — that is R4 (E-6/F-7). The rule
is now *recorded in provenance*, so when it changes the change is visible and dated instead of silently rewriting what
past numbers meant.

## Status
✅ **DONE — STEP 6 IS COMPLETE.** Applied, ledger 1:1, gates green, suite 2,434/6.
**Scorecard instance + benefit results byte-identical to baseline. Zero numbers moved.**

---

# Step 7 · revision materiality — CONSUMER behaviour (F-9) · NO migration

## The problem underneath the ruling
`id` identifies a **version**. The KPI detail trend was built from **one** `kpiId`'s targets and actuals, so after a
revision the trend **silently restarts** and the KPI's history looks like it never happened. **"Display a methodology
break" had nowhere to appear, because the trend never spanned versions.** So step 7 is two things, and the second is
meaningless without the first.

## What shipped
1. **Lineage-aware history** — `kpiApi.lineageVersions/targetsForKpis/actualsForKpis`; `useKpiDetail(kpiId, lineageId)`
   now reads the **whole lineage** and returns `versions`. Facts keep their own `kpi_id` — **nothing is repointed**.
2. **Exact provenance per point** — each `TrendRow` carries `kpiVersion` + `revisionClass`, **read from the row's own
   `kpi_id`** (provenance, not inference). New **Version** column (`v2 ⚠`); unknown version renders a dash, never a guess.
   This is the ruling's "non_material continuity retains **exact provenance**".
3. **Methodology break** — an ADS `SectionMessage appearance="warning"` above the chart, naming **which version** and
   **from which period**, and the semantics that changed. Only `material` raises it.
4. **The rule is SHARED, not local** — `domain/materiality.ts` → `methodologyBreaks(points)`. Same reasoning as the DB
   resolver: the ruling forbids surfaces inventing their own version handling, and scorecard detail + board packs need
   the same answer (F-3). A page-local re-derivation would drift.

## 🔴 F-11 — found while verifying this slice: **the `tsc` gate is a no-op**
`tsconfig.json` is a solution config (`files: []` + references), so **`npx tsc --noEmit` compiles nothing**. A
deliberate `const x: number = "string"` in the page produced **no error**. The gate reported on every slice of this
feature has been **vacuous**. The real check (`-p tsconfig.app.json`) shows **159 pre-existing errors in 4 foreign
files** and **0 in ours**. Full detail + recommendation: `09_DECISIONS.md` → **F-11**. **No shipped claim rests on
tsc** — every claim in `06_VALIDATION_EVIDENCE.md` was established by DB probe or test.

## Status
✅ **DONE** — gates green, **8 new tests**, suite **2,442 passed / 6 failed** (baseline 2,434 → +8; the 6 are the
pre-existing foreign ChatDock failures). `usage-map.generated.ts` regenerated for the new import.
**Step 7's DB half was already proven in 6a** (material revision ⇒ Missing, never a carried-forward value).

---

# R2 · E1 — persisted review scheduling entity (D-6) · migration `20260717130000`
`strata_reviews` + `strata_review_participants` + `strata_review_readiness` (view) +
`strata_schedule_review` / `strata_update_review` + the D-6 backfill.

## What already existed — and it shrank the slice
**`strata_decisions` already has `snapshot_id` + `forum`; `strata_actions` already has `decision_id`.** So the
authorization's "snapshot, agenda, decision and action relationships" is **already expressed** as
snapshot ← decisions ← actions. E1 therefore **joins that chain at the snapshot** and does **NOT** add `review_id` to
decisions/actions: a second path to the same fact lets the two disagree, and the existing chain answers every
question. **Only `agenda` was genuinely absent, so only `agenda` was added.** `strata_reviews` itself was correctly
reported absent by §9.

## D-6 honoured literally
Backfill = **2 migrated Closed reviews / 2 locked snapshots**. `chair_id`, `agenda`, `scheduled_for` and participants
are **NULL/empty — never invented**. Participants are ROWS rather than a jsonb blob precisely so nobody can write `[]`
and call it attendance. Each migrated row's `note` states the derivation **on the row**, including that
`review_type`/`cadence` (executive/quarterly) are **an assumption of the migration, not a recorded fact** — a reader
is never left guessing which fields were recorded.

## The two defaults, as defaults
`departmental → monthly`, `executive → quarterly`, applied via COALESCE in `strata_schedule_review`, **not** a CHECK.
A CHECK forcing departmental⇒monthly would make a genuinely ad-hoc departmental review unrepresentable, and the system
would then be lying about a meeting that really happened.

## Readiness is DERIVED, never stored
`strata_review_readiness` view. Storing it would create a second source of truth that goes stale the moment a snapshot
locks — and someone would eventually trust the stale copy. `blocking_reasons` is an array so the UI can state **why**
rather than render a bare red dot.

## Probe finding
**`strata_snapshots.status` CHECK is `locked | superseded` only** — a snapshot is locked by construction; there is no
unlocked state. My first error message said "unlocked snapshot", describing a state that cannot exist. **Corrected**
to name superseded explicitly.

## Status
✅ **DONE** — applied, ledger 1:1, gates green. All rules proven (backfill · participants 0 · cadence defaults ·
readiness both ways · cannot close without a snapshot · cannot close on a non-locked snapshot · closed review immutable).
**Next: F1 board-pack issue/supersede — it needs E1, which now exists.**

---

# R2 · F1 — board-pack editorial lifecycle, issuance + supersession · migration `20260717140000`

## F-12 — `status` was already taken
`status` is the **generation** lifecycle (`pending|generating|ready|failed`), not an editorial one. Adding
`issued/superseded` there (as §6 says) would conflate "did the file render?" with "did the board approve it?", and an
`issued` pack would lose its generation state. New **`issue_status`** carries `draft|in_review|approved|issued|
superseded`; existing rows default to `draft` — the truth. See `09_DECISIONS.md` → **F-12**.

## Immutability is a TRIGGER, not a policy
RLS gates *whether a row is writable*, not *which fields changed* — and both RPCs are SECURITY DEFINER, so they bypass
RLS anyway. A BEFORE UPDATE trigger is the only layer that sees OLD vs NEW and binds every writer. Exactly one
transition is permitted on an issued pack (`issued → superseded`) and it must leave snapshot, storage_path, sections,
title, version, issued_by/at and format **byte-identical** — proven. DELETE of an issued/superseded pack is refused
too: deleting it would erase the record of what a board received.

## §8.7 in full
Correction = **new version**, never an edit. `snapshot_id` is **copied, never re-pointed**: a corrected pack reports the
SAME numbers, corrected in presentation. If the numbers themselves changed, that is a new snapshot and a new pack —
re-pointing a pack at different numbers while keeping its identity is the precise lie this programme exists to prevent.
**SoD added** (approver ≠ issuer), mirroring `strata_approve_record` — issuance is what makes a pack a board record.

## F-3 discharged at DB level
`strata_board_pack_qualification` — **derived** from `strata_integrity_exceptions`, never copied onto the pack: a copy
goes stale the moment the register changes, and the stale copy is what would get **printed on a board pack**. It states
the distinction that matters: *the figures are OFFICIAL and UNCHANGED; what is qualified is their PROVENANCE.*
Issuance also stamps the qualification into the audit trail — the point-in-time fact of what was known when the board
received it. Proven live against **SNAP-1**, a genuinely qualified snapshot.

## Status
✅ **DONE** — applied, ledger 1:1, gates green, suite **2,442 / 6** (the clean end of the flaky range).
**Remaining in R2: the editorial builder UI** (`title`/`sections` columns + RPCs exist; no UI yet) — DB-complete,
UI-pending. Then R3 → R4 → R5.
