# Implementation Notes: test-hub / exp-002

**Title:** Test Hub Data Contract & Schema Truth Audit
**Date:** 2026-06-26
**Type:** research

N/A — research experiment. No src/ files modified. No changes made.

---

## Changes Made

None. Read-only research.

---

## Reuse Decisions

None. Research only.

---

## Deferred / Out of Scope

### Deferred 1 — Staging DB probe of `tm_get_requirement_test_cases`

Run against staging: `SELECT * FROM tm_get_requirement_test_cases('story', gen_random_uuid()::text) LIMIT 1;`
Verify internal SQL valid (prior session flagged possible deleted `tm_test_executions` table ref).
Impact if broken: TraceabilityPage requirement-to-case matrix fails silently.

### Deferred 2 — TypeScript types for `tm_test_plans` / `plan_test_cycles`

Tables exist in DB (types.ts line 28234). `useTestPlansG26.ts` uses `as any` for all queries.
Fix: `supabase gen types typescript --linked` → regenerate → remove `as any`.
Requires exp-003 src/ edit approval.

### Deferred 3 — Wire test-plans feature OR delete orphaned code

`src/components/test-plans/` (9 components) + `useTestPlansG26.ts` unreachable from any route.
Decision: add `/testhub/plans` route (Option A) or delete (Option B). Requires Vikram input.

### Deferred 4 — th_* table cleanup

27+ dormant tables. Zero active reads. Cleanup = `DROP TABLE th_*` migration.
Requires Gate 4 approval + staging validation first.

### Deferred 5 — DashboardPage test-specific widgets

`ProjectDashboardPage mode='test'` renders but `isTest` branch has no test KPI widgets yet.
Exp-006 build scope.
