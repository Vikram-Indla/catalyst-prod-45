# Handover — CAT-AI-ACCESS-MGMT-20260626-003

**Session 001 ended:** Discovery complete. Plan Lock written. Implementation NOT started.

---

## Rehydration State

**Branch:** main
**Last commit:** `9b55315f9` — RBAC P0 fix + department column + override modal + dead code removal
**Clean to start:** YES (only unrelated pre-existing changes in unstaged working tree — test-plans, testhub)

**Feature Work ID:** `CAT-AI-ACCESS-MGMT-20260626-003`
**Feature folder:** `~/catalyst/features/CAT-AI-ACCESS-MGMT-20260626-003/`

---

## What was discovered (do NOT re-discover)

1. **Gemini 2.5 Flash** already configured. `GEMINI_API_KEY` in Supabase secrets. Pattern: `supabase/functions/caty-chat/index.ts`.

2. **User management Edge Functions** already exist and are production-ready:
   - `user-invite-send` — invite user with role + module_access + department
   - `user-delete` — hard delete
   - `user-update` — update role, email, name, approval_status
   - `reset-user-password` — admin-triggered password reset

3. **Permission systems are orthogonal:**
   - `admin_role_module_permissions` → ModuleGate (DO NOT TOUCH)
   - `product_role_permissions` → RBAC action permissions (THIS feature)

4. **Avatar upload already works:** `resourceAvatarService.uploadResourceAvatar` used in `AdminAccessPage.tsx`

5. **`AdminAccessPage.tsx`** (1952 lines) is comprehensive and largely functional. Don't rebuild it.

6. **`UserAccessPage.tsx`** has `// @ts-nocheck` — read fully before deciding to fix vs redirect.

7. **`PermissionsAdminPage.tsx`** (190 lines) has broken syntax — rewrite from scratch.

---

## Active Plan Lock summary (4 slices)

### Slice 1 — Permission model migration (START HERE)
- Replace PERMISSION_GROUPS (11 module names → 32 action strings: "Product: Create Story" etc.)
- DB migration: delete old `product_role_permissions` rows, insert new ones (all Deny by default, admin role gets all Allow)
- Change `permission_level` values: Full→Allow, others→Deny
- Update `PermissionsMatrix.tsx`: show Allow/Deny toggle (not Full/View/None dropdown)
- Rewrite `PermissionsAdminPage.tsx`: catalogue view — for each action, which roles have Allow

**Key file:** `src/hooks/useProductRoles.ts` — `PERMISSION_GROUPS` const and `PermissionLevel` type

**Proposed PERMISSION_GROUPS:**
```typescript
export const PERMISSION_GROUPS = [
  // Project module
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
  // Product module
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
] as const;

export type PermissionLevel = 'Allow' | 'Deny';
```

**Migration template:**
```sql
-- supabase/migrations/YYYYMMDD_action_level_permissions.sql
-- Step 1: delete all existing product_role_permissions
DELETE FROM product_role_permissions;

-- Step 2: update permission_level check constraint
-- (check actual constraint name in DB first)
-- Step 3: insert new action-level permissions for all existing roles (default Deny)
INSERT INTO product_role_permissions (role_id, permission_group, permission_level)
SELECT r.id, g.group_name, 'Deny'
FROM product_roles r
CROSS JOIN (VALUES
  ('Project: Create'), ('Project: Delete'), ('Project: Archive'),
  ('Project: Rename'), ('Project: Manage Members'), ('Project: Change Lead'),
  ('Project: Edit Settings'), ('Project: Export Data'),
  ('Project: View All Projects'), ('Project: Change Icon'),
  ('Product: Create Story'), ('Product: Delete Story'), ('Product: Edit Story'),
  ('Product: Rename Story'), ('Product: Assign Story'), ('Product: Change Story Status'),
  ('Product: Change Story Priority'), ('Product: Move Story to Sprint'), ('Product: Clone Story'),
  ('Product: Create Epic'), ('Product: Delete Epic'), ('Product: Edit Epic'),
  ('Product: Create Sprint'), ('Product: Start Sprint'), ('Product: Close Sprint'),
  ('Product: Delete Sprint'), ('Product: View Backlog'), ('Product: Manage Board'),
  ('Product: Add Comment'), ('Product: Delete Comment'), ('Product: Link Issues'),
  ('Product: Export Stories')
) AS g(group_name);

-- Step 4: update user_permission_overrides — existing override_value is already Allow/Deny/Inherited
-- The permission_group values need to be cleared as they reference old module names
DELETE FROM user_permission_overrides WHERE module = 'Product';
```

### Slice 2 — Fix broken admin pages
- Read `UserAccessPage.tsx` fully → decide: redirect to `/admin/access` or fix
- Rewrite `PermissionsAdminPage.tsx` as a read-only catalogue

### Slice 3 — AI admin Edge Function
- `supabase/functions/ai-admin-assistant/index.ts`
- Gemini intent parsing → CommandPlan → saga execution
- Follow `caty-chat` as structural template
- Orchestrate existing Edge Functions

### Slice 4 — AI Access Management UI
- `src/pages/admin/AiAccessPage.tsx`
- `src/hooks/useAdminAiAssistant.ts`
- Chat UI + progress panel + confirmation gates
- Wire to `ai-admin-assistant` Edge Function
- Add to AdminSidebar

---

## Questions to ask Vikram at START of next session (before coding)

1. **Permission level model:** `Allow/Deny` confirmed? (Recommended: yes)
2. **Auto-create role:** confirmation gate (recommended) or silent?
3. **Action list (32 groups above):** Any to add/cut for v1?
4. **AI route name:** `/admin/ai-assistant` or another name?
5. **UserAccessPage:** Read it and make a call, or Vikram has a known decision?

---

## Files NOT to touch (regression risk)
- `src/pages/admin/ModuleAccessAdminPage.tsx`
- `src/components/admin/module-access/ModuleAccessMatrix.tsx`
- `supabase/functions/user-invite-send/index.ts` (production-ready, don't modify)
- `supabase/functions/user-delete/index.ts` (same)
- `supabase/functions/user-update/index.ts` (same)
- `src/pages/admin/AdminAccessPage.tsx` — audit in Slice 2 but don't modify in Slice 1

---

## Context chain
- **Previous:** `CAT-RBAC-LIVE-DATA-20260626-002` — P0 assign fix, department column, override modal, 10 deprecated files deleted. Committed `9b55315f9`.
- **This:** Permission model migration + AI Access Management. Starts from clean main.
