# D3 — Table Inventory (cyij / catalyst-staging, dev-app DB)

> STATUS: 🟢 FIRST PASS. Source: `supabase db query --linked` (project cyijbdeuehohvhnsywig). 2026-06-27.
> Evidence-only. Row counts = `pg_stat_user_tables.n_live_tup`.

## HEADLINE: severe schema fragmentation
At least **6 competing families** for test/release/sprint/defect/incident, most empty.

| Family | Prefix | Live? | Notes |
|---|---|---|---|
| Test Management | `tm_*` | DEMO-only | The schema the real reports query. Near-empty (see below). |
| Test Hub (alt) | `th_*` | mostly dead | th_test_cycles(6), th_tags(16); rest 0 |
| Test (legacy giant) | `test_*` | **DEAD (0 rows)** | ~110 tables, all unpopulated scaffolding |
| Project Hub | `ph_*` | **LIVE** | Real delivery data spine |
| Release Hub | `rh_*` | config-only | rh_releases(1), config tables |
| Release 360 | `r360_*` | DEAD (0) | r360_releases, r360_ai_release_standings |
| Standalone | `releases`, `iterations`, `defects`, `incidents`, `product_*` | DEAD (0) | duplicates, unused |

## LIVE tables that matter (n_live_tup > 0)
### Delivery spine (ph_* — REAL)
| Table | Rows | Role |
|---|---|---|
| ph_issues | 2381 | Jira-synced work items (sprint by **text** `sprint_name`) |
| ph_work_items | 1366 | Normalized work items (FKs: `sprint_id`, `release_id`, `parent_id`) |
| ph_versions | 193 | versions |
| ph_releases | 59 | **release source of truth** (project_id, dates, status) |
| ph_jira_sprints | 26 | **sprint source of truth** (project_id, jira_sprint_id, dates) |
| ph_projects | 8 | projects |

### Test side (tm_* — DEMO-level, almost empty)
| Table | Rows |
|---|---|
| tm_test_steps | 28 |
| tm_test_cases | **11** |
| tm_folders | 6 |
| tm_cycle_scope | 3 |
| tm_step_results | 3 |
| tm_set_cases | 3 |
| tm_defects | **1** |
| tm_test_cycles | **1** |
| tm_test_runs | **1** |
| tm_test_sets | 1 |
| tm_projects | 1 |

## CONSEQUENCE
The "real" reports at `/testhub/reports` + `/testhub/reports/:type` query `tm_*`, which holds
~11 cases / 1 run / 1 cycle / 1 defect. **Management-grade reporting on real data currently has
almost nothing to report.** Delivery data (ph_*) is rich; test data is not.

## Full table list
See raw query output in session 001 / `../evidence/`. 220+ tables in public schema.
