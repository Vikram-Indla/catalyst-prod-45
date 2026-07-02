# DRIFT LOG

## Plan Lock 6a superseded — wrong root cause diagnosed pre-approval — 2026-07-02

**What happened:** Plan Lock 6a (epic-key click-to-open fix) was drafted and approved based on a
hypothesis — `SwimlaneHeader.tsx`'s epic-key `span[role="link"]` nested inside the row's own
`<button onClick={onToggle}>`, theorized to swallow the click. Before writing code, ran one more
Karpathy-loop experiment (direct React-fiber `props.onClick()` invocation, bypassing DOM event
dispatch entirely) — the handler ran with zero errors, still zero dialogs. That disproved the
nested-button theory outright: the click **does** reach `openDetail()` correctly.

**Real root cause (confirmed via control test + DB query):**
- Clicked a card on the same board → detail panel opened correctly (proves `CatalystShell` /
  `CatalystDetailRouter` / `useGlobalSearchStore` all work fine on this route).
- Clicked epic key BAU-5851 (a live, non-deleted epic) → **panel opened correctly**. The
  Board.tsx/SwimlaneHeader wiring is 100% functional, no bug there at all.
- Clicked epic key BAU-3726 (the one from the original manual check) → silent no-op, confirmed
  via SQL: `ph_issues.deleted_at` is set (soft-deleted 2026-06-24), `issue_type = 'Feature'`.
- `CatalystDetailRouter.tsx:88-93`'s type-lookup query filters `.is('deleted_at', null)` — a
  soft-deleted parent returns no row, `lookedUpType` stays `null`, `resolveItemType(null)`
  returns `null` (line 44), and the "still loading, don't render" guard at line 180-182
  (`if (!resolved && !itemType) return null`) can't tell "still fetching" apart from "fetched and
  genuinely found nothing" — so it returns `null` forever, no dialog, no error state, no user
  feedback.
- Scale check: `36 of 416` distinct live-referenced parent keys in `ph_issues` are soft-deleted
  (~9%) — not a one-off edge case, a real class of dead clicks across the app (this bug isn't
  kanban-specific — every `openDetail({id})` call site with an unresolved `itemType` hits the
  same silent-null path for any soft-deleted target).

**Resolution:** Plan Lock 6a marked SUPERSEDED (see `03_PLAN_LOCK.md`, not deleted — kept for the
record). New Plan Lock 6a-revised needed, scoped to `CatalystDetailRouter.tsx`'s loading-vs-empty
guard, which was explicitly FORBIDDEN in the superseded lock. `SwimlaneHeader.tsx` needs no
change — removed from files-to-modify.

**Process note:** confirms the value of the "invoke the handler directly" experiment as a cheap
way to falsify a hypothesis before spending a code-change cycle on it. Should be standard practice
for any "click does nothing" bug before proposing a fix.


## Staging (cyij / catalyst-staging) migration history drift — 2026-07-02

**What happened:** Attempting to push a small additive migration (3 nullable columns) via
`supabase db push --linked` revealed the staging database's migration-history bookkeeping had
drifted heavily from the local `supabase/migrations/` folder — 29 remote-recorded migrations
had no matching local file (orphaned, likely from last week's 2026-06-25 cleanup renaming/
squashing files), and 439 local files had never been recorded as applied on remote at all.

**Root cause of the underlying app-level bug this uncovered:** 5 pairs of migration files in
the repo share the exact same 14-digit timestamp prefix (e.g. two different files both named
`20260626100000_*.sql`). Postgres' `schema_migrations` table has a PRIMARY KEY on `version`,
so this is a structural defect — only one file per pair could ever be recorded, no matter what.
Fixed by renaming one file in each pair to `<timestamp>+1 second>`:
- `20260626100000` → `20260626100001_drop_broken_sync_jira_bug_to_defect.sql`
- `20260627130000` → `20260627130001_repoint_tm_test_sets_project_fk_to_tm_projects.sql`
- `20260627140000` → `20260627140001_check_permission_product_super_admin.sql`
- `20260627160000` → `20260627160001_tasks_fk_and_key_hardening.sql`
- `20260627170000` → `20260627170001_task_work_item_links.sql`

**Resolution (with explicit user confirmation at each step, per this repo's permission-layer
rules for shared-DB actions):**
1. Backed up remote schema: `supabase db dump --linked` → 751 tables, 82,762 lines. Saved at
   `/private/tmp/claude-502/-Users-vikramindla-Documents-GitHub-catalyst-prod-45/3de8c329-9762-4011-9b3c-dc85cab3c637/scratchpad/db-backup/schema_backup_20260702.sql`
   (session-scoped scratchpad — **copy this somewhere durable if you want to keep it**,
   session scratchpads are not permanent).
2. Local migrations dir also snapshotted alongside the backup (`local-migrations-snapshot-20260702/`).
3. `supabase migration repair --status reverted <29 orphaned timestamps>` — told remote
   bookkeeping "these no longer exist locally."
4. `supabase migration repair --status applied <439 historical local timestamps>` — told
   remote bookkeeping "these are already satisfied by the current schema" (per user directive:
   "local is source of truth" — last week's cleanup already reflects this history in the live
   schema; don't re-execute old SQL against an already-evolved database).
5. Renamed the 5 duplicate-timestamp files (above).
6. `supabase db push --linked --yes --include-all` — applied cleanly: the 5 renamed files +
   the new `20260702180000_add_epic_color_status_columns.sql`.
7. Regenerated `src/integrations/supabase/types.ts` from the linked project. `npx tsc --noEmit`
   clean repo-wide (zero errors from the whole reconciliation).

**Verdict:** resolved. Migration history is now consistent between local and remote. If a
future session hits "Remote migration versions not found" or "Found local migration files to
be inserted before the last migration" again, it should NOT recur from this specific incident —
but if it does, the backup file above is the fallback.

**Process note for future sessions:** every step above required an explicit, specific user
confirmation — this repo's permission layer blocks vague "proceed"/"go" for schema-affecting
Supabase CLI commands on the shared staging project, even when a `Bash(supabase db push*)`
allow-rule exists in `.claude/settings.local.json`. `supabase migration repair` at this scale
was NOT approved by that rule and had to be run by Vikram directly in his own terminal once.
