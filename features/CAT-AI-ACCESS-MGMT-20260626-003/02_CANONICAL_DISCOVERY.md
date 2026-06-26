# Canonical Discovery

## Existing Infrastructure (discovered 2026-06-26)

### AI Layer
- **Model:** Gemini 2.5 Flash via OpenAI-compatible endpoint
- **URL:** `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- **Key:** `GEMINI_API_KEY` in Supabase secrets (already set — confirmed by `caty-chat` usage)
- **Pattern:** `supabase/functions/caty-chat/index.ts` — the template for the new admin AI Edge Function
- **Model constant:** `const MODEL = 'gemini-2.5-flash'`

### User Management Edge Functions (all admin-protected, all production-ready)
| Function | What it does |
|---|---|
| `user-invite-send` | Create + send invitation. Takes email, role, module_access, full_name, department_id. Returns OTP link. |
| `user-delete` | Hard delete user from auth.users (cascades to profiles). Admin-only. |
| `user-update` | Update role, module_access, approval_status, full_name, email on profile + auth. |
| `reset-user-password` | Admin-triggered password reset. |
| `user-update-password` | Direct password change. |
| `invite-resolve` | Accept/resolve a pending invite. |
| `invitation-expire` | Expire a pending invite token. |

### Profile Schema (relevant columns)
```
profiles:
  id uuid PK (= auth.users.id)
  email text
  full_name text
  avatar_url text           -- EXISTS. resourceAvatarService handles upload.
  role text                 -- system role (admin/user/developer etc)
  department_id uuid        -- FK → capacity_departments.id
  module_access jsonb       -- per-module boolean flags
  approval_status text      -- APPROVED / PENDING / REJECTED
  locked_until timestamptz
  failed_login_count int
  must_change_password bool
```

### Avatar Upload
- `uploadResourceAvatar` / `removeResourceAvatar` from `src/services/resourceAvatarService.ts`
- Already wired in `AdminAccessPage.tsx`
- Supabase Storage bucket already exists

### RBAC Tables
```
product_roles           -- role definitions
product_role_permissions  -- (role_id, permission_group, permission_level)
user_product_roles        -- (user_id, role_id)
user_permission_overrides -- (user_id, permission_group, override_value, module)
```

### Existing Admin Pages
| Page | Route | Status |
|---|---|---|
| `AdminAccessPage.tsx` (1952 lines) | `/admin/access` | Comprehensive. User list, invite, edit, avatar, module_access. Mostly functional. |
| `UserAccessPage.tsx` (724 lines) | `/admin/users` | `// @ts-nocheck`. Broken. Duplicate of AdminAccess? Needs audit. |
| `RolesAdminPage.tsx` | `/admin/roles` | Fixed in CAT-RBAC-LIVE-DATA-20260626-002. Working. |
| `PermissionsAdminPage.tsx` (190 lines) | `/admin/permissions` | Broken syntax. Needs rewrite. |
| `ModuleAccessAdminPage.tsx` | `/admin/module-access` | Working. NOT to be touched — different system. |

### Current PERMISSION_GROUPS (to be replaced)
```
'Capacity Planner', 'Budget Planner', 'Industry Backlog', 'Work Manager',
'Release Dashboard', 'Incident Room', 'Dependency Board', 'Defects',
'Test Management', 'Reports & Analytics', 'Settings & Admin'
```

## Proposed Action-Level Permission Groups (v1: Project + Product modules)

### Project Module (~12 actions)
```
'Project: Create',
'Project: Delete',
'Project: Archive',
'Project: Rename',
'Project: Manage Members',
'Project: Change Lead',
'Project: Edit Settings',
'Project: Export Data',
'Project: View All Projects',
'Project: Change Icon',
```

### Product Module (~22 actions)
```
'Product: Create Story',
'Product: Delete Story',
'Product: Edit Story',
'Product: Rename Story',
'Product: Assign Story',
'Product: Change Story Status',
'Product: Change Story Priority',
'Product: Move Story to Sprint',
'Product: Clone Story',
'Product: Create Epic',
'Product: Delete Epic',
'Product: Edit Epic',
'Product: Create Sprint',
'Product: Start Sprint',
'Product: Close Sprint',
'Product: Delete Sprint',
'Product: View Backlog',
'Product: Manage Board',
'Product: Add Comment',
'Product: Delete Comment',
'Product: Link Issues',
'Product: Export Stories',
```

**Total: 32 action groups for v1.** Grows as more modules are added.

### Permission Level Change
- Old ENUM: `Full | View only | Own only | None`
- New ENUM: `Allow | Deny`
- Migration: `Full` → `Allow`, `View only | Own only | None` → `Deny`
- `user_permission_overrides.override_value` stays as `Allow | Deny | Inherited` (no change needed)

## Canonical Components
- Chat UI: extend `caty-chat` pattern (already uses ADS inline flags, Spinner, Button)
- Tables: `JiraTable` from `@/components/shared/JiraTable`
- Modals: `@atlaskit/modal-dialog` ModalTransition pattern
- Toasts: `catalystToast` from `@/lib/catalystToast`
- Flags/inline notices: `@atlaskit/flag` (for AI confirmation gates)
- Select: `@atlaskit/select`
- Lozenge: `@atlaskit/lozenge`
- Avatar: `CatalystAvatar` from `@/components/shared/CatalystAvatar`
- Tabs: `@atlaskit/tabs` (already unbanned)
