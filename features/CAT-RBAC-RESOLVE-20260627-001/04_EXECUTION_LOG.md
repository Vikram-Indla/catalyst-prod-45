# 04 — Execution Log

## Phase 0 — Backfill user_product_roles (DONE on dev/cyij, 2026-06-27)

**Migration authored:** `supabase/migrations/20260627130000_backfill_user_product_roles.sql`
**Applied to:** cyij dev (linked) via `supabase db query`. NOT yet pushed to staging/prod.

**Mapping (profiles.role → product_roles.code):**
admin→super_admin · team_lead→team_lead · Backend Architect→backend_architect ·
Product Owner→product_owner · else→developer

**Validation (raw):**
- before_unmapped (profiles w/ no product role): **57**
- after_unmapped: **0** ✓
- distribution: developer 56, product_owner 3, backend_architect 2, team_lead 2, net_developer 1, super_admin 1
- users holding super_admin (all-Allow): **1** ✓
- footprint check: developer/product_owner/backend_architect/team_lead/net_developer = 32 Deny / 0 Allow each
- **users_with_any_allow = 1** (definitive parity proof)

**Result:** Every profile now has ≥1 product role. Only the admin gains real permissions
(super_admin = all-Allow); all others all-Deny → matches current admin-binary check_permission.
Effective-permission parity preserved. Additive only, reversible.

**Reversal (if needed):** delete user_product_roles rows created by the mapping (everything except
the 4 pre-existing rows). Safe because additive.

## Phase 1 — Onboarding write-path (DONE on dev/cyij, 2026-06-27)

**Ground-truth corrections to the audit:**
- `user_invitations.department_id` DOES exist (uuid). Earlier claim of a phantom column was wrong.
  Real gap: invite-accept never propagated it to `profiles.department_id`.
- `handle_new_user` trigger seeds `profiles` ONLY (not `user_roles`). So invite-accept's old
  `user_roles.update()` (and user-update's) hit 0 rows → invited/edited roles were silently lost.
- `app_role` enum has 19 values (admin, program_manager, team_lead, user, product_owner,
  project_manager, developer, qa_tester, pmo, guest, …), not 4. `super_admin` is NOT in it —
  product_roles only. So `admin` is the top tier reachable via user_roles.

**Files changed:**
- `supabase/functions/user-invite-accept/index.ts` — on accept, resolve invited role across all 3
  models: delete+insert `user_roles`, upsert `user_product_roles` (exact code or 'developer'
  baseline; admin→super_admin), set `profiles.role` + `profiles.department_id`.
- `supabase/functions/user-update/index.ts` — /admin/access role edit now delete+inserts user_roles
  (was a no-op update), mirrors profiles.role, and syncs the product role incl. stripping
  super_admin on demotion.
- `src/pages/admin/CapacityDepartments.tsx` — delete link-check now also blocks on pending
  `user_invitations.department_id` (Gap 6).

**Deployed:** user-invite-accept + user-update to cyij (`--use-api`).

**Functional proof (real invite → accept on dev):**
- created pending invite (role=developer, department=Product), invoked user-invite-accept → ok:true
- asserted: profiles.role=developer + department_id set + APPROVED; user_roles=developer;
  user_product_roles→developer. New user visible to /admin/roles. ✓
- test user + invite deleted; leftover=0.

## Phase 2 — check_permission cutover (DONE on dev/cyij, 2026-06-27)

**Migration:** `supabase/migrations/20260627140000_check_permission_product_super_admin.sql`
(applied to cyij; NOT pushed to staging/prod DB).

**Change:** the full-access (admin) branch of `check_permission` now resolves from the product-role
model — `EXISTS (user_product_roles → product_roles.code='super_admin')` — with legacy
`has_role(_user_id,'admin')` kept as an OR fallback (dual-read). The legacy granular branch is
preserved byte-for-byte.

**Validation (raw, dev):**
- admin → true; random developer → false.
- DEFINITIVE product path: granted super_admin product role to a non-admin dev (no legacy admin row)
  → check_permission flipped false→TRUE; revoked → true→false.
- whole-population parity: can_users = 1 / 61 (the admin) — identical to pre-cutover. No lockout,
  no over-grant. Function still STABLE SECURITY DEFINER.

**Rollback:** CREATE OR REPLACE check_permission with the prior body (has_role admin only).

## 🚫 Phase 3 BLOCKED — granular matrix not wired (needs product input)
The 832-row `product_role_permissions` matrix is keyed by free-text `permission_group`
("Product: Create Story", …). Runtime callers pass `(entity_type, action[, scope])` e.g.
`('test_cases','configure')`, `(entityType,'edit')`. There is NO table/column linking the two
vocabularies. Wiring per-group Allow/Deny to the gate requires an
`(entity_type, action) → permission_group` mapping that does not exist and is a product decision.
Until that mapping is authored, only the super_admin (full-access) row of the matrix is live.
