# STRATA & Catalyst Product Isolation Strategy

**Status:** Active Isolation (CAT-STRATA-ISOLATE-20260707-001)  
**Updated:** 2026-07-07  
**Next Merge Planning:** 6-12 months from isolation start  

---

## Overview

STRATA and Catalyst are separate strategic planning products that share a codebase and database, but operate independently through strict isolation at the branch, environment, and app logic layers.

**Key Principle:** You cannot accidentally run one product's code as the other or corrupt one product's data by accident.

---

## Branch Isolation

| Branch | Purpose | Contains |
|--------|---------|----------|
| `main` | Catalyst primary development branch | Catalyst code + STRATA code (for reference) |
| `strata-standalone` | STRATA primary development branch | STRATA code only (cleaner history) |
| Other branches | Feature branches | Follow parent branch rules |

**Rules:**
- Catalyst work happens on `main` or feature branches from `main`
- STRATA work happens on `strata-standalone` or feature branches from `strata-standalone`
- Merges between `main` and `strata-standalone` are rare and require explicit approval
- See [Merge Safety Checklist](#merge-safety-checklist) before any cross-product merge

---

## Environment Variable Isolation

Both products use the **same Supabase project** but are distinguished by the `APP_PRODUCT` environment variable.

**Required Setup:**

```bash
# For Catalyst development:
cp .env.example.catalyst .env.local
npm run check:product-env
npm run dev:catalyst

# For STRATA development:
cp .env.example.strata .env.local
npm run check:product-env
npm run dev:strata
```

**Environment Variables:**

| Variable | Catalyst | STRATA | Notes |
|----------|----------|--------|-------|
| `APP_PRODUCT` | `CATALYST` | `STRATA` | **Required**. Startup fails if missing or invalid. |
| `VITE_SUPABASE_URL` | `https://cyijbdeuehohvhnsywig...` | `https://cyijbdeuehohvhnsywig...` | Same for both (staging). Prod: `lmqwtldpfacrrlvdnmld...` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same | Same | Same for both. |

**Key Point:** Both products point to the **same Supabase project**. Isolation is enforced via:
1. **RLS policies** (database layer) — rows tagged by product
2. **App routing** (frontend layer) — `APP_PRODUCT` selector routes to correct module
3. **Startup guard** (validation layer) — `productEnvironmentGuard.ts` fails immediately if `APP_PRODUCT` is invalid

---

## Database Migration Isolation

STRATA and Catalyst have separate migration paths to prevent confusion.

### For Catalyst (main branch):

```bash
# Run Catalyst migrations from supabase/migrations/
npm run check:product-env
npm run db:migrate:catalyst
# or: supabase db push  (default, runs from supabase/migrations/)
```

### For STRATA (strata-standalone branch):

```bash
git checkout strata-standalone
npm run check:product-env
npm run db:migrate:strata
# Runs from supabase/strata/migrations/ against same Supabase database
```

**Migration Folder Structure:**

```
supabase/
├── migrations/                    # Catalyst migrations
│   ├── 20260705100000_strata_*.sql  (also copied to strata/ — see below)
│   ├── 20260706093000_strata_*.sql
│   └── ... (non-STRATA migrations)
│
└── strata/
    └── migrations/               # STRATA-specific migrations
        ├── 20260705100000_strata_foundation_config_engine.sql
        ├── 20260705100100_strata_strategy_scorecard.sql
        └── ... (24 files total, copied from supabase/migrations/)
```

**Key Points:**
- STRATA migrations are **copied** to `supabase/strata/migrations/`, not moved
- Both folders are valid; idempotency via Supabase version ledger prevents double-apply
- When on `strata-standalone` branch, use `npm run db:migrate:strata`
- When on `main` branch, use `npm run db:migrate:catalyst` or `supabase db push`
- **Both run against the same database** — version tracking prevents issues

---

## Local Development Workflow

### Option A: Develop Catalyst (main branch)

```bash
# Checkout main branch
git checkout main

# Setup environment
cp .env.example.catalyst .env.local
npm run check:product-env

# Verify environment is correct
npm run dev:catalyst

# Open http://localhost:5173
# App initializes with APP_PRODUCT=CATALYST
# You see Catalyst features and routes
```

### Option B: Develop STRATA (strata-standalone branch)

```bash
# Checkout STRATA branch
git checkout strata-standalone

# Setup environment
cp .env.example.strata .env.local
npm run check:product-env

# Verify environment is correct
npm run dev:strata

# Open http://localhost:5173
# App initializes with APP_PRODUCT=STRATA
# You see STRATA features and routes
```

### Option C: Run Migrations

**For Catalyst migrations:**
```bash
git checkout main
npm run check:product-env
npm run db:migrate:catalyst
```

**For STRATA migrations:**
```bash
git checkout strata-standalone
npm run check:product-env
npm run db:migrate:strata
```

---

## Validation & Preflight Checks

**Before running the app, always check your environment:**

```bash
npm run check:product-env
```

This script validates:
- ✅ `APP_PRODUCT` is set and valid
- ✅ Supabase variables are configured
- ✅ `.env.local` file exists
- ✅ Current git branch matches `APP_PRODUCT` (warning only)

**Startup Guard:**
If you run the app with invalid `APP_PRODUCT`:
- Startup fails immediately with a clear error message
- Shows the correct environment template to use
- Prevents running the wrong product accidentally

---

## Forbidden Actions

❌ **NEVER do these:**

1. **Run STRATA code with `APP_PRODUCT=CATALYST`** (or vice versa)
   - The startup guard will prevent this
   - If somehow bypassed, data corruption risk is high

2. **Cherry-pick migrations between folders** manually
   - Use the `npm run db:migrate:*` scripts instead
   - Version ledger tracks what's applied

3. **Merge `strata-standalone` → `main` without explicit approval**
   - Both products are not ready to merge yet
   - Use [Merge Safety Checklist](#merge-safety-checklist) if needed

4. **Commit STRATA migrations to `supabase/migrations/` after they're moved**
   - They're already in both places; avoid duplication

5. **Delete or rename `.env.example.catalyst` / `.env.example.strata`**
   - Developers depend on these templates

---

## Merge Safety Checklist

**If you need to merge code between branches, use this checklist:**

### Before Any Cross-Product Merge:

- [ ] **Is this merge necessary?** (Most work should stay on its own branch)
- [ ] **What product does this code belong to?** (Catalyst or STRATA)
- [ ] **Which branch is the source?** (main or strata-standalone)
- [ ] **Which branch is the target?** (main or strata-standalone)
- [ ] **Code Review:** Has the code been reviewed by at least 2 engineers?
- [ ] **Database Impact:** Will this change any tables or RLS policies?
- [ ] **Migrations:** Are all migrations included? Are they in the right folder?
- [ ] **Feature Flags:** Does this change any feature flags? Are they product-specific?
- [ ] **Environment:** Does this introduce new environment variables?
- [ ] **Regressions:** Has the target product been tested after merge?

### When Merging STRATA → Catalyst (Deferred, 6-12 Months):

- [ ] **Business approval:** Is this merge approved by stakeholders?
- [ ] **Feature completeness:** Is STRATA feature set mature enough?
- [ ] **Code quality:** Does STRATA code meet Catalyst standards?
- [ ] **Data reconciliation:** How will STRATA and Catalyst data merge?
- [ ] **Timeline:** Is a dedicated merge feature work created (CAT-STRATA-MERGE-*-001)?
- [ ] **Rollback plan:** Can we roll back if issues arise?

**After merge, always:**
- [ ] Test Catalyst still works
- [ ] Test STRATA still works (if keeping separate)
- [ ] Run full test suite
- [ ] Monitor for regressions in prod

---

## Startup Guard & Product Environment Guard

**File:** `src/lib/productEnvironmentGuard.ts`

The startup guard validates the environment at app initialization:

```typescript
// Called in src/main.tsx before mounting the app
validateProductEnvironment();
```

**What it checks:**
1. `APP_PRODUCT` is set (required)
2. `APP_PRODUCT` is either `CATALYST` or `STRATA`
3. Supabase URL and key are configured
4. No silent fallback to wrong product

**If validation fails:**
```
❌ APP_PRODUCT environment variable is not set.

Set APP_PRODUCT to one of: CATALYST, STRATA

Examples:
  APP_PRODUCT=CATALYST npm run dev:catalyst
  APP_PRODUCT=STRATA npm run dev:strata

Or copy one of the environment templates:
  cp .env.example.catalyst .env.local  (for Catalyst)
  cp .env.example.strata .env.local    (for STRATA)
```

The app will **not start** until this is fixed.

---

## Common Issues & Troubleshooting

### Issue: "APP_PRODUCT is not set"

**Cause:** Environment variable missing from `.env.local`

**Fix:**
```bash
cp .env.example.catalyst .env.local    # for Catalyst
# or
cp .env.example.strata .env.local      # for STRATA

npm run check:product-env
npm run dev:catalyst  # or dev:strata
```

### Issue: "Invalid APP_PRODUCT value"

**Cause:** `APP_PRODUCT` is set to something other than `CATALYST` or `STRATA`

**Fix:**
```bash
# Check your .env.local
cat .env.local | grep APP_PRODUCT

# Should be exactly:
# APP_PRODUCT=CATALYST
# or
# APP_PRODUCT=STRATA

# Fix and reload
npm run check:product-env
npm run dev
```

### Issue: "Git branch doesn't match APP_PRODUCT"

**Cause:** You're on the wrong git branch for the product you're developing

**Example:** On `main` but `APP_PRODUCT=STRATA`

**Fix:**
```bash
# Check your branch
git branch --show-current

# Switch to the right branch
git checkout main          # for Catalyst
git checkout strata-standalone  # for STRATA

# Update environment
cp .env.example.catalyst .env.local    # for main
cp .env.example.strata .env.local      # for strata-standalone

npm run check:product-env
npm run dev:catalyst  # or dev:strata
```

### Issue: Migrations not found in `supabase db push`

**Cause:** Using wrong migration directory script

**Fix:**
```bash
# For Catalyst:
npm run db:migrate:catalyst   # runs supabase/migrations/

# For STRATA:
npm run db:migrate:strata     # runs supabase/strata/migrations/

# Or manually specify:
supabase db push --linked
supabase db push --linked --dir ./supabase/strata
```

---

## Long-Term Roadmap: Merge-Back (6-12 Months)

STRATA is a temporary fast-track experimental version. It will eventually merge back into Catalyst.

**Timeline:**
- **Months 1-6:** STRATA development in isolation (currently here)
- **Months 6-8:** Merge planning & design (separate feature work: CAT-STRATA-MERGE-*-001)
- **Months 9-12:** Merge execution & integration
- **Month 12+:** Unified product or decided on two-product strategy

**Merge Strategy (TBD):**
1. **Option A: Cherry-Pick** — Key STRATA features cherry-picked into Catalyst Strategy
2. **Option B: Full Merge** — `strata-standalone` → `main` + code reconciliation
3. **Option C: Keep Separate** — STRATA remains standalone product (business decision)

**Current isolation preserves all merge paths.** Surgical changes make any of these options feasible.

---

## Questions & Support

- **Environment setup:** See [Local Development Workflow](#local-development-workflow)
- **Branch strategy:** See [Branch Isolation](#branch-isolation)
- **Migrations:** See [Database Migration Isolation](#database-migration-isolation)
- **Merge questions:** See [Merge Safety Checklist](#merge-safety-checklist)
- **Technical details:** See `catalyst/features/CAT-STRATA-ISOLATE-20260707-001/`

---

**Prepared by:** Catalyst Engineering  
**Last Updated:** 2026-07-07  
**Feature Work:** CAT-STRATA-ISOLATE-20260707-001  
**Contacts:** Refer to feature work folder for escalation
