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

- **D5 (scope expansion, 2026-07-06)**: Goal condition requires EVERY Catalyst
  screen (all hubs), not only STRATA. Plan Lock scope extended: sweep all
  primary nav surfaces (Home, Project Hub, Product Hub, Ideation, Incident Hub,
  Release Hub, Test Hub, Tasks, Docs, Admin, Portfolio/Programs, Search) with
  before screenshots + per-screen audit; surgical fixes for visible ADS
  violations; before/after evidence for every changed screen. Files-forbidden
  list relaxed accordingly (still surgical, still no data-path changes).

- **D6 (finding, not fixed)**: /docs renders a blank content area (STRATA
  sidebar shown) — routing/feature-flag state, data-path; out of styling scope.
- **D7 (finding, not fixed)**: Ideation backlog shows a redundant "IDEAS /
  IDEAS" container crumb inside WorkListPanel, and ProgramDirectory/Ideation
  headers remain Tailwind-styled (pre-existing debt covered by the ratchet
  gates; full conversion is its own slice).
