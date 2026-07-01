# Objective — CAT-SLUGS-UNIVERSAL-20260701-001

Replace all raw UUID/ID route segments across Catalyst with named, human-readable slugs.
Ensure all future routes auto-use slugs. No UUID params in any new route, ever.

## Goal
- Every navigable entity has a `slug` column (frozen on creation, derived from `name`)
- All routes use `:slug` / `:key` / display-key params — zero `:uuid` params
- Central URL builder layer (`src/lib/routes.ts`) is the single source of URL truth
- UUID-based legacy URLs redirect to slug URLs (backward compat forever)

## Non-scope
- Knowledge docs, priority lists, themes, resources (low shareability — Phase 5+ if ever)
- Admin routes (internal UUIDs acceptable)
- Query params with UUIDs (e.g. `?filterId=`) — addressed in later phase
