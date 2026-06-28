# PLAN LOCK — Slice 9: Canonical Create-Task modal + TSK- keys + detail full-view

Feature: CAT-TASKS-20260627-001 · Date: 2026-06-27 · Status: **AWAITING APPROVAL (no code yet)**

## Objective
Make Task creation use the canonical create-issue modal (the Create Story modal), defaulted to Task inside the task module, with Workstream replacing Project; fix the uniform `TSK-` key prefix everywhere; and fix the task-number → full detail view (currently "Issue not found").

## Decisions locked (by JK this session)
- **One modal:** extend `CreateStoryModal` to natively handle `workType='Task'` (swap Project→Workstream, write to `tasks` table). Other work types unchanged. (Risk: shared Story create flow — guard carefully.)
- **Requiredness mirrors Story:** required = Work type, Workstream (replaces Project), Summary, Reporter. Optional = Parent, Priority (default Medium), Description, Assignee, Labels, Status (default initial).

## Field mapping (Task work type → tasks table)
| Modal field | tasks column | Required | Notes |
|---|---|---|---|
| Work type | (drives branch) | ✓ | defaults to 'Task' in task module; still lists other types |
| Workstream (replaces Project) | workstream_id | ✓ (form) | from task_workstreams (useTaskWorkstreams); DB col nullable, enforce in form |
| Status | status_id | ✗ | default = initial task status (see OPEN-1); changeable; CatalystStatusPill w/ task_statuses |
| Summary | title | ✓ | |
| Parent | task_work_item_links | ✗ | links to any ph_issues work item EXCEPT sub-task; insert junction row on create |
| Priority | priority | ✗ | default 'medium' (lowercase mapping) |
| Description | description (+ description_adf?) | ✗ | RichTextEditor; see OPEN-2 |
| Assignee | assignee_id | ✗ | |
| Reporter | reporter_id | ✓ (form) | default to current user (like Story) |
| Labels | labels (NEW col) | ✗ | needs labels text[] column (OPEN-3) |
| ~~Start/Due date~~ | start_date/due_date | — | DROPPED from create (nullable; set in detail) |

## Sub-slices (each ≤ 2h, independently verifiable)
### 9A — Key unification + detail full-view fix (lowest risk, do first)
- New migration `20260627180000_tasks_key_prefix_tsk.sql` (staging-applied via Mgmt API): `CREATE OR REPLACE generate_task_key()` → `TSK-` regex+prefix; data-update existing `PLN-1`/`TIG-1` → `TSK-1`/`TSK-2` (OPEN-4).
- Client: drop per-workstream `computeWorkstreamKey` prefix; insert key=null → DB trigger assigns TSK-N; navigate using returned `data.key`. Update temp-key generators (useCreateTask.ts:45/109, useKanbanTasks.ts:116, useTaskBoards.ts:176/178, useTaskItems.ts:49/323, PlannerTimeline.tsx:143) PLN-→TSK-.
- Detail fix: root cause = client/DB key drift; once keys are single-source (TSK- from DB, navigate by returned key), `/tasks/view/<key>` resolves. Verify TasksDetailPage `.eq('key',taskKey)` hits.
- Verify: create task → returns TSK-N → click number → full TaskCatalystView opens (DOM probe on :8080) + DB row key matches URL.

### 9B — Extend canonical modal for Task
- `CreateStoryModal.tsx`: when `workType==='Task'` → render Workstream select (replace Project block), task statuses in Status pill, Reporter required, Parent queries ph_issues `issue_type != 'sub-task'`, Labels, Description rich text. Hide Sprint/Project-only bits.
- `handleSubmit`: branch on workType==='Task' → call task create (useCreateTaskMutation, extended for new fields + parent link) instead of useCreateStoryMutation; on success navigate `/tasks/view/<returned key>`.
- `CreateDropdown.tsx`: in `/tasks/*` open the canonical modal with `defaultWorkType='Task'` (remove handoff to bespoke CreateTaskModal). Non-task types selected in-modal create normally (ph_issues).
- Verify: modal in task module shows Task default + Workstream + all fields; assignee dropdown not clipped (canonical fields portal correctly); create writes tasks row; DOM + DB probes.

### 9C — Retire bespoke modal + cascade
- Repoint 9 call sites (PlannerTimeline/Calendar/BoardsPage/KanbanPage/Dashboard/PlannerCreateModal/index) to the canonical modal; delete `CreateTaskModal/` once unused; keep useCreateTaskMutation (the mutation) as the task write path.
- Verify: every entry point opens the canonical modal; no dead imports; tsc -p tsconfig.app.json no new errors.

## Sub-decisions — RESOLVED (JK, 2026-06-27)
- **OPEN-1 (status): RESOLVED → default to existing "Backlog"** task status (changeable in pill). No new status, no data change.
- **OPEN-2 (description): RESOLVED → add `description_adf jsonb`** to tasks + store plain-text projection in `description`. True rich-text parity.
- **OPEN-3 (labels): RESOLVED → add `labels text[] default '{}'`** column to tasks.
- **OPEN-4 (key rename): RESOLVED → rename `PLN-1`/`TIG-1` → `TSK-1`/`TSK-2`** in the 9A data migration.

## Consolidated 9A migration (staging via Mgmt API; new file `20260627180000_tasks_canonical_modal_support.sql`)
1. `CREATE OR REPLACE generate_task_key()` → `TSK-` regex + prefix.
2. `UPDATE tasks SET key='TSK-1' WHERE key='PLN-1'; UPDATE tasks SET key='TSK-2' WHERE key='TIG-1';` (idempotent guards).
3. `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_adf jsonb;`
4. `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';`
All idempotent + reversible; staging only.

## Guardrails
- ADS tokens only; canonical components only (reusing CreateStoryModal/PortalFix/RichTextEditor/CatalystStatusPill — all canonical). No hand-rolled UI. No bare colors.
- Zero-assumption rendering (no fake defaults; unknown → empty).
- Regression guard: Story/Epic/etc create path must be byte-for-byte unchanged when workType!='Task' — verify Create Story still works after 9B.
- Migrations: staging `cyijbdeuehohvhnsywig` only via Mgmt API; never prod; never db push.
- No commit until DOM+DB verification per sub-slice and explicit approval.

## Stop conditions
Prod risk, Story-create regression, schema decision unresolved (OPEN-1..4), 2h slice overrun, destructive data action.
