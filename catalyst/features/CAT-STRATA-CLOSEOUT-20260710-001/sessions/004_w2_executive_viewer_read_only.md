# Session 004 — W2: executive_viewer becomes truly read-only

**Date:** 2026-07-10 · **DB:** staging only (prod untouched)

## Finding (bigger than the Plan Lock assumed)

The leak was not just a UI constant. The DB itself granted executive_viewer writes in
**six places**, contradicting the role's own definition of record
(20260705100000 line 67: `'executive_viewer', -- CEO/CXO consumption; no data edits`):

| # | Write path | Where |
|---|---|---|
| 1 | RLS `strata_decisions_insert` | 20260705100400 |
| 2 | RLS `strata_ai_review` (approve/reject AI advisories) | 20260705100400 |
| 3–6 | RPCs `strata_create_decision` / `strata_update_decision` / `strata_create_action` / `strata_update_action` | 20260705190000 |

## Delivered

1. **Migration `20260710140000_strata_executive_viewer_read_only.sql`** — recreates
   both policies and all four RPCs as verbatim copies with ONLY the role array +
   error message changed (`['strategy_office','vmo_validator']`; admin bypass inside
   strata_has_role untouched). Applied to staging; ledger row 1:1.
2. **UI**: `DECISION_AUTHOR_ROLES` (Reviews) and `ADVISORY_ROLES` (Command Center)
   drop executive_viewer, with doctrine comments. All other *_ROLES lists already
   excluded it (verified: vmoAuthoring, ProjectCardDetailView).
3. **Guard test `rbac.guard.test.ts`** — (a) scans every strata `*_ROLES` write-gate
   constant for the role; (b) asserts the migration file exists, covers all six
   write paths, and contains no ARRAY granting executive_viewer.

## Deliberately unchanged (identity-based, not role-based — logged for the record)

- `strata_decisions_update` RLS keeps `created_by = auth.uid()` — an author can edit
  their own decision. Post-W2 an executive_viewer can never become an author.
- `strata_actions_write` RLS keeps `owner_id = auth.uid() OR created_by = auth.uid()` —
  a user who OWNS an action may progress it (self-service on own assignments).
  This is assignment-scoped, not a role grant; flagged to Vikram in case the
  strict reading ("no data edits, ever") should override it.

## Validation (raw)

- Staging probe post-apply: **zero** policies and **zero** of the four RPCs still
  reference executive_viewer (only the ledger row matches the grep).
- vitest strata: **19/19** (17 prior + 2 new RBAC guards) · tsc rc=0 ·
  color gate 0=0 · ads-audit-gate all categories at baseline.
- Live DOM probe with an executive_viewer user: not exercisable (single admin
  session available) — enforcement is DB-side (RPC + RLS), verified by probe above.
