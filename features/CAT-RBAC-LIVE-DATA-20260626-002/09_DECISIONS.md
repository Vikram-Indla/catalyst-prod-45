# Decisions — CAT-RBAC-LIVE-DATA-20260626-002

## D-001: Option A — wire to existing tables, no migrations
**Date:** 2026-06-26  
**Decision:** Use `product_roles` + `user_product_roles` + `product_role_permissions` + `profiles`.  
**Why:** No migration risk. Real data already exists. Hooks already exist in `useProductRoles.ts`.  
**Rejected:** Option B (new rbac_* tables) — adds migration risk for no new user value.

## D-002: No action-level permissions (view/create/edit/delete)
**Date:** 2026-06-26  
**Decision:** Permission catalogue shows PERMISSION_GROUPS matrix (11 groups × roles), not action-level.  
**Why:** `product_role_permissions` has permission_group + permission_level. No action-level table deployed.  
**Future:** Action-level RBAC is separate future feature.

## D-003: Delete rbac-mock.ts entirely
**Date:** 2026-06-26  
**Decision:** Delete the file. All 9 consumers updated to use real hooks.  
**Why:** User explicitly requested removing dummy data. File is pure mock scaffolding.

## D-004: RbacSchemaBanner becomes no-op
**Date:** 2026-06-26  
**Decision:** RbacSchemaBanner renders null always. Not deleted (may still be imported briefly during transition).  
**Why:** "RBAC preview mode" language no longer applies. Pages will show real data.

## D-005: UserWithRole used for both Users and Assignments tabs
**Date:** 2026-06-26  
**Decision:** Both RbacUsersTable and RbacAssignmentsTable accept `UserWithRole[]`.  
**Why:** `useUsersWithRole(roleId)` returns user_product_roles rows — exactly what both tabs need.  
**Columns differ:** Users tab shows profile info. Assignments tab shows assignment metadata (created_at).
