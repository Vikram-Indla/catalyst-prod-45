# 01 — OBJECTIVE: STRATA closeout — last-mile governance features

**Feature Work ID:** CAT-STRATA-CLOSEOUT-20260710-001
**Date:** 2026-07-10 · **Owner:** Vikram (product) / Catalyst Engineering
**Predecessors:** CAT-STRATA-FOUNDATION-20260709-001 (23 REQs closed), CAT-STRATA-CONSOLIDATE-20260710-001 (single-track merge + Catalyst-context seed)

## Why this feature exists

The 2026-07-10 closeout critique (session 002 of CONSOLIDATE) found that the three
"missing" features named by the product owner (PDF board-pack export, approval
workflows, role granularity) are **80% built** — the admin panel has a full
draft→approve→retire lifecycle, a 6-role model exists with write-gating, and
boardPack.ts renders complete PDF + PPTX packs. What is actually missing is the
**last mile**:

1. Board packs download to one browser and vanish — `storage_path` is never
   populated, so no one else can ever retrieve a generated pack. (P0 — user-named
   top priority)
2. `executive_viewer` can author decisions (it is in DECISION_AUTHOR_ROLES) —
   the read-only role is not read-only. (P0 — RBAC correctness bug)
3. No notification layer exists anywhere in STRATA — pending approvals, blockers,
   overdue actions and validation requests alert no one. (P1 — user priority 1–2)
4. No "my work" inbox — approvals/actions/validations owed by a user are scattered
   across pages. (P1)
5. Period close is ungated — a snapshot can lock with missing actuals and open
   decisions, silently. (P2)

## Placement doctrine (user-directed, binding)

**Policy and configuration live in `/strata/admin`; runtime artifacts and actions
live in the four area surfaces.** Notification rules, approval routing and role
assignment are admin-panel sections; pack storage, the inbox and the close
checklist are surface work. The admin panel remains the single governance
control plane.

## Non-scope (user-directed)

- What-if / scenario planning → MVP2, explicitly deferred
- Jira → Project Card sync → "look at later" (priority 3)
- Email / Slack notification channels (in-app only this feature)
- Mobile optimization; scorecard-specific PDF export
- No prod DDL from sessions; migration files authored + applied to staging only

## Done means

Generated packs persist and are retrievable by any authorized user from any
session; executive_viewer is provably read-only; governance events produce
in-app notifications governed from the admin panel; a user sees everything
that needs them in one place; period lock shows a truthful readiness checklist.
