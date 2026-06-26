# Plan Lock — CAT-RBAC-LIVE-DATA-20260626-002
**Status:** DRAFT — awaiting Vikram approval  
**Date:** 2026-06-26

---

## Objective
Wire RBAC admin pages to real Supabase data. Delete rbac-mock.ts. No migrations.

## Non-Scope
- No new DB migrations
- No new tables (no `rbac_roles`, `rbac_permissions`, etc.)
- No action-level permissions (create/edit/delete/approve) — no real table exists
- No changes to AdminAccessPage, UserAccessPage, AdminGuard, admin-nav
- No changes to any supabase/ files

## 2-Hour Timebox

### Slice 1 — Full read wiring + delete mock (2h)
Everything in one slice: wire all pages to real data, delete mock file.

---

## Real Data Architecture

### Existing hooks (import from `@/hooks/useProductRoles`)

| Hook | Table | Returns |
|---|---|---|
| `useProductRoles()` | `product_roles` + `user_product_roles` | `ProductRole[]` (with user_count) |
| `useUsersWithRole(roleId)` | `user_product_roles` + `profiles` | `UserWithRole[]` |
| `useAllRolePermissions()` | `product_role_permissions` | `RolePermission[]` |
| `useRolePermissions(roleId)` | `product_role_permissions` | `RolePermission[]` for one role |

### Type shapes (from useProductRoles.ts)

```ts
interface ProductRole {
  id: string; name: string; code: string;
  description: string | null; is_active: boolean;
  scope: string; user_count?: number;
}

interface UserWithRole {
  id: string; user_id: string; role_id: string;
  business_lines: string[];
  user: { id: string; email: string; full_name: string | null } | null;
  has_overrides: boolean;
}

interface RolePermission {
  id: string; role_id: string;
  permission_group: string;        // 'Capacity Planner' | 'Budget Planner' | ...
  permission_level: 'Full' | 'View only' | 'Own only' | 'None';
}
```

### PERMISSION_GROUPS constant (already in useProductRoles.ts)
11 groups: Capacity Planner, Budget Planner, Industry Backlog, Work Manager,
Release Dashboard, Incident Room, Dependency Board, Defects, Test Management,
Reports & Analytics, Settings & Admin

---

## Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/RolesAdminPage.tsx` | Wire to `useProductRoles`, `useUsersWithRole`; replace hand-rolled ARIA tabs with `@atlaskit/tabs` |
| `src/pages/admin/PermissionsAdminPage.tsx` | Wire to `useAllRolePermissions` + `useProductRoles`; fix fontWeight 653→600; remove internal subtitle |
| `src/components/admin/rbac/RbacRolesTable.tsx` | Props: `ProductRole[]` instead of `RbacRole[]`; adapt card display |
| `src/components/admin/rbac/RbacUsersTable.tsx` | Props: `UserWithRole[]` instead of `RbacUser[]`; use `CatalystAvatar`; Lozenge status |
| `src/components/admin/rbac/RbacAssignmentsTable.tsx` | Props: `UserWithRole[]` (reuse same data, different columns); adapt column defs |
| `src/components/admin/rbac/PermissionsMatrix.tsx` | Full rewrite: `ProductRole[]` × `PERMISSION_GROUPS` × `RolePermission[]` matrix |
| `src/components/admin/rbac/RbacSchemaBanner.tsx` | Delete content — render null (will be cleaned up as import removed) |
| `src/components/admin/rbac/AssignUsersModal.tsx` | Fix fontWeight 653→600 only (write paths out of scope for Slice 1) |
| `src/components/admin/rbac/CreateEditRoleModal.tsx` | Fix fontWeight 653→600 only |
| `src/lib/rbac-mock.ts` | DELETE |

## Files Forbidden (do NOT touch)
- `supabase/*`
- `src/components/admin/AdminGuard.tsx`
- `src/components/admin/admin-nav.ts`
- `src/pages/admin/AdminAccessPage.tsx`
- `src/pages/admin/UserAccessPage.tsx`
- `src/hooks/useUserRole.ts`
- `src/hooks/useProductRoles.ts` — READ ONLY (use its exports, do not modify)

---

## Canonical Component Hierarchy

| Component | Use |
|---|---|
| `@atlaskit/tabs` | Tab strip in RolesAdminPage (replaces hand-rolled ARIA tabs) |
| `CatalystAvatar` from `@/components/shared/CatalystAvatar` | User avatar in table cells |
| `@atlaskit/lozenge` | Status pills + role scope badges |
| `@atlaskit/spinner` | Loading states |
| `@atlaskit/empty-state` | Zero-data states |
| `JiraTable` from `@/components/shared/JiraTable` | User + assignment tables (unchanged) |

---

## UI/UX Rules

1. **ADS tokens only** — no bare hex outside `var()` fallbacks, no Tailwind color utilities
2. **`fontWeight: 600`** everywhere — fix `653` typo in 6 places:
   - `PermissionsAdminPage.tsx` lines ~93, ~156
   - `PermissionsMatrix.tsx` lines ~74, ~91, ~107
   - `AssignUsersModal.tsx` line ~141
3. **`@atlaskit/tabs`** in RolesAdminPage — not hand-rolled ARIA tabs
4. **`CatalystAvatar size="small"`** for user cells — not initials divs
5. **Status Lozenge map:**
   - `APPROVED` → `appearance="success"` "Active"
   - `PENDING_APPROVAL` → `appearance="inprogress"` "Pending"
   - `DISABLED` → `appearance="removed"` "Disabled"
   - `null` → `appearance="default"` "—"
6. **Scope badge** — role `scope` shown as `Lozenge appearance="default"` (e.g. "Enterprise", "Product")
7. **No "RBAC preview mode" language** — remove RbacSchemaBanner from all pages
8. **Empty states via `@atlaskit/empty-state`** — not plain text divs
9. **Loading via `@atlaskit/spinner`** — center with flex wrapper
10. **ZERO-ASSUMPTION** — null full_name → '—', null email → '—'
11. **No green/lime/orange/rainbow** colors on non-AI controls

## Permissions Matrix Design
Grid: columns = product roles (`ProductRole.name`), rows = `PERMISSION_GROUPS`

Access level display:
- `'Full'` → filled circle `●` in `var(--ds-icon-brand)`
- `'View only'` → half circle `◑` in `var(--ds-icon-subtle)`
- `'Own only'` → dot `·` in `var(--ds-icon-subtle)`
- `'None'` → dash `—` in `var(--ds-text-subtlest)`

---

## Integration/Wiring Rules

1. `RolesAdminPage` calls `useProductRoles()` → passes roles to `RbacRolesTable`
2. Selected role's `id` → passed to `useUsersWithRole(selectedRoleId)` → passed to `RbacUsersTable` and `RbacAssignmentsTable`
3. `PermissionsAdminPage` calls `useProductRoles()` + `useAllRolePermissions()` → passes to `PermissionsMatrix`
4. Query keys: `['product-roles']`, `['users-with-role', roleId]`, `['all-role-permissions']` — already defined in useProductRoles.ts
5. First role auto-selected on load (use `roles?.[0]?.id` when real data arrives)

---

## Parallel Execution Plan

Sequential (one person, read dependencies):
1. Read `RbacRolesTable.tsx`, `RbacUsersTable.tsx`, `RbacAssignmentsTable.tsx`, `PermissionsMatrix.tsx`
2. Write new prop types and component bodies
3. Wire `RolesAdminPage.tsx` and `PermissionsAdminPage.tsx`
4. Delete `rbac-mock.ts`
5. Verify no remaining import of `rbac-mock`
6. TypeScript check
7. ADS token check

---

## Screenshot Checklist

| # | Page | What to capture |
|---|---|---|
| SS-01 | `/admin/roles` | Real role in sidebar (code/name from DB) |
| SS-02 | `/admin/roles` Users tab | Real user profile, CatalystAvatar, Lozenge status |
| SS-03 | `/admin/roles` Users tab | Empty state (role with 0 users) |
| SS-04 | `/admin/roles` Permissions tab | Real PERMISSION_GROUPS matrix for selected role |
| SS-05 | `/admin/permissions` | Permission catalogue (module-level) |
| SS-06 | `/admin/permissions` Role matrix | Full grid real roles × real permission groups |

---

## Validation Commands

```bash
# TypeScript
npx tsc --noEmit --skipLibCheck 2>&1 | tail -30

# ADS tokens
python3 skills/ads-validator/scripts/token-validator.py --path src/

# No remaining mock imports
grep -rn "from '@/lib/rbac-mock'" src/ | grep -v ".test."

# Confirm file deleted
ls src/lib/rbac-mock.ts 2>&1
```

All must pass before commit.

---

## Stop Conditions

- TypeScript errors → STOP, fix
- ADS token violations → STOP, fix
- Any remaining `from '@/lib/rbac-mock'` import → STOP, remove
- Hand-rolled ARIA tabs still in RolesAdminPage → STOP
- fontWeight: 653 still anywhere → STOP
- Scope exceeds 10 files → STOP, raise
- `rbac-mock.ts` still exists → STOP

---

## Drift/Rebaseline Rules

- `useUsersWithRole` returns empty array → render EmptyState, not error
- `useProductRoles` returns empty array → render "No roles configured" EmptyState  
- Query error → show `@atlaskit/section-message appearance="error"` with generic message
- If `product_role_permissions` has no rows for a role → show all groups as 'None'

---

## Commit Gate (after Slice 1)

Before committing:
- [ ] Feature Work ID in commit message: CAT-RBAC-LIVE-DATA-20260626-002
- [ ] Session log written
- [ ] TypeScript: 0 errors
- [ ] ADS validator: 0 violations
- [ ] rbac-mock.ts deleted and no imports remain
- [ ] Screenshot acceptance: all 6 screenshots captured and accepted
- [ ] Vikram explicit approval to commit
