# Plan Lock — CAT-AI-ACCESS-MGMT-20260626-003

**Status:** APPROVED — awaiting implementation session

---

## Objective
Production-grade AI Access Management feature on top of working RBAC infrastructure.

## Non-Scope
- Module-level access (ModuleGate, `admin_role_module_permissions`) — UNTOUCHED
- Modules beyond Project + Product for v1 action permissions
- Bulk CSV import
- MFA reset, session revocation
- Any new Supabase Storage buckets (already working)

---

## Timebox
8 hours total across 4 slices × 2 hours each.

---

## SLICE 1 — Permission Model Migration (2h)

### Goal
Replace 11 module-level permission groups with 32 action-level groups. Update DB, hooks, UI.

### Files to modify
| File | Change |
|---|---|
| `src/hooks/useProductRoles.ts` | Replace `PERMISSION_GROUPS` const with action-based array. Change `PermissionLevel` type to `'Allow' \| 'Deny'`. |
| `supabase/migrations/YYYYMMDD_action_level_permissions.sql` | (a) DELETE existing product_role_permissions rows. (b) INSERT new rows for all existing roles × all 32 new groups, defaulting to 'Deny'. (c) Grant reasonable defaults for admin role: all 'Allow'. |
| `src/components/admin/rbac/PermissionsMatrix.tsx` | Update column headers + toggle to show Allow/Deny instead of Full/View/None dropdown. Use ADS `Toggle` or `Checkbox`. |
| `src/pages/admin/PermissionsAdminPage.tsx` | Rewrite from scratch (currently broken syntax). Show permission catalogue: action → which roles have Allow. |

### Files forbidden
- `ModuleAccessAdminPage.tsx` and anything in `module-access/` — different system
- `AdminAccessPage.tsx` — not in this slice

### Validation
```bash
npx tsc --noEmit
```
Screenshot: `/admin/roles` → Permissions matrix tab shows 32 action groups with Allow/Deny toggles.

---

## SLICE 2 — Fix Broken Admin Pages (2h)

### Goal
`UserAccessPage.tsx` and `PermissionsAdminPage.tsx` wired and functional.

### Discovery first
Read the full `UserAccessPage.tsx` (724 lines) to understand if it's a duplicate of `AdminAccessPage` or a different surface. If duplicate: redirect it to `/admin/access`. If different: fix it.

### Files to modify
| File | Change |
|---|---|
| `src/pages/admin/UserAccessPage.tsx` | Remove `// @ts-nocheck`. Wire to real data or redirect if duplicate. |
| `src/pages/admin/PermissionsAdminPage.tsx` | Rewrite. Read-only catalogue: for each action group, which roles have Allow? JiraTable layout. |

### Validation
```bash
npx tsc --noEmit
```
Screenshot: both pages render without error.

---

## SLICE 3 — AI Admin Edge Function (2h)

### Goal
New `supabase/functions/ai-admin-assistant/index.ts` that:
1. Takes natural language command from authenticated admin
2. Calls Gemini to parse into structured `AdminIntent`
3. Validates intent against live data (user exists? role exists? permission valid?)
4. Returns a `CommandPlan` — list of steps with descriptions, a `requiresConfirmation` flag, and any warnings
5. On `execute: true`, runs the steps in order with saga rollback

### Intent schema (Gemini output)
```typescript
interface AdminIntent {
  action: 'invite_user' | 'delete_user' | 'assign_role' | 'remove_role' |
          'set_permission' | 'create_role' | 'edit_role' | 'reset_password' |
          'approve_user' | 'reject_user' | 'suspend_user' | 'update_profile' |
          'upload_avatar' | 'change_email' | 'change_name';
  params: Record<string, string | boolean | string[]>;
  confidence: number;   // 0-1
  clarification_needed: string | null;
}
```

### Command plan schema (Edge Function output)
```typescript
interface CommandPlan {
  intent: AdminIntent;
  steps: Array<{
    id: string;
    description: string;    // human-readable: "Create role 'Security Engineer' with default permissions"
    status: 'pending' | 'running' | 'done' | 'failed' | 'rolled_back';
    warning?: string;       // "Role doesn't exist — will be created"
    compensating_action?: string;  // description of rollback if this step fails
  }>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;   // "Role 'Security Engineer' not found. Create with defaults?"
  warnings: string[];
  errors: string[];               // validation errors (user not found, permission not valid, etc.)
}
```

### Saga pattern
```
steps: [create_role, assign_user_to_role, set_permissions, send_invite]
compensating:
  - step 1 fails → nothing to undo
  - step 2 fails → (step 1 done) → delete role
  - step 3 fails → (steps 1+2 done) → remove user from role, delete role
  - step 4 fails → log warning (invite failed, user+role state preserved, retryable)
```

### Orchestration targets
- `user-invite-send` (existing) → invite new user
- `user-delete` (existing) → delete user
- `user-update` (existing) → update profile
- `reset-user-password` (existing) → password reset
- Direct DB via `supabase-service-role`: create/edit/delete product_roles, assign user_product_roles, set product_role_permissions, set user_permission_overrides

### File to create
`supabase/functions/ai-admin-assistant/index.ts`

### Validation
- Call with `{"message": "give test@example.com the .Net Developer role"}` → returns CommandPlan with steps
- Call with `{"message": "assign test@example.com to Security Engineer role"}` + Security Engineer doesn't exist → `requiresConfirmation: true`, `confirmationMessage: "Role 'Security Engineer' not found. Create it with default permissions?"`
- Call with `{"message": "delete vikramataol@gmail.com"}` → `errors: ["Cannot delete the last admin user"]`

---

## SLICE 4 — AI Access Management UI (2h)

### Goal
`/admin/ai-assistant` — production-grade chat UI where admin issues natural language commands.

### Route
Add to `AdminSidebar.tsx` under a new "Intelligence" section (or add to existing admin nav).
Route: `/admin/ai-assistant`

### Component: `src/pages/admin/AiAccessPage.tsx`

### UI Layout (two-panel)
```
┌─────────────────────────────────────────────────────────────┐
│ AI Access Assistant                              [Clear chat]│
│ "Manage users, roles, and permissions with natural language" │
├──────────────────┬──────────────────────────────────────────┤
│ Chat history     │ Command preview / Progress               │
│                  │                                          │
│ [User message]   │ ┌─ Intent: Assign role ─────────────── ┐│
│ [AI response]    │ │ Step 1: Validate user ✓              ││
│ [Confirm flag]   │ │ Step 2: Check role ⚠ (doesn't exist) ││
│ [User: yes]      │ │ Step 3: Create role (pending)         ││
│                  │ │ Step 4: Assign user (pending)         ││
│                  │ └───────────────────────────────────────┘│
│                  │                                          │
│                  │ [Confirm and execute] [Cancel]           │
├──────────────────┴──────────────────────────────────────────┤
│ [Type your command...]                        [Send]        │
└─────────────────────────────────────────────────────────────┘
```

### Key behaviors
1. Admin types command → sends to `ai-admin-assistant` with `execute: false` → shows CommandPlan
2. If `requiresConfirmation: true` → show ADS inline `SectionMessage` (warning appearance) with confirm/cancel buttons
3. Admin confirms → sends same command with `execute: true` → streams progress updates per step
4. Steps show status icons: pending (dot) / running (Spinner) / done (CheckMark) / failed (✗ red) / rolled_back (↩ gray)
5. On error: ADS `Flag` error notification + which steps were rolled back
6. On success: ADS `Flag` success notification
7. Chat history persists in component state (not DB — no need)
8. Commands are pre-validated: duplicate detection ("user already has this role"), invalid email format, unknown permission names

### Canonical components
- `@atlaskit/section-message` for confirmation gates and warnings
- `catalystToast` for success/error
- `@atlaskit/spinner` for running steps
- `@atlaskit/icon/core/check-mark` for done steps
- `@atlaskit/textfield` for input
- `@atlaskit/button/new` for Send / Confirm / Cancel
- `CatalystAvatar` for user display in chat

### Files to create/modify
| File | Change |
|---|---|
| `src/pages/admin/AiAccessPage.tsx` | New page |
| `src/hooks/useAdminAiAssistant.ts` | New hook — calls `ai-admin-assistant` Edge Function |
| `src/pages/admin/AdminSidebar.tsx` | Add "AI Assistant" nav item |
| `src/App.tsx` (or router file) | Add `/admin/ai-assistant` route |

---

## UI/UX Rules (all slices)
- ADS tokens only — `var(--ds-*)` — no hex, no Tailwind color utilities
- No hand-rolled table/modal/form/select — use JiraTable, @atlaskit/modal-dialog, @atlaskit/textfield, @atlaskit/select
- Canonical component hierarchy enforced
- Progress steps: ADS `ProgressTracker` or inline step list — no hand-rolled step UI
- Confirmation gates: `@atlaskit/section-message` (warning) — not a modal
- Error toasts: `catalystToast.error()` — not inline red text

## Data/Backend Rules
- All admin operations go through existing Edge Functions where one exists
- New operations go direct DB via service_role in the Edge Function
- AI Edge Function uses `GEMINI_API_KEY` (already in Supabase secrets) + `SUPABASE_SERVICE_ROLE_KEY`
- Client-side code NEVER holds service_role key — all privileged ops via Edge Functions
- Rollback: saga pattern in Edge Function — each step has compensating action
- No bare `supabase.auth.admin.*` calls from client

## Guardrails (do not violate)
- Cannot delete last admin user → `errors: ["Cannot delete the last admin user"]`
- Cannot remove admin role from yourself
- Cannot create duplicate role (by name, case-insensitive)
- Cannot assign user to role they already have
- Cannot set permission that doesn't exist in `PERMISSION_GROUPS`
- All confirmation gates block execution until user explicitly confirms
- No silent auto-creates — always show what will be created before doing it

## Screenshot Checklist
- [ ] `/admin/roles` → Permissions matrix tab with 32 action groups + Allow/Deny toggles
- [ ] `/admin/permissions` → Permission catalogue (action → role list)
- [ ] `/admin/ai-assistant` → Empty state / welcome
- [ ] `/admin/ai-assistant` → Command entered, CommandPlan shown with steps
- [ ] `/admin/ai-assistant` → Confirmation gate (SectionMessage warning, Confirm/Cancel)
- [ ] `/admin/ai-assistant` → Execution progress (steps with status icons)
- [ ] `/admin/ai-assistant` → Success state (Flag notification)
- [ ] `/admin/ai-assistant` → Error state with rollback shown

## Validation Commands
```bash
npx tsc --noEmit
# Then browser test all screenshots above
```

## Stop Conditions
- TypeScript errors → stop, fix, re-check before continuing
- Regression on `/admin/roles` (existing RBAC page) → raise RED FLAG
- Any bare hex color → fix before commit
- Any hand-rolled table/modal → replace with canonical component

## Commit Gate (per slice)
- TypeScript 0 errors confirmed
- Screenshot signoff for that slice's UI changes
- Session log written
- Stage explicit files only — never `git add -A`
