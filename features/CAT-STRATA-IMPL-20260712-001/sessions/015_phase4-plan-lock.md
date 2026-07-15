# Session 015 — Phase 4 Plan Lock (governance & data)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15
**Branch:** `strata/impl-phase01` (at `8855b7a69` = origin/main; Phase 3 complete)
**Goal:** Discovery + Plan Lock for Phase 4 — STOP before any code (Vikram approval required per CLAUDE.md).

## Scope (HANDOFF build order, authoritative)
Phase 4 = **governance & data**, 6 anchors, order **10 → 23 → 24 → 09 → 19 → 20**:
- 10 Decision Cockpit `/strata/reviews/:snapshotKey` · 23 Reviews Index `/strata/reviews` ·
  24 Board Pack + Present (NEW route) · 09 Run Detail `/strata/data/runs/:runKey` ·
  19 Data & Lineage Landing `/strata/data` · 20 Upload Wizard `/strata/data/upload`.

## Done this session
- Mandatory start sequence (clean, synced `8855b7a69`).
- HANDOFF.md build-order re-read via DesignSync → confirmed Phase-4 anchor set + order (no drift vs D-12/K-P3-1).
- **All 6 anchors read IN FULL via DesignSync** (parent-only) → digested to
  `discovery/07_phase4_anchor_specs.md` (design-authority proxy for subagents).
- Spawned **4 parallel discovery agents** (read-only): canonical-component, route/page, integration-architect,
  data/safety-guard (staging schema reality). Awaiting completion.

## Key early findings (to confirm via agents)
- **StrataLifecycleStepper must be built FIRST** (Phase-0 D-4 deferred "until first consumed") — consumed by
  09/20 (7-step run/upload stepper) + 23/10 (5-stage review-lifecycle, compact-dots variant). §18 API.
- **Backend-reality risk (P3-D3-style scope cuts expected):** anchor 24 board-pack editorial builder + issue +
  print + present mode; anchor 09 clustered-errors + promote RPC + quarantine 3-way; anchor 19 downstream
  dependents. Data/safety agent is verifying against staging schema.

## DONE — all 4 discovery agents complete; Plan Lock produced
- Route/page agent: no splits — 23/10 in-place (StrataReviewsPage `:snapshotKey` branch), 19/09 in-place
  (StrataDataPipelinePage `:runKey` branch), 20 in-place; only 24 = NEW route `/reviews/:snapshotKey/pack` + `StrataBoardPackPage`.
- Canonical agent: build `StrataLifecycleStepper` by extracting `PipelineStepper`/`StageDot`; promote KpiFreshnessCell;
  high reuse for 10/19/23; anchor 24 = hand-rolled/scope concentration.
- Data-safety agent (staging schema): reviews derived (no table); board pack = file/gen record (no editorial/issue);
  runs 2-way (no quarantine); no source→forward-dependency; promote no reverse RPC; wizard best-backed.
- Integration agent: reviews = derived over snapshots+decisions+actions+packs; thin hooks useDataSourceBySlug/
  useRunsForSource/kpisForSource; `reviewAdvisory` is AI-advisory (naming trap); wizard uses lineageApi staging (not importExecutionBatch).
- Wrote: `11_KARPATHY_LOOP_LOG.md` K-P4-1…4; `03_PLAN_LOCK_PHASE4.md` (7 slices 4A–4G, decisions P4-D0…D8);
  `09_DECISIONS.md` P4-D0…D8 PROPOSED.

## ⛔ STOP — Plan Lock PROPOSED, awaiting Vikram approval. NO CODE until approved.
Slice order once approved: **4A StrataLifecycleStepper → 4B(23) → 4C(10) → 4D(19) → 4E(09) → 4F(20) → 4G(24 scoped)**.
First implementation step will be 4A; re-read the slice anchor in full via DesignSync before coding (drift protocol).
