# CAT-TASKS-20260627-001 — Handover (final, merged to main)

## Feature
Task Management overhaul. 8 slices. Branch `claude/angry-lovelace-a4b08e` (worktree) → **MERGED into `main`**.

## Git state
- Feature branch HEAD: `9fd0dacab` (worktree, clean).
- **Merged into local `main`**: merge commit **`f3a350eb6c066b2533591a515eea65ae10966548`** (`--no-ff`, parents `40de23503` + `9fd0dacab`). Clean merge, no conflicts.
- All 7 task commits in main: `2f7122a66` `e824c333e` `f2036e2a6` `da00b9569` `39d6798b1` `7602eefab` `9fd0dacab`.
- ⚠️ **Local `main` was 26 commits BEHIND origin/main before the merge and was NOT pulled first** → local main has now diverged from origin/main. The merge is **LOCAL ONLY (not pushed)**. Before pushing: reconcile with origin/main (pull/rebase or merge origin/main) — do NOT force-push. Decide with Vikram.
- Untracked in both checkouts: `features/CAT-TASKS-20260627-001/` (these docs; never committed).

## Running state (this machine)
- **localhost:8080** serves the worktree (branch `claude/angry-lovelace-a4b08e`) — dev server cwd = the worktree, not the main dir.
- **localhost:8081** STOPPED.
- Main working dir is now on `main` (after the merge). Worktree dir still on the feature branch.
- Worktree has a symlinked `node_modules` (→ main) + copied `.env.local` (staging) for the dev server.

## Environment (CRITICAL)
- App DB = STAGING `cyijbdeuehohvhnsywig` (org xtrdfmquqljdkpxyltmn, "catalyst-staging").
- PROD = `lmqwtldpfacrrlvdnmld` ("catalyst-prod", org wxrdscstztinvcjdcgka) — NEVER touch.
- The connected Supabase MCP (6c122156) / OAuth http entry is PROD-ORG-ONLY. **Reachable staging path FOUND 2026-06-27:** `.mcp.json` `supabase-staging` entry's PAT works directly against the Management API SQL endpoint (account is in both orgs). Still NEVER `db push` (out-of-sync + duplicate version prefixes).

## DEFECT-002 — CLOSED on staging
tasks FKs (status/workstream/assignee) applied to staging via separate handling; `/tasks/view/:key` renders full canonical detail; create works; statuses seeded; keys generate.

## What works live (validated on 8080 + 8081)
/tasks/overview · /tasks/workstreams (CRUD, not 404) · /tasks/board · /tasks/list · /tasks/timeline · /tasks/view/<key> (full detail + Linked items section) · +Create→Create Task (default-to-Task) · create success flag (showFlag) · workstream-prefix keys (e.g. JKT-1, TIG-1).

## Migrations — APPLIED + VERIFIED on STAGING 2026-06-27 (never prod) ✅
All 3 applied to `cyijbdeuehohvhnsywig` and verified via DB introspection:
1. `20260627170000_task_work_item_links.sql` → table created (pkey, `not_subtask` CHECK, `unique(task_id,work_item_key)`, FKs task_id→tasks + created_by→profiles, 2 indexes). Live add/unlink unblocked.
2. `20260617030000_tasks_notifications.sql` → `catalyst_notify_tasks` trigger + `catalyst_notify_tasks_trigger()` fn live (fires on assignee_id + status_id). Assign/status notifications unblocked.
3. `20260627160000_tasks_fk_and_key_hardening.sql` → was already applied (6 FKs validated + `set_task_key` trigger); re-confirmed.

**Apply path that worked:** `.mcp.json` `supabase-staging` entry's PAT (sbp_…, scoped --project-ref=cyijbdeuehohvhnsywig, account is in BOTH orgs) used directly against the Supabase Management API SQL endpoint `POST https://api.supabase.com/v1/projects/<ref>/database/query` (REF=staging only; token never printed). The OLD MCP `6c122156`/OAuth http entry is prod-org-only — that was the dead end.
**CAVEAT:** Management-API query does NOT write `supabase_migrations.schema_migrations`, so `list_migrations`/`db push` won't show these 3 as applied (idempotent re-run is safe). Still NEVER `db push` (duplicate `…160000`/`…170000` version prefixes from unrelated cycle-audit migrations).
**Remaining functional check:** live app re-test — link add/unlink + assign notification via Chrome DOM probe on localhost:8080 (DB layer proven; app path not yet re-exercised this session).

## Deferred / follow-ups (non-blocking)
- Native Tasks-Hub `tasks` not unioned into Home "For you" feed (bounded `useHomeWorkItems` change).
- RLS-001 (security slice): anon read+write on tasks family; opt-in policies commented in the S3 migration.
- Cosmetic: ⋯ row-action dropdown anchors top-left (ads DropdownMenu quirk in JiraTable cell); workstream lead field not in create/edit form; key-gen client-side race (collision fallback mitigates; DB-hardenable).

## Key implementation notes
- Create Task modal = canonical PortalFix + @atlaskit/form/select/textfield/textarea/button + CatalystDatePicker + MiniAvatar; props `{open,onOpenChange,defaultWorkstream,onSuccess}` preserved.
- DEFECT-004 fix is CLIENT-SIDE in `useCreateTaskMutation` (computeWorkstreamKey → PREFIX-N, collision-fallback to trigger). DEFECT-003 success flag via `showFlag({appearance:'success'})` (bypasses suppressed catalystToast.success).
- Task detail = `TaskCatalystView` (task-catalyst/) via CatalystDetailRouter entityKind='task'. Breadcrumb prop projectName="Tasks".
- Workstreams page = `WorkstreamsManagerPage.tsx` modeled on AllProjectsPage; reuses useTaskWorkstreams CRUD hooks + ConfirmDeleteDialog + WorkstreamFormModal.
- Linking = `task_work_item_links` junction + `useTaskWorkItemLinks.ts` + `TaskLinkedItemsSection.tsx` (mounted in TaskCatalystView leftContent).
- WORKTREE PATH TRAP: in this worktree session, file tools must use the worktree path prefix or edits land on the main checkout. See memory [[worktree-path-trap]].

## Next prompt
`continue feature CAT-TASKS-20260627-001`
