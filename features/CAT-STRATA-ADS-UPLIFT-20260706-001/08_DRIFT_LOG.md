# Drift log — CAT-STRATA-ADS-UPLIFT-20260706-001

- **D1 (accepted)**: `audit:ads:gate` fails with spacing 4 vs baseline 1. All 4
  offenders are `dock.css:888/925/940` and `00-ComponentRegistry.stories.tsx:666`
  — files untouched by this branch (diff = 7 strata files). Breach is INHERITED
  from main pre-branch, same pattern as CAT-STRATA-20260705-001 handover
  ("+6 inherited"). Not ratcheting the baseline up (baselines only move down);
  not fixing out-of-scope files (Plan Lock forbids edits outside strata).
- **D2 (scope note)**: Data Pipeline stepper kept hand-rolled — @atlaskit/progress-tracker
  is NOT in package.json dependencies; the stepper is token-pure and state-driven.
  Adding a new dependency is out of the surgical-uplift scope.
- **D3 (finding reversed)**: the "stray red arrow" on KPI detail flagged during
  inventory is actually StrataTrendSpark (declining achievement 100→66.7,
  var(--ds-text-danger)) — legitimate data-viz, no fix.
- **D4**: New cycle / New element modals verified as ads Modal + Textfield +
  @atlaskit/datetime-picker during inventory; datetime placeholder "2/18/1993"
  is the Atlaskit component's own locale placeholder (component-owned, kept).
