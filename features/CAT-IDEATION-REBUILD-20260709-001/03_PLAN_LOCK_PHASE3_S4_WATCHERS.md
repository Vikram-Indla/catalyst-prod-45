# PLAN LOCK — Phase 3 Slice S4: Watchers

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive) 2026-07-11 · **Timebox**: 1h

## Objective
Build the "Watching (N) 👁 [watch]" rail control from 04 §C.4 over the already-existing `idn_watchers` table (S1 schema, RLS already correct: any approved user can read, only your own row writable). Binary watch/unwatch — no importance levels (that's votes).

## Non-scope
- Auto-watch-on-submit/auto-watch-on-vote (`idn_watch_reason` enum has `submitter`/`voter`/`manual` — this slice only wires the `manual` path via an explicit button; auto-watch rows would be written by the submit/vote mutations themselves, a change to S2's/S2-votes' mutation code, not this slice).
- Watcher list/avatars display — count + toggle only, matching the mock's compactness.

## Files to modify
- `src/hooks/useIdeationWatchers.ts` (new) — count + my-watch-state query, toggle mutation.
- `src/modules/ideation/components/WatchControl.tsx` (new) — small Atlaskit Button + eye icon, ADS tokens.
- `src/modules/ideation/pages/DetailPage.tsx` — mount next to `VoteControl` in the Community rail row.

**Files forbidden**: any migration (schema exists, unchanged), any file outside the three above.

## Data rules
- Zero-assumption: 0 watchers renders "0 watching", not hidden.
- RLS already correct — no client-side re-implementation.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits
- [ ] Real DB proof: toggling watch inserts/deletes the real `idn_watchers` row with `reason='manual'`; count updates live
- [ ] Screenshot alongside the S2/S3 verification batch once sign-in unblocks

## Stop conditions
Any DB schema change needed → stop, re-plan.
