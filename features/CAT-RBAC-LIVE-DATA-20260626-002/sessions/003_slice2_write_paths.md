# Session 003 — Slice 2 Write Paths
**Date:** 2026-06-26
**Purpose:** Activate all RBAC write paths — create/edit role, assign users, edit permissions matrix

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useProductRoles.ts` | +3 exports: useAllProfiles, useAssignUserToRole, useRemoveUserFromRole |
| `src/components/admin/rbac/CreateEditRoleModal.tsx` | Wire Save → useCreateRole / useUpdateRole, remove disabled tooltip |
| `src/components/admin/rbac/AssignUsersModal.tsx` | Full rework: load all profiles, diff-based save (Promise.all), +/− indicators |
| `src/components/admin/rbac/PermissionsMatrix.tsx` | Clickable cells (cycle None→Full→View only→Own only), Save permissions button |
| `src/pages/admin/RolesAdminPage.tsx` | Enable Assign users button, remove Tooltip import |

## Validation

- TypeScript: 0 errors
- ADS token validator: 0 violations
- "coming soon" strings: 0 remaining in RBAC components

## Screenshot Acceptance

| # | Description | Status |
|---|---|---|
| SS-01 | Assign users modal — all real profiles loaded (Abdullah, Abdulmjeed, etc.) | ✅ |
| SS-02 | Assign users modal — user selected (blue highlight, + indicator, unsaved changes count) | ✅ |
| SS-03 | Permissions matrix — cell clicked (Release Dashboard None→Full), Save permissions button appears | ✅ |

## Key Design Decisions

- AssignUsersModal loads ALL approved profiles (not just current members) — diff on save
- Cycle order: None → Full → View only → Own only → None
- Save permissions button only appears when isDirty (cell was changed)
- PermissionsMatrix editable only when roles.length === 1 (single-role view)
- Full grid in /admin/permissions remains read-only
- Promise.all for batch assign/remove — individual mutation onError handles toast
