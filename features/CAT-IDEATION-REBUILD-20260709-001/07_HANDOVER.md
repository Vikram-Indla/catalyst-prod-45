# HANDOVER — CAT-IDEATION-REBUILD-20260709-001

**Updated**: 2026-07-11 · **Resume with**: `continue feature CAT-IDEATION-REBUILD-20260709-001`

## State (accurate as of this update — the pre-2026-07-11 content below is historical)

- **Phase 0** (design lock): ✅ EXITED.
- **Phase 1** (foundations, S1–S5): ✅ all committed, all staging-validated.
- **Phase 2** (CRUD, S1–S5: Inbox, Create/Submit, Detail, Explore, Portfolio): ✅ all committed. Explore had a real cross-session collision (see below) — resolved, current.
- **Phase 3** (workflow/permissions):
  - S1 (real guard evidence + Decision UI Approve/Decline/Park): ✅ committed, **screenshot-verified with real staging data** (see `06_VALIDATION_EVIDENCE.md`).
  - S2 Votes, S4 Watchers, S3 Admin: ✅ code committed, **live browser + DB verified** (sign-in blocker resolved — a still-live session survived on a previously-used dev port). Vote cast/changed, Watch toggled, both DB-confirmed. Admin's scoring model + 26-row role matrix render exactly matching the S3 seed. Found and fixed a real `@atlaskit/popup` positioning bug along the way (menu pinned at (0,0) — rebuilt with the manual-position + `createPortal` pattern `StatusLozengeDropdown.tsx` already uses for the identical failure).
  - S5 Merge: ⚠️ **UI/UX confirmed correct; the actual database write is blocked for every user, always** — see "⚠️ Confirmed blocker" below.
- **Phase 5** S1 Conversion: ⚠️ same status as Merge — UI correct, DB write blocked by the identical root cause.
- **Phase 6** S1 (notification dispatch — `idea_comment_added`, `idea_decision`): ✅ committed, **live DB-verified**. Found and fixed a real `status_type` CHECK constraint violation along the way (see `11_KARPATHY_LOOP_LOG.md` #22).
- **Phase 4** (AI Copilot): **not started.** Needs LLM gateway wiring, prompt versioning, suggestion ledger UI — genuinely a multi-slice undertaking, correctly deferred in every Plan Lock so far, not attempted under time pressure.
- **Remaining known gaps** (see `04_ELITE_DESIGN_BLUEPRINT.md`'s P0/P1 table for the full list): Evidence panel (idn_evidence has no UI at all), remaining notification events (`idea_submitted`/`idea_triage_assigned`/`idea_mentioned`/`idea_vote_milestone`/`idea_merged`/`idea_converted`/`idea_delivered`/`idea_ai_suggestions_ready` — see Phase 6 S1's Plan Lock non-scope for why each is deferred), scoring-model editing/publish flow (Admin page is read-only), role-gating the workflow action buttons (pre-existing gap across the *whole* canonical workflow system, not ideation-specific — `ph_wf_transition_roles` role groups aren't mapped to `product_roles.code` anywhere), Homepage widgets/ForYou section, AR/RTL pass.

## ⚠️ Confirmed blocker — needs a migration + Vikram's review, this is the #1 next-session priority

Merge and Conversion are **fully built and UI-tested**, but their final `idn_ideas` UPDATE is rejected by RLS for every user, every time. Confirmed live (not theoretical) — full detail and exact repro in `06_VALIDATION_EVIDENCE.md`'s "Merge + Conversion" section. Short version: `idn_ideas_update` (in the original S1 migration, `supabase/migrations/20260709130000_idn_core_schema.sql:229`) has no explicit `WITH CHECK`, so Postgres reuses `USING` evaluated against the **new** row — and the policy's own lock conditions (`decision IS DISTINCT FROM 'merged'`, `converted_business_request_id IS NULL`) then reject the exact values Merge/Conversion are trying to write. A second, independent gap: `idn_conversions` has no DELETE RLS policy, so the mutation's compensating cleanup (delete the orphaned BR row on failure) silently no-ops.

**The fix is a migration** (split `idn_ideas_update` into a correct `USING` on the old row + a permissive role-based `WITH CHECK`; add a DELETE policy to `idn_conversions`). Deliberately not written this session — every relevant Plan Lock named "any DB schema change needed → stop, re-plan" as a hard stop condition, and applying an RLS/security policy change to a live staging database unilaterally, mid-autonomous-loop with no one reviewing, is exactly the kind of action that condition exists to prevent. **Do not build anything else on top of Merge/Conversion until this is fixed and re-verified.**

## Commits (main, chronological, Phase 2 onward)

- `9982a52d3` Phase 2 S1 — Inbox 2-pane triage
- `5c08c939d` Phase 2 S2 — Create/Submit idea form
- `a93b2655f` Phase 2 S3 — Idea Detail, real ADF + comments
- `f49cfe20e` → **superseded same-day by** `588e825c7` — Phase 2 S4 Explore. Real cross-session collision: another concurrent session independently built the same slice, caught a real RLS gap (`idn_ideas` SELECT policy has no draft/ownership clause — any approved user could read other users' private drafts org-wide), fixed it as D16, and their version replaced this one on `main`. Verified independently before trusting the report; no data lost, confirmed via `git merge-base --is-ancestor`.
- `23a1e7172` Phase 2 S5 — Portfolio, real Value×Effort chart (recharts `shape` prop fix for invisible scatter points — see `11_KARPATHY_LOOP_LOG.md`)
- `d3a20cfcd` (rebased from a locally-unpushed `493013d30`) Phase 3 S1 — workflow guards real evidence + Decision UI. **Screenshot-verified.**
- `76a36591d` Phase 3 S2–S5 + Phase 5 S1 — Votes/Watchers/Admin/Merge/Conversion (initial commit).
- `6214b8ff3` Live-verification fixes: `VoteControl`'s `@atlaskit/popup` → manual-position rewrite, error-surfacing fix in `useIdeationMerge.ts`/`useIdeationConvert.ts` (was throwing raw Postgrest objects, not `Error` instances — masked the real RLS error behind a generic message), compensating-cleanup fix attempt in Conversion (confirmed still non-functional due to the second RLS gap, documented not hidden).
- (uncommitted as of this handover — see below) Phase 6 S1 notification dispatch.

## Cautions carried forward

- Zero legacy carryover: no reads/imports of `ph_ideas`/`ph_idea_*`/`modules-dormant/ideation`/`ideationService.ts` anywhere in new code. Still true — checked every slice.
- Concurrent sessions: this repo has had at least 3 other concurrent sessions active during Phase 2–5 (Strata consolidation, docintel, another Ideation session on Explore). Always `git fetch origin main` + check for file overlap before pulling/rebasing; use `git rebase` (never force-push) to reconcile an unpushed local commit against a moved origin.
- `.codebase-memory/*` and `src/components/ads/DropdownMenu.tsx` are pre-existing dirty files in the shared checkout, not owned by this feature — never stage them; restore `.codebase-memory` to clean before any rebase (it blocks rebase otherwise) and leave `DropdownMenu.tsx` untouched.
- vitest still cannot start locally (rolldown `styleText` vs Node 20.12.2) — re-checked 2026-07-11, still broken. Not this feature's to fix (global tooling/Node version).
- Merge (Phase 3 S5) intentionally does NOT transfer votes/evidence/watchers — `idn_votes_update`/`idn_watchers_write` RLS both require `user_id = auth.uid()`, so a client session structurally cannot move another user's rows. Real transfer needs a `SECURITY DEFINER` RPC. This is a SEPARATE, additional limitation from the confirmed blocker above (which prevents the merge transition itself from working at all, not just the data transfer) — both need migrations, flag both to Vikram together.

## Drift

None new. `08_DRIFT_LOG.md` still reflects only the pre-Phase-2 DRIFT-001 (S3 seed schema mismatches, resolved).
