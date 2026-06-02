---
branch: Projects-boards-manager-01
type: planning-handover
created: 2026-06-01
status: PLAN COMPLETE — ready for execution
model: claude-opus-4-8
---

# Project Board Manager — Planning Handover

**Surface:** Project Board Manager (clicked from "Project Board" in left panel). **Project-exclusive** — Catalyst products get their own separate boards. Mirrors Jira's board manager at `/jira/boards`.

## Live Jira probe results (token verified working 2026-06-01)

Token authenticated (`/myself` → 200) with full Agile API access. Base `https://digital-transformation.atlassian.net`, email `vikramataol@gmail.com`. **Token now exposed in chat — rotate it; canonical copy lives in Supabase secret `JIRA_API_TOKEN`.**

### Board list model — `GET /rest/agile/1.0/board` (17 boards total)
Each value yields the 3 required columns:
- **Board Name** = `name`
- **Location** = `location.projectName` + `location.projectKey`
- **Lead/Admin** = filter `owner` (resolved via the board's saved filter)
- Type guard field: `location.projectTypeKey` (`"software"`). **Move constraint enforcement: only move between `projectTypeKey === "software"`; NEVER to a product.**
- Also: `type: "kanban"|"scrum"`, `isPrivate`.

### Board 29 ("Backlog Readiness") config — `/rest/agile/1.0/board/29/configuration`
```json
{
  "id": 29, "name": "Backlog Readiness", "type": "kanban",
  "location": { "type": "project", "key": "SS", "id": "10051", "name": "Sectorial Services" },
  "filter": { "id": "10070" },
  "subQuery": { "query": "fixVersion in unreleasedVersions() OR fixVersion is EMPTY" },
  "columnConfig": {
    "columns": [
      { "name": "Backlog", "statuses": [] },
      { "name": "in Requirements", "statuses": [{ "id": "10038" }] },
      { "name": "requirement validation", "statuses": [{ "id": "10157" }] },
      { "name": "in design", "statuses": [{ "id": "10115" }] },
      { "name": "Technical Validation", "statuses": [{ "id": "10039" }] },
      { "name": "In Refinement", "statuses": [{ "id": "10121" }] },
      { "name": "Ready for DEV", "statuses": [{ "id": "10114" }] },
      { "name": "In Development", "statuses": [{ "id": "10091" }] }
    ],
    "constraintType": "issueCount"
  },
  "ranking": { "rankCustomFieldId": 10019 }
}
```
Maps directly to Catalyst: `columnConfig.columns[]{name,statuses[]}` → `board_columns.status_ids uuid[]`; `constraintType:"issueCount"` → WIP-by-count (P2, deferred); `ranking.rankCustomFieldId` → `board_issue_rank`.

### Filter 10070 — `/rest/api/3/filter/10070`
Shape: `{id, name, owner{accountId,displayName,avatarUrls}, jql, favourite, sharePermissions[]}`.
- `owner` = board Lead/Admin source.
- `sharePermissions[].type:"project"` → maps to `ph_saved_filters.is_shared` / project scoping.
- **Confirms the non-JQL divergence:** Jira `board.filter` (1:1) ↔ Catalyst `boards.filter_id → ph_saved_filters.id`. We replace the JQL box with a picker of existing project saved filters.

### Jira REST limitation
Agile config endpoint does **NOT** expose **swimlanes** or **card colors** (UI-only in Jira, no REST). Phase F builds those from ADS + product decisions, not a probe. This is an API gap, not a token gap.

## DB ground truth (Supabase ref lmqwtldpfacrrlvdnmld)
- `boards.project_id → projects.id` (NOT ph_projects). `boards.filter_id → ph_saved_filters.id`.
- Tables: boards(3 rows), board_columns(9), board_members(3), board_issue_rank(0), board_quick_filters(9), board_status_mappings(0).
- RPC `create_board` EXISTS (10-arg: p_name, p_project_id, p_is_personal, p_visibility, p_swimlane_type, p_color, p_columns jsonb, p_user_id, p_board_type, p_board_query).
- **MISSING RPCs to build: `update_board` (plain UPDATE suffices), `delete_board` (soft-delete exists in hook), `move_board` (NEW — needs type guard), `copy_board` (NEW — deep-copy config, skip issues).**
- RLS: boards SELECT via `can_view_board(id, auth.uid())`; UPDATE `created_by=auth.uid() OR admin member`; no DELETE policy (soft delete via `deleted_at`). `ph_saved_filters` SELECT `user_id OR is_shared OR owner_id = auth.uid()`.

## Catalyst reuse map (DO NOT re-research)
- **Listing table:** `src/components/shared/JiraTable/` (cells.tsx factories) — swap current card grid in `BoardManagerPage.tsx` for JiraTable.
- **Hooks:** `src/hooks/useBoards.ts` (`useBoards(projectId)`), `src/hooks/useBoardMutations.ts` (`useCreateBoard`/`useUpdateBoard`/`useDeleteBoard`/`useToggleBoardStar` + column/quick-filter/rank mutations).
- **Avatars:** `CatalystAvatar.tsx` (@atlaskit/avatar + avatar-group), `EditableAssignee/EditableAssignee.tsx` (single-select Lead), multi-select Admins pattern from `business-requests/BRAssigneePicker.tsx`.
- **Filter picker:** `src/hooks/workhub/useSavedFilters.ts` (`useFiltersForProject`) → `ph_saved_filters`; templates `src/lib/filters/filterTemplates.ts`.
- **Map statuses (reuse as-is):** `src/pages/project-hub/MapStatusesPage.tsx` + `src/hooks/useMapStatuses.ts` → denormalizes into `board_columns.status_ids[]`.
- **Star/4U:** `board_members.is_starred` (per-user) vs `user_starred_items` (Home/4U via `src/hooks/home/useStarredItems.ts`). **BRIDGE NEEDED:** `useToggleBoardStar` must ALSO upsert/delete `user_starred_items`.
- **LEGACY — do NOT reuse:** `src/services/boardService.ts` (operates on FeatureWithDetails/WORKFLOW_STATUSES).

## Known defects to fix
1. `BoardManagerPage.tsx:81` — `<p>Debug: projectId = {projectId}</p>` ships to production. REMOVE.
2. `ProjectBoardManagerPage.tsx` imported but NOT mounted in any route. MOUNT it.
3. Two competing route trees + two star mechanisms — see code-archaeology notes above.

## Functionality matrix (priority × complexity — high/high first)
| # | Feature | Pri | Cplx | Reuse/New |
|--|--|--|--|--|
| 1 | Listing table (Name·Lead·Location) | P0 | High | Reuse JiraTable+useBoards |
| 2 | Map statuses → columns | P0 | High | Reuse MapStatusesPage |
| 3 | Non-JQL filter picker → boards.filter_id | P0 | High | Reuse useFiltersForProject; New wiring |
| 4 | Kebab Delete (soft) | P0 | Med | Reuse useDeleteBoard |
| 5 | Kebab Edit settings (name·admins·location inline) | P0 | Med | Reuse useUpdateBoard+EditableAssignee |
| 6 | Star↔4U bridge | P0 | Med | Reuse useToggleBoardStar; New user_starred_items upsert |
| 7 | Kebab Move (project→project same-type only) | P1 | High | New move_board RPC + projectTypeKey guard |
| 8 | Kebab Copy | P1 | High | New copy_board RPC (config only, no issues) |
| 9 | Swimlanes settings | P1 | Med | Partial (boards.swimlane_type) |
| 10 | Quick filters settings | P1 | Med | Reuse board_quick_filters |
| 11 | Card colors settings | P1 | Med | New |
| 12 | Card layout settings | P1 | Low | New |
| 13 | Route mount fix | P0 | Low | Fix |
| 14 | Remove debug banner | P0 | Low | Fix |
| 15 | WIP min/max | P2 | Low | Defer |
| 16 | Working Days / Timeline | P2 | — | Defer |

## ADS component inventory
JiraTable (canonical, not @atlaskit/dynamic-table directly); @atlaskit/dropdown-menu (DropdownMenu/DropdownItem/DropdownItemGroup, danger group for Delete) + IconButton + ShowMoreHorizontalIcon; @atlaskit/modal-dialog, @atlaskit/textfield, @atlaskit/select, @atlaskit/form; CatalystAvatar (@atlaskit/avatar + avatar-group), EditableAssignee, BRAssigneePicker pattern; @atlaskit/select fed by useFiltersForProject; MapStatusesPage + @atlaskit/pragmatic-drag-and-drop; StarStarred/StarUnstarred icons + IconButton; @atlaskit/tabs or side-nav for settings; @atlaskit/toggle (card layout). All `var(--ds-*)` tokens; spacing 4/8/16/24/32; fontWeight 653 allowed for Jira parity.

## Phased execution (each = separate branch-isolated conversation, CRUD-tested)
- **Phase A** `Projects-boards-listing-01` — JiraTable swap, route mount, debug-banner removal, kebab Delete + Edit settings inline.
- **Phase B** `Projects-boards-filter-01` — non-JQL filter picker → boards.filter_id.
- **Phase C** `Projects-boards-mapstatuses-01` — mount MapStatusesPage in settings.
- **Phase D** `Projects-boards-star-01` — star→user_starred_items bridge.
- **Phase E** `Projects-boards-movecopy-01` — move_board + copy_board RPCs.
- **Phase F** `Projects-boards-settings-01` — swimlanes/quick filters/card colors/card layout.

## SOP (reuse for Create Board / View Board cycles)
1. Probe-first; screenshots BANNED for functionality (CLAUDE.md 2026-06-01).
2. Clone-Parity Pre-Flight — mount canonical via adapter, never fork.
3. Confirm FK targets + existing RPCs before UI.
4. ADS inventory up front.
5. Constraint guards server-side (Move type check in RPC).
6. CRUD acceptance gate on real Catalyst + Jira.
7. Branch isolation + planning/execution split.
