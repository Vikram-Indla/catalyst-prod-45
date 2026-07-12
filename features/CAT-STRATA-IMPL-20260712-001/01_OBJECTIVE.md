# 01 — Objective

## Feature Work ID
`CAT-STRATA-IMPL-20260712-001`

## One-line
Implement the STRATA Locked-V1 design pack (28 anchors) onto the existing STRATA module,
in HANDOFF phase order, protecting the map + sidebar/top-nav visuals and the ADS token system.

## What "done" looks like (whole feature)
Every anchor's route matches its `.dc.html` design + DESIGN ANNOTATIONS footer, using canonical
components and `--ds-*` tokens only, passing proposal §20 acceptance:
- Five-verb chain restatable from entry.
- Exec answers condition/exceptions/value/trust/decisions from Command Center first screenful.
- ≤3 interactions verdict→evidence with origin preserved (`?from=`).
- States distinguishable in grayscale; both themes pass reload-into-dark.
- Keyboard-only validate/resolve/record/weight-change.
- Map passes zero-change preservation diff (screenshot + behavior probe vs baseline).

## Scope of THIS effort (bounded)
Discovery + Plan Lock for **Phase 0 + Phase 1** only. Later phases get their own Plan Locks.

- **Phase 0 — shared foundations:** Sidebar IA rename (visual-frozen), context spine
  (StrataContextToolbar ext.), StrataSnapshotBand, StrataChainStrip, StrataLifecycleStepper,
  state-taxonomy lozenge conventions, JiraTable overflow patch as a prop.
- **Phase 1 — executive core:** 01 Command Center `/strata`, 11 My Work `/strata/my-work`
  (NEW page), 12 Scorecards Index `/strata/scorecards`, 13 Scorecard Detail
  `/strata/scorecards/:slug`.

## Non-scope
Phases 2–5. Any change to the map's graph/inspector/filters/legend. Any restyle of sidebar/
top nav. New design tokens. v2/v3 concepts (posture fields, bubbles, decision fields, map
overlays, glyph signatures).

## Existing pages in play (redesign, not greenfield)
- `StrataCommandCenterPage.tsx` (01), `StrataScorecardsPage.tsx` (12),
  `StrataScorecardDetailPage.tsx` (13) — exist, redesign to anchor.
- `11 My Work` — no page yet; genuinely NEW (`/strata/my-work`).
