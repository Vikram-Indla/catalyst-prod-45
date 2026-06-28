# 02 — Canonical Discovery — CAT-TASKS-20260627-001 (tasks)

Date: 2026-06-27 · Status: DISCOVERY COMPLETE (5 parallel agents + verification probes)
Live-table verification: code queries `tasks` / `task_statuses` / `task_workstreams` (62/31/18 refs).
`planner_tasks` / `planner_statuses` / `planner_workstreams` are legacy Lovable-era duplicates — VERIFY against live DB (supabase MCP) before any migration.

---

## A. DATA / ERD (live tables)

### tasks (live; legacy mirror `planner_tasks`)
Columns of note: id, task_key/key, title, description, status_id→task_statuses, priority(critical|high|medium|low),
workstream_id→task_workstreams, assignee_id/reporter_id/reviewer_id→profiles, parent_task_id→tasks (self),
due_date, start_date, time_estimate_minutes, time_logged_minutes, progress, blocked/blocked_reason,
is_archived, is_starred, deleted_at (soft delete), created_by, created_at, updated_at, completed_at.
RLS: authenticated CRUD; SELECT where deleted_at IS NULL (no team/workstream scoping — note).

### task_workstreams (live; legacy mirror `planner_workstreams`)
id, name, slug(unique), color, icon, sort_order, key_prefix, description, lead_id→profiles,
start_date, due_date, is_active, is_archived, created_at, updated_at. Lifecycle = is_active + is_archived (no hard delete).

### task_statuses (live; legacy mirror `planner_statuses`)
id, name, slug, color, position, is_done/is_completed_status, is_default, is_system, created_by.

### Supporting: task_dependencies (blocked_by|blocks|related), task_comments, planner_task_watchers,
planner_task_mentions, task_labels + task_label_assignments.

### notifications
recipient_user_id, actor_user_id, notification_type, entity_type, entity_id, entity_title, entity_key,
entity_icon_type, hub_source, status, status_type, tab, metadata, read_at, etc.
DB trigger `catalyst_notify_tasks_trigger` on `public.tasks` AFTER INSERT/UPDATE OF assignee_id,status_id →
inserts assignment + status_change notifications (suppresses self-assign). VERIFY it is live & references `tasks`/`task_statuses`.

### BLOCKER — task <-> work-item linkage DOES NOT EXIST
`tasks` only has `parent_task_id` (self-ref subtasks). No polymorphic link to story/feature/epic/incident/business_request.
`work_item_links` exists but covers epic|feature|story|task in the `work_items` schema only — excludes `tasks`.
Stories use columns `linked_work_item_id` + `linked_work_item_type`. **Rule #1/#2 requires NEW schema.** (needs consent)

---

## B. UI — current state

- Tasks routes: `/tasks/:view` -> PlannerPage (overview/board/list/work/timeline), `/tasks/view/:taskKey` -> TasksDetailPage->CatalystDetailRouter, `/tasks/filters/*`. `/tasks/workstreams` + `/tasks/my-tasks` -> 404 (deprecated 2026-06-17; static segment outranks `:view`).
- **Add Task modal** = `src/modules/tasks/components/CreateTaskModal/CreateTaskModal.tsx` — ~90% hand-rolled (custom modal, dropdowns, calendar, inputs, buttons, success overlay). Submits via `useCreateTaskMutation`. Props: {open,onOpenChange,defaultWorkstream,onSuccess}. Legacy wrapper `PlannerCreateModal`.
- **Workstreams page** = `src/modules/tasks/components/workstreams/WorkstreamsPage.tsx` — has CRUD (create/read/update/delete/archive) but hand-rolled tables/dropdowns; route 404s. Sub-components: CreateWorkstreamModal, WorkstreamDrawer, WorkstreamCard, WorkstreamQuickEditDialog, WorkstreamMembersDialog, ArchivedWorkstreamsView, WorkstreamLeadPickerDropdown.

## C. PARITY TARGETS (canonical, to replicate)

- **CREATE STORY modal**: `src/components/workhub/create-story/CreateStoryModal.tsx` — PortalFix(@atlaskit/modal-dialog), @atlaskit/select (work-type, project, parent AsyncSelect, priority, assignee, reporter, labels CreatableSelect), CatalystStatusPill, RichTextEditor(Tiptap/ADF), MiniAvatar user picker, `flag.*()` toast. Work-type dropdown hands off to Task/Business-Request.
- **CREATE BUSINESS REQUEST modal**: `src/components/business-requests/CreateBusinessRequestModal.tsx` — same pattern.
- **VIEW STORY**: `src/components/catalyst-detail-views/story/CatalystViewStory.tsx` via `CatalystViewBase` (breadcrumb `TicketBreadcrumbs` = Home>Project>Parent>Key), right sidebar `CatalystSidebarDetails` (assignee/priority/reporter/labels/sprint/timestamps), `CatalystStatusPill`, title editor, linked items, subtasks, activity. Tasks already route through `CatalystDetailRouter` — verify task uses same shell.
- **USER PICKER**: MiniAvatar (@atlaskit/avatar size=small) + `resolveAvatarUrl` cascade; option pattern in CreateStoryModal:381-389,533-541. REUSE for tasks (keep avatars consistent).
- **Workstream-page parity**: `AllProductsPage` (`/product-hub/products`) and `AllProjectsPage` (`/project-hub/projects`) — list-management pages with CRUD. (which one = confirm w/ Vikram)

## D. CANONICAL COMPONENT INVENTORY
JiraTable `src/components/shared/JiraTable/JiraTable.tsx` (mandatory for list surfaces) ·
CatalystStatusPill · WorkItemTypeIcon `src/components/icons/WorkItemTypeIcon.tsx` (admin overrides) ·
PriorityIcon · @atlaskit/avatar(MiniAvatar) · **toast = `flag.*()` from `src/components/shared/JiraTable/flags.tsx`** (ADS @atlaskit/flag — NOT catalystToast, NOT hand-rolled) ·
modal = PortalFix `src/components/workhub/create-story/PortalFix.tsx` (Vite portal workaround) · breadcrumb TicketBreadcrumbs.

## E. WIRING GAPS (tasks currently siloed)
1. Notifications: DB trigger exists for tasks but client/events registry (`task_assigned`,`task_created`) — verify firing end-to-end; stories fire via trigger/Jira-sync.
2. Home (`src/hooks/home/useHomeWorkItems.ts`): tasks siloed in "planner/tasks" domain, absent from unified "delivery/all" — assigned tasks don't show beside stories.
3. Data hooks split: task hooks (`useMyTasks`,`useKanbanTasks`,`useTasksAllWorkItems`,`useTasksTableData`) use separate query keys; no shared work-item service.
4. Timeline/Board/All-Work are task-only views, not unified with stories/epics.
5. Realtime `useTaskRealtime` invalidates task keys only.

## F. ADS / HAND-ROLLED DEBT (tasks module)
50+ hand-rolled primitives (dropdowns->@atlaskit/select; modals->PortalFix/@atlaskit/modal-dialog; tables->JiraTable;
inputs->@atlaskit/textfield; buttons->@atlaskit/button; date->@atlaskit/datetime-picker; badges->@atlaskit/lozenge;
avatars->@atlaskit/avatar; checkboxes->@atlaskit/checkbox). 135+ banned colors (Tailwind slate/blue/emerald/amber/red in
`insights/*`; hex in SidebarFields). No JiraTable in task list/workstream tables today.
