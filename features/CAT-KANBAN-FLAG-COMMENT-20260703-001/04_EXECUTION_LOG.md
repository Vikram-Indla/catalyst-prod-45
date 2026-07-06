# 04 — Execution Log

## Step 1 — Migration
- File: `supabase/migrations/20260703340000_ph_comments_comment_type.sql`
- Adds `comment_type text NOT NULL DEFAULT 'normal'` on `public.ph_comments`.
- Adds CHECK constraint `comment_type in ('normal', 'flag_added', 'flag_removed')`.
- Idempotent (guarded by `IF NOT EXISTS` + `pg_constraint` existence check).
- **Not yet applied to remote.** User to apply via `supabase db push` or MCP `apply_migration`.

## Step 2 — Reason capture write path
- `src/components/workhub/issue-view/IssueActionDialogs.tsx`:
  - New module-private helper `writeFlagActivity({ workItemId, newFlagged, note })` inserts one `ph_comments` row + one `ph_activity_log` row in parallel. Body is raw note, may be empty. Failures are logged and swallowed so the primary `ph_issues` update stays user-visible.
  - `FlagPopover` mutation: replaced legacy `activity_logs` insert (unread by `useWorkItemActivity`) with a call to `writeFlagActivity`.
  - `AddFlagModal` mutation (`ph_issues` branch only): same replacement. Non-`ph_issues` branches remain unchanged.
- Dead helpers left in place (`normalizeNote`, `extractPlainText`, `DEFAULT_ADD_FLAG_NOTE`, `DEFAULT_REMOVE_FLAG_NOTE`) — noUnusedLocals is disabled in `tsconfig`, so they compile clean. Cleanup deferred as separate housekeeping.

## Step 3 — Hook + type extension
- `src/hooks/useWorkItemActivity.ts`:
  - `ActivityEntry.comment_type?: 'normal' | 'flag_added' | 'flag_removed'` added.
  - `ph_comments` SELECT now includes `comment_type`.
  - Comment mapper forwards the field (defaults to `'normal'` when the migration has not yet been applied — safe for rollout order).

## Step 4 — Renderer branch
- `src/components/project-hub/work-items/detail/ActivityFeed.tsx`:
  - New local `FlagCommentBody` component renders the flag icon (orange `--ds-background-danger-bold` for added / subtle `--ds-icon-subtle` for removed) plus the "Flag added" / "Flag removed" header. Optional body line only renders when `body.trim() !== ''`.
  - `CommentEntry` body cell branches on `entry.comment_type`.
  - Imported `FlagFilledIcon` from `@atlaskit/icon/core/flag-filled` (same source as the kanban card render).

## Step 5 — Direct one-click toggles
- `src/features/kanban-board/KanbanPage.tsx` — the ph_issues-native kanban surface — already routes every Flag / Unflag click through `AddFlagModal` (`onFlag(issue) → setFlagTarget(issue)` at line 175-177). No changes needed.
- `src/modules/project-work-hub/components/drawers/StoryActionMenu.tsx` — has an "Add flag" DropdownItem that writes `is_flagged = true` directly with no reason capture (line 27-40). Left untouched this iteration; noted as follow-up. This entry never removes a flag today either, so it is out-of-parity with Jira on more than just the audit trail.
- `src/components/kanban/*` canonical menu items — used only by non-`ph_issues` adapter boards (ideas, incident, portfolio, release, planner, cycle, team). Out of scope this iteration.

## Validation
- `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` — no new errors in `IssueActionDialogs`, `useWorkItemActivity`, `ActivityFeed`. Pre-existing errors in unrelated files (`CapacityHeatmap`, `icon-registry`) untouched.
- `npm run lint:colors:gate` — pass (0 = baseline 0).
- `npm run audit:ads:gate` — pass after tokens baseline ratcheted from 25969 → 25970 (single new `var()` usage in `FlagCommentBody`; ratchet policy explicitly permits token movement in either direction).

## Still to do (post-migration)
- Vikram applies migration `20260703340000_ph_comments_comment_type.sql` to staging / prod.
- Manual QA per screenshot checklist in `03_PLAN_LOCK.md`.
- Follow-up: extend `StoryActionMenu` to route through `AddFlagModal`.
- Follow-up: add comment / history recording for `ph_work_items` (native Project Hub items) — currently only Jira-sourced ph_issues surface routes through the modal.
