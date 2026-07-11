# PLAN LOCK — ADS gate repair

**Feature Work ID:** CAT-IDEATION-REBUILD-20260709-001  
**Date:** 2026-07-11  
**Status:** APPROVED — Vikram: “Continue as required.”  
**Timebox:** under 30 minutes

## Objective

Restore the repository ADS audit ratchet after commit `9b0f7ee62` added one token violation and one
typography violation in `StartEvaluationArea`.

## Scope

- Replace the newly added hardcoded 32px/20px spacing with ADS space tokens.
- Remove the newly added uppercase transformation and letter spacing.
- Preserve workflow behavior and visible copy.

## Files allowed

- `src/modules/ideation/pages/DetailPage.tsx`
- This feature's Plan Lock, drift, Karpathy, handover, and session records.

## Files forbidden

- `design-governance/audit-baseline.json`
- Any Supabase file or database object.
- DocIntel source code.

## Acceptance

- `npm run audit:ads:gate` reports no category above baseline.
- `npm run lint:colors:gate` passes.
- Targeted audit reports no violation in the repaired block.
- No behavior, route, data, or permission change.

## Stop conditions

- Any required baseline increase.
- Any additional source file needed.
- Any behavioral test failure attributable to the repair.
