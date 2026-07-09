# Session 012 — Command Room depth: executive KPI bands (SRC-M3) (2026-07-09)

## Delivered
- **Strategy Room band** (`strata-strategy-band`, canonical `StrataStatStrip`): Active themes (of total in cycle) · Active objectives · Charters complete (matches the row-lozenge completeness rule; warning tone "governance drift" when short) · Objectives measured (KPI-link coverage over active theme-objectives; warning when gaps). All derived from queries the page already loads — zero fabrication.
- **Reviews band** (`strata-reviews-band`, index view only): Snapshots (latest key) · Open decisions (warning when >0) · Overdue actions (danger when >0; caption shows open-action denominator) · Period close status + period name. Derived from loaded snapshots/decisions/actions/activePeriod.
- With Portfolio (StrataStatStrip already present) and Command Center + Scorecards, **all four canonical area landings now lead with the executive KPI band** — the SRC-M3 "are we winning?" answer above the fold.

## Verification (:8081, live staging data — screenshots in chat)
- Strategy Room: 3 of 4 themes active · 4 objectives · Charters 2/3 "governance drift" (truthful: Digital Market Leadership uncharted) · Measured 4/4 "full KPI coverage".
- Reviews: Snapshots 2 latest SNAP-1 · Open decisions 1 (matches Command Center) · Overdue 0 of 2 open · Period Open Q2 FY2026.
- Light theme verified (user toggled): bands render correctly on ADS tokens in both themes.
- tsc clean · 20/20 tests · color gate 0=0 · audit gate at baseline.

## Command Room depth status
SRC-M3 KPI bands ✅ (all landings) · SRC-M5 value bar ✅ (session 011) · SRC-M4 scorecard grid ✅ (existing) · SRC-M1 map = existing page (enhancement unscoped) · **SRC-M7 board-pack editorial layout — last remaining depth item**.
