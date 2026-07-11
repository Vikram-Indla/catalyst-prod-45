# Objective

Vikram: Release Hub text is too dense/noisy in places and too small to read in others; viewport space is under-used (e.g. Calendar/Execution pages show a lot of dead whitespace under sparse content). Inspect every route in the Release module against:

1. CRE rule engine compliance (creation/link actions call `src/lib/catalyst-rules`)
2. ADS validator compliance (no hardcoded colors, typography/spacing on the governance token scale)
3. Canonical-component opportunities (swap hand-rolled UI for `JiraTable`/`ProjectPageHeader`/`StatusLozenge`/etc.)

Deliverable: a pass/fail matrix per route, plus an attack plan to bring the module to standard, matching Atlassian Design System spacing and typography usage.

## Non-scope

- The orphaned legacy Release tree (`src/pages/releases/*`, `src/features/all-releases/*`, `release-calendar`, `release-compare`) — not routed anywhere live. Flagged separately for deletion, not audited/fixed here.
- No code changes under this Work ID. This is audit + plan only.

## Done means

Every one of the 21 live routes (see 03_PLAN_LOCK.md) has a matrix row with all lenses backed by grep evidence and/or live screenshot/computed-style evidence — nothing marked from memory.
