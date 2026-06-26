# Plan Lock — Slice 2 — CAT-RBAC-LIVE-DATA-20260626-002
**Status:** DRAFT — awaiting Vikram approval
**Date:** 2026-06-26

---

## Objective
Activate all disabled write paths in RBAC admin:
- Create role
- Edit role (name, description, is_active)
- Assign / remove users from a role
- Edit permission levels in the matrix (per cell, per role)
- (Optional) Delete role with confirmation

No new migrations. No new tables. All mutations target existing tables.

## Non-Scope
- No changes to AdminAccessPage, UserAccessPage, AdminGuard, admin-nav
- No supabase/ files
- No UI redesign (Slice 3)
- No user permission overrides UI (already has its own flow in AccessPage)
- No bulk operations

---

## 2-Hour Timebox

### Sub-tasks

| # | Task | Time |
|---|---|---|
| 1 | Add 3 missing hooks to useProductRoles.ts | 15 min |
| 2 | Wire CreateEditRoleModal Save | 20 min |
| 3 | Rework AssignUsersModal (all profiles + diff save) | 40 min |
| 4 | Make PermissionsMatrix cells clickable + Save button | 30 min |
| 5 | TypeScript + validation | 15 min |

Total: ~2h

---

## Existing Hooks (already in useProductRoles.ts — no change needed)

| Hook | Action |
|---|---|
| `useCreateRole()` | INSERT product_roles + seed product_role_permissions |
| `useUpdateRole()` | UPDATE product_roles (name, description, is_active) |
| `useDeleteRole()` | Cascade DELETE permissions → assignments → role |
| `useUpdateRolePermissions()` | UPSERT product_role_permissions (onConflict: role_id,permission_group) |

---

## New Hooks to Add (to useProductRoles.ts)

### `useAllProfiles()`
```ts
export function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data as { id: string; email: string; full_name: string | null }[];
    }
  });
}
```

### `useAssignUserToRole()`
```ts
export function useAssignUserToRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from('user_product_roles')
        .insert({ user_id: userId, role_id: roleId, business_lines: [], has_overrides: false });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-role', v.roleId] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
    },
    onError: (e) => catalystToast.error('Failed to assign user: ' + (e as Error).message),
  });
}
```

### `useRemoveUserFromRole()`
```ts
export function useRemoveUserFromRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userRoleId, roleId }: { userRoleId: string; roleId: string }) => {
      const { error } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('id', userRoleId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-role', v.roleId] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
    },
    onError: (e) => catalystToast.error('Failed to remove user: ' + (e as Error).message),
  });
}
```

---

## File Changes

### 1. `src/hooks/useProductRoles.ts`
ADD 3 exports at bottom: `useAllProfiles`, `useAssignUserToRole`, `useRemoveUserFromRole`.
No changes to existing exports.

### 2. `src/components/admin/rbac/CreateEditRoleModal.tsx`
- Import `useCreateRole`, `useUpdateRole`
- Remove Tooltip disabled wrapper from Save button
- On click: call `useCreateRole({ name, description, is_active })` or `useUpdateRole({ id, name, description, is_active })`
- `isPending` from mutation → `isLoading` on button
- On success: call `onClose()`
- Validation already exists (name required, min 2 chars)

### 3. `src/components/admin/rbac/AssignUsersModal.tsx`
**Rework** — current modal only shows current role members. New flow:
- Load ALL profiles via `useAllProfiles()`
- Load current role members via `useUsersWithRole(role.id)` (already done)
- `initialSelected = new Set(currentUsers.map(u => u.user_id))` — pre-check current members
- User list shows ALL profiles. Checked = assigned. Toggle to add/remove.
- Count badge: "X assigned, Y changes pending"
- Save = compute diff:
  - Added = selected − initial → call `useAssignUserToRole` for each
  - Removed = initial − selected → call `useRemoveUserFromRole` for each (need userRoleId lookup)
- Use `Promise.all` for batch, single success toast on completion
- Remove Tooltip disabled wrapper
- Loading state on Save button during mutation

**userRoleId lookup**: build `Map<userId, userRoleId>` from `currentUsers` before diffing.

### 4. `src/components/admin/rbac/PermissionsMatrix.tsx`
**Extend** — cells become clickable to cycle permission level:
- `None → Full → View only → Own only → None`
- Local state: `localPerms: Record<group, level>` initialized from `permissions` prop
- Dirty tracking: `isDirty = localPerms !== incoming perms`
- Add "Save permissions" button (top right of matrix) — visible only when `isDirty`
- On Save: call `useUpdateRolePermissions({ roleId: roles[0].id, permissions: localPerms })`
- Only enable edit when exactly 1 role is shown (single-role view in RolesAdminPage tab)
- Full-grid matrix in PermissionsAdminPage: read-only (no edit, no Save button)
- Cell cursor: `pointer` when editable, `default` when read-only
- Tooltip on cell: current level name on hover

---

## UI/UX Rules (Slice 2)

1. **ADS tokens only** — no bare hex
2. **`isDisabled` state** — all buttons show spinner during mutation (`isPending`)  
3. **Toast** — `catalystToast.success` / `.error` — already wired in hooks
4. **No confirmation dialog for role delete** — out of scope Slice 2 (too much scope)
5. **ZERO-ASSUMPTION** — null full_name in AssignUsersModal → show email
6. **Sorted list** — profiles sorted by full_name asc in useAllProfiles
7. **No lime/green/orange** on save/assign buttons — use `appearance="primary"` (blue ADS)
8. **Clicking permission cell**: visual feedback — background flash `var(--ds-background-selected)` for 150ms

---

## Files Forbidden (Slice 2)
- `supabase/*`
- `src/pages/admin/RolesAdminPage.tsx` — no changes needed (modals are self-contained)
- `src/pages/admin/PermissionsAdminPage.tsx` — no changes (matrix there is read-only)
- `src/components/admin/AdminGuard.tsx`
- `src/pages/admin/AdminAccessPage.tsx`
- `src/pages/admin/UserAccessPage.tsx`

---

## Screenshot Checklist

| # | What |
|---|---|
| SS-01 | Create role modal — form filled, Save active (not disabled) |
| SS-02 | After create — new role appears in sidebar list |
| SS-03 | Edit role modal — pre-filled with real name |
| SS-04 | Assign users modal — all org profiles listed, checkboxes |
| SS-05 | Permission matrix — cell clicked, level changed, Save button visible |
| SS-06 | After save permissions — toast + updated cell value |

---

## Validation Commands

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | tail -30
python3 skills/ads-validator/scripts/token-validator.py --path src/components/admin/rbac/
grep -rn "coming soon\|isDisabled\|RBAC_SCHEMA" src/components/admin/rbac/
```

All must pass. Zero "coming soon" tooltip strings remaining after Slice 2.

---

## Stop Conditions
- TypeScript error → STOP, fix
- ADS violation → STOP, fix
- Mutation fires without role.id guard → STOP
- `user_product_roles` INSERT missing `has_overrides: false` → bug, fix before commit
- Scope exceeds 4 files → STOP, raise

---

## Commit Gate
- [ ] Feature Work ID: CAT-RBAC-LIVE-DATA-20260626-002
- [ ] Session log: sessions/003_slice2_write_paths.md
- [ ] TypeScript: 0 errors
- [ ] ADS validator: 0 violations
- [ ] No "coming soon" strings remaining in RBAC components
- [ ] All 6 screenshots captured and accepted
- [ ] Vikram explicit "commit" approval
