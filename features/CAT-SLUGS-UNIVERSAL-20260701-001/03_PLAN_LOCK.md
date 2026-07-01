# Plan Lock — CAT-SLUGS-UNIVERSAL-20260701-001

**Status: PHASE 2 COMPLETE — Phase 3 requires separate Plan Lock review**

## Phase 1 — URL Builder Layer ✅ DONE
- Created `src/lib/routes.ts` — typed URL builders for all current routes
- Added SLUG CONTRACT section to `CLAUDE.md`
- Zero behavioral change, zero DB change, zero route change

## Phase 2 — DB Migrations ✅ DONE
Entities:
- Batch A: `boards`, `sprints`
- Batch B: `releases` table, `test_cycles`
- Batch C: `programs`, `teams`, `portfolios`
- Batch D: incidents — use existing `key` field, no new column

Each batch: ADD COLUMN slug TEXT, backfill via slugify(name), dedup suffix, ADD UNIQUE INDEX, ADD INSERT TRIGGER.

## Phase 3 — Route Param Updates + Resolution Hooks (BLOCKED)
- FullAppRoutes.tsx: `:boardId` → `:boardSlug`, `:sprintId` → `:sprintSlug`, etc.
- New `useXBySlug()` hooks for each slug-resolved entity
- Migrate 310+ call sites to `Routes.*` builders

## Phase 4 — Backward Compat Redirects (BLOCKED)
- `UuidToSlugRedirect.tsx` components mounted outside CatalystShell
- UUID-in-path → slug lookup → navigate({replace:true})

## Architecture decisions locked
- Slug FROZEN on creation (does not follow renames)
- Conflict: append -2, -3 (surface as form validation)
- `slugifyName()` imported from `src/lib/avatars.ts` — not duplicated
- Redirects outside CatalystShell (avoid Navigate re-render loop per lines 213–220)
