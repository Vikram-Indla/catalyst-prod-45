# Session 013 — Slice 3B-3 · Portfolio Index (anchor 22)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15
**Branch:** `strata/impl-phase01` (at `daa1d89fe` = origin/main after 3B-2)
**Target:** Repurpose `/strata/portfolio` into a real portfolios index (anchor 22).

## Anchor 22 re-read (DesignSync) — NO DRIFT vs Plan Lock 3B-3
Pure portfolios list: title "Portfolios" · leakage-concentration sentence · **value-by-stage small
multiples (shared scale, planned=100%)** · **ranked-by-leakage JiraTable** (Portfolio+owner·N benefits ·
Planned · Forecast · Leakage · Validated · Weakest link) → row → anchor-08 detail · comparability footer.
States: bar skeletons · restricted out-of-scope named-but-unlinked · locked snapshot · <1100 stack.

## Architecture
- **Dispatcher in VMO page** (Plan Lock "repurpose `/strata/portfolio`" + "replace the single-portfolio-at-index
  body"): VMO default export becomes a thin dispatcher — bare `/portfolio` (no `?portfolio=`, no benefit slug)
  → new `StrataPortfolioIndexView`; else → existing body (renamed `StrataPortfolioManageView`, byte-identical).
  Stable hook list at the dispatcher (children own their hooks) → no rules-of-hooks violation. Preserves
  `?portfolio=` management (3B-2 "Manage benefits" target) + `/portfolio/benefits/:slug` benefit detail.
- **`StrataValueBar scaleOverride?` prop** (additive, default = self max, behavior-preserving) — anchor 22
  needs ONE shared scale across portfolios; the `multiple` variant otherwise normalizes per-instance.
- **P3-D2 aggregation** reused: one `useBenefits()` (all benefits, carry `portfolio_id`) + `useQueries` over
  each benefit's `benefitValues`; per benefit active-period-else-latest snapshot; Σ per portfolio; validated =
  Σ realized·validated. Global scale = max Σplanned. Weakest link client-derived (max-leakage benefit else
  lowest-confidence). Zero-assumption dashes; "SAR committed spend" NOT rendered (no field) — open-gates count only.

## Log
- `StrataValueBar` (`shared.tsx`): additive `scaleOverride?: number|null` — default = self max (behavior-preserving);
  `multiple`/`hero`/`default` consumers unaffected. Enables shared-scale small multiples.
- New `StrataPortfolioIndexView.tsx` (anchor 22): subtitle (N portfolios · Σplanned · attribution rules v2) ·
  grounded **leakage-concentration sentence** (top portfolio's share of total gap, from real aggregates) ·
  **value-by-stage small multiples** ("SHARED SCALE · PLANNED = 100%", `StrataValueBar variant="multiple"
  scaleOverride={globalMaxPlanned}`, ranked order, "No claims yet" for empty) · **ranked-by-leakage JiraTable**
  (Portfolio + "owner · N benefits" · Planned · Forecast · Leakage[danger if ≥50% of total gap else warning] ·
  Validated · Weakest link) → row → `Routes.strata.portfolioDetail(slug, from?)`; top-leakage row focused ·
  **comparability footer** (attribution-rules-v2 statement + open-gates exposure count). States: loading spinner ·
  error · empty (canAuthor → create) · per-panel value-load error.
- P3-D2 aggregation: one `useBenefits()` (all) + `useQueries` per benefit `benefitValues`; per benefit
  active-period-else-latest snapshot; Σ per portfolio; validated = Σ realized·validated; weakest-link
  client-derived (max-leakage benefit else lowest-confidence). Committed-spend SAR NOT rendered (no field).
- **Dispatcher** in `StrataPortfolioVmoPage.tsx`: body renamed `StrataPortfolioManageView` (byte-identical);
  new default dispatches bare `/portfolio` → IndexView, else (`?portfolio=` / benefit slug) → ManageView.
  Stable hook list at dispatcher (children own hooks) → no rules-of-hooks violation.

## Gates + verification (all GREEN, first pass)
- `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` at baseline (19799/19799 — no new offenders) · `lint:cre` passed.
- Live `/strata/portfolio` **light + dark** — index renders; **shared-scale small multiples confirmed** (Investor
  Experience 3.1M planned bar ~10% width vs Transformation 27M full bar); leakage tone danger (−8.6M, 91% of gap)
  vs warning (−750K); top row focused; grounded concentration sentence; comparability footer. **No console errors.**
- **Dispatcher verified live:** row → `/portfolio/transformation-portfolio-fy2026` (3B-2 detail);
  `?portfolio=transformation-portfolio-fy2026` → VMO ManageView (switcher/stat strip/members/register unbroken);
  `/portfolio/benefits/b2b-revenue-uplift` → ManageView benefit detail with **StrataValueBar hero unchanged**
  (Planned 14M/Forecast 13.8M/Realized+Validated 12.5M — identical to pre-change).
- **Map zero-change** (git diff empty). Changed set (4 files): shared.tsx, StrataPortfolioVmoPage.tsx,
  StrataPortfolioIndexView.tsx (new), session 013 log.

## NEXT
Slice **3C** — Import & Reconciliation (anchor 18, `StrataExecutionImportPage`, P3-D3 scoped-down). Last Phase-3 slice.
