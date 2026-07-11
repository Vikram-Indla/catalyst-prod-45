# HANDOVER — CAT-IDEATION-REBUILD-20260709-001

**Updated**: 2026-07-11 · **Resume with**: `continue feature CAT-IDEATION-REBUILD-20260709-001`

## State (accurate as of this update — the pre-2026-07-11 content below is historical)

- **Phase 0** (design lock): ✅ EXITED.
- **Phase 1** (foundations, S1–S5): ✅ all committed, all staging-validated.
- **Phase 2** (CRUD, S1–S5: Inbox, Create/Submit, Detail, Explore, Portfolio): ✅ all committed. Explore had a real cross-session collision (see below) — resolved, current.
- **Phase 3** (workflow/permissions):
  - S1 (real guard evidence + Decision UI Approve/Decline/Park): ✅ committed, **screenshot-verified with real staging data** (see `06_VALIDATION_EVIDENCE.md`).
  - S2 Votes, S4 Watchers, S3 Admin: ✅ code committed, **live browser + DB verified** (sign-in blocker resolved — a still-live session survived on a previously-used dev port). Vote cast/changed, Watch toggled, both DB-confirmed. Admin's scoring model + 26-row role matrix render exactly matching the S3 seed. Found and fixed a real `@atlaskit/popup` positioning bug along the way (menu pinned at (0,0) — rebuilt with the manual-position + `createPortal` pattern `StatusLozengeDropdown.tsx` already uses for the identical failure).
  - S5 Merge: ✅ **RLS migration applied to staging, live-verified working** (IDEA-9 merged into IDEA-8 via real UI, `merged_into_id` DB-confirmed, no RLS error). See "✅ Resolved" below.
  - S7 (new, gap fix — screening → evaluation transition): ✅ committed, **live-verified**. `StartEvaluationArea` — no UI anywhere previously moved an idea from `screening` to `evaluation`, silently blocking Decision and Conversion for every real user. Reused the existing generic `useDecideIdeaTransition` mutation (already accepted any `toStatusKey`) — no new hook, no new RLS surface.
- **Phase 5** S1 Conversion: ✅ **RLS migration applied to staging, live-verified working end-to-end** (IDEA-8: screening → evaluation → approved → converted, all via real UI clicks, no SQL shortcuts). DB-confirmed: `idn_ideas.workflow_status_key = 'converted'`, `converted_business_request_id` set, real `business_requests` row (`MIM-001`) + `idn_conversions` audit row both created.
- **Phase 6** S1 (notification dispatch — `idea_comment_added`, `idea_decision`): ✅ committed, **live DB-verified**. Found and fixed a real `status_type` CHECK constraint violation along the way (see `11_KARPATHY_LOOP_LOG.md` #22).
- **Phase 3** S6 (Evidence panel — snippet + link kinds): ✅ committed, **live DB-verified** (add snippet, add link, delete — all confirmed against real `idn_evidence` rows). Checked the RLS for the same self-referential lock bug Merge/Conversion hit *before* building — confirmed clean (see `11_KARPATHY_LOOP_LOG.md` #23).
- **Phase 4** (AI Copilot): **not built, still only scoped.** `03_PLAN_LOCK_PHASE4_S1_CLASSIFICATION_DRAFT.md` — a real, concrete first-slice plan (classification suggestion: one edge function call to the already-existing `_shared/llm.ts` gateway, one `idn_ai_suggestions` insert, one review card). Deliberately not built: deploying a real edge function is a live-infrastructure change with real LLM cost — needs a separate go/no-go from Vikram, not given yet as of this update. Surfaces a real open question worth checking before any code: does `idn_ai_suggestions` need its own UPDATE RLS policy for the accept/reject path, and does it risk the same self-referential bug `idn_ideas_update` had? Check that line-by-line first.
- **Remaining known gaps** (see `04_ELITE_DESIGN_BLUEPRINT.md`'s P0/P1 table for the full list): Merge's vote/evidence/watcher transfer (needs a `SECURITY DEFINER` RPC — client RLS structurally can't move another user's rows, see `11_KARPATHY_LOOP_LOG.md` #15), evidence `document`/`voice_transcript`/`image` kinds (need docintel/voice-flow/attachment infra), remaining notification events (`idea_submitted`/`idea_triage_assigned`/`idea_mentioned`/`idea_vote_milestone`/`idea_merged`/`idea_converted`/`idea_delivered`/`idea_ai_suggestions_ready` — see Phase 6 S1's Plan Lock non-scope for why each is deferred), scoring-model editing/publish flow (Admin page is read-only), role-gating the workflow action buttons (pre-existing gap across the *whole* canonical workflow system, not ideation-specific — `ph_wf_transition_roles` role groups aren't mapped to `product_roles.code` anywhere), Homepage widgets/ForYou section (deliberately not touched — shared universal infrastructure, real regression risk), AR/RTL pass, `VITE_ENABLE_IDEATION` still defaults false (dark-launch flag, `src/lib/featureFlags.ts:110`) — module is built and staging-verified but not yet exposed to real users; flipping it is a deploy decision, not made in this session. Also: `HubSwitcher.tsx:73`'s `href: '/ideation/backlog'` doesn't match any mounted route (actual root is `/ideation`) — a one-line link fix needed whenever the flag flips on.

## ✅ Resolved — RLS migration applied and live-verified (2026-07-11)

Merge and Conversion were blocked because `idn_ideas_update` (original S1 migration, `supabase/migrations/20260709130000_idn_core_schema.sql:229`) had no explicit `WITH CHECK`, so Postgres reused `USING` evaluated against the **new** row — the policy's own lock conditions rejected the exact values Merge/Conversion were trying to write. Full detail and exact repro in `06_VALIDATION_EVIDENCE.md`'s "Merge + Conversion" section.

**Fix applied**: `supabase/migrations/20260711025559_idn_ideas_fix_self_referential_lock_rls.sql` — applied to staging (`cyijbdeuehohvhnsywig`) via Vikram's explicit approval, `apply_migration` succeeded, policies confirmed live via `pg_policies`. Split `idn_ideas_update` into a correct `USING` on the old row + a permissive role-based `WITH CHECK`; added a DELETE policy to `idn_conversions`.

**Live-verified, not just schema-checked** (learning from `11_KARPATHY_LOOP_LOG.md` #17 — SQL dry-runs bypass RLS and prove nothing about real behavior):
- Merge: IDEA-9 → merged into IDEA-8 via real UI, `merged_into_id` DB-confirmed, no RLS error.
- Conversion: IDEA-8 taken through the real UI end-to-end (`screening → evaluation → approved → converted`), DB-confirmed 3-table write chain (`idn_ideas`, `business_requests` `MIM-001`, `idn_conversions`).

**Not yet applied to prod** (`lmqwtldpfacrrlvdnmld`) — staging-only as of this update. Prod application needs the same explicit approval treatment when Vikram is ready.

## Commits (main, chronological, Phase 2 onward)

- `9982a52d3` Phase 2 S1 — Inbox 2-pane triage
- `5c08c939d` Phase 2 S2 — Create/Submit idea form
- `a93b2655f` Phase 2 S3 — Idea Detail, real ADF + comments
- `f49cfe20e` → **superseded same-day by** `588e825c7` — Phase 2 S4 Explore. Real cross-session collision: another concurrent session independently built the same slice, caught a real RLS gap (`idn_ideas` SELECT policy has no draft/ownership clause — any approved user could read other users' private drafts org-wide), fixed it as D16, and their version replaced this one on `main`. Verified independently before trusting the report; no data lost, confirmed via `git merge-base --is-ancestor`.
- `23a1e7172` Phase 2 S5 — Portfolio, real Value×Effort chart (recharts `shape` prop fix for invisible scatter points — see `11_KARPATHY_LOOP_LOG.md`)
- `d3a20cfcd` (rebased from a locally-unpushed `493013d30`) Phase 3 S1 — workflow guards real evidence + Decision UI. **Screenshot-verified.**
- `76a36591d` Phase 3 S2–S5 + Phase 5 S1 — Votes/Watchers/Admin/Merge/Conversion (initial commit).
- `6214b8ff3` Live-verification fixes: `VoteControl`'s `@atlaskit/popup` → manual-position rewrite, error-surfacing fix in `useIdeationMerge.ts`/`useIdeationConvert.ts` (was throwing raw Postgrest objects, not `Error` instances — masked the real RLS error behind a generic message), compensating-cleanup fix attempt in Conversion (confirmed still non-functional due to the second RLS gap, documented not hidden).
- `7952b5828` Phase 6 S1 — notification dispatch (comment + decision), live DB-verified.
- `cf32e90ff` Phase 3 S6 — Evidence panel (snippet + link), live DB-verified.
- `b33819295` RLS fix migration drafted (NOT applied) for Merge/Conversion.
- (uncommitted as of this handover — see below) Phase 4 S1 classification — scoping draft only, no code.

## Cautions carried forward

- Zero legacy carryover: no reads/imports of `ph_ideas`/`ph_idea_*`/`modules-dormant/ideation`/`ideationService.ts` anywhere in new code. Still true — checked every slice.
- Concurrent sessions: this repo has had at least 3 other concurrent sessions active during Phase 2–5 (Strata consolidation, docintel, another Ideation session on Explore). Always `git fetch origin main` + check for file overlap before pulling/rebasing; use `git rebase` (never force-push) to reconcile an unpushed local commit against a moved origin.
- `.codebase-memory/*` and `src/components/ads/DropdownMenu.tsx` are pre-existing dirty files in the shared checkout, not owned by this feature — never stage them; restore `.codebase-memory` to clean before any rebase (it blocks rebase otherwise) and leave `DropdownMenu.tsx` untouched.
- vitest still cannot start locally (rolldown `styleText` vs Node 20.12.2) — re-checked 2026-07-11, still broken. Not this feature's to fix (global tooling/Node version).
- Merge (Phase 3 S5) intentionally does NOT transfer votes/evidence/watchers — `idn_votes_update`/`idn_watchers_write` RLS both require `user_id = auth.uid()`, so a client session structurally cannot move another user's rows. Real transfer needs a `SECURITY DEFINER` RPC. This is a SEPARATE, additional limitation from the confirmed blocker above (which prevents the merge transition itself from working at all, not just the data transfer) — both need migrations, flag both to Vikram together.

## Drift

None new. `08_DRIFT_LOG.md` still reflects only the pre-Phase-2 DRIFT-001 (S3 seed schema mismatches, resolved).
