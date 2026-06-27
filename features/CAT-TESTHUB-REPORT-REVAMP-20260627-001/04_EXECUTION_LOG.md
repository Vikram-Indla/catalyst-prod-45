# 04 — Execution Log

## 2026-06-27 — Phase 1 discovery + demo seed
- Read-only DB discovery on cyij (supabase db query --linked). No prod touch.
- Decisions D-001..D-007 logged (test schema tm_*, work item ph_issues, release→sprint derive, coverage=stories, defects=hybrid, seed Senaei BAU).
- WROTE (cyij dev, G-001 APPROVED, tagged REVAMP-DEMO-20260627):
  - tm_projects: +1 (Senaei BAU mirror, id = ph_projects id)
  - tm_test_cases: +14 (linked to real BAU stories)
  - tm_requirement_links: +14 (Trace-To real ph_issues)
  - tm_test_cycles: +2 · tm_cycle_scope: +14 · tm_test_runs: +12 · tm_defects: +3
- PROVEN on real data: coverage 14/394=3.6%; exec 8P/3F/1B/2NR; 3 governance mismatches (BAU-6018/6075/6003 Done+failed).
- Scripts: blueprint/seed_revamp_demo.sql, blueprint/rollback_revamp_demo.sql.
- No src/ code changed. No schema/DDL changed (data-only writes to existing tables).
