# Decisions: STRATA Isolation Implementation

**Feature Work ID:** CAT-STRATA-ISOLATE-20260707-001  
**Recorded:** 2026-07-07

## Approved User Decisions

### Decision 1: Supabase Project Separation
**Question:** Should STRATA have its own entirely separate Supabase project, or use same project with separate database/schema?

**Decision:** **Same Project, Separate Database**

**Rationale:**
- Simplifies billing and infrastructure management
- RLS policies already provide data isolation by product
- No need for separate project URLs or credentials
- Both environments (staging: cyijbdeuehohvhnsywig, prod: lmqwtldpfacrrlvdnmld) can serve both products

**Impact:**
- `APP_PRODUCT` acts as runtime product selector
- No separate `VITE_STRATA_SUPABASE_*` variables needed
- Isolation enforced via RLS and app-level product routing
- Database has shared infrastructure for both products

**Date:** 2026-07-07  
**Owner:** User  

---

### Decision 2: Migration File Handling
**Question:** Should the 24 existing STRATA migrations be moved or copied to the new folder?

**Decision:** **Copy (Both Branches)**

**Rationale:**
- Less risky than moving (no accidental loss of main branch stability)
- Preserves git history on both branches
- Both branches can operate independently
- Idempotency via Supabase version ledger prevents double-apply
- Easy to debug if migration issues arise

**Impact:**
- `supabase/migrations/` keeps originals (main branch stability)
- `supabase/strata/migrations/` has copies (STRATA branch autonomy)
- Both branches run migrations against same database
- Version ledger tracks which migrations have been applied
- Easy to cherry-pick migrations if needed during merge-back phase

**Date:** 2026-07-07  
**Owner:** User

---

### Decision 3: Product Track Lifetime
**Question:** Is STRATA a permanent separate product, or will it eventually merge back into Catalyst?

**Decision:** **Eventually Merge Back (6-12 Month Isolation)**

**Rationale:**
- STRATA is a fast-track experimental version
- Expected timeline: 6-12 months of isolated development
- Then explicit merge planning and integration back into Catalyst
- Isolation is temporary, not permanent fork

**Impact:**
- Plan Lock documents "deferred merge phase"
- Code changes kept surgical (easier to merge later)
- Feature Work Folder created to track isolation (will inform merge planning)
- Merge safety checklist in README_STRATA_ISOLATION.md
- Future feature work (CAT-STRATA-MERGE-*-001) will handle actual merge

**Date:** 2026-07-07  
**Owner:** User

---

## Technical Decisions Made During Planning

### Decision 4: Product Selector Pattern
**Made by:** Implementation planning  
**Rationale:** Runtime `APP_PRODUCT` environment variable (not URL-based)

**Details:**
- `APP_PRODUCT=CATALYST` → routes to Catalyst feature flags, navigation, modules
- `APP_PRODUCT=STRATA` → routes to STRATA feature flags, navigation, modules
- Startup guard validates `APP_PRODUCT` is set; fails if missing/invalid
- Prevents silent fallback to wrong product

**Implementation:**
- `.env.example.catalyst` and `.env.example.strata` templates
- `src/lib/productEnvironmentGuard.ts` for validation
- `scripts/check-product-environment.ts` for preflight checks

---

### Decision 5: Feature Work Folder Scope
**Made by:** Implementation planning  
**Rationale:** Follow Catalyst operating contract

**Details:**
- Create `catalyst/features/CAT-STRATA-ISOLATE-20260707-001/` folder
- Include required artifacts: 00, 01, 03, 07, 08, 09
- Document isolation strategy, plan, handover, decisions
- Not a code refactor — a structural/organizational task

---

### Decision 6: Migration Script Approach
**Made by:** Implementation planning  
**Rationale:** Separate scripts for clarity

**Details:**
- `npm run db:migrate:catalyst` → `supabase db push` (from `supabase/migrations/`)
- `npm run db:migrate:strata` → `supabase db push --dir ./supabase/strata` (from `supabase/strata/migrations/`)
- Both scripts run against same Supabase database
- Developer must explicitly choose which migration set to run
- Prevents accidental cross-product migrations

---

## Decision Log Format

For any future decisions added to this file:

```markdown
### Decision N: [Title]
**Made by:** [Person/Entity]  
**Date:** [YYYY-MM-DD]  
**Rationale:** [Why this decision?]  
**Impact:** [What changes as a result?]  
**Reversible:** [Yes/No — if needed]  
```

---

**Last Updated:** 2026-07-07  
**Next Review:** After implementation complete
