# Session 012 — Slice 3B-2 · Portfolio Detail (anchor 08)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15
**Branch:** `strata/impl-phase01`
**Resume point:** Phase 3 mid-flight. 3A-1/3A-2/3B-0/3B-1 merged. **NEXT = 3B-2 (Portfolio Detail, NEW route `/strata/portfolio/:slug`).**

## Rehydration (pre-flight)
- `pwd` = repo root; branch `strata/impl-phase01`; working tree CLEAN; no relevant stashes.
- `HEAD == origin/main == 3ea29e789` — branch fully synced + pushed.
- `StrataStrategyMapPage.tsx` byte-untouched vs main (zero-change gate intact).
- Read in order: 00 → 01 → 03_PLAN_LOCK_PHASE3 (APPROVED) → 07_HANDOVER → 08_DRIFT_LOG → 09_DECISIONS → 11_KARPATHY_LOOP_LOG.
- Plan Lock Phase 3 APPROVED (Vikram 2026-07-14); P3-D1…D8 all CONFIRMED.

## This session's target — Slice 3B-2 (per Plan Lock)
NEW route `/strata/portfolio/:slug` + `PortfolioDetailPage` (P3-D7 split of the 1142-LOC VMO page).
Value-position hero (leakage + `StrataValueBar variant="hero"`, portfolio aggregate P3-D2 client-derived)
+ Benefits table (JiraTable, leakage-sorted) + Gates (decision briefs → `StrataDecisionModal` → `valueApi.decideGate`).
HIGH-STAKES route/page split — `/strata/portfolio` must never break.

## Gates before commit
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` (baseline 19799) · `npm run lint:cre`.
Live-verify light+dark on localhost:8080. Map zero-change diff. Merge via temp-worktree flow.

## Log
- Re-read anchor 08 (`08 Portfolio & Benefit Realization.dc.html`) in FULL via DesignSync — **no drift** from Plan Lock 3B-2.
- **Route split (surgical, shadow-checked):** `routes.ts` → `strata.portfolioDetail(slug, from?)`; `StrataRoutes.tsx` → lazy `PortfolioDetailPage` + `<Route path="portfolio/:slug">` after `portfolio/benefits/:slug`. React-Router specificity keeps `benefits/:slug` + `:slug/evidence` ahead — verified live, no shadow.
- **New page `StrataPortfolioDetailPage.tsx`** (anchor-08 anatomy): value-position leakage hero (grounded verdict sentence from real Σaggregates + `StrataValueBar variant="hero"` waterfall) · benefits JiraTable (leakage-sorted; forecast danger-toned; confidence level·% ; attestation lozenge; "via N cards" subline) · Gates decision-context list (stage badge + benefit + criteria + due/overdue + role-gated Decide → `StrataDecisionModal`/`valueApi.decideGate`) · "completion ≠ benefit" footer.
- **P3-D2 client-derive:** per-benefit `benefitValues` via `useQueries`; active-period-else-latest snapshot; Σ per kind; validated = Σ realized·validated (no `validated` kind exists). Zero-assumption dashes. NO migration.
- **Header fix (live-verify caught):** `ProjectPageHeader` H2 = `title ?? routeWord`; routeWord = hub label "Portfolio & VMO". Matched sibling pattern (KPI/Scorecard/Element detail) — trail = section back-link only + `title={portfolio.name}`. H2 now = portfolio name.

## Gates + verification (all GREEN)
- `npx tsc --noEmit` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` at baseline (tokens 19799/19799 — fixed 2 new offenders: `'12px 0'`→`var(--ds-space-150)`, `marginTop:2`→`var(--ds-space-025)`) · `lint:cre` passed.
- Live `/strata/portfolio/transformation-portfolio-fy2026` **light + dark** — waterfall/verdict/table/gates/footer all render; states grayscale-distinguishable; **no console errors**.
- **No-shadow verified live:** benefit row → `/portfolio/benefits/churn-reduction-value` renders VMO benefit detail; `/portfolio/:slug/evidence` renders EvidencePage; `/portfolio` index renders untouched VMO page.
- **Map zero-change:** `git diff origin/main -- StrataStrategyMapPage.tsx` empty.
- Changed set (4 files): `src/lib/routes.ts`, `src/modules/strata/StrataRoutes.tsx`, `src/modules/strata/pages/StrataPortfolioDetailPage.tsx` (new), this session log.

## Deferred (carry to 3B-3 / polish)
- Objective-hop subline ("↑ objective") omitted (multi-hop benefit→card→objective); "via N cards" shown instead. Reachable on benefit detail.
- 3B-3 (Portfolio Index, anchor 22) will make index rows link to this new detail route (small-multiples + leakage rank).
