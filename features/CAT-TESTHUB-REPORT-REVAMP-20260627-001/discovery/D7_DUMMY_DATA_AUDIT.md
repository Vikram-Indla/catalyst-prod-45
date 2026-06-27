# D7 — Dummy / Seeded Data Audit

> STATUS: 🟢 FIRST PASS.

| Surface | Data | Marker |
|---|---|---|
| `/testhub/reports-lab` | fully SEEDED (mock) | useSeededTestReportData.ts; UI labels "Staging UI Lab · Seeded Data" |
| `/testhub/reports` + `/:type` | REAL tm_* (near-empty pre-seed) | live Supabase hooks |
| REVAMP demo seed (this feature) | SEEDED but linked to REAL ph_issues stories | tag `custom_fields.seed_batch='REVAMP-DEMO-20260627'`, keys RVTC-/RVCYC-/RVDF-/SENAEI-BAU |

## Rollback for revamp seed
`blueprint/rollback_revamp_demo.sql` — deletes by seed_batch tag + key prefixes (cyij only).
Seeded counts: 14 cases, 14 req_links, 2 cycles, 14 scope, 12 runs, 3 defects, 1 tm_project (mirror).
