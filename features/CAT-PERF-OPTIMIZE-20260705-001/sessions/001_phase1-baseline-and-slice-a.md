# Session 001 — Phase 1 baseline + Slice A

**Feature:** CAT-PERF-OPTIMIZE-20260705-001
**Date:** 2026-07-05
**Branch:** main

## Phase 1 — baseline (read-only)
5 parallel audit dims (bundle / render / data-fetch / memory / heavy-surfaces). Findings in 03_PLAN_LOCK.md.
Headline: `vendor-atlaskit` 21.9MB/5.62MB-gzip modulepreloaded (vite.config.ts:788) — but split is SPIKE-1 (Emotion closure landmine, documented 2026-06-08 revert). Lucide + barrel = SPIKE-2/3.

## Slice A — async-setState-after-unmount leaks (DONE)
Applied repo `cancelled`/mountedRef guard pattern to 7 files:
- P0 `catalyst-detail-views/improve/SuggestChildIssuesDialog.tsx` — `cancelled` flag + cleanup
- P0 `catalyst-detail-views/improve/LinkSimilarItemsDialog.tsx` — `cancelled` flag + cleanup
- P0 `reqAssist/RAEpicGenerationModal.tsx` — `cancelledRef` guard on run()/invokeGeneration + cleanup
- P1 `reqAssist/RAEpicDraftDrawer.tsx` — `mountedRef` (fetchEpics has 3 callers) + guard
- P1 `reqAssist/RABackgroundModal.tsx` — `cancelled` flag + cleanup
- P1 `reqAssist/RAJiraSidePanel.tsx` — `cancelled` flag at 2 await points + cleanup
- P2 `reqAssist/RAStatsBar.tsx` — `cancelled` flag on fetchActivity (channel already cleaned)

**Validation:** `npx tsc --noEmit` → 0 errors. Logic-only (no color/UI change → no screenshot). Behavior-preserving.

## Next
Slice B (read-path N+1: StoriesListView P0, useReleaseHealth P1).
