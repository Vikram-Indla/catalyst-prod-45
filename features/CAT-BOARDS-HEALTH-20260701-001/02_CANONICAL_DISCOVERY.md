# Canonical Discovery

## Boards page
- **File:** `src/components/boards/BoardManagerPage.tsx`
- **Table component:** `JiraTable<BoardListItem>` — canonical, must keep
- **Columns (current):** `__star`, `name`, `admin`, `primary_work_item_type`, `__menu`
- **Row actions:** `BoardRowActions()` at line 326 — currently HOVER-ONLY (opacity 0→1 CSS)
- **Data hook:** `useBoards(projectId, projectKey)` → `src/hooks/useBoards.ts`
- **Supabase table:** `boards` (public schema)
- **Also:** `src/pages/product-hub/ProductBoardManagerPage.tsx` mounts same component

## ph_issues confirmed columns
| Column | Type | Notes |
|---|---|---|
| `due_date` | DATE | Primary overdue signal |
| `is_flagged` | BOOLEAN | Closest proxy for blocked |
| `status` | TEXT | Status name string |
| `status_category` | TEXT | `'todo'` / `'in_progress'` / `'done'` |
| `assignee_display_name` | TEXT | For unassigned detection |
| `assignee_user_id` | UUID | |
| `sprint_name` | TEXT | Denormalized, no FK |
| `issue_key` | TEXT | e.g. BAU-234 |
| `project_key` | TEXT | |
| `issue_type` | TEXT | Story/Epic/Feature/Task/etc |
| `priority` | TEXT | `critical/high/medium/low` |
| `story_points` | NUMERIC | |
| `parent_key` | TEXT | |
| `jira_updated_at` | TIMESTAMPTZ | Stale signal (updated_at fallback) |
| `jira_created_at` | TIMESTAMPTZ | Age signal |

## Missing fields (capability gaps)
| Missing | Impact | Fallback |
|---|---|---|
| `status_changed_at` | Can't compute true "time in status" | Use `jira_updated_at` — label as "last updated" not "time in status" |
| `is_blocked` | No explicit block signal | Use `is_flagged` as proxy + status text "on_hold"/"blocked" keyword |
| `sprint_id FK` | Can't join sprints table | Use `sprint_name` text, no sprint end date available |
| `release_id FK` | No release risk | Use `fix_versions` JSONB |
| Sprint end date | Can't compute sprint risk | **Sprint risk signal not available in Phase 1** — surface as capability gap |

## Existing components to reuse / deprecate
| Component | Path | Action |
|---|---|---|
| `CatyBoardInsight` | `src/components/for-you/atlaskit/CatyBoardInsight.tsx` | **DEPRECATE** — mark `@deprecated`, keep file, do not delete |
| `health-calculator.ts` | `src/lib/releases/health-calculator.ts` | Pattern reference only — do not import |
| `board_insight_cache` | Supabase table | Can be reused for caching scoring output |
| `AIInsightsBar` | `src/features/all-releases/components/AIInsightsBar.tsx` | Pattern reference |

## Priority values (canonical)
`'critical' | 'high' | 'medium' | 'low'`

## Status categories (canonical)
`'todo' | 'in_progress' | 'done'`

## Workflow statuses (10-stage)
`backlog | design | ready_for_dev | in_development | qa_testing | uat_testing | in_beta | ready_for_prod | in_production | on_hold`

## Board-to-issue join
`useKanbanData.ts` — fetches `ph_issues` filtered by `project_key` + `board_columns.status_ids` mapping

## Routes pattern
`src/lib/routes.ts` — `projectHubRoutes.board(projectKey, boardSlug)` for navigation
