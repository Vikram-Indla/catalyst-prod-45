# PLAN LOCK — Slice 2 (changes 5–6, revised)

**Status:** Approved by "go" (2026-07-08), continuing slice 1's cadence — discovery already done,
executing same session per established pattern (draft lock, execute, gate, screenshot).
**Timebox:** 2 hours. **Branch:** main.

## Pre-execution correction (Drift 4)
Original change 6 said "drop duplicate Themify pill (floating FAB + panel pill)". Checked live code:
`src/pages/ForYouPage.atlaskit.tsx` / `AssignedPanel.tsx` — there is only ONE AI entry point, the
`AskCatyThemifyButton` pill inside `AssignedPanel`. No separate FAB exists in the codebase; that was
an invented element in my mockup illustration, not a real duplicate. **Nothing to dedupe.** Scope 6
narrows to: sidebar footer only (drop weather, drop per-row timestamps; keep dual clocks).

## Objective
Finish the noise cut: fix the fake-link project name, tame weight-653, unify badge shape, quiet the
sidebar footer. Still subtraction/normalization only — no layout change.

## Files to modify
1. `src/components/for-you/atlaskit/ForYouRow.tsx` — project-name span (line ~271): color
   `token('color.link', 'var(--ds-link)')` → `var(--ds-text-subtlest)`. It's not a link (no href,
   no onClick) — stop painting it like one.
2. `src/components/ja/CatalystHeader.tsx` — wordmark span (line ~165): `fontSize: var(--ds-font-size-500)`
   (17px) + `fontWeight: 500` → `fontSize: var(--ds-font-size-400)` (14px) + `fontWeight: 600`.
   Matches Atlassian top-bar app-name spec.
3. `src/components/shared/StatusLozenge/StatusLozenge.tsx` — `font-weight: 653` → `600` (real,
   non-synthesized weight). Same fix in `src/pages/ForYouPage.atlaskit.tsx` h1 (line ~321,
   `font: '653 24px/28px ...'` → `'600 24px/28px ...'`).
4. `src/components/for-you/atlaskit/ForYouTabs.tsx` — badge shape unification (lines ~205-241):
   all three badge variants (assigned-blue, ageing-red, neutral) get the same `borderRadius`
   (`999`, matching the neutral/default pill already in use) instead of the two square-r2 outliers.
   Colors/meaning unchanged — red stays Ageing-only.
5. `src/components/layout/SidebarClock.tsx` — drop the `useCityWeather` render (temp + weather icon);
   keep both timezone rows (real Riyadh↔India need, per 09_DECISIONS). Layout collapses from
   3-col grid to city+time only.
6. `src/components/layout/HomeSidebar.tsx` — drop the per-row relative-timestamp second line
   (`formatTimestamp` render, ~line 203-212) in the Recent tree; row becomes single-line label only.

## Files forbidden
Same as slice 1 (StatusLozenge component deletion, theme-tokens.css, any file not listed,
the 4 known foreign in-flight files).

## Non-goals
No Themify/FAB changes (Drift 4 — nothing real to fix). No further token-layer surgery.

## Validation
tsc, color gate, audit gate (ratchet down if reduced), relevant vitest suites, git-stash regression
check like slice 1, live screenshots light+dark on localhost:8080 (nav wordmark close-up, a tab-badge
row, an "In progress" row showing subtle project name, sidebar footer without weather).

## Stop conditions
Same as slice 1: any gate count rises, any non-listed file touched, any consumer outside scope changes.
