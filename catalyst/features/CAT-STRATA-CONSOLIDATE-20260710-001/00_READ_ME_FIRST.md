# CAT-STRATA-CONSOLIDATE-20260710-001: Single-Track Consolidation

**Status:** Implementation  
**Owner:** Catalyst Engineering  
**Timeline:** 2026-07-10  
**Objective:** Kill dual-branch isolation. Consolidate Strata to single `main` branch. Strata module sits under Hub Switcher alongside Catalyst Strategy module.

## Quick Summary

**Previous:** Dual-branch strategy (main + strata-standalone, merge after 6-12 months)  
**New:** Single-track model (both products on main, runtime APP_PRODUCT selector)

## What's Happening

1. Delete `strata-standalone` branch
2. Archive CAT-STRATA-ISOLATE feature folder
3. Clean up isolation artifacts
4. Verify both products work on `main`
5. Update docs

## Files to Read in Order

1. `00_READ_ME_FIRST.md` (this file)
2. `01_OBJECTIVE.md` (problem & solution)
3. `03_PLAN_LOCK.md` (approved checklist)

## Key Changes

- ❌ Delete: `strata-standalone` branch
- ❌ Delete: CAT-STRATA-ISOLATE-20260707-001 feature folder
- ❌ Delete: `supabase/strata/migrations/` (archive)
- ❌ Remove: `db:migrate:strata` script
- ✅ Keep: All code (Strata module, Strategy module)
- ✅ Keep: productEnvironmentGuard, APP_PRODUCT selector
- ✅ Keep: Hub Switcher, runtime product selection

## Testing

```bash
# Test both products on main
npm run check:product-env
npm run dev:catalyst
npm run dev:strata
npm run lint
```

## Timeline

- Cleanup & verification: 1.5 hours
- Testing: included above

---

**Last Updated:** 2026-07-10
