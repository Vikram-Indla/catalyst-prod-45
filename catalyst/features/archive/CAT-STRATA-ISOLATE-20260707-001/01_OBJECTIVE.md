# Objective: STRATA Product Isolation

**Feature Work ID:** CAT-STRATA-ISOLATE-20260707-001  
**Status:** Implementation in progress  
**Date:** 2026-07-07

## Problem Statement

STRATA (CAT-STRATA-20260705-001) is a mature strategic planning module currently integrated into Catalyst's main branch. However:

1. **Branch Mixing:** STRATA and Catalyst share the same Git branch, making independent development risky
2. **Database Risk:** Both products point to the same Supabase project without clear product-level isolation, risking accidental cross-product data mutations
3. **Migration Ambiguity:** STRATA's 24 migration files live in the shared `supabase/migrations/` folder, making it unclear which migrations belong to which product
4. **No Product Selector:** There is no `APP_PRODUCT` environment variable, making it impossible to explicitly choose which product to run
5. **Merge Path Unclear:** STRATA is intended to eventually merge back into Catalyst (6-12 months), but current structure makes merge planning impossible

## Goals

**Primary Goal:**  
Isolate STRATA into a separate long-lived Git branch with dedicated environment variables and migration path, while preserving the ability to safely merge back into Catalyst within 6-12 months.

**Sub-Goals:**
1. Create `strata-standalone` as the canonical STRATA development branch
2. Establish `APP_PRODUCT` as the runtime product selector
3. Separate STRATA migrations into `supabase/strata/migrations/`
4. Create startup guards that fail fast on product/environment mismatches
5. Document isolation strategy and merge-back path clearly
6. Prevent accidental code merges via governance checklist
7. Maintain zero regression to Catalyst or Strategy module

## Success Criteria

- ✅ `strata-standalone` branch exists and is independent
- ✅ `.env.example.catalyst` and `.env.example.strata` templates prevent configuration errors
- ✅ `APP_PRODUCT` is required at startup; missing value fails immediately
- ✅ STRATA migrations have dedicated folder and script
- ✅ `npm run dev:catalyst` and `npm run dev:strata` work correctly
- ✅ `npm run check:product-env` validates configuration
- ✅ README_STRATA_ISOLATION.md documents governance and merge safety
- ✅ No regression: Catalyst works unchanged on main, STRATA works on strata-standalone
- ✅ Feature Work Folder created per Catalyst operating contract

## Scope (In)

- Branch isolation strategy
- Environment variable separation (APP_PRODUCT)
- Migration path organization
- Startup guards and validation scripts
- Documentation and governance
- Package script updates
- Feature Work Folder creation

## Scope (Out)

- Deeply refactoring STRATA or Catalyst code
- Changing table schemas or RLS policies
- Moving/renaming existing files (only creating new ones)
- Altering Catalyst main branch's visible behavior
- Definitive merge-back implementation (that's a future feature work)
- Product-specific Supabase projects (we're using same project, different APP_PRODUCT)

## Approach

**Phase 1: Branch Isolation**
- Create `strata-standalone` from main

**Phase 2: Environment Separation**
- Create `.env.example.catalyst` and `.env.example.strata`
- Introduce `APP_PRODUCT` variable (required, validated)
- Create product environment guard at startup

**Phase 3: Migration Organization**
- Create `supabase/strata/migrations/` folder
- Copy 24 STRATA migration files there
- Add migration scripts: `db:migrate:catalyst`, `db:migrate:strata`

**Phase 4: Code Verification**
- Verify STRATA module is self-contained
- Verify no regressions to Catalyst

**Phase 5: Documentation & Governance**
- README_STRATA_ISOLATION.md with merge safety checklist
- Feature Work Folder with all required artifacts
- Git hooks (optional) for branch warnings

## Timeline

- **Phase 1-3:** 2-3 hours (core infrastructure)
- **Phase 4-5:** 1-2 hours (verification and docs)
- **Total:** ~4 hours for full implementation

## Non-Functional Requirements

- **Reliability:** Startup guard must fail immediately if APP_PRODUCT is missing or invalid
- **Clarity:** Environment templates and docs must be unambiguous
- **Safety:** Merge checklist must prevent accidental cross-product commits
- **Reversibility:** All changes must be easily reversible for future merge-back phase
- **Compliance:** Follow Catalyst operating contract (Feature Work Folder, etc.)

## Merge-Back Strategy (Future)

When STRATA is ready to merge back into Catalyst (6-12 months):

1. Explicit merge planning begins (separate feature work: CAT-STRATA-MERGE-*-001)
2. Options:
   - Cherry-pick STRATA features back into Catalyst Strategy module
   - Full merge: `strata-standalone` → `main` + reconciliation
3. Requires business approval and explicit data/code integration review
4. This isolation task preserves the merge path by keeping changes surgical

---

**Prepared by:** Catalyst Engineering  
**Date:** 2026-07-07
