# 08 — Drift Log

Deviations from the anchor that were taken deliberately (with rationale), pending confirmation.

## DRIFT-1 · CC perspective-health position (slice 1A-3)
- **Anchor 01:** judgment band (7fr) + perspective health (5fr) share Row 1.
- **Implemented:** judgment band spans Row 1 full-width; perspective-health panel stays in Row 2
  (beside the trend chart), unchanged.
- **Why:** moving the large perspective-health JSX into Row 1 is a risky cut/paste; full-width band
  + perspective panel below conveys the same information ("what moves the score" is also in the
  composed sentence's worst-perspective clause). Bounded, lower-risk.
- **Status:** minor visual deviation; refine to the 7/5 split in a later polish pass if desired.

## DRIFT-2 · CC keeps trend chart + AI advisory (slice 1A-3) → see D-8
- **Anchor 01:** Command Center shows judgment band, decisions, changes-since-snapshot, attention
  inbox, data-trust strip — NO enterprise-score trend chart and NO AI-advisory panel.
- **Implemented:** kept the existing trend chart (Row 2) and AI-advisory panel (Row 4). The AI
  advisory is a governed feature (F-GOV-009, human-review workflow) — removing it silently would be
  a REGRESSION. The trend chart is a working panel.
- **Status:** raised as **D-8 (proposed)** — keep both, or remove to match the anchor? Do not remove
  working/governed features without an explicit decision.

## DRIFT-3 · CC changes-since-snapshot placement (slice 1A-4)
- **Anchor 01 / handover:** "changes since last locked review" noted as "row 2 right".
- **Implemented:** added as a new full-width Row 3 (span 12) between trend/health (Row 2) and the
  needs-attention inbox — a pure addition, no cut/paste of working panels.
- **Why:** same lower-risk rationale as DRIFT-1 — reflowing the span-8/span-4 Row 2 to insert the panel
  beside perspective-health risks the working trend chart + health panel. User-approved this session
  (new full-width row). Refine toward the anchor's literal 7/5 / row-2-right split in a later polish pass.
- **Status:** minor visual deviation, functionally complete; live-verified both modes.

## DRIFT-4 · Scorecards Index — anchor 12 exceeds Plan Lock 1C scope (slice 1C, RAISED, awaiting decision)
- **Plan Lock 1C:** incremental state-quality on the CURRENT page (Models grid + Instances JiraTable)
  — skeleton, per-panel errors, role-aware empty, restricted, docTitle — plus a "ranked-variance panel
  (client-derived, no RPC)". Written when anchor 12 was read "via critique only".
- **Anchor 12 (now read in full):** a card-first **scope chooser, NOT a table** — composed judgment
  one-liner + one instance card each (64px StrataScoreRing + band Lozenge + owner/scope + Δ-vs-prior +
  coverage/trust footnote; CEO card accent border; role-scoped order; click→detail) + ranked-variance
  panel. **No Models grid.**
- **Data facts (staging FY2026):** 3 instances only (CEO Q1 locked, CEO Q2 live, B2B Sector Q2 live);
  `owner_id` all NULL. **"Variance to plan" is NOT client-derivable** — no instance-level plan/target
  score (only per-KPI targets → would need the rollup RPC). Only the CEO scorecard has a prior period.
- **Decision needed:** (1) scope — full anchor-12 card redesign (split ≤2h) vs Plan-Lock-literal
  incremental; (2) ranked-panel basis — since "vs plan" can't be truthful, rank by current score/band
  (worst-first) or by Δ-vs-prior. RAISED to Vikram; no code until resolved.
