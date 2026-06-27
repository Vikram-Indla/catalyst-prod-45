# 09 — Decisions

## D1 — Direction: wire RPC to product roles (2026-06-27, Vikram)
Of {wire RPC / kill product UI / fix data bugs only / report only}, Vikram chose **wire RPC to
product roles**. Product-role model becomes the single source of truth.

## D2 — Phase the work; do NOT flip the security RPC first (2026-06-27, Claude, pending ack)
RED FLAG: 59/61 profiles have zero product roles + all-Deny defaults → flipping RPC = mass lockout.
Therefore this Plan Lock = Phase 0 (backfill) + Phase 1 (onboarding write-path) ONLY. RPC rewrite
(Phase 2) + cutover (Phase 3) deferred to a second Plan Lock written after parity numbers exist.

## D3 — Backfill mapping = OPEN (blocker)
Default = map by legacy `app_role`, preserving current effective access. Full
`app_role → product_roles.code` table must be supplied/confirmed by Vikram before Phase 0 SQL is
authored. Until then: no backfill SQL.

## OPEN — to decide before Phase 1
- Gap 4: add real `user_invitations.department_id` column, OR strip the phantom write? (data model call)
- user-update: keep dual legacy+product write during transition, or product-only?

## Audit findings (source — 2026-06-27)
6 gaps confirmed in code. See `01_OBJECTIVE.md` table. Two are 🔴 deadlocks (inert matrix,
split-brain), one 🔴 onboarding gap, one 🔴 phantom-column data loss, two 🟠.
