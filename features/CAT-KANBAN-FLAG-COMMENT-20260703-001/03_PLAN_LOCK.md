# 03 — Plan Lock

**Status:** DRAFT — awaiting Vikram approval before any code is written.
**Timebox:** 2 hours.

## Objective

Record every flag/unflag toggle as (a) a specially-typed `ph_comments` row and (b) a `ph_activity_log` row so the existing `ActivityFeed` on the work-item detail view shows the entries in the **All**, **Comments**, and **History** tabs — Jira parity, `ph_issues`-only this iteration.

## Non-scope

- No changes to the flag icon on the kanban card.
- No changes to `FlagPopover` / `AddFlagModal` layout or copy.
- No new Activity tab.
- No comment-recording for `business_requests` / `tasks` / `rh_releases` / `tm_test_cases`.
- No changes to the Jira sync path.

## Canonical components selected

- `FlagFilledIcon` from `@atlaskit/icon/core/flag-filled` — for the header row in the flag comment (orange = added, gray = removed).
- Existing `AddFlagModal` (`src/components/workhub/issue-view/IssueActionDialogs.tsx:274`) — the single reason-capture surface. All direct one-click toggles route here.
- Existing `RichTextEditor` (already used inside `AddFlagModal` and comment edit) — no changes.
- Existing `useWorkItemActivity` hook — extended to select `comment_type` and to expose it on `ActivityEntry`.

## Files to modify

1. **DB migration (new file):** `supabase/migrations/<YYYYMMDDhhmmss>_ph_comments_comment_type.sql`
   - `alter table public.ph_comments add column if not exists comment_type text not null default 'normal';`
   - CHECK constraint: `comment_type in ('normal', 'flag_added', 'flag_removed')`.
2. `src/components/workhub/issue-view/IssueActionDialogs.tsx`
   - `FlagPopover` mutation: replace the `activity_logs` insert with a paired write:
     - `ph_comments` insert `(work_item_id, author_id, body, comment_type)` where `body = note.trim()` (may be empty) and `comment_type = 'flag_added' | 'flag_removed'`.
     - `ph_activity_log` insert `(work_item_id, user_id, action='field_updated', field_name='Flagged', old_value, new_value)` where the values are `'None'` and `'Impediment'`.
   - `AddFlagModal` mutation: same paired write inside the `if (tableName === 'ph_issues')` branch. Other tables continue to write `activity_logs` only (unchanged).
3. `src/hooks/useWorkItemActivity.ts`
   - `select` on `ph_comments` includes `comment_type`.
   - `ActivityEntry` gains `comment_type?: 'normal' | 'flag_added' | 'flag_removed'`.
   - Comment mapper forwards `comment_type`.
4. `src/components/project-hub/work-items/detail/ActivityFeed.tsx`
   - Add render branch on `comment_type`. When `flag_added` / `flag_removed`, render:
     - Row 1: `<FlagFilledIcon size="small" primaryColor="var(--ds-background-danger-bold)" />` (added) or `primaryColor="var(--ds-icon-subtle)"` (removed) + text "Flag added" / "Flag removed" (font: `var(--ds-font-body)`, color: `var(--ds-text)`).
     - Row 2 (only if `body.trim() !== ''`): `body` in `color: var(--ds-text-subtle)`.
   - Edit mode: when editing a flag comment, the `RichTextEditor` receives an ADF doc whose first block is the same header row, followed by the optional body. `comment_type` is preserved on save.
5. Direct one-click toggles — routed through `AddFlagModal`:
   - `src/components/kanban/SortableCard.tsx:201` (`Flag` / `Unflag` menu entry)
   - `src/components/kanban/PragmaticBoard.tsx:306`
   - `src/components/kanban/overflow-menu/WorkItemOverflowMenu.tsx:143`
   - `src/components/project-hub/work-items/WorkItemsTable.tsx:400` (context menu handler)
   - `src/components/project-hub/work-items/TableContextMenu.tsx` (already forwards)
   - The `onToggleFlag(id)` handler in the caller opens `AddFlagModal` instead of calling `useKanbanMutations.toggleFlag` directly. `useKanbanMutations.toggleFlag` remains as the low-level write path used by the modal.

## Files forbidden

- `src/components/kanban/WorkItemCard.tsx` — flag icon render (line 412). Do NOT touch.
- `src/components/kanban/kanban-types.ts` — `isFlagged` shape. Do NOT touch.
- Any adapter file (`adapters/*.tsx`). Do NOT touch.
- `AddFlagModal` layout / copy / RichTextEditor wiring. Only the mutation body inside the `ph_issues` branch.

## UI/UX rules

- ADS tokens only. Zero hex. Zero Tailwind color utilities. Zero `rgb()` / `rgba()` / `hsl()`.
- Flag icon color:
  - Added: `var(--ds-background-danger-bold)` (matches existing card render at `WorkItemCard.tsx:412`).
  - Removed: `var(--ds-icon-subtle)` (gray, per screenshot 144757).
- Text color: `var(--ds-text)` for header row, `var(--ds-text-subtle)` for optional body.
- Body optional: when empty, do not render the second line.

## Data/backend rules

- `ph_comments.comment_type` is `text` with CHECK constraint. Default `'normal'` so existing rows are unaffected.
- `ph_activity_log` writes go to the existing table used by `useWorkItemActivity` — NOT `activity_logs`.
- `ph_issues.is_flagged` + `flag_reason` continue to be the source of truth. The comment row's `body` is a snapshot of the reason at toggle time; editing the comment does not mutate `flag_reason`.
- RLS: `ph_comments` already permits authors to insert / update. No policy change required.

## Integration / wiring rules

- Direct kanban / table one-click toggles must open `AddFlagModal` and defer the write to the modal's mutation. They no longer call `useKanbanMutations.toggleFlag` directly.
- `useKanbanMutations.toggleFlag` remains untouched (used by drag or programmatic paths; not user-facing menu clicks).
- The `AddFlagModal` mutation is the only path that writes `ph_comments` + `ph_activity_log` for flag events.

## Parallel execution plan

Sequential (small blast radius):
1. Migration file + apply (supabase-dev via MCP; verify with `list_tables`).
2. `IssueActionDialogs.tsx` — mutation paired-write for both `FlagPopover` and `AddFlagModal`.
3. `useWorkItemActivity.ts` — select + type + mapper.
4. `ActivityFeed.tsx` — render branch + edit-mode branch.
5. Route 4 direct one-click toggles to `AddFlagModal`.

## Screenshot checklist

- [ ] Flag an item from kanban card menu → `AddFlagModal` opens (matches current behavior).
- [ ] Confirm with empty note → comment in Comments tab shows orange flag + "Flag added" only, no body line.
- [ ] Confirm with note text → comment shows orange flag + "Flag added" + body line below.
- [ ] Unflag with empty note → comment shows gray flag + "Flag removed" only.
- [ ] Unflag with note → comment shows gray flag + "Flag removed" + body line.
- [ ] History tab shows two entries: `None → Impediment` and `Impediment → None`.
- [ ] All tab shows both comment and history entries interleaved chronologically with the correct COMMENTS / HISTORY pills.
- [ ] Edit-pen on the flag comment opens `RichTextEditor` with the same header + body content; Save preserves `comment_type`.

## Validation commands

- `npm run lint:colors:gate` — must pass (no new hardcoded colors).
- `npm run audit:ads:gate` — must pass.
- `npm run typecheck` — must pass.
- Manual: run the checklist above on `localhost:8080`.

## Stop conditions

- Migration is rejected or fails to apply → STOP, do not code the frontend.
- ADS scanner reports a new violation → STOP, use a token.
- Any adapter file appears in the diff → STOP, revert.
- Any changes leak to `business_requests` / `tasks` / `rh_releases` / `tm_test_cases` comment / activity paths this iteration → STOP.
- Screenshot checklist fails on any row after one correction loop → STOP and raise.

## Drift / rebaseline

- If mid-implementation we discover a comment renderer canonical (`WorkItemComment`, etc.) higher in the tree, prefer editing the canonical over adding a branch in `ActivityFeed.tsx`. Log to `08_DRIFT_LOG.md` and continue.
