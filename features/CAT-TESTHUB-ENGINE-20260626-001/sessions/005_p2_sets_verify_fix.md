# Session 005 — Phase 2: Test Sets (verify-and-fix)

**Date:** 2026-06-27
**Branch:** main
**Goal:** Verify Set CRUD + membership persists live (plan §Phase 2). Sets surface pre-existed (TestSetsPage + SetDetailPage, routes wired) → verify-and-fix, not greenfield.

## Bugs found + fixed (mirrors Repository methodology)
1. **TestSetsPage crashed on render** — missing `import { useNavigate, useParams } from 'react-router-dom'` (used at lines 221-222). Whole /testhub/sets ErrorBoundary'd. FIXED: added import.
2. **D10 — Set create FK-failed (23503).** `tm_test_sets.project_id` FK → `projects`, but testhub keys on `tm_projects` (16 core tables → tm_projects; tm_test_sets + 5 template/audit outliers → projects). Repointed FK → tm_projects (migration 20260627130000, table empty = zero risk). Approved by Vikram.
3. **D11 — Membership insert 403 (42501).** tm_set_cases had RLS enabled but ZERO policies → default-deny. Added 4 policies via parent tm_test_sets, mirroring tm_cycle_scope (migration 20260627140000). Approved by Vikram.
4. **SetDetailPage wrong tm_set_cases columns** — `set_id`(→test_set_id), `order_index`(→sort_order) in members query + add-cases insert + SetCase type. Detail showed "Cases (0)" despite 3 real members. FIXED.
5. **List showed stale denormalized test_count (0)** — nothing syncs it. List now derives live count from tm_set_cases (batch query; PostgREST embed `tm_set_cases(count)` failed PGRST200 → used two-query tally).

## Validation (live on cyij)
- tsc clean.
- Set create: authed POST → 201, set_key=SET-001 (trigger-gen).
- Membership: authed POST ×3 → 201; authed GET → 3 rows (RLS select passes).
- Detail page: "Cases (3)" — TC-0001, TC-001, TC-002 render.
- List page: SET-001 … Static … **3** (live count).
- DB: tm_test_sets 1 row, tm_set_cases 3 rows for SET-001.

## Open flags (08)
- **version-pin NOT schema-supported** (tm_set_cases has no version col) — plan wanted version-pinned membership. Out of this slice; raise before Phase 2 sign-off.
- tm_cycle_sets table doesn't exist (SetDetailPage cycles query) — Phase 3.
- 5 other tm_* FK outliers → projects — revisit when those surfaces built.
- UI create/add-cases dialogs: code now schema-correct; proven via authed POST. Synthetic input into the custom portal dialogs is unreliable in-harness (React state not updated by raw value-set) — not an app bug.
