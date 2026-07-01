# Objective

Fix the Board Manager to be usable from first contact.

## Problems Being Solved
1. Empty state shows useless search/filter bar when no boards exist
2. No default board — teams start cold with zero boards
3. Filter required to create a board — onboarding blocker
4. Location column is redundant — user already knows their context
5. No way to distinguish system boards from user-created boards

## Done When
- 0-board state: clean empty state with single "Create board" CTA, no filter bar
- Fresh product/project: "Primary Board" auto-appears with correct columns
- CreateBoardModal: filter is optional, Location field removed
- Board list table: Location column → "Primary Work Item" column
- Primary Board: shows "Default" lozenge, cannot be deleted

## Non-Scope
- Board view (KanbanPage) internals
- IncidentBoardPage / TestHub board views
- Board settings/edit flow
- Jira sync
