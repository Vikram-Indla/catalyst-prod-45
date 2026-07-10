# Session 007 — AC8 tooltips + AC6 resolution (2026-07-09)

## AC8 — RAG lozenge tooltips (DONE)
- `StrataBandLozenge` (shared.tsx): wrapped in canonical `Tooltip` (@/components/ads) showing `<label> — governed threshold band, score ≥ <min_score>` from the governed scheme config (no invented copy). Unresolved band fallback keeps zero-assumption (no tooltip).
- `StrataExecutionHealthLozenge`: tooltip per health key with meanings mirrored VERBATIM from the server rules in `strata_calc_execution_progress` (20260706231000) — comment in code pins the coupling.
- DOM-verified on :8081: hover on Total-score ON TRACK shows "On track — governed threshold band, score ≥ 85." (screenshot in chat).

## AC6 — mutation feedback (RESOLVED, no code needed beyond existing)
- Attempted a success toast on Recalculate; discovered `@/hooks/use-toast` is an ADS shim with a **platform-wide doctrine**: "DEPRECATED 2026-06-16 (Vikram): non-destructive confirmation badges are suppressed platform-wide. Only destructive (error) toasts render." Success flag intentionally reverted (would be silently swallowed dead code).
- AC6 is satisfied doctrine-compliantly: Recalculate → `invalidate()` refreshes scores and the "Calculated <time>" line (DOM-verified: 14:02 → 14:03 on click, no reload); errors render inline (`recalcError` SectionMessage) and destructive flags platform-wide.
- Plan Lock AC6 wording ("Atlaskit flag success/error") is superseded by the 2026-06-16 platform doctrine for the success half — noted in 00_admin/DECISIONS.md.

## Validation
tsc clean · 16/16 strata+sidebar tests · color gate 0=0 · ads-audit-gate at baseline. Files touched: `src/modules/strata/components/shared.tsx`, `src/modules/strata/pages/StrataScorecardDetailPage.tsx` (comment only net effect).

## Remaining (STATE.json)
AC5 transitions instrumentation; Command Room visual depth; decommission slice REQ-016/018/019/022/023; Vikram screenshot signoff (sessions 005–007).
