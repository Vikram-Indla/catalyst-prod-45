# CAT-STRATA-ISOLATE-20260707-001: STRATA Isolation Strategy

**Status:** Implementation in progress  
**Owner:** Catalyst Engineering  
**Timeline:** 2026-07-07 to TBD  
**Objective:** Isolate STRATA module into separate Git branch with dedicated environment and migration path while preserving ability to merge back into Catalyst (6-12 months).

## Quick Start

This feature work establishes strict isolation between Catalyst and STRATA, two separate strategic planning products that will eventually merge back.

**Files to read in order:**
1. `00_READ_ME_FIRST.md` (this file)
2. `01_OBJECTIVE.md` (full objective statement)
3. `03_PLAN_LOCK.md` (approved implementation plan)

**Key Branches:**
- `main` — Catalyst + STRATA (current state, for reference)
- `strata-standalone` — STRATA only (canonical STRATA development branch)

**Key Environment Variables:**
- `APP_PRODUCT=CATALYST` — Runs Catalyst
- `APP_PRODUCT=STRATA` — Runs STRATA
- Both point to same Supabase project (isolation via RLS and app logic)

**Key Migrations:**
- `supabase/migrations/` — Catalyst migrations
- `supabase/strata/migrations/` — STRATA migrations (copy of 24 files)

## Decisions Made

1. **Same Supabase project** — Both products use cyijbdeuehohvhnsywig (staging) or lmqwtldpfacrrlvdnmld (prod)
2. **Copy migrations** — STRATA migrations copied to dedicated folder; idempotency via version ledger
3. **Merge path preserved** — Isolation is temporary (6-12 months); deferred merge into Catalyst planned

## What Changed

- Created `strata-standalone` branch
- Created `.env.example.catalyst` and `.env.example.strata` templates
- Created `supabase/strata/migrations/` with 24 copied STRATA migration files
- Created `src/lib/productEnvironmentGuard.ts` startup guard
- Created `scripts/check-product-environment.ts` preflight validator
- Created `README_STRATA_ISOLATION.md` governance documentation
- Added package scripts: `dev:catalyst`, `dev:strata`, `db:migrate:catalyst`, `db:migrate:strata`, `check:product-env`
- Updated Feature Work Folder per Catalyst operating contract

## What Did NOT Change

- All existing Catalyst code on main branch
- All existing STRATA code on main branch (preserved for reference)
- STRATA module location (`src/modules/strata/`)
- Route registry
- Catalyst feature flags or Strategy module

## Next Phase (Merge-Back, 6-12 Months)

When STRATA is mature and ready to integrate back into Catalyst:
1. Explicit merge planning begins (separate feature work)
2. Cherry-pick or full merge of `strata-standalone` → `main`
3. Data reconciliation if applicable
4. Sunsetting of separate product track

## Testing This Feature

```bash
# Test Catalyst on main branch
git checkout main
cp .env.example.catalyst .env.local
npm run check:product-env
npm run dev:catalyst

# Test STRATA on strata-standalone branch
git checkout strata-standalone
cp .env.example.strata .env.local
npm run check:product-env
npm run dev:strata
```

## Risks & Mitigations

| Risk | How We Handle It |
|------|------------------|
| Accidental merge STRATA → Catalyst | Merge checklist in README_STRATA_ISOLATION.md; require explicit approval |
| Wrong APP_PRODUCT at startup | productEnvironmentGuard fails fast; preflight warns |
| Migration confusion | Separate folders + scripts; version ledger prevents double-apply |
| Code drift during isolation | Document merge-back strategy; establish sync points quarterly |
| Loss of work | Git history preserved; cherry-pick feasible |

## Contacts & Escalation

- **Lead:** Catalyst Engineering
- **Questions:** Refer to README_STRATA_ISOLATION.md or catalyst/features/CAT-STRATA-ISOLATE-20260707-001/
- **Urgent issues:** Contact Catalyst oncall

---

**Last Updated:** 2026-07-07
