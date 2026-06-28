# CAT-TASKS-20260627-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### D-001 (2026-06-27) Workstream page parity target
Replicate **AllProjectsPage** (`/project-hub/projects`), not AllProductsPage. Workstreams behave like projects (lead, dates, status, child work items).

### D-002 (2026-06-27) Task<->work-item link schema
Use a **new many-to-many junction table** (`task_work_item_links`: task_id, work_item_id, work_item_type, link_type), NOT story-style single columns and NOT widening `work_item_links`. Requires migration approval at Slice 3. Rule: link to any Catalyst work-item type EXCEPT sub-task.

### D-003 (2026-06-27) Workstream rebuild strategy
Build the new page at a **test route then cut over** (e.g. `/tasks/workstreams-v2`), screenshot signoff, then re-point `/tasks/workstreams`. No in-place rewrite until accepted.

### D-004 (2026-06-27) First execution slice
**Create Task modal parity** is Slice 1.

### D-005 (2026-06-27) Live tables
Canonical live tables = `tasks` / `task_statuses` / `task_workstreams`. `planner_*` are legacy Lovable duplicates — verify vs live DB before any migration.

### D-006 (2026-06-27) Toast + user picker
Toast = ADS `flag.*()` (from JiraTable/flags.tsx). User picker = MiniAvatar pattern (@atlaskit/avatar + resolveAvatarUrl), replicated in tasks (do NOT refactor CreateStoryModal to share, to avoid Story regression).

### D-007 (2026-06-27) Default-to-Task
`+ Create` inside `/tasks/*` defaults work-item type to **Task** via `CreateDropdown.tsx` `defaultWorkType`, routing through the existing `onOpenTask` handoff. Story/BR defaults unchanged elsewhere.

### D-008 (2026-06-27) tasks.key format = PLN-N
Slice 3 key generator emits **PLN-N** (matches existing useCreateTaskMutation comment). No TASK-N / workstream-prefix keys this slice.

### D-009 (2026-06-27) RLS = verify, don't change blindly
Verified live: anon (public key, no user token) can READ and DELETE `tasks` → RLS off/permissive (finding RLS-001). Authenticated app usage works. Slice 3 migration leaves RLS UNCHANGED; the hardening SQL is included COMMENTED-OUT/opt-in with justification for an explicit future decision.

### D-010 (2026-06-27) Migration application = write file only
Claude writes the migration file ONLY. No MCP apply, no prod, no service-role. Vikram/pipeline applies later.

### D-011 (2026-06-27) FK set = full, minus non-existent column
Full FK set planned. LIVE `tasks` table has **no `parent_task_id` column** (verified via types.ts + REST), so that self-FK is N/A and EXCLUDED. Implemented FKs: status_id→task_statuses (RESTRICT), workstream_id→task_workstreams (SET NULL), assignee_id/created_by/reporter_id/reviewer_id→profiles (SET NULL).
