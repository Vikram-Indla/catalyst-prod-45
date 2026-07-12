# Catalyst multi-tenancy — product-wide initiative (originating from V3-OPEN-013)

**Status:** PROPOSED — needs its own Feature Work ID + Plan Lock before any code.
**Origin:** V3-OPEN-013 tenant-isolation portion (Vikram decision, 2026-07-12).
**Scope owner:** product + platform (NOT a STRATA-local change).

## Why this is an initiative, not a defect fix

Catalyst is **single-tenant by explicit design** today. Evidence (2026-07-12):
- `strata_foundation_config_engine.sql:6`: "Single-tenant deployment (Q4):
  organization_id kept nullable for future use."
- Zero RLS policies reference `organization_id`/`tenant_id`/`account_id` across 1,274
  migrations; no `organizations` table; no `current_user_org()` helper.
- STRATA `organization_id` columns exist but are NULL on 100% of rows and read by
  nothing. STRATA's RLS (approval + role) matches the whole product.

A tenant boundary added to STRATA alone would be illusory and would break access. Real
multi-tenancy has to be product-wide to mean anything.

## Minimum coherent scope (order matters)

1. **Tenant model.** Introduce an `organizations` table and a membership/resolution
   path (user → org), plus a `current_user_org()` SECURITY DEFINER helper resolving via
   `profiles`. None of these exist today.
2. **Anchor every tenant-owned table.** Add `organization_id` (keep the existing STRATA
   placeholder columns), backfill to the single existing org, then `NOT NULL` + FK.
   This spans far more than STRATA.
3. **RLS rollout.** Add `AND organization_id = public.current_user_org()` to SELECT/WRITE
   policies across every tenant-owned table (STRATA: `strata_portfolios`,
   `strata_project_cards`, and every sibling). Partial rollout = no boundary.
4. **App query layer.** Add org scoping to reads/writes (e.g. STRATA
   `executionApi.projectCards` `domain/index.ts:393`, `strata_add_portfolio_member`
   `write_paths.sql:1706`) — but only meaningful once 1–3 exist.
5. **Card lifecycle (separate, smaller).** If "retired/deleted/ineligible" filtering is
   wanted for the Add-Member selector, add a card lifecycle column (`stage` CHECK or
   `deleted_at`) — none exists today — then filter `buildProjectCardOptions`.

## Risks / decisions to make before starting
- Is Catalyst actually going multi-tenant, or staying single-tenant? (If staying
  single-tenant, V3-OPEN-013's tenant portion is a permanent not-a-defect.)
- Backfill: every existing row maps to which org? (Only one exists today.)
- This touches security posture product-wide — must go through Plan Lock, security
  review, and staged rollout, not a point fix.

## Acceptance (when this initiative closes V3-OPEN-013's tenant portion)
Live cross-tenant evidence: two orgs, a user in org A cannot SELECT org B's portfolios or
project cards (RLS-proven), and the Add-Member selector returns only the acting tenant's
cards. Until an org model exists, this evidence cannot be produced.
