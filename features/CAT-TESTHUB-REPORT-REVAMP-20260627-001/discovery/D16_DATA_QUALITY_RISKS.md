# D16 — Data Quality & Risk List

> STATUS: 🟢 FIRST PASS.

| ID | Risk | Evidence | Severity |
|----|------|----------|----------|
| DQ-01 | **Schema fragmentation** — 6 competing test/release/sprint families | D3: tm_/th_/test_/ph_/rh_/r360_ | HIGH |
| DQ-02 | `test_*` giant family (~110 tables) entirely DEAD (0 rows) | D3 | HIGH (confusion/migration risk) |
| DQ-03 | Two work-item models: `ph_issues` (2381, text sprint) vs `ph_work_items` (1366, FK sprint/release) | D8/D9 | HIGH (which is canonical?) |
| DQ-04 | tm_* test data is demo-only (11 cases/1 run/1 cycle/1 defect) | D3 | HIGH (reports empty on real data) |
| DQ-05 | Release↔Sprint has NO direct FK | D8 | MED (rollup undefined) |
| DQ-06 | Sprint as TEXT (`ph_issues.sprint_name`) not FK | D9 | MED (join fragility) |
| DQ-07 | `iterations` table exists but empty — dead duplicate of ph_jira_sprints | D3 | LOW |
| DQ-08 | Multiple defect models: tm_defects(1), ph_defects(0), th_defects(0), defects(0), test_defect_links | D3 | MED |
| DQ-09 | Multiple incident models: incidents(0), ph_incidents(0), incident_* family | D3 | MED |
| DQ-10 | Pre-existing ADS hex-fallback violation in ReportDetailPage.tsx ~:1337 (`#F7F8F9`) | D2 | LOW (debt) |

## Migration / safety note
No schema change proposed. Any consolidation of fragmented families = invasive, consent-gated (CONSENT_GATES).
