# Session 001 — Discovery + Plan Lock draft

**Date:** 2026-07-03
**Actor:** Claude Code (Opus 4.7)
**Branch:** `detail-view`

## What happened

1. Located flag/unflag surface across kanban stack. Read WorkItemCard render (`WorkItemCard.tsx:412`), overflow menu entries (`WorkItemOverflowMenu.tsx:143`, `SortableCard.tsx:201`, `PragmaticBoard.tsx:306`), toggle wiring (`KanbanBoardShell.tsx:258`), and adapter mapping table.
2. Confirmed flag icon color rendering: uses `var(--ds-background-danger-bold)` which shows orange in current theme (screenshot 144503) — Jira parity, no change needed.
3. Located reason-capture UI: `FlagPopover` (inline detail popover) + `AddFlagModal` (bigger board modal) inside `src/components/workhub/issue-view/IssueActionDialogs.tsx`. Both accept an optional note; both currently write to `activity_logs` (NOT `ph_activity_log` that `useWorkItemActivity` reads); neither writes to `ph_comments`.
4. Located activity feed: `src/components/project-hub/work-items/detail/ActivityFeed.tsx` powered by `useWorkItemActivity` (`src/hooks/useWorkItemActivity.ts`). Feed reads `ph_comments` + `ph_activity_log` + `ph_comment_reactions`. `ph_comments.body` is plain text today.
5. Located direct one-click toggle callers that bypass reason capture (kanban card menu, table context menu, TaskGrid, useKanbanMutations.toggleFlag).

## Decisions taken

- Route direct one-click toggles through `AddFlagModal` (option A) so every flag/unflag captures an optional reason and lands the comment + history entry.
- Scope this iteration to `ph_issues` only. Other 4 mode tables get the modal but no comment / history recording (they have no activity feed yet — separate work).
- Add `ph_comments.comment_type` enum column (`normal` / `flag_added` / `flag_removed`) with default `normal`. Body stays optional (may be empty string).
- History entries land as `ph_activity_log` rows with `field_name = 'Flagged'`, `old_value` / `new_value` = `'None'` / `'Impediment'`.

## Awaiting

Vikram approval on `03_PLAN_LOCK.md` before writing code.
