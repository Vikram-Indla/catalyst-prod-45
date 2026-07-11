# HANDOVER — CAT-STRATA-CLOSEOUT-20260710-001

**Status:** COMPLETE — all five waves delivered, applied to staging, screenshot-verified, pushed to main.
**Date:** 2026-07-10

## What this feature was

The 2026-07-10 closeout critique found the "missing three" features (PDF board-pack
export, approval workflows, role granularity) were 80% built. This feature closed the
verified last mile, plus two follow-on quality-of-life waves.

## Waves delivered

| Wave | Outcome | Migration | Sessions |
|---|---|---|---|
| W1 | Board packs persist to a private bucket; signed-URL download from any session | 20260710130000 | 002, 003 |
| W2 | executive_viewer made truly read-only (was in 6 DB write paths) | 20260710140000 | 004 |
| W3a | In-app notifications engine (tables, RLS, emit helper, triggers, submit fan-out) | 20260710150000 | 005 |
| W3b | Bell + unread badge + inbox popup; admin "Notifications" section (13th) | — | 006 |
| W4 | "Mine" filter on the Command Center Needs-attention inbox (owner_id per rule) | 20260710160000 | 007 |
| W5 | Advisory period-close readiness checklist on Reviews | — | 008 |

All migrations applied to staging (cyijbdeuehohvhnsywig) with exact-version ledger
rows. Prod untouched. Every wave: tsc rc=0, vitest strata 19/19 (incl. new
rbac.guard.test), color gate 0=0, ads-audit-gate at/under baseline.

## Screenshot acceptance (all captured in chat, driven via Chrome on localhost:8080/staging)

- W1: generate PDF → stored row → hard reload persists → signed-URL renders the pack.
- W3b: bell badge "2", inbox with two real notifications, admin Notifications section (6 toggles).
- W4: All=59 → Mine=7 (exactly the logged-in user's owned items).
- W5: Close readiness "11 to resolve" matching SQL ground truth (2 / 8 / 1).

## Known deferrals / notes (logged honestly)

- 08_DRIFT_LOG CLOSEOUT-DRIFT-001: notification rules are admin toggles, not the full
  governed lifecycle (avoids touching strata_governed_tables()).
- action_overdue notifications fire on write only (no scheduler this feature).
- Multi-user RLS legs (pack download by a second user; executive_viewer denied writes;
  notification recipient scoping) verified at the policy level, not with two live
  sessions — flag for a multi-user pass if desired.
- W2: identity-based self-service grants kept (author edits own decision; owner
  progresses own action) — flagged in session 004 for product review.
- W5 is advisory only; hard close-gating is a deferred admin-policy item.

## Not in scope (per Plan Lock, user-directed)

What-if / scenario planning (MVP2); Jira→Project Card sync (later); email/Slack
channels; mobile; scorecard-specific PDF export.

## Merge-to-main status

All eight commits (docs + W1–W5) are on origin/main. No prod DDL pending. Staging
carries the applied migrations + demo seed data (Investor Experience pillar,
20260710120000).
