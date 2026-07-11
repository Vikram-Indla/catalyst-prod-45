# PLAN LOCK — Phase 3 Slice S2: Vote + importance control

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive: "complete the whole Ideation module... loop until built") 2026-07-11 · **Timebox**: 2h

## Objective
Build D3's vote-with-importance control (idn_votes: 1 vote/user, importance 1–4 critical/important/nice/none) and mount it on the Detail page's rail "Community" block per 04 §C.4 mock (`👍 12 votes · Critical×3 [Vote ▾ importance]`). D9 already approved this as one of the 5 non-canonical components (no canonical equivalent — ReactionBar precedent is emoji-only).

## Non-scope
- Vote milestone notifications (`idea_vote_milestone` trigger already seeded in S3, fires server-side / Phase 6 notification wiring, not this UI slice).
- Vote column in Explore/JiraTable or Portfolio bubble-size-by-votes — follow-up slice, not blocking this one.
- Watchers (`idn_watchers`) — separate table, separate slice; D3/D9 only cover votes.

## Design evidence
04 §C.4 rail mock (Community block): vote count + importance breakdown + `[Vote ▾ importance]` control. D3: "Vote + 4-level importance (critical/important/nice/none)" per Mobbin/Productboard evidence (05 §C row 12).

## Component (D9-approved non-canonical)
`VoteControl` — Atlaskit `Button` + `Popup`/dropdown for importance selection, ADS tokens only. No canonical equivalent exists (checked: `ReactionBar` is emoji-reaction-only, not vote+importance).

## Files to modify
- `src/hooks/useIdeationVotes.ts` (new) — vote count + importance breakdown query, current-user vote query, cast/update/remove mutation.
- `src/modules/ideation/components/VoteControl.tsx` (new) — the D9 non-canonical control.
- `src/modules/ideation/pages/DetailPage.tsx` — mount `VoteControl` in the rail under a new "Community" row.

**Files forbidden**: any file already touched by another concurrent session this hour (recheck `git status`/`git log` before editing); migration files (schema already exists, `idn_votes` unchanged).

## Data rules
- RLS already enforces: 1 vote/user (`UNIQUE(idea_id,user_id)`), blocked on locked ideas (`idn_idea_is_locked`). No client-side re-implementation of those invariants — just surface server errors honestly.
- Zero-assumption: 0 votes renders "0 votes", not hidden or a fabricated placeholder.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] Real DB proof: cast a vote as the signed-in user on a real staging idea → `idn_votes` row appears with correct `importance`; changing importance updates the same row (not a duplicate, honors the UNIQUE constraint); vote count updates live on the page without reload
- [ ] Screenshot: Detail page rail showing the Community block with a real vote cast, light + dark

## Stop conditions
Any DB schema change needed → stop, re-plan.

## Drift / rebaseline
None anticipated.
