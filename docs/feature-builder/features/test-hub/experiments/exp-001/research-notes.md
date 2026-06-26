# Research Notes: test-hub / exp-001

**Title:** Feature intake and Catalyst pattern discovery
**Date:** 2026-06-26
**Type:** research

---

## Findings

### 1. Canonical pattern map is clear

8 Catalyst patterns identified and mapped with Test Hub status per each. See `catalyst-pattern-discovery.md`.
Key: Dashboard + Filters already use canonical patterns. JiraTable, CatalystViewBase, ActivityPanel not confirmed in most pages.

### 2. Test Hub footprint is large but fragile

- 14 routes, 19 page files, 18 hooks, full type system — substantial shell exists
- BUT: critical dual-schema bug means data written via UI never appears in dashboard stats
- Dashboard mounts canonical `ProjectDashboardPage` correctly — good
- FiltersListPage mounts canonical `FiltersListPage` correctly — good
- Remaining 17 pages need exp-002 audit to determine: are they using canonical components or parallel implementations?

### 3. AIO docs — fully accessible

- 152 PDFs at `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/` — accessible
- Structured knowledge base at `/Users/vikramindla/Downloads/aio-tests-knowledge/` — accessible (7 directories)
- NOT blocked. Decision: `keep`

### 4. Critical dual-schema issue (from TESTHUB_GAP_ANALYSIS.md, April 2026)

Two parallel schemas: `tm_*` (active, used by 90% of code) and `th_*` (legacy, used by dashboard RPCs and some modals).
Data written to `tm_test_cases` via repository page never shows in dashboard stats (which read `th_test_cases`).
This is the root cause of all "empty data" bugs reported. Fix = update RPCs to read `tm_*`.

### 5. Admin config pages exist

5 admin pages under `src/pages/admin/test/`. These drive priority/type/status UI. Admin config pattern correctly architected per Catalyst convention.

### 6. CaseDrawer is custom — risk

`src/pages/testhub/repository/CaseDrawer.tsx` exists as a custom component. Unknown if it uses `CatalystViewBase`. If parallel implementation: violates REUSE FIRST rule, carries 18+ parity defect risk (same failure mode as `BrSidebarDetails`, 2026-06-01). Exp-002 must audit.

### 7. CATY AI hook exists, not confirmed wired

`src/hooks/test-management/useAIGeneration.ts` exists. Not confirmed wired to any UI button. Exp-002 must check Repository and CycleDetailPage for AI integration.

---

## Evidence

| Claim | Source |
|---|---|
| 14 routes registered | `FullAppRoutes.tsx` lines 139–144, 655–673 |
| 19 page files | `find src/pages/testhub -name "*.tsx"` |
| 18 hooks | `ls src/hooks/test-management/` |
| Dashboard uses canonical | `src/pages/testhub/DashboardPage.tsx` lines 1–14 |
| Filters uses canonical | `src/pages/testhub/FiltersListPage.tsx` lines 1–14 |
| Dual schema confirmed | `TESTHUB_GAP_ANALYSIS.md` lines 1–78 |
| 152 PDFs accessible | `ls "/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/"` → 152 count |
| Knowledge base accessible | `ls /Users/vikramindla/Downloads/aio-tests-knowledge/` |
| 5 admin pages | `FullAppRoutes.tsx` lines 139–144 |
| CaseDrawer custom file | `src/pages/testhub/repository/CaseDrawer.tsx` (exists) |

---

## Acceptance Criteria Status

| Criterion | Pass? | Evidence |
|---|---|---|
| Canonical Catalyst references identified | ✅ | catalyst-pattern-discovery.md — 8 patterns mapped |
| Current Test Hub footprint documented | ✅ | current-state-audit.md — routes, pages, hooks, issues |
| AIO Tests documentation availability confirmed | ✅ | 152 PDFs + knowledge base accessible |
| `feature-intake.md` filled | ✅ | Written |
| `catalyst-pattern-discovery.md` filled | ✅ | Written |
| `current-state-audit.md` filled | ✅ | Written |
| `external-benchmark-research.md` filled | ✅ | Written |
| `experiment-roadmap.md` updated | ✅ | Written with Phase 0–3 table |
| `research-notes.md` filled | ✅ | This file |
| `baseline.md` filled | ✅ | Written |
| `scorecard.md` filled | ✅ | Written |
| Decision logged | ✅ | `keep` — see decision.md |
| No `src/` files touched | ✅ | Zero src/ modifications — read-only access only |
