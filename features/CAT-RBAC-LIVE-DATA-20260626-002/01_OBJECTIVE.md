# Objective — CAT-RBAC-LIVE-DATA-20260626-002

## Goal
Replace all mock data in RBAC admin pages with real Supabase data.
Delete `src/lib/rbac-mock.ts`.

## Success Criteria
- `/admin/roles` shows real roles from `product_roles` table
- Users tab shows real profiles from `profiles` + `user_product_roles`
- Assignments tab shows real assignment rows
- `/admin/permissions` matrix shows real data from `product_role_permissions`
- `rbac-mock.ts` does not exist
- No TypeScript errors
- No ADS token violations
- UI is enterprise-quality: no mock/preview language, proper lozenges, real counts

## Non-Goals
- No new DB migrations
- No new tables
- No action-level permissions (view/create/edit/delete) — not deployed
- No changes to AdminAccessPage (already real)
- No changes to AdminGuard, admin-nav, UserAccessPage
- No changes to auth.users or RLS policies

## Boundary
All work confined to:
- `src/pages/admin/RolesAdminPage.tsx`
- `src/pages/admin/PermissionsAdminPage.tsx`
- `src/components/admin/rbac/*.tsx`
- `src/lib/rbac-mock.ts` (DELETE)
