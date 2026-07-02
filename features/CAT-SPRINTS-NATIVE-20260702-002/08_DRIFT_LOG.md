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
