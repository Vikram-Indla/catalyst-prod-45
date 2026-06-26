# Objective

## Primary Goals

1. **Permission model migration** — Replace module-level permission groups (Work Manager, Capacity Planner, etc.) with action-level groups scoped to Project and Product modules. Binary Allow/Deny replaces Full/View/Own/None for action permissions.

2. **Fix broken admin pages** — `UserAccessPage.tsx` has `// @ts-nocheck`. `PermissionsAdminPage.tsx` has broken syntax. Both must be fully wired and functional.

3. **AI Access Management (`/admin/ai-assistant`)** — A production-grade, chat-style admin UI powered by Gemini 2.5 Flash that allows an admin to issue natural language commands to manage users, roles, and permissions. Atomic execution with saga-pattern rollback. No orphan states.

## Non-Scope (v1)

- Bulk operations (CSV import, bulk role assignment)
- Auth operations (MFA reset, session revocation)
- Module-level access control changes (ModuleGate / `admin_role_module_permissions` — untouched)
- New Supabase Storage bucket for avatars — already working via `resourceAvatarService`
- Any modules beyond Project and Product for action-level permissions

## Done = ?

- `/admin/roles` → Permissions matrix shows action-level groups with Allow/Deny controls
- `/admin/ai-assistant` → Admin types "give a@b.com the .Net Developer role with create story permission" → Caty interprets, previews, confirms, executes with progress steps, shows result
- `/admin/access` → User management fully functional (already largely working, gaps fixed)
- TypeScript 0 errors
- Screenshot signoff on all three pages
