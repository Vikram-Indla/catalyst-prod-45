# 01 — Objective

## Goal
Make the Catalyst RBAC system have ONE source of truth: the product-role model
(`user_product_roles` → `product_role_permissions` → `user_permission_overrides`), read by the
runtime gate `check_permission`, with no silent data loss in onboarding.

## "Done" looks like
- Every active profile resolves to the SAME effective permissions before and after cutover
  (parity diff = 0 unexpected changes).
- `check_permission` RPC reads the product-role tables (not legacy binary `has_role` admin check).
- The `/admin/permissions` matrix actually changes runtime behaviour.
- A newly invited+accepted user appears on `/admin/roles` with a product role.
- No phantom-column writes (department on invite either persists or is removed).

## Non-scope (this feature)
- Redesign of the permission-group taxonomy (~33 groups) — keep as-is.
- New admin UI surfaces. Wiring only, no net-new screens.
- Capacity-planning department refactor beyond the delete link-check fix.

## Source audit (2026-06-27) — confirmed in code
| Gap | Evidence |
|---|---|
| RPC ignores product tables | `check_permission` reads `user_roles`+legacy `permission_grants/roles`; collapses to `has_role(admin)`. Live callers: ListScreenToolbar, AttachmentsSection, InJiraLayout. |
| Split-brain writes | `/admin/access`→`user_roles` (user-update:61); `/admin/roles`→`user_product_roles` (useProductRoles:524). |
| Onboard gap | invite-accept writes `user_roles`+`profiles` only, no `user_product_roles` (user-invite-accept:64). |
| Phantom column | `user_invitations.department_id` not in any migration; invite-send writes it → silently dropped. |
| Orphaned overrides | `user_permission_overrides` written by UI, never read at resolve; wiped by migration 20260626100000. |
| Dept delete check | CapacityDepartments:62 checks only `profiles.department_id`. |
