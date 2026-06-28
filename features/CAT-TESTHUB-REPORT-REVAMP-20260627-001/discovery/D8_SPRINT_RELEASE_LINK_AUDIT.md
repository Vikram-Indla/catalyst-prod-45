# D8 — Sprint / Release Link Audit (cyij)

> STATUS: 🟢 FIRST PASS — columns probed; cardinality UNRESOLVED (user decision).

## Sprint source of truth
- **`ph_jira_sprints`** (26 rows). Columns: id, name, title, status, start_date, target_date,
  actual_date, release_date, owner_user_id, project_id, **jira_sprint_id**, sort_order, section_name.
- Sprint↔Project: `ph_jira_sprints.project_id` ✅ direct FK.
- Other sprint tables (`anchor_sprints` 1, `injira_sprints` 0, `iterations` 0, `product_sprints` 0,
  `ph_sprint_approvers` 1) — not the live source.
- **`sprint` vs `iteration`**: `iterations` table exists but is EMPTY. Live concept = `ph_jira_sprints`. → confirm with user (Q-SEED-02).

## Release source of truth
- **`ph_releases`** (59 rows). Columns: id, name, title, status, start_date, target_date,
  actual_date, release_date, owner_user_id, **project_id**, sort_order, section_name.
- Release↔Project: `ph_releases.project_id` ✅ direct FK.

## ⛔ Release ↔ Sprint linkage — NO DIRECT FK
- `ph_jira_sprints` has **no** `release_id` column.
- `ph_releases` has **no** sprint reference.
- → A release's sprints CANNOT be derived from a direct column. Either (a) derived via work items
  that carry both sprint_id + release_id (`ph_work_items`), or (b) not modeled at all.
- **UNKNOWN U-002 confirmed.** Cardinality + derivation = USER DECISION. See QUESTIONS_QUEUE Q-001.

## How work items carry sprint/release
- `ph_work_items` (1366): has BOTH `sprint_id` AND `release_id` (real FKs) + `parent_id`, `hierarchy_path`.
  → release→sprint COULD be derived here (sprints whose work items share a release).
- `ph_issues` (2381): sprint as **text** `sprint_name` + `fix_versions` + `sprint_release`; parent via `parent_key`.
  → no sprint_id FK; weaker for joins.

## Active sprint / release detection
- No explicit `is_active` column seen. Likely derived from `status` + dates. → STATUS_MAPPING + DATE_SOURCES (user-gated).
