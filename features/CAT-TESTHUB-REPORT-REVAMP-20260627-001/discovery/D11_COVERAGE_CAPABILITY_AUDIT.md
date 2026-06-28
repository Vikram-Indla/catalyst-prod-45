# D11 — Coverage Capability Audit (PROVEN on real data)

> STATUS: 🟢 PROVEN 2026-06-27 after seed. Denominator = D-006 (stories).

## Formula (D-006)
Coverage% = (in-scope stories with ≥1 linked test case) ÷ (all in-scope stories) × 100.
- In-scope stories = `ph_issues` where project_name=<project> and issue_type='Story'.
- Linked = exists `tm_requirement_links` where requirement_type='story' and external_key = story.issue_key.

## Proven result (Senaei BAU)
| total_stories | covered_stories | coverage_pct |
|---|---|---|
| 394 | 14 | **3.6%** |
(14 = seeded links; pre-seed = 0%.) Coverage is now computable end-to-end on real delivery data.

## Notes
- Execution-coverage (executed ÷ planned) also computable via tm_cycle_scope.current_status.
- Pre-seed, coverage was IMPOSSIBLE (tm_requirement_links=0). Seed (G-001) unblocked it.
