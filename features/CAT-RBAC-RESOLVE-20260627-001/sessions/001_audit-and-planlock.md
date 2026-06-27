# Session 001 — Audit + Plan Lock draft (2026-06-27)

## Did
- Ran RBAC total-function gap audit (read-only, code-grounded via 2 parallel Explore agents + grep).
- Confirmed 6 gaps; 4 critical. Key deadlock: `check_permission` RPC reads legacy tables, never
  the product-role tables the admin UI writes → permission matrix inert.
- Vikram chose direction: wire RPC to product roles (D1).
- Raised RED FLAG: mass lockout if RPC flipped before backfill.
- Created feature folder CAT-RBAC-RESOLVE-20260627-001.
- Drafted Plan Lock scoped to Phase 0 (backfill) + Phase 1 (onboarding write-path).

## Evidence anchors (code)
- check_permission callers: ListScreenToolbar.tsx:35, AttachmentsSection.tsx:22, InJiraLayout.tsx:66
- split-brain writes: user-update/index.ts:61 vs useProductRoles.ts:524
- onboard gap: user-invite-accept/index.ts:64
- phantom column: no migration defines user_invitations.department_id; invite-send writes it

## State at end
PLAN LOCK DRAFTED — NOT APPROVED. No code/SQL run.

## Next action
Await: (1) Vikram approval of Plan Lock scope (Phase 0+1), (2) the app_role→product_roles.code
mapping table. Until both, do not author backfill SQL.
