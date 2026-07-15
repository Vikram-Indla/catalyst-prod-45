# Session 020 — Phase 4 · Slice 4F (Upload Wizard, anchor 20)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001 · **Date:** 2026-07-15 · Auto-commit-when-green.
**Goal:** Redesign `StrataUploadWizardPage` to anchor 20 — 7-step lifecycle + AUTO/CONFIRM/DECIDE MAP step.

## Drift gate — anchor 20 re-read IN FULL via DesignSync. NO drift vs Plan Lock.
7-step lifecycle stepper (Map current) + AUTO/CONFIRM/DECIDE mapping table (Your column mono · Sample values mono · →
· Template field Select · Match badge) + mapping-memory band + Continue gated on no DECIDE.

## Data reality (staging)
- 1 template: "KPI Actuals (Quarterly)" v1, target kpi_actual, column_schema = 4 fields (kpi_slug/period/value/
  confidence), **`mapping_rules` empty** → AUTO/CONFIRM/DECIDE is a client name-match heuristic. Parsed file lives in
  `parsed` state (headers + rows) — sample values client-side. Staging path (createUploadRun/insertStagingRows/
  markRunStaged) → run detail (09) already works. No template-contract write path (mapping-memory honest/deferred).

## 4F — BUILT + verified + auto-committed. Files: `StrataUploadWizardPage.tsx` + `audit-baseline.json`.
- **Replaced the hand-rolled 4-step stepper** with canonical `StrataLifecycleStepper variant="full"` showing the 7-step
  lifecycle (`wizardLifecycle`): wizard owns Contract/Upload/Map (steps 1-3), Validate/Resolve/Promote/Calculated are
  todo (they run on run detail 09 after staging).
- **Step model → 3 wizard steps** (Contract/Upload/Map); replaced the old Preview + Submit steps with a **MAP step**
  (`MapStep`): AUTO/CONFIRM/DECIDE mapping table (`buildMapRows` — exact name/label match→AUTO, partial→CONFIRM, none→
  DECIDE; `normName` heuristic since template.mapping_rules is empty) with monospace Your-column + real Sample values
  (from `parsed.rows`) + per-row ADS `Select` over `column_schema` + "Leave unmapped" + Match lozenge + honest
  MAPPING MEMORY band ("applies to this run only — no template-contract write path").
- **Continue gated on no unresolved DECIDE** (`unresolvedDecide`); "Continue to validation" = stage the run (remapped
  `raw` via `remapRaw` → template columns) + navigate to run detail (existing `submit`).
- Removed dead: PreviewStep, precheckRows, RowCheck, summaryRow, PREVIEW_CAP.
- **Deviations (honest, flagged):** (1) role gate kept as the existing 4-role non-blocking warning (anchor says
  data_steward-only) — not hard-blocked to avoid regressing access; DB enforces the real guard. (2) "Save & exit"
  draft NOT added (no draft-persistence path) — Cancel retained.
- Gates: tsc · colors 0/0 · audit tokens **19799→19798** (removed more inline font-size literals than added; **baseline
  ratcheted down**) · CRE. Live-verified light+dark: pasted a CSV (kpi_slug/period/actual_value/notes) → MAP step showed
  3 AUTO + 1 DECIDE (notes), Continue DISABLED until DECIDE resolved (Leave unmapped) → ENABLED. Only
  StrataUploadWizardPage.tsx + baseline touched (map untouched); console clean (only a chrome-extension error).
  NB: the Catalyst activity/chat FAB overlaps the wizard footer — used `find`/`javascript_tool` to click Continue.

## ⛔ NEXT = 4G Board Pack (anchor 24) — NEW route `/strata/reviews/:snapshotKey/pack` + `StrataBoardPackPage` (scoped
P4-D2: read-only editorial preview + Present mode + Print/PDF; editorial builder + Issue DEFERRED). Also wire the
cockpit's Present-mode/Export-board-pack actions (deferred from 4C). Re-read anchor 24 via DesignSync first.
