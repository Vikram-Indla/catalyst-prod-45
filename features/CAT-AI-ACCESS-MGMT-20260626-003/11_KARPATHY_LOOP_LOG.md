# Karpathy Loop Log — CAT-AI-ACCESS-MGMT-20260626-003

## Session 001 — Discovery (2026-06-26)

### Loop 1: Permission model hypothesis
**H:** Module-level PERMISSION_GROUPS can simply be replaced with action-level strings — same schema, different values.
**E:** Read `product_role_permissions` schema + `useProductRoles.ts`. Confirmed same table structure works. `permission_level` column needs migration.
**M:** Schema compatible. Migration risk: all existing permission rows will be deleted and replaced with new defaults. Risk is low — no production users are relying on these role permissions yet (system is new).
**K:** KEEP approach. Action-level strings in same table. Migrate `permission_level` values.

### Loop 2: Two permission systems hypothesis
**H:** Changing `PERMISSION_GROUPS` might break module-level access control (ModuleGate).
**E:** Found `admin_role_module_permissions` table + `ModuleAccessAdminPage.tsx` — completely separate from `product_role_permissions`. ModuleGate reads from `admin_role_module_permissions`, not `product_role_permissions`.
**M:** No interference confirmed. Systems are orthogonal.
**K:** KEEP plan. Safe to change `product_role_permissions` without touching ModuleGate.

### Loop 3: AI infrastructure hypothesis
**H:** Gemini API needs to be set up from scratch.
**E:** Found `caty-chat` Edge Function using `gemini-2.5-flash` with `GEMINI_API_KEY` from env. 80+ AI Edge Functions already in project.
**M:** Infrastructure exists. New AI admin Edge Function just follows `caty-chat` pattern.
**K:** KEEP. Extend existing pattern, don't reinvent.

### Loop 4: User management operations hypothesis
**H:** Need to build user management operations from scratch.
**E:** Found `user-invite-send`, `user-delete`, `user-update`, `reset-user-password`, `user-update-password` — all admin-protected, production-ready Edge Functions.
**M:** 80%+ of required admin operations already exist as Edge Functions.
**K:** KEEP. AI Edge Function orchestrates existing functions — minimal new code for user ops.

### Loop 5: Avatar upload hypothesis
**H:** Avatar upload needs new Supabase Storage bucket.
**E:** `uploadResourceAvatar` / `removeResourceAvatar` from `resourceAvatarService`. Already used in `AdminAccessPage.tsx`. Storage bucket exists.
**M:** Avatar upload is already fully implemented.
**K:** KEEP. AI can invoke this as an admin action. No new infrastructure needed.

### Loop 6: AdminAccessPage scope hypothesis
**H:** Access Management page needs to be built.
**E:** `AdminAccessPage.tsx` is 1952 lines, comprehensive: user list, invite flow, edit panel, avatar upload, module_access management, approval workflow.
**M:** Access Management page already largely functional. Gap is: it's not connected to the new action-level RBAC system.
**K:** DISCARD "build from scratch". Instead: wire existing page to new permission model after Slice 1.

### Loop 7: UserAccessPage hypothesis
**H:** `UserAccessPage.tsx` is a second user management surface.
**E:** Has `// @ts-nocheck`, references `ProductRole`, `ResourceUser`, `AutoLink` types. Seems to be an older/alternative view. 724 lines.
**M:** Needs full read in Slice 2 to determine if it's a duplicate or unique surface.
**K:** DEFER — decision D6. Read fully in Slice 2 before touching.
