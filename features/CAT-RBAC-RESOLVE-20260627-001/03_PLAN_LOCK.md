# 03 — PLAN LOCK (DRAFT — awaiting Vikram approval)

> Status: **NOT APPROVED. No code, no SQL, no migration executed.**
> Approval required before Phase 0.

## Objective
See `01_OBJECTIVE.md`. One RBAC source of truth (product-role model) read by `check_permission`,
zero onboarding data loss, effective-permission parity preserved across cutover.

## Scope (this Plan Lock)
**Phase 0 + Phase 1 only.** Phases 2–3 (RPC rewrite + cutover) are a SEPARATE Plan Lock, written
after Phase 0 parity numbers exist. Rationale: never touch the security RPC until the data
foundation is proven and reversible.

## Non-scope
- `check_permission` RPC body is NOT edited in this Plan Lock.
- No legacy table (`permission_grants`/`permission_roles`) dropped yet.
- No taxonomy / UI redesign.

## Backfill map (OPEN BLOCKER — must be locked before Phase 0 SQL is written)
Default proposal (preserves current effective access):

| legacy source | → product_roles.code |
|---|---|
| `user_roles.role = 'admin'` | `super_admin` (or admin-tier product role) |
| `user_roles.role = 'program_manager'` | TBD — Vikram |
| `user_roles.role = 'team_lead'` | TBD — Vikram |
| `user_roles.role = 'user'` / none | baseline product role — TBD — Vikram |
| `profiles.role` (legacy text) | tie-break only if `user_roles` absent — TBD |

**Backfill SQL is not authored until this table is fully filled and approved.**

## Phase 0 — Backfill (DB, reversible)
- Files: ONE new migration `supabase/migrations/<ts>_backfill_user_product_roles.sql`.
- Insert `user_product_roles` rows for all profiles per locked mapping. Idempotent (ON CONFLICT).
- Forbidden: editing `check_permission`, editing `product_role_permissions` defaults, deleting any row.
- Validation: `SELECT count(*) FROM profiles p LEFT JOIN user_product_roles upr ON upr.user_id=p.id
  WHERE upr.id IS NULL;` → must be 0 for active profiles. Capture before/after counts.

## Phase 1 — Onboarding write-path (edge functions, surgical)
- `supabase/functions/user-invite-accept/index.ts` — also insert `user_product_roles` from invite role.
- `supabase/functions/user-update/index.ts` — keep `user_roles` write OR mirror to product role (decide in Decisions).
- `supabase/functions/user-invite-send/index.ts` — remove phantom `department_id` write OR add the column via migration (decide; Gap 4).
- `src/pages/admin/CapacityDepartments.tsx` — extend delete link-check (Gap 6) ONLY if department_id column is real.
- Validation: invite → accept → user appears on `/admin/roles`. Functional, DOM/DB proof not screenshot-only.

## Files forbidden (both phases)
- `check_permission` RPC migration body.
- Any `DELETE`/`TRUNCATE` on permission tables.
- `git add -A`. Stage explicit files only.

## Stop conditions
- Mapping table unresolved → STOP, do not write backfill SQL.
- Any active profile resolves to fewer permissions post-backfill → STOP, raise RED FLAG.
- Phase boundary → STOP, report, await go for next phase.

## Timebox
Phase 0 ≤ 1h. Phase 1 ≤ 2h. Split if exceeded.

## Validation commands (to be run per phase)
- Backfill parity: SQL count query above + per-role spot check.
- Onboarding: create test invite, accept, assert `user_product_roles` row + `/admin/roles` visibility.

## Karpathy loop
Each phase logged to `11_KARPATHY_LOOP_LOG.md`: hypothesis → SQL/edit → measured count → keep/discard.
