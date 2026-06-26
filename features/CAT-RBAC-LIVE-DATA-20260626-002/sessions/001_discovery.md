# Session 001 — Discovery
**Date:** 2026-06-26  
**Purpose:** activate feature, audit RBAC data sources, produce Plan Lock

## Pre-flight
- Branch: main
- Dirty: CyclesPage.tsx, ReportDetailPage.tsx, ReportsPage.tsx, RepositoryPage.tsx (testhub, unrelated)
- supabase migration (unrelated)

## Discovery Findings

### DB Tables Available
- `product_roles` — id, name, code, description, is_active, scope
- `user_product_roles` — id, user_id, role_id, business_lines, created_at
- `product_role_permissions` — id, role_id, permission_group, permission_level
- `profiles` — id, full_name, email, avatar_url, approval_status, department_id
- `admin_role_module_permissions` — system role × module key (NOT used for RBAC UI)
- NO `rbac_*` tables exist anywhere

### Hooks Already Exist in useProductRoles.ts
- `useProductRoles()` ✓
- `useUsersWithRole(roleId)` ✓
- `useAllRolePermissions()` ✓
- `useRolePermissions(roleId)` ✓
- `ProductRole`, `UserWithRole`, `RolePermission` types ✓

### Mock Consumers (9 files to fix)
1. `src/pages/admin/RolesAdminPage.tsx`
2. `src/pages/admin/PermissionsAdminPage.tsx`
3. `src/components/admin/rbac/PermissionsMatrix.tsx`
4. `src/components/admin/rbac/RbacRolesTable.tsx`
5. `src/components/admin/rbac/RbacUsersTable.tsx`
6. `src/components/admin/rbac/RbacAssignmentsTable.tsx`
7. `src/components/admin/rbac/AssignUsersModal.tsx`
8. `src/components/admin/rbac/CreateEditRoleModal.tsx`
9. `src/components/admin/rbac/RbacSchemaBanner.tsx`

## Decision
Option A: wire to existing tables. No migrations.

## Status
Plan Lock written. Awaiting Vikram approval.
