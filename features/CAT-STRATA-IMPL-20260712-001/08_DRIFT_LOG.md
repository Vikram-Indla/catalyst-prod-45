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

## DRIFT-7 · Project Cards list — inline milestones (slice 3A-1a) — RAISED then REVERSED by Vikram
- **Was:** each hand-rolled card tile had a "Show milestones (N)" inline expander (`MilestonesSubtable`).
- **Anchor 17:** a clean strategic-contribution table, row → detail; the anchor shows no inline milestones.
- **First cut (RAISED):** replaced tiles with a JiraTable and relocated milestones to the card detail (07).
- **RESOLVED (Vikram, 2026-07-14): RESTORE inline milestones.** Re-implemented as canonical JiraTable **tree
  rows** — a card row expands (chevron) to its milestones as indented child rows (name + status lozenge +
  due date), other columns blank; `getRowDepth`/`getRowHasChildren`/`expandedRowIds`. Milestones fetched
  once page-level (`milestonesByCard` from `allMilestonesQ`), never per-row. Hand-rolled tiles still gone.
- **Status:** NOT a drift from the anchor's intent (row→detail preserved; expand is an additive affordance).
  Live-verified light+dark (Care App v3 → MVP release DONE / AI deflection IN PROGRESS / Full migration PLANNED).
- **LESSON:** the union-row edit hit a **stale-HMR crash** (`getRowHasChildren` saw `milestonesByCard` undefined
  during Fast Refresh) — a full page reload cleared it; tsc + a clean load are the real gate, not the HMR state.

## DRIFT-6 · Phase-3 anchor set — handover candidate ≠ HANDOFF build-order (Phase-3 start, RESOLVED)
- **Handover 07 said:** "Phase-3 = governance & delivery; anchors likely 07·09·10·17·18·19·23·24."
- **HANDOFF.md build-order (authoritative, re-read via DesignSync 2026-07-14) has NO "governance &
  delivery" phase.** Phase 3 = **delivery & value** (07·17·18·08·22·21); Phase 4 = **governance & data**
  (10·23·24·09·19·20). The handover conflated the two phases and dropped the Phase-3 value anchors
  (08 Portfolio · 22 Portfolio Index · 21 Benefit Detail).
- **RESOLVED (Vikram, 2026-07-14): implement HANDOFF Phase 3 as written — 07·17·18·08·22·21.**
  Governance/data (09·10·19·20·23·24) becomes Phase 4 with its own Plan Lock. Caught by the
  "confirm the exact anchor set against HANDOFF.md at Phase-3 start" guard. No code before Plan Lock.

## DRIFT-5 · KPI Library columns — anchor 16 vs 2C-1 shipped (slice 2C-2, RAISED, awaiting decision)
- **2C-1 shipped:** `KPI · Achievement · Actual/Target (combined) · Trend spark (StrataTrendSpark) ·
  Validation · Owner · Freshness` (7 cols). Plan Lock 2C line explicitly listed "Actual vs Target ·
  Trend spark (StrataTrendSpark)".
- **Anchor 16 (read in full session 007):** `[28px ✓] · KPI·objective · Achievement · Actual · Target ·
  Δ · Validation · Owner · Freshness` (9 cols). **NO trend spark.** Actual and Target are SEPARATE
  columns; a Δ (vs prior period) column is added. Freshness = glyph (●/◐/○) + relative time.
- **Conflict:** the anchor (design authority) has no trend spark and splits Actual/Target; the Plan Lock
  (higher precedence) kept a combined Actual/Target + a trend spark. Per drift protocol ("if the anchor
  contradicts this plan… stop for re-decision — do not silently adapt").
- **Decision needed:** (a) match anchor literally — drop trend spark, split Actual + Target, add Δ; or
  (b) keep the trend spark 2C-1 shipped AND add split Actual/Target/Δ (wider table); or (c) keep combined
  Actual/Target + trend spark and add only Δ. **Recommend (a)** — the anchor is deliberate (trend lives on
  KPI Detail; the library is verdict-scan, and Δ already carries direction-of-travel). RAISED; no code until resolved.
- **RESOLVED (Vikram, session 007): (a) match anchor exactly** — drop trend spark, split Actual + Target
  into separate columns, add Δ (vs prior period). Applied in slice 2C-2b.

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

## DRIFT-8 · Slice 4A — consumer refactor deferred to redesign slices (RAISED, low-risk refinement)
- **Plan Lock 4A said:** build `StrataLifecycleStepper` AND refactor `StrataDataPipelinePage` + `StrataUploadWizardPage`
  consumers "behavior-preserving (no visual change to current use)".
- **Reality found at slice start:** the canonical stepper matches the ANCHOR (numbered circles; **current = warning**,
  per anchors 09/20). The two existing steppers differ: UploadWizard `current = --ds-text-brand` (blue); DataPipeline
  `PipelineStepper` is a DIFFERENT visual entirely (icon-dots, 8-stage) and its surfaces are being redesigned —
  anchor 19 (landing) has NO stepper (removed in 4D), anchor 09 (run detail) gets the numbered stepper (4E).
- **Conflict:** refactoring either consumer in 4A would EITHER change its "current" colour (brand/info → warning =
  NOT behavior-preserving) OR duplicate the 4D/4E/4F redesign work. There is no behavior-preserving refactor available.
- **Taken:** 4A ships the canonical `StrataLifecycleStepper` component ONLY (like 3B-0 shipped StrataValueBar variants
  ahead of consumers). Consumers ADOPT it in their own redesign slices — 4E (run detail), 4F (upload wizard),
  4B/4C (review dots) — where changing to the anchor stepper is the intended design, not a regression. The existing
  inline steppers stay untouched until then (zero visual change now).
- **Status:** low-risk refinement; component is tsc + gates green, live-verified when first consumed. **Flagged to
  Vikram** — not silently adapted. If Vikram wants the consumers swapped in 4A regardless (accepting the current-colour
  shift), say so and I will.
