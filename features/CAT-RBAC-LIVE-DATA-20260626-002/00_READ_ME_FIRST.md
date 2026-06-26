# CAT-RBAC-LIVE-DATA-20260626-002 — READ ME FIRST

**Status:** Plan Lock written — awaiting Vikram approval before any code.

**Problem:** RBAC admin pages (`/admin/roles`, `/admin/permissions`) show 100% mock data
from `rbac-mock.ts`. Access Management (`/admin/access`) shows real data.
User wants RBAC pages to use same real data source.

**Solution:** Wire RBAC pages to existing hooks in `useProductRoles.ts`.
Delete `rbac-mock.ts`. No migrations.

**Real data sources:**
- `product_roles` table — role definitions
- `user_product_roles` table — user↔role assignments
- `product_role_permissions` table — role permission levels per permission group
- `profiles` table — user profile data

**Hooks already exist (DO NOT recreate):**
- `useProductRoles()` — all product roles + user counts
- `useUsersWithRole(roleId)` — profiles with role for a given role
- `useAllRolePermissions()` — full role×permission matrix
- `useRolePermissions(roleId)` — permissions for one role

**Do not code until Plan Lock approved.**
