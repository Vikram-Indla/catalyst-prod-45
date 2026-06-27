# Session 004 — Slice 9A + 9B: canonical Task modal + TSK- keys (2026-06-27)

## Scope
9A: uniform TSK- key prefix + fix task-detail "Issue not found" (key drift).
9B: extend canonical CreateStoryModal to natively handle workType='Task'.

## Decisions (JK)
- One modal (extend canonical, not a mirror).
- Requiredness mirrors Story (Workstream/Summary/Reporter required; rest optional).
- Initial status = Backlog; add description_adf + labels columns; rename PLN/TIG → TSK.

## Done
9A:
- Migration 20260627180000 applied to staging: generate_task_key→TSK-, rename PLN-1/TIG-1→TSK-1/2, add tasks.description_adf (jsonb) + tasks.labels (text[]).
- useCreateTaskMutation, useTaskBoards, useKanbanTasks, useTaskItems: insert no key → DB trigger assigns TSK- (single source of truth; also fixes latent task_key-column insert bug). PlannerTimeline/useTaskItems display fallbacks → TSK-.
9B:
- CreateStoryModal: workType='Task' → Workstream (replaces Project), task statuses (default Backlog), Parent=any work item except sub-task, Reporter required, Labels, rich-text Description; Sprint hidden; submit writes tasks + navigates /tasks/view/<key>. Non-Task paths untouched.
- useCreateTaskMutation: +description_adf/reporter/labels/parent; inserts task_work_item_links (type resolved server-side).
- CreateDropdown: /tasks/* opens canonical modal defaulted to Task (other types still selectable); bespoke handoff removed.

## Validation (raw)
- tsc -p tsconfig.app.json: 181 total errors WITH and WITHOUT my edits → 0 new; none in touched files.
- Staging DB sims: insert no-key→TSK-3; detail lookup by key hits; full payload (priority lowercase, labels, adf, reporter, Backlog) OK; parent link to Story OK; sub-task link REJECTED by CHECK; delete cascades link (0 orphans). All test rows cleaned up.

## Deferred
- Live UI signoff (modal render, assignee no-clip, work-type default, post-create nav, Story no-regression) — JK chose commit-first, manual UI check after.
- 9C: retire bespoke CreateTaskModal across the other 9 call sites.

## Lesson
- In a worktree with pre-existing stashes, `git stash push -- <files>` + `pop` to compare tsc spuriously conflicted an unrelated file (wh-jira-sync). Avoid the stash dance for baseline comparison; recount differently.
