# CAT-RBAC-RESOLVE-20260627-001 — READ ME FIRST

**Purpose:** Close the RBAC split-brain. The runtime authz gate (`check_permission` RPC) reads
the legacy role model; the admin UI (`/admin/roles`, `/admin/permissions`, overrides) writes a
product-role model the gate never reads. Result: the permission matrix is inert and onboarded
users are invisible to the product-role system.

**Origin:** Gap audit 2026-06-27 (see `09_DECISIONS.md` → Audit findings). Vikram chose direction
"wire RPC to product roles".

## State: PLAN LOCK DRAFTED — NOT APPROVED. NO CODE / NO SQL RUN.

## 🚩 Standing RED FLAG — mass lockout
Flipping `check_permission` to product tables BEFORE backfill = every non-admin denied.
59/61 profiles have zero `user_product_roles` rows; defaults are all-Deny; overrides empty.
**Backfill (Phase 0) is mandatory before any RPC read change (Phase 2).**

## Open blocker before Phase 0 executes
The `app_role → product_roles.code` mapping table must be supplied/confirmed by Vikram.
Backfill SQL is NOT written until that mapping is locked. See `03_PLAN_LOCK.md` §Backfill map.

## Read order for any continuation
1. `00_READ_ME_FIRST.md` (this)
2. `01_OBJECTIVE.md`
3. `03_PLAN_LOCK.md`
4. `09_DECISIONS.md`
5. `08_DRIFT_LOG.md`
6. latest `sessions/`
