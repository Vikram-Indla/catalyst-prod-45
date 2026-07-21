# KARPATHY LOOP LOG — CAT-STRATA-STRATEGY-ADS-20260720-001

Hypothesis → Experiment → Measure → Keep/Discard → Log.

## L1 — Where does the parity wrapper's sentence-case effect live?
- **Hypothesis:** wrapping STRATA lozenges in `data-cp-lozenge-jira-parity` will make them sentence case (per audit).
- **Experiment:** read `src/index.css` parity block + `src/components/ads/Lozenge.tsx`.
- **Measure:** light-mode sentence-case override was **removed 2026-06-09** (Vikram); only dark-mode color
  softening remains. Wrapping alone is inert in light mode.
- **Keep/Discard:** DISCARD "wrapper alone fixes it." KEEP → DI-02 needs a page-scoped transform re-enable → governance conflict → **D1**.

## L2 — Is `@atlaskit/tabs` the canonical in-repo switcher, and can Map stay navigational?
- **Hypothesis:** ADS Tabs can host Structure/Narrative while Map navigates.
- **Experiment:** grep tabs usage; read `DatabaseSurface.tsx:762-784`.
- **Measure:** `@atlaskit/tabs` installed; TabList-only `selected`+`onChange` switcher is an established pattern.
  Map as a sibling Button (button role) keeps it out of the tab set.
- **Keep/Discard:** KEEP → WP-E; Map = adjacent ADS Button, `viewMode` stays local state (no URL change).

## L3 — Can DI-04/DI-05 be fixed page-locally?
- **Hypothesis:** the trigger/count fixes are page-local.
- **Experiment:** grep consumers of `StrataChipMenu` / `StrataPanel`.
- **Measure:** shared across 26 / ~30 STRATA pages respectively.
- **Keep/Discard:** DISCARD page-local fix. KEEP → DEFER (D2/D3); editing shared code would risk sibling regression, violating the zero-regression directive.

## L4 — Does the count/label casing collapse into one fix?
- **Hypothesis:** sentence-casing source strings fixes both readiness labels and lozenges.
- **Experiment:** classify each flagged element (plain span vs Atlaskit Lozenge).
- **Measure:** readiness labels/badges are plain spans (source-controlled → WP-A visibly fixes). Lozenge casing
  is Atlaskit-transform-controlled (WP-A cannot fix; needs WP-H/D1).
- **Keep/Discard:** KEEP the split — WP-A ≠ DI-02. Do not claim WP-A resolves lozenge casing.
