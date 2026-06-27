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

## Phase 1 — Onboarding write-path: NOT STARTED.
