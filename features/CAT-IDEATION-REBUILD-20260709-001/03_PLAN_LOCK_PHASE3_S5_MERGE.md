# PLAN LOCK — Phase 3 Slice S5: Merge (winner-takes, V1)

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive) 2026-07-11 · **Timebox**: 1.5h

## Objective
The `screening → merged` transition (S3 seed, `reason_required` guard already real) gets a real UI: pick a target idea, confirm with a reason, source idea becomes `merged` + `merged_into_id` set + locked (RLS `idn_idea_is_locked` already treats `decision='merged'` as terminal-locked — no client code needed for that half).

## Non-scope — and why, explicitly (not silently dropped)
The full C.6 mock promises vote/evidence/watcher **transfer** ("4 votes move," "5 watchers merged"). **Checked the RLS and it's a hard block, not a UI gap**: `idn_votes_update`/`idn_watchers_write` both require `user_id = auth.uid()` — a client session can only ever modify its OWN vote/watch row. Moving OTHER users' vote/watcher rows during a merge is only possible via a `SECURITY DEFINER` Postgres function, which is a migration. Every Plan Lock this session has held "no migration" as a hard constraint, and mid-autonomous-loop without Vikram actively reviewing is the wrong moment to introduce new schema/function surface unilaterally. **This slice ships the merge status transition only; vote/evidence/watcher transfer is flagged as a follow-up requiring a migration-backed RPC, and the UI says so honestly instead of promising a transfer that doesn't happen.**
- Evidence re-linking — same RLS-needs-a-function constraint, plus no Evidence panel UI exists yet regardless.
- Duplicate-suggestion-originated merge (side pre-selected from an AI suggestion) — Phase 4, no suggestions exist yet.
- Target-idea search/picker as a rich modal — this slice uses a plain text input for the target's `idea_key` (typed by the reviewer, who already knows which idea is the duplicate) rather than building a new search-and-select UI component; upgrading to a picker is a follow-up, not blocking correctness.

## Files to modify
- `src/hooks/useIdeationMerge.ts` (new) — merge mutation: validates the target exists and isn't the source itself, updates the source idea.
- `src/modules/ideation/pages/DetailPage.tsx` — Merge action, visible when `workflow_status_key === 'screening'`.

**Files forbidden**: any migration (hard constraint — see non-scope), `idn_votes`/`idn_watchers` writes for any user other than the acting one (RLS-enforced anyway, but don't attempt to route around it).

## Data rules
- `idea_key` lookup for the target is exact-match, case-insensitive; a not-found or self-referencing key surfaces a real error, not a silent no-op.
- Reason is required (matches the seeded `reason_required` guard) — reuses `ReasonCaptureModal`, same as Decline/Park.
- ADS tokens only.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits
- [ ] Real DB proof on a real `screening` staging idea: merging into a real target sets `workflow_status_key='merged'`, `decision='merged'`, `merged_into_id=<target's real id>`, `decision_reason=<typed text>`; a subsequent UPDATE attempt on the merged idea is blocked by RLS (`idn_idea_is_locked`) — proving the terminal lock is real, not just documented
- [ ] Screenshot: merge action + confirmation + the resulting locked/merged state

## Stop conditions
Any DB schema/migration need → stop, this slice explicitly excludes it.
