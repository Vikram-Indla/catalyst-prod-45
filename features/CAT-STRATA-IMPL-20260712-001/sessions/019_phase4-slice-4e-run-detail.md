# Session 019 — Phase 4 · Slice 4E (Run Detail, anchor 09)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001 · **Date:** 2026-07-15 · Auto-commit-when-green.
**Goal:** Redesign `StrataDataPipelinePage` RunDetailSection (`:runKey` branch) to anchor 09.

## Drift gate — anchor 09 re-read IN FULL via DesignSync. NO drift vs Plan Lock.
7-step lifecycle stepper + validation summary + clustered errors + commit/promote + downstream rail + contract/lineage
rail. Anchor shows a 3-tile Accepted/**Quarantined**/Rejected but **P4-D3 = 2-way** (`strata_validate_run` emits
valid/rejected only) — honest scoped build, not drift.

## Data reality (staging)
- `strata_validation_results`: error_code, field_name, severity ('error'/'warning' — all 'error' → confirms 2-way),
  message, suggested_fix → clusterable by error_code+field_name. RUN-1001: 2 clusters (KPI_NOT_FOUND, VALUE_NOT_NUMERIC).
  RUN-9: 6 rejected but NO validation_results rows (rejects without per-row detail).
- `strata_kpis.data_source_id` → RUN-1001 source (Salam Finance Excel) has 3 dependent KPIs (P4-D4).

## 4E — BUILT + verified + auto-committed. Files: `StrataDataPipelinePage.tsx` only.
- **7-step lifecycle stepper** (`StrataLifecycleStepper variant="full"`, adopting 4A's canonical component — DRIFT-8
  consumer adoption): Contract→Upload→Map→Validate→Resolve→Promote→Calculated, derived from run.status + rejects
  (`runLifecycleSteps`). Replaced the old page-level 8-stage `PipelineStepper` (removed PIPELINE_STAGES/stageStates/
  StageDot/PipelineStepper dead code + the page-level mount).
- **2-way validation summary** (P4-D3): "N rows received" + Accepted (valid, success) / Rejected (danger) tiles. NO
  invented quarantine tier.
- **Clustered errors** (`clusterErrors`, client GROUP BY error_code+field_name): "N ROWS" lozenge + code·field + message
  + suggested fix. Honest empty-state: when rejected>0 but no result rows → "No per-row error detail" (NOT "all passed").
- **Commit panel**: Promote (existing `strata_promote_run`, role-gated) + honest reversibility (P4-D7: "writes
  pending-attestation actuals — not committed; no automatic reverse; re-run a fixed file") + client-side "Download
  rejected (N)" CSV. Moved Promote out of the header.
- **Downstream-impact rail** (P4-D4): backward-derived dependent KPI names via `data_source_id` + consequence warning +
  honest "scorecard/snapshot forward impact not tracked" gap. **Contract & lineage rail**: Source/Template/Run key/
  Channel/Checksum field rows. Removed the old forward "Lineage" panel.
- Kept the Staged rows table + attestation modal (attestation quarantine verdict PRESERVED — a distinct governed feature,
  not the validation-summary quarantine P4-D3 removes). Removed now-unused imports (AlertTriangle/MoveRight/IconButton/Copy).
- Gates: tsc · colors 0/0 · audit 19799/19799 (fixed off-grid marginTop:2→4) · CRE all green. Live-verified light+dark:
  RUN-1001 (2 clusters, 3 dependent KPIs, full lineage) + RUN-9 (rejects w/o detail → honest empty-state). Map untouched.
  NB: dev session expired mid-verify (getSession timeout) — user re-authed; only StrataDataPipelinePage.tsx touched.

## ⛔ NEXT = 4F Upload Wizard (anchor 20) — `StrataUploadWizardPage`. Then 4G Board Pack (anchor 24). Re-read anchor 20 via DesignSync first.
