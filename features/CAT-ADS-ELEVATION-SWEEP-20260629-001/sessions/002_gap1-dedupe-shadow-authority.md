# Session 002 — Slice 1 (Gap 1): dedupe shadow-token authority

**Date:** 2026-06-29
**Branch:** fix/ads-elevation-sweep (off origin/main)

## Change
Deleted the duplicate `!important` `--ds-shadow-raised/overlay` block from the dark
selector in `src/index.css` (was ~6114-6116), replaced with a pointer comment.
`catalyst-ads-parity.css` is now the single shadow authority (it also owns the
previously-missing `--ds-shadow-overflow`).

## Verification (raw)
- DOM probe, light: raised/overlay/overflow all resolve (incl. overflow).
- DOM probe, dark (forced + reverted): raised `#010404@0.5`, overlay `#010404@0.36`,
  overflow resolves — near-identical to the deleted `rgba(3,4,5,…)` values. No regression.
- `npm run lint:colors:gate` → ✅ 76 = baseline 76 (no color change).
- `npm run audit:ads:gate` → ✅ tokens dropped 27637→27635; baseline ratcheted down.
- `git diff src/index.css` → only the shadow-block change; no codemod pollution.

## Not mine (left unstaged)
- `src/components/hierarchy/StatusBadge.tsx` — carried-over CAT-ADS-STATUS-SWEEP work.
- `src/styles/r360.css` — auto-rewritten by the border-width codemod (watcher). Flagged to Vikram.

## Next
Slice 2/3/4 — sweep the 202 real `box-shadow` literals to `--ds-shadow-*` tokens.
