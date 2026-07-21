# OBJECTIVE — CAT-STRATA-STRATEGY-ADS-20260720-001

## Goal
Resolve the ADS-compliance findings from the Design Intelligence audit (Brief v3.0,
2026-07-20, verdict HALT / 44.4%) for the STRATA Strategy Room **on the page itself only**,
delegating labels, view navigation, empty state, spacing, and containment to ADS canonicals —
**without touching any shared component and without regressing any behavior**.

## What "done" looks like (visible outcome)
- Readiness band labels and badges read in **sentence case** (e.g. "Objectives with measures", "2 gaps", "Draft").
- The Structure / Narrative view switcher is the **canonical `@atlaskit/tabs`** control; **Map** remains an
  adjacent action that navigates to the protected `/strata/strategy/map` route and is **not** part of the tab set.
- The inspector no-selection state is a **compact ADS `EmptyState`** (no invented CTA).
- The `TypeChip` internal gap sits on the **ADS 4/8 spacing grid** (`var(--ds-space-050)`), not `5px`.
- Redundant same-plane borders/shadows **around** the hierarchy (readiness band, inspector rail) are reduced,
  **without** altering the shared `StrataPanel`.

## Explicit non-goals
- No change to data, queries, permissions, filters, authoring actions, JiraTable behavior, or the
  responsive rail/drawer behavior.
- No change to any shared component (`StrataChipMenu`, `StrataPanel`), the ADS wrapper layer, the shell,
  global CSS, or the protected map route.
- Findings that live in shared components (DI-04 trigger, DI-05 count) are **deferred**, recorded, and
  raised for a separate decision — not fixed inside this feature.

## Success gate
- All in-scope DI selectors flip red→green (or documented old→new) per `SELECTOR_MAP.md`.
- Full Vitest suite green (Node 22, sequential); `lint:colors:changed:ci` + `audit:ads:gate` + `build` clean.
- Authenticated before/after screenshots (1024/1280/wide, light + dark) show no adjacent regression.
- Deferred findings and DI-08 shared residual explicitly reported, not silently absorbed.
