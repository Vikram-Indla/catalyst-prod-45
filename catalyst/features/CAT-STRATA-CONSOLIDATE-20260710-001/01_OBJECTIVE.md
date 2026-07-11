# Objective: STRATA Consolidation — Single-Track Model

**Feature Work ID:** CAT-STRATA-CONSOLIDATE-20260710-001  
**Owner:** Catalyst Engineering  
**Timeline:** 2026-07-10  

---

## The Problem

Previous strategy (CAT-STRATA-ISOLATE-20260707-001) created a separate `strata-standalone` branch to isolate Strata development for 6-12 months. This introduces:

- **Dual-branch complexity:** Developers must switch branches to work on different products
- **Code drift risk:** Catalyst and Strata diverge during isolation, making eventual merge complex
- **Resource duplication:** Migrations, scripts, configs replicated across branches
- **Operational friction:** Two separate product tracks, two sets of deployment logic, two migration paths

---

## The Solution

**Consolidate to a single-track model:**

1. **One branch (`main`)** for both Catalyst and Strata
2. **Hub Switcher** selects which product to run (Catalyst routes vs Strata routes)
3. **Single module model:** Strata module + Strategy module in one codebase
4. **Runtime APP_PRODUCT selector** (not branch-based)
5. **Forward velocity:** Both products develop together, no merge debt

---

## What Changes

- Delete `strata-standalone` branch
- Delete isolation feature work (CAT-STRATA-ISOLATE-20260707-001)
- Archive `supabase/strata/migrations/` (all migrations in one track)
- Remove `db:migrate:strata` script (use main migrate)
- Update docs: explain single-track model

## What Stays the Same

- ✅ All Strata code (`src/modules/strata/`)
- ✅ All Catalyst code (`src/modules/strategy/`)
- ✅ Hub Switcher (product selection logic)
- ✅ APP_PRODUCT environment variable (runtime selector)
- ✅ productEnvironmentGuard (startup validation)
- ✅ Supabase schema (RLS isolation still applies)

---

## Success Criteria

- ✅ `strata-standalone` deleted
- ✅ Both products run on `main`
- ✅ Single migration track works
- ✅ No broken imports
- ✅ Docs reflect new strategy

---

**Estimated Effort:** 1.5 hours
