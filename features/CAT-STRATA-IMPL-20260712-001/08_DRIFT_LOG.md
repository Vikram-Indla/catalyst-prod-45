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
