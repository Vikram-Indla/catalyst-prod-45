# Plan Lock: STRATA Consolidation — Dual-Branch to Single Track

**Feature Work ID:** CAT-STRATA-CONSOLIDATE-20260710-001  
**Status:** Approved  
**Date:** 2026-07-10  
**Objective:** Kill dual-branch isolation strategy. Consolidate Strata into single `main` branch. Strata becomes one module under Hub Switcher alongside Catalyst's Strategy module.

---

## New Strategic Direction

**Previous approach (CAT-STRATA-ISOLATE-20260707-001):**
- Separate `strata-standalone` branch for 6-12 month isolation
- STRATA develops independently, merges back later
- Risk: code drift, complex merge, resource duplication

**New approach (CAT-STRATA-CONSOLIDATE-20260710-001):**
- Single `main` branch for both Catalyst and Strata
- Hub Switcher selects product at runtime (APP_PRODUCT)
- Strata is a module under the hub switcher, not a separate product track
- Strategy module in Catalyst, Strata module in Strata
- Single codebase, single migration track, one forward velocity

---

## Approved Consolidation Strategy

1. **Branch State:**
   - Delete `strata-standalone` branch (work preserved in git history)
   - Keep all Strata code on `main`
   - No separate development branch

2. **Module Organization:**
   - Strata: `src/modules/strata/` (unchanged, sits under Hub Switcher)
   - Catalyst: `src/modules/strategy/` (unchanged, sits under Catalyst routes)
   - Hub Switcher: Routes to either product based on APP_PRODUCT

3. **Database & Migrations:**
   - Keep single `supabase/migrations/` track (24 Strata migrations already applied)
   - Keep `supabase/strata/migrations/` as archive (no longer used)
   - All future DDL goes into `supabase/migrations/`

4. **Environment Selector:**
   - Keep APP_PRODUCT (CATALYST | STRATA) for runtime switching
   - Keep `.env.example.catalyst` and `.env.example.strata` for local dev templates
   - Dev can switch products locally without branch switching

5. **Package Scripts:**
   - Keep `dev:catalyst` and `dev:strata` (convenient shortcuts)
   - Remove `db:migrate:strata` (not needed, use main migrate)
   - Keep `check:product-env` for validation

6. **Isolation Artifacts:**
   - Keep productEnvironmentGuard.ts (still needed)
   - Keep README_STRATA_ISOLATION.md (reference for what was tried)
   - Update docs to reflect new "one module, one branch" strategy

---

## Implementation Checklist

### Phase 1: Backup & Safety
- [x] Verify clean git state on `main`
- [x] Confirm `strata-standalone` branch exists
- [x] Document current state (git log, branch list)

### Phase 2: Delete Isolation Artifacts
- [ ] Delete `strata-standalone` branch (`git branch -D strata-standalone`)
- [ ] Remove CAT-STRATA-ISOLATE-20260707-001 feature folder (archive first if needed)
- [ ] Update package.json: remove `db:migrate:strata` script
- [ ] Archive `supabase/strata/migrations/` folder (move to archive or delete)
- [ ] Update README_STRATA_ISOLATION.md → explain this was attempt, now one-track

### Phase 3: Consolidate Documentation
- [ ] Update CLAUDE.md: remove dual-branch strategy guidance
- [ ] Create `README_STRATA_SINGLE_TRACK.md` (new governance for single-track model)
- [ ] Update docs to reflect Hub Switcher model

### Phase 4: Verify Strata on Main
- [ ] Run `npm run check:product-env` (should pass)
- [ ] Run `npm run dev:strata` on `main` (should work)
- [ ] Run `npm run dev:catalyst` on `main` (should work)
- [ ] Verify no broken imports: `npm run lint`
- [ ] Verify Strata module routes work: navigate to `/ideas/`, `/strategy/`

### Phase 5: Clean Stashes & History
- [ ] Review stashes: `git stash list` (decide what to keep/discard)
- [ ] If stash contains strata-specific work, cherry-pick into `main`
- [ ] Document stash decisions in session log

### Phase 6: Final Commit
- [ ] Stage files: feature work folder, package.json, docs updates
- [ ] Create commit: "feat(strata): consolidate to single-track model — kill dual-branch strategy"
- [ ] Verify commit only touches intended files
- [ ] Write session log

---

## Critical Files to Delete/Archive

| File/Folder | Action | Reason |
|---|---|---|
| `strata-standalone` branch | Delete (`git branch -D`) | No longer needed; all work on `main` |
| `catalyst/features/CAT-STRATA-ISOLATE-20260707-001/` | Archive (move to `docs/archive/`) | Document what was tried, but now superseded |
| `supabase/strata/migrations/` | Archive or delete | Migrations already in `supabase/migrations/` |
| `db:migrate:strata` script | Remove from package.json | Use main migrate for both products |

## Critical Files to Keep/Update

| File | Action | Why |
|---|---|---|
| `src/modules/strata/` | Keep unchanged | Core Strata module |
| `src/modules/strategy/` | Keep unchanged | Core Catalyst Strategy module |
| `.env.example.catalyst` | Keep | Local dev template |
| `.env.example.strata` | Keep | Local dev template |
| `src/lib/productEnvironmentGuard.ts` | Keep | Still needed for APP_PRODUCT validation |
| `scripts/check-product-environment.ts` | Keep | Still needed for startup check |
| `package.json` | Update scripts (remove one) | Remove `db:migrate:strata` |
| `README_STRATA_ISOLATION.md` | Update | Explain this was attempt; new model is one-track |

## Forbidden Actions

- ❌ Do NOT keep `strata-standalone` branch (kill it)
- ❌ Do NOT create new branches for Strata (all work on `main`)
- ❌ Do NOT split migrations again (keep in `supabase/migrations/`)
- ❌ Do NOT remove productEnvironmentGuard (still needed)
- ❌ Do NOT modify Strata module code (only structure/docs)

## What Stays Unchanged

- ✅ All Strata code (`src/modules/strata/`)
- ✅ All Catalyst code (`src/modules/strategy/`)
- ✅ Hub Switcher logic (product selection)
- ✅ Supabase schema (RLS still enforces isolation)
- ✅ APP_PRODUCT selector at runtime

---

## Verification Commands

```bash
# Verify branch deleted
git branch -v | grep strata

# Verify strata works on main
npm run dev:strata

# Verify catalyst works on main
npm run dev:catalyst

# Verify no broken imports
npm run lint

# Verify guard still works
npm run check:product-env

# Verify migrations applied
supabase db list-remote
```

---

## Rollback Plan

If consolidation causes issues:
1. Revert last commit: `git revert HEAD` or `git reset --soft HEAD~1`
2. Restore `strata-standalone` from git reflog if needed: `git branch strata-standalone <reflog-sha>`
3. Restore CAT-STRATA-ISOLATE folder from git history

**All changes are reversible.**

---

## Timeline

- Phase 1-2 (Backup & Cleanup): 15 min
- Phase 3 (Documentation): 20 min
- Phase 4 (Verification): 30 min
- Phase 5-6 (Cleanup & Commit): 15 min
- **Total: ~1.5 hours**

---

## Success Metrics

- ✅ `strata-standalone` branch deleted
- ✅ Both products run on `main` branch
- ✅ `npm run dev:strata` works
- ✅ `npm run dev:catalyst` works
- ✅ Zero broken imports (lint passes)
- ✅ productEnvironmentGuard still validates APP_PRODUCT
- ✅ Feature folder complete (00, 01, 03, 07, 08, 09)
- ✅ Session log written

---

**Approved by:** User decision (2026-07-10)  
**Decision:** Kill dual-branch isolation. Single track, one module model.
