# CAT-STRATA-CLOSEOUT-20260710-001 — READ ME FIRST

**Feature:** STRATA closeout — last-mile governance (pack persistence, RBAC fix, notifications, inbox, close checklist)
**Status:** Plan Lock DRAFT — awaiting Vikram approval. No code yet.
**Branch:** main (single-track). **DB:** staging only.

## Read order
1. `01_OBJECTIVE.md` — why: the "missing three" were 80% built; this closes the last mile
2. `03_PLAN_LOCK.md` — W1–W5 waves, discovery evidence, forbidden list
3. `sessions/` — session logs

## Binding doctrine
- **Placement**: policy/config → `/strata/admin`; runtime artifacts/actions → area surfaces.
- Non-scope: what-if (MVP2), Jira sync (later), email/Slack channels, mobile, prod DDL.
- Predecessor context: CAT-STRATA-FOUNDATION-20260709-001 (23 REQs, merged), CAT-STRATA-CONSOLIDATE-20260710-001 (merge + Catalyst-context seed 20260710120000).

## Priority order (user-confirmed 2026-07-10)
1. W1 board-pack persistence (PDF export continuity) — P0
2. W2 executive_viewer read-only + W3 notifications — P0/P1
3. W4 inbox, W5 close checklist — P1/P2
