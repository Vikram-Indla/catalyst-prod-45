# Session 018 — Phase 4 · Slice 4D (Data & Lineage Landing, anchor 19)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15 · **Branch:** `strata/impl-phase01` · Auto-commit-when-green authorized.
**Goal:** Redesign `StrataDataPipelinePage` LANDING branch (`/strata/data`, no runKey) to anchor 19. Run detail (09) = 4E.

## Drift gate — DONE
- **Anchor 19 re-read IN FULL via DesignSync.** NO drift vs Plan Lock: judgment sentence + consequence-ranked sources
  table (Source·Freshness ●◐○·Contract·Downstream dependents·Last run·Status) + recent-runs table (Run·What·Rows·
  Status·Waiting on it). Landing carries NO lifecycle stepper.

## Data reality (staging)
- 2 data sources (Salam Finance Excel excel/quarterly/3 dependent KPIs/last run 2 Jul; Salam BI Extract bi/monthly/
  4 KPIs/never run), both `health` = NULL → freshness derived from last-run age. 13 upload runs (status `completed`,
  varying rejects). `strata_kpis.data_source_id` EXISTS → downstream dependents backward-derivable (P4-D4).

## 4D — BUILT + verified + auto-committed. Files: `shared.tsx` + `StrataDataPipelinePage.tsx`.
- **P4-D8: `StrataFreshnessGlyph` promoted to `shared.tsx`** — timestamp-based (`latest: string|null`), replicating the
  KPI-library `KpiFreshnessCell` thresholds/glyphs/tokens exactly (●≤2d / ◐3-5d / ○>5d + age, date on hover). KPI-library
  consumer NOT refactored (DRIFT-8 precedent — visual parity without touching it).
- **Stepper guarded** to run-detail-only (`{runKey ? <PipelineStepper/> : null}`) — landing had a neutral 8-dot stepper;
  anchor 19 has none.
- **Judgment sentence** (`DataLandingJudgment`) — derived triage line ("N sources stale/aging (X degrades N KPIs); M
  runs need resolution", or "all fresh").
- **Sources table** (`SourcesPanel` → JiraTable, `buildSourceRows`): consequence-ranked (stale>aging>healthy>never-run,
  derived from last-run age since `health` is null) · Source (name + system_type·cadence) · Freshness glyph · Contract
  (last run's `template_version`, honest "—" if none) · Downstream dependents (backward-derived KPI names via
  `data_source_id`; tooltip notes scorecard/snapshot forward impact NOT tracked = labeled gap) · Last run (run_key +
  date, stacked) · Status (derived Stale/Aging/Healthy or registration status). **Source→detail NOT built** (no route/
  page exists — not a Phase-4 anchor; rows non-clickable, deferred).
- **Recent runs table** (`RunsPanel` → anchor columns): Run · What (file + owner name via `useProfileNames` · date) ·
  Rows (SegmentedCounts valid/rejected/raw) · Status · **Waiting on it** (danger "N KPIs waiting"/"needs resolution"
  when `runNeedsResolution`, else "—"). Row→run detail (09) + Sync-from-Jira preserved.
- New hooks used: `useKpis`, `useProfileNames`. Gates: tsc clean · colors 0/0 · audit 19799/19799 · CRE passed.
  Live-verified light+dark (Salam Finance Excel ○ stale 12d, 3 KPIs; runs "needs resolution" for rejected runs).
  Only shared.tsx + StrataDataPipelinePage.tsx touched (StrataStrategyMapPage untouched). Fresh-reload console clean
  (transient HMR stale-import errors during the edit sequence — cleared on reload).

## ⛔ NEXT = 4E Run Detail (anchor 09) — `StrataDataPipelinePage` RunDetailSection (`:runKey` branch). Re-read anchor 09 via DesignSync first.
