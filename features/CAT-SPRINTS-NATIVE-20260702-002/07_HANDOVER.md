# HANDOVER — CAT-SPRINTS-NATIVE-20260702-002

**Written:** 2026-07-03, end of session 003
**Session ended at:** user requested a copy-paste handover before ending the conversation
**Git HEAD:** `3cbf32781e1dd7eebc4fcc707d9be5dae7c162bd`
**Branch:** `main` (pushed — `main` and `origin/main` match at time of writing; this repo has an actively concurrent session pushing to `origin/main`, expect drift — `git fetch` before trusting "0 behind")

---

## OBJECTIVE (brief)

Replace dead Jira-synced sprint data with Catalyst-native sprints: FK-only membership, auto/custom naming, DoD → awaiting_approval → approval lifecycle, optional release link, and Phase-3 insights (AI summary, health, analytics) gated on real transition data. Full detail: `01_OBJECTIVE.md`.

---

## ACTIVE PLAN LOCK

File: `03_PLAN_LOCK.md`
Status: **DRAFT — still not re-locked as-built.** It only ever formally covered slice S0.1a (a schema/routing slice from early in the feature). Phases 0, 1, and 2 all shipped since then without a matching Plan Lock — recorded honestly as process debt across `08_DRIFT_LOG.md` DRIFT-001/002, not hidden. **Re-locking the Plan Lock as-built (or writing a fresh one for Phase 3) is the single biggest process debt item outstanding.**

Key constraints still in force from the DRAFT lock + subsequent decisions:
- Files forbidden (Phase 0 scope): legacy `Sprints.tsx`/`SprintBoard.tsx` (SAFe `iterations` table — untouched), `statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts`, `rh_*` release-ops stack.
- No touching Jira sync, prod strategy (explicitly deferred by Vikram — see D-013), or the migration-ledger drift (explicitly deprioritized by Vikram in favor of functionality work — see memory `feedback-functionality-over-migrations`).

---

## CURRENT STATE

### What is working (verified live this session, not just claimed)
- **Phase 0/1/2 sprint lifecycle** — list, create, DoD, awaiting_approval trigger, approve/reject, release link — verified via a 3-agent verification gate against live staging data (not just commit messages). See `06_VALIDATION_EVIDENCE.md` VG-001. Thin coverage (one real sprint, `88fc7fa1`, carries all the live evidence) but the mechanism works end-to-end.
- **RLS hardening (D-015/D-016)** — approve/reject and sprint-status transitions are now enforced at the DB layer (`supabase/migrations/20260703260000_sprint_approval_rls_hardening.sql`), not just client code. Applied to staging, verified via `pg_policies`/`pg_proc` catalog queries (trigger functions confirmed to bypass RLS as table owner). Same fix extended to `ph_release_approvers` for parity.
- **D-014 closed, no code needed** — traced the actual add-to-sprint code path; Business Requests structurally cannot reach sprints (separate table, no `sprint_id`/`project_id` FK, the work-item picker never queries `business_requests`).
- **Release-detail loading bug** — confirmed fixed live (fresh load + hard reload, no stuck state).
- **Migration-collision fix** — a concurrent session independently created a colliding migration filename (`20260703220000`); resolved by renaming this feature's file to `20260703270000_sprint_release_link.sql` (see D-017) and merging cleanly.

### What is NOT working / incomplete
- **Sprint health engine has a real bug**: `src/features/health/adapters/entity.ts` (`useEntityHealthAdapter`) matches sprint membership via the deprecated `sprint_release` JSONB field, not the `sprint_id` FK — contradicts `SPRINT_CONFIG.matchIssueByFk` in `src/lib/entity-hub/config.ts:152-153`, which explicitly documents that path as dead for sprints. **Any sprint health score today is silently wrong.** This is the recommended first Phase-3 slice — small, contained, high-leverage.
- **No AI summary caching exists for sprints or releases** — `summarize-release` edge function has zero caching (every "Summarize" click re-invokes the LLM). The cached-by-hash pattern the objective wants (D-007/S3.1) exists in a *different* feature (For You board insights: `hashBoardState` + `board_insight_cache` table) and needs to be ported, not assumed to already exist.
- **No formula exists for D-008's efficiency score** (40% completion + 25% flow-efficiency + 20% scope-stability + 15% approval-timeliness) — must be built fresh; nothing in the codebase computes this composite today.
- **No reusable timeline/chart component exists for scope-change history (S3.3)** — corrected a stale memory on this; `d3`/`recharts` are installed as deps but nothing pre-built in this repo actually uses them for a lane/timeline view. Would be genuinely new UI work.
- **Prod strategy (D-013)** — explicitly deferred, not pending action. Prod still has no `ph_jira_sprints` table.
- **Migration-ledger drift** (`supabase db push --linked` fails on unrecorded/duplicate versions) — explicitly deprioritized by Vikram this session in favor of functionality work. Flagged, not fixed, not currently being worked.

### What was last touched
File: none — last action was discovery (2 parallel read-only agents), no code written this session for Phase 3 yet.
State: Phase 3 is **scoped and ordered, not started**.

---

## PHASE 3 — PROPOSED SLICE ORDER (agreed with Vikram, not yet Plan-Locked)

1. **Health FK fix** — `src/features/health/adapters/entity.ts`: switch sprint membership match from `sprint_release` JSONB `.contains()` to `sprint_id` FK, matching `SPRINT_CONFIG.matchIssueByFk`. Small, contained bug fix — do this first, everything else about sprint health is untrustworthy until it's fixed.
2. **Wire sprint health into the side panel** — health engine already exists and is wired in 5 other places (`BoardManagerPage.tsx`, `BacklogPage.atlaskit.tsx`, `FilterPreviewPage.tsx`, `DependenciesView.tsx`, `ReleaseDetailPage.tsx` via a full-panel toggle) but has zero references in `ReleaseSidePanel.tsx` (1,693 lines, checked). Needs a `config.kind === 'sprint'`-gated health card, pattern-matching the existing `DefinitionOfDoneCard` gate.
3. **AI summary + cache (S3.1)** — port `hashBoardState`'s SHA-256 hash-cache pattern (currently only in `CatyBoardInsight.tsx` + `board_insight_cache` table) into a new sprint-scoped cache table; wire the existing `ReleaseSummaryCard` component (`src/components/releases/detail/summarize/ReleaseSummaryCard.tsx` — already has an `entityLabel?: string` prop specifically for this, defaults to `'Release'`) with `entityLabel="Sprint"`; needs a sprint branch in `summarize-release` edge function or a new one, plus a sprint-scoped store/hook (current `catyReleaseSummarizeStore.ts` / `useReleaseSummaryStream.ts` are keyed on `releaseId`).
4. **Time-in-status / efficiency (S3.5)** — build D-008's formula fresh. Real transition data confirmed available: `work_item_transitions` has 2,095 rows staging-wide (2,085 backfilled + 10 native, up from 2 at last checkpoint), with real non-null dwell times (`time_in_from_status_ms`) on 1,278 of them.
5. **Scope-change history (S3.3)** — genuinely new UI, no reusable chart/timeline component exists. Do this after the lower-risk slices, budget more time.
6. **Dependencies (S3.2)** — least specified in the original objective; lowest priority.

None of these are Plan-Locked yet. **The next session should write a Plan Lock for slice 1 (health FK fix) before touching code**, per the standing "no code before Plan Lock" rule — this handover is not a substitute for that.

---

## CHANGED FILES (this session, all committed + pushed)

| File | Status | Notes |
|---|---|---|
| `supabase/migrations/20260703260000_sprint_approval_rls_hardening.sql` | complete, applied to staging | D-015/D-016 RLS fix |
| `supabase/migrations/20260703270000_sprint_release_link.sql` | complete (renamed) | was `20260703220000_...`, renamed to resolve a version collision, D-017 |
| `features/CAT-SPRINTS-NATIVE-20260702-002/06_VALIDATION_EVIDENCE.md` | complete | VG-001 verification gate results |
| `features/CAT-SPRINTS-NATIVE-20260702-002/08_DRIFT_LOG.md` | complete | DRIFT-002 (concurrent-session commit collision) |
| `features/CAT-SPRINTS-NATIVE-20260702-002/09_DECISIONS.md` | complete | D-011 through D-017 |
| `features/CAT-SPRINTS-NATIVE-20260702-002/sessions/003_continue_feature.md` | complete | full session narrative |

No Phase 3 code has been written yet — discovery only.

---

## FORBIDDEN FILES

Do not touch these in the next session without a fresh Plan Lock decision:
- `src/pages/Sprints.tsx`, `SprintBoard.tsx` — legacy SAFe `iterations` stack, explicitly untouched
- `src/lib/statusPalette.ts`, `defectWorkflow.ts`, kanban `columnConfig.ts` — global regression surface (D-006)
- `rh_*` release-ops tables/pages — untouched
- Anything prod-targeting (`lmqwtldpfacrrlvdnmld`) — explicitly deferred per Vikram

---

## SCREENSHOTS

No new screenshots this session — RLS fix was backend-only (no UI touched), verified via SQL catalog queries instead. Prior session's full screenshot round (list, create modal, detail states, kebab menu) still stands, referenced in `sessions/002_continue_feature.md`.

---

## VALIDATION EVIDENCE

```bash
npx tsc -p tsconfig.app.json --noEmit
# 183 errors — matches pre-existing baseline, zero new errors from this session's merge
```

Full verification-gate raw evidence (DB probes, code-diff review, live DOM checks): `06_VALIDATION_EVIDENCE.md` VG-001.

Outstanding validations needed:
- Live click-through regression test of the RLS fix (Chrome MCP disconnected mid-session; only catalog-verified, not click-tested)
- D-007 gate proof (3) DB-level re-verification (code-level confirmed clean; a live `information_schema`/view check on `vw_sprint_jira_progress` would close the loop fully)

---

## DRIFT LOG SUMMARY

See `08_DRIFT_LOG.md` for full log.

Active drift events: 2 (DRIFT-001, DRIFT-002 — both are process-debt records, not currently-open incidents)
Most recent: DRIFT-002 — a concurrent session committed session 002's pending work mid-conversation, including this session's own in-progress session-log file, confirming two Claude Code sessions were operating on the same non-worktree checkout simultaneously. **Note for next session:** the *other* concurrent session has since added a hard-stop `CLAUDE.md` section ("CONCURRENT SESSIONS & DB TARGETING") and a `PreToolUse` hook (`.claude/hooks/supabase-linked-guard.sh`) directly addressing this exact class of incident — read that section before running any more `supabase --linked` commands or assuming you have the checkout to yourself.

---

## STANDING DIRECTIVES FROM VIKRAM (this session)

1. **"dont worry ever about prod its long way. first stabilize stageing"** — prod strategy (D-013) is explicitly deferred, not a blocker. (Saved to memory: `staging-first-prod-deferred`.)
2. **"lets focus on functionality not migrations here"** — said right after the above, in response to a proposed migration-ledger-drift audit. Don't self-select into infra/CI hygiene work; default to functionality unless explicitly asked. (Saved to memory: `feedback-functionality-over-migrations`.)

Both are durable — they should shape prioritization in future sessions on this repo, not just this conversation.

---

## NEXT EXACT PROMPT

Paste this as your first message in the next session:

```
continue feature CAT-SPRINTS-NATIVE-20260702-002

Read (in order):
  features/CAT-SPRINTS-NATIVE-20260702-002/00_READ_ME_FIRST.md
  features/CAT-SPRINTS-NATIVE-20260702-002/01_OBJECTIVE.md
  features/CAT-SPRINTS-NATIVE-20260702-002/03_PLAN_LOCK.md
  features/CAT-SPRINTS-NATIVE-20260702-002/07_HANDOVER.md   <- this file, read fully, it has the Phase 3 slice order
  features/CAT-SPRINTS-NATIVE-20260702-002/08_DRIFT_LOG.md
  features/CAT-SPRINTS-NATIVE-20260702-002/09_DECISIONS.md  <- D-011 through D-017 especially
  features/CAT-SPRINTS-NATIVE-20260702-002/06_VALIDATION_EVIDENCE.md  <- VG-001

Also read CLAUDE.md's "CONCURRENT SESSIONS & DB TARGETING — HARD STOP" section before any
git or supabase --linked command — a different concurrent session hit a real incident this
class of risk caused and added hard guardrails; assume they may still be running.

Then run pre-flight:
pwd && git branch --show-current && git status --short --untracked-files=all && git stash list --max-count=5
git fetch origin main && git log --oneline main..origin/main   <- check for concurrent-session drift before doing anything

Next action: write a Plan Lock for Phase 3 slice 1 (health FK fix — src/features/health/adapters/entity.ts
switch sprint-membership match from ph_issues.sprint_release JSONB to the sprint_id FK, matching
SPRINT_CONFIG.matchIssueByFk in src/lib/entity-hub/config.ts). Get it approved before writing code.
Standing directives: prod is deferred (D-013), prioritize functionality over migration/infra hygiene
work unless explicitly asked.
```
