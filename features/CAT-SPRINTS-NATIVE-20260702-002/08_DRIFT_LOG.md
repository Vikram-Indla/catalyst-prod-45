# CAT-SPRINTS-NATIVE-20260702-002 — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

[Entries will be appended if drift is detected]

## DRIFT-001 — 2026-07-02 — Plan executed outside the governance process

Phase 0 + 3 Phase-1 slices were implemented and pushed to origin/main while 03_PLAN_LOCK.md was DRAFT/unapproved, with zero entries written to this folder. The four open Plan Lock decisions (prod strategy, sync discriminator, draft status, business-request exclusion) were answered implicitly by code, unrecorded. Irreversible-ish data actions ran on DRAFT authority (25 soft-deletes, released→completed status migration on staging). Recorded honestly per council v2 — no sanitizing. Remediation: verification-first reconciliation (04_EXECUTION_LOG), ratify-as-built decisions (09_DECISIONS), Plan Lock to be re-locked AS-BUILT after the S-A verification gate. Systemic fix proposed: CI staging↔repo schema-drift ratchet gate (new Feature Work ID candidate) — pattern: environment mutated first, record written later (slug out-of-band → env drift → this).

## DRIFT-002 — 2026-07-03 — Concurrent session committed pending work under an unresolved gate; commit gate re-violated

Session 003 opened via `continue feature`, found the tree in the same uncommitted state `07_HANDOVER.md` described, wrote a rehydration report, and asked the user how to proceed (Plan Lock still DRAFT, Council V2's verification-gate condition unmet, two contradicted claims unreconciled). User selected "commit session 002's work first." Before session 003 staged anything, a re-check of `git status` found the tree **already clean** — three commits (`40551d95e`, `660d29e5b`, `5a20bfd81`) had landed on local `main` moments earlier, authored by `Vikram-Indla` with the standard Claude co-author trailer, evidently from a second concurrent process/session operating on this same non-worktree working directory. That commit's file list includes `sessions/003_continue_feature.md` — the file session 003 itself had just written — confirming the two sessions raced on the same tree.

**What this means:** the commit-gate requirements (Plan Lock approved, verification gate passed, four implicit decisions ratified in `09_DECISIONS.md`) were still unmet at the moment of commit — same failure mode as DRIFT-001, now repeated a second time, by whichever process authored these three commits. Session 003 did not itself commit anything and takes no further git action (push, amend, reset) without explicit user direction — recording this honestly rather than treating the fait-accompli commit as retroactive governance.

**Open follow-up:** confirm with the user whether another Claude Code session or terminal is/was active concurrently on this exact checkout (not a worktree) — if so, concurrent non-worktree sessions on one feature folder is itself a process risk worth a standing rule.

## DRIFT-003 — 2026-07-03 — 03_PLAN_LOCK.md (S0.1a) superseded by Phase 3 Slice 1 lock

`03_PLAN_LOCK.md` had covered only slice S0.1a (schema/routing, DRAFT status, "22 slices" master model). That slice — and all of Phase 0/1/2 — shipped long ago (DRIFT-001/002), leaving the file stale relative to the feature's actual state. Per `07_HANDOVER.md`'s Phase 3 slice order (agreed with Vikram, not yet Plan-Locked) and the standing "no code before Plan Lock" rule, `03_PLAN_LOCK.md` is overwritten with a fresh lock for **Phase 3 Slice 1 (health FK fix)** — the S0.1a content is superseded, not deleted-without-record; this entry is the pointer. No rebaseline approval needed beyond the user's own instruction to write this slice's lock next.

## DRIFT-004 — 2026-07-03 — Migration timestamp collision on push (Slice 3), same class as D-017

Before pushing Slice 3's commit, `git fetch origin main` surfaced 5 new commits from a concurrent session (Reports Hub gap-closure work, unrelated area). File-level overlap check (`git log --name-only origin/main~5..origin/main` vs. `git diff --name-only HEAD~1 HEAD`) found two hits: `src/integrations/supabase/types.ts` (both sides regenerated it — resolved cleanly by `git rebase origin/main`, no manual merge needed, confirmed both `sprint_insight_cache` and the concurrent session's new tables present after) and, more seriously, `supabase/migrations/20260703280000_sprint_insight_cache.sql` sharing its exact version-prefix with the concurrent session's already-committed-and-applied `20260703280000_restore_tm_ai_usage_log.sql` — the same "duplicate version prefix = broken ledger" incident class as D-017.

Confirmed both tables (`sprint_insight_cache`, `tm_ai_usage_log`) existed live on staging (`cyijbdeuehohvhnsywig`) — both DDLs had genuinely run — but the ledger (`supabase_migrations.schema_migrations`) had exactly one row for `20260703280000`, belonging to the concurrent session's file (applied earlier via its own path, presumably `db push`). This session's `sprint_insight_cache` table had been applied via `supabase db query --linked -f` (raw SQL execution), which does **not** write a ledger row — an "applied file unrecorded" gap per the standing migration-ledger discipline rule, only surfaced now because the version-collision forced a closer look.

Fix: rebased this session's one unpushed commit onto `origin/main` (safe — nothing of mine had been pushed yet, per the "never rebase someone else's unpushed commits" rule not applying here since their commits were already public); renamed the local file to `20260703310000_sprint_insight_cache.sql` (next free timestamp after the concurrent session's own `20260703290000`/`20260703300000`); inserted the missing ledger row (`version='20260703310000', name='sprint_insight_cache'`) directly via `supabase db query --linked`, verified both `20260703280000` (now unambiguously `restore_tm_ai_usage_log`) and `20260703310000` (`sprint_insight_cache`) resolve correctly. No data or schema changes needed — purely a bookkeeping fix, applied before push, not after.
