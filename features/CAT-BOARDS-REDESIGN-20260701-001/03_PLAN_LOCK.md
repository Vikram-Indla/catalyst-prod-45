# PLAN LOCK — CAT-BOARDS-REDESIGN-20260701-001

**Status: APPROVED by Vikram 2026-07-01**

## Timebox: 2 hours

## Execution Order

### Phase 1 — DB Migration (15 min)
File: `supabase/migrations/20260701000000_add_default_board_fields.sql`
- ADD COLUMN `is_default BOOLEAN DEFAULT FALSE` to boards
- ADD COLUMN `primary_work_item_type TEXT` to boards
- CREATE UNIQUE INDEX boards_one_default_per_project WHERE is_default=TRUE AND deleted_at IS NULL
- Apply to cyij staging

### Phase 2 — RPC Update (10 min)
File: `supabase/migrations/20260701000001_update_create_board_rpc_default_fields.sql`
- Update `create_board()` RPC to accept `p_is_default BOOLEAN DEFAULT FALSE` and `p_primary_work_item_type TEXT`
- Write both to boards table on insert

### Phase 3 — TypeScript Types (5 min)
File: `src/types/board.ts`
- Add `is_default?: boolean` to Board interface
- Add `primary_work_item_type?: string` to Board interface

### Phase 4 — Empty State (30 min)
New file: `src/components/boards/BoardsEmptyState.tsx`
- Board icon + "No boards yet" heading + subtext + "+ Create board" button
- ADS tokens only, no bare colors

File: `src/components/boards/BoardManagerPage.tsx`
- Wrap JiraTable + toolbar in conditional: `if boards.length === 0 && !isLoading → <BoardsEmptyState />`
- boards.length > 0 OR isLoading → existing full UI

### Phase 5 — CreateBoardModal: Filter Optional (20 min)
File: `src/components/boards/CreateBoardModal.tsx`
- Remove `required` from filter selector
- Remove right-side info panel
- Remove Location read-only field
- When filter not selected: pass `filter_id: null` to createBoard

### Phase 6 — Primary Board Auto-Provision (30 min)
New file: `src/hooks/useEnsurePrimaryBoard.ts`
- After boards load: if no board has `is_default=true`, call createPrimaryBoard
- Primary board config per mode:
  - product: name="Primary Board", primary_work_item_type="Business Request", columns=DEFAULT_COLUMNS
  - project: name="Primary Board", primary_work_item_type="Story", columns=DEFAULT_COLUMNS
  - test: name="Primary Board", primary_work_item_type="QA Bug", columns=TEST_BOARD_COLUMNS
  - incident: name="Primary Board", primary_work_item_type="Production Incident", columns=DEFAULT_COLUMNS simplified

Files to wire:
- `src/pages/product-hub/ProductBoardManagerPage.tsx`
- `src/pages/project-hub/ProjectBoardManagerPage.tsx`

### Phase 7 — Table Column Swap (20 min)
File: `src/components/boards/BoardManagerPage.tsx`
- Remove `location` JiraTable column
- Add `primary_work_item_type` column (JiraIssueTypeIcon + label, width ~160px, dash if null)
- Add "Default" Lozenge (appearance="new") next to name when `is_default=true`
- Hide "Delete" kebab option when `board.is_default=true`

## Files Forbidden from Modification
- `src/features/kanban-board/KanbanPage.tsx`
- `src/features/kanban-board/data/useKanbanData.ts`
- `src/features/kanban-board/data/useKanbanMutations.ts`
- `src/pages/incidenthub/IncidentBoardPage.tsx`
- `src/pages/testhub/BoardPage.tsx`

## Guardrails
- ADS tokens only — run `npm run lint:colors:gate` before commit
- JiraTable for board list — no custom tables
- No hand-rolled UI components
- No bare hex/rgb/Tailwind color utilities
- `is_default` boards: no delete, show "Default" lozenge

## Commit Gate
- Feature Work ID: CAT-BOARDS-REDESIGN-20260701-001
- Session log written
- Plan Lock (this file) approved
- Color audit passing
- Screenshot acceptance for empty state + board list
