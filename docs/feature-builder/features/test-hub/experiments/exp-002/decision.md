# Decision: test-hub / exp-002

**Title:** Test Hub Data Contract & Schema Truth Audit
**Date:** 2026-06-26
**Type:** research

---

## DECISION: keep

**REASON:** tm_* is definitively the canonical schema family. All 16 routed testhub pages confirmed safe for UI audit. All 19 active RPCs verified in types.ts. One suspect RPC (tm_get_requirement_test_cases) flagged for staging probe in exp-003. Zero src/ changes made.

---

## 5-Point Report

### 1. Canonical Table Family Recommendation

**tm_* only.**

All active hooks (28 total), pages (16 routed), and features read exclusively from `tm_*`. The `th_*` tables (27+) exist in the database and types.ts but are unreferenced by any active code. The prior frontend that read `th_*` was deleted. The broken `get_dashboard_stats` RPC (read `th_*`, always returned 0) is no longer called by any page.

**Build rule: all new testhub pages/hooks MUST read tm_*. Never th_*.**

---

### 2. Broken Data Paths

**1 suspect (needs staging probe):**
- `tm_get_requirement_test_cases()` — prior session flagged possible reference to deleted `tm_test_executions` table. Function IS in types.ts (line 69796) and IS called by `useRequirementLinks`. Internal SQL validity unverified without DB probe.
- Impact if broken: TraceabilityPage requirement-to-case matrix fails silently.

**1 dead (not broken, just unused):**
- `get_dashboard_stats` SQL function — reads `th_*`, always returned 0. No page calls it. DashboardPage correctly uses `ProjectDashboardPage mode='test'` instead.

**0 hard-broken paths among routed pages.**

---

### 3. Pages/Hooks Blocked by Data-Contract Issues

**None of the 16 routed pages are blocked.**

Orphaned code with data issues (not routed, invisible to users):
- `useTestPlansG26.ts` — `as any` for `tm_test_plans` + `plan_test_cycles` (no TypeScript types generated)
- `src/components/test-plans/` (9 components) — built but wired to nothing

---

### 4. Pages Safe for UI Audit

All 16 routed testhub pages. See `research-notes.md` Finding 5 for full table.

Summary: DashboardPage, RepositoryPage, CyclesPage, CycleDetailPage, ExecutionPage, MyWorkPage, DefectsPage, ReportsPage, ReportDetailPage, TestSetsPage, SetDetailPage, TraceabilityPage, FiltersListPage, FilterDetailPage, FilterPreviewPage, BoardPage — ALL confirmed tm_* data paths, ALL safe.

---

### 5. Recommended Exp-003

**"Test Hub Data Repair + Types Regeneration"**

1. Staging DB probe: `supabase db query --linked "SELECT * FROM tm_get_requirement_test_cases('story', gen_random_uuid()::text) LIMIT 1;"` — confirm function SQL valid
2. Types regen: `supabase gen types typescript --linked` → get proper types for `tm_test_plans` + `plan_test_cycles`
3. Update `useTestPlansG26.ts`: remove all `as any` using new types
4. Vikram decision: wire `/testhub/plans` route OR delete 9 orphaned test-plans components
5. (Optional) `th_*` cleanup migration

Gate: exp-003 requires permission to edit src/ files (types.ts, useTestPlansG26.ts) and run staging DB queries.

---

### 6. Confirmation: No Code Changes Made

- ✅ Zero `src/` files modified
- ✅ Zero staging/production DB queries executed
- ✅ Zero migrations created or run
- ✅ Zero routes added or modified
- ✅ Zero `supabase/functions/` files touched
- ✅ All changes limited to `docs/feature-builder/features/test-hub/experiments/exp-002/` + workspace docs

---

## Decision Rules

| Rule | Applied? |
|---|---|
| scorecard.md total >= 80 | yes — 96 of 100 |
| Zero hard fails in scorecard.md | yes — 0 hard fails |
| allowed-edit-surface.md filled before work started | yes — pre-filled |
| Screenshot provided (if UI build) | N/A — research experiment |

---

## What Exp-003 Must Do

1. Staging DB probe: verify `tm_get_requirement_test_cases` valid
2. Types regeneration: eliminate `as any` in test-plans hooks
3. Vikram decision on test-plans feature (wire vs delete)
4. Assess th_* cleanup priority

---

## Human Approval

- [ ] Vikram reviewed and approved
- **Approved:** _pending_
