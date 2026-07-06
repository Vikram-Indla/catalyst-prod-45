# Objective — CAT-STRATA-ADS-UPLIFT-20260706-001

Uplift all 14 STRATA surfaces + modals to full ADS/Atlaskit compliance with
Jira-grade typography, with before/after screenshot evidence per screen.

## In scope
- Fix breadcrumb "STRATA" left-clip on every page (StrataPageShell negative margin vs overflow:clip ancestor).
- Fix lozenge/column clipping (Command Center needs-attention Type column, KPI Library Achievement, Portfolio benefit register/value profile right edge).
- Correct page titles on detail pages (KPI detail shows "KPI library", scorecard detail shows "Scorecards").
- Typography sweep to ADS scale (font.heading/body tokens), matching Project Hub contrast.
- Replace any remaining hand-rolled sub-components with Atlaskit equivalents where a canonical exists (stepper → progress-tracker if available, chips → Lozenge/Tag).
- Before/after screenshots for every screen + report of changes.

## Non-scope
- No data/RPC/schema changes. No routing changes. No new features.
- No rebuild of the module ("do not kill everything") — surgical uplift only.
- No dark-mode-specific work beyond token correctness.
- No Astryx adoption (ring-fence decision stands).

## Done means
Every STRATA screen renders with: unclipped breadcrumb, unclipped lozenges,
correct detail titles, ADS-token-pure styling, Atlaskit primitives, and an
after-screenshot proving each fix.
