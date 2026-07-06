# Plan Lock — CAT-STRATA-ADS-UPLIFT-20260706-001

**Status**: ACTIVE — user-directed via /goal (execution explicitly ordered; goal hook blocks stopping).
**Timebox**: slices of ≤2h; slice 1 = systemic fixes in shared shell + clipping; slice 2 = per-page sweep; slice 3 = evidence.

## Objective
ADS/Atlaskit uplift of all STRATA surfaces with before/after screenshot evidence. Upgrade in place — no rebuild.

## Canonical components
- JiraTable (already in use) — keep; rebalance column widths where cells clip.
- @/components/ads wrappers: Lozenge, Button, Heading, Modal, Textfield, SectionMessage, Tabs, EmptyState.
- ProjectPageHeader (hubType strata) — keep; fix mount geometry.
- @atlaskit/progress-tracker for the Data Pipeline stepper IF the dependency exists; else keep token-pure custom.

## Files to modify (expected)
- src/modules/strata/components/shared.tsx (StrataPageShell mount, panel/typography polish)
- src/modules/strata/pages/StrataCommandCenterPage.tsx (needs-attention Type column)
- src/modules/strata/pages/StrataKpiLibraryPage.tsx (Achievement column)
- src/modules/strata/pages/StrataPortfolioVmoPage.tsx (right-edge clipping)
- src/modules/strata/pages/StrataKpiDetailPage.tsx (title = KPI name)
- src/modules/strata/pages/StrataScorecardDetailPage.tsx (title = scorecard name)
- src/modules/strata/pages/StrataDataPipelinePage.tsx (stepper)
- src/modules/strata/pages/StrataStrategyRoomPage.tsx / StrataStrategyMapPage.tsx (type chips / legend tokens)
- Other strata pages only for typography/token corrections surfaced by discovery.

## Files forbidden
- Anything outside src/modules/strata/** except: NONE unless a shared-layout bug requires it — then RED FLAG first.
- No supabase/, no src/lib/routes.ts, no CatalystShell, no ProjectPageHeader.tsx (breadcrumb fix must land inside StrataPageShell geometry, not the shared header used by 5 other hubs).

## UI/UX rules
- ADS tokens only; no new hex/rgb/Tailwind colors. Lozenges own their colors.
- Zero-assumption rendering stays (dash/null when unknown).
- Typography per ADS scale; numerals keep tabular-nums; match Project Hub contrast.

## Validation
- tsc -p tsconfig.app.json — baseline 183, no new errors.
- npm run lint:colors:gate and audit:ads:gate — no increase.
- Chrome MCP after-screenshots of all 16 checklist states; DOM probe proving breadcrumb unclipped (scrollWidth == clientWidth AND box inside clip ancestor).

## Stop conditions
- Any fix requiring edits outside src/modules/strata/** → RED FLAG to user.
- Any regression in table sorting/row-click behavior → stop, revert slice.

## Drift
Log deviations to 08_DRIFT_LOG.md; decisions to 09_DECISIONS.md.
