# Apply the Task-module migrations (CAT-TASKS-20260627-001)

The Task Management overhaul + Slice 9 (canonical create modal, `TSK-` keys) is merged to `main`.
The **code** ships via `git pull`. The **database changes do not** — each environment must apply
these 4 migrations once. They are **idempotent** (safe to re-run) and **reversible** (ROLLBACK block in each file).

> ⚠️ **Status: applied to STAGING (`cyijbdeuehohvhnsywig`) only.** Every other environment
> (other devs' local Supabase, CI seed, **prod**) still needs them. **Never apply to prod without explicit sign-off.**

## The 4 migrations — apply in this order
| Order | File (`supabase/migrations/`) | What it does |
|---|---|---|
| 1 | `20260617030000_tasks_notifications.sql` | `catalyst_notify_tasks` trigger + fn (assign/status notifications) |
| 2 | `20260627160000_tasks_fk_and_key_hardening.sql` | 6 FKs on `tasks` + initial `generate_task_key` trigger |
| 3 | `20260627170000_task_work_item_links.sql` | `task_work_item_links` junction (+ sub-task CHECK) |
| 4 | `20260627180000_tasks_canonical_modal_support.sql` | `generate_task_key` → `TSK-`; rename PLN/TIG → TSK; add `tasks.description_adf` + `tasks.labels` |

(That is also filename/timestamp order, so it's dependency-safe.)

## How to apply

### ⚠️ Do NOT use `supabase db push` for this repo
Two unrelated migrations share the exact version prefixes `20260627160000` and `20260627170000`
(the cycle-audit migrations). `db push` mis-orders / errors on duplicate versions. Apply the SQL directly instead.

### Option A — Supabase Studio (simplest, per environment)
1. Open the target project → **SQL Editor**.
2. Open each file above **in order**, paste its contents, **Run**.
3. Run the verification block below; every row/count should match.

### Option B — Supabase Management API (scripted; what was used on staging)
```bash
# REF = the TARGET project ref (NOT prod unless approved). TOKEN = a PAT with access to that project's org.
for f in 20260617030000_tasks_notifications \
         20260627160000_tasks_fk_and_key_hardening \
         20260627170000_task_work_item_links \
         20260627180000_tasks_canonical_modal_support; do
  curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$(python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/'+'$f'+'.sql').read()}))")"
done
```
> Note: the Management API runs raw SQL and does **not** record rows in `supabase_migrations.schema_migrations`.
> Re-running is harmless (idempotent), but `list_migrations`/`db push` won't show these as "applied".

## Verification (read-only — run after applying)
```sql
select
  (select count(*) from pg_constraint
     where conrelid='public.tasks'::regclass and contype='f') as task_fks,            -- expect 6
  to_regclass('public.task_work_item_links')::text                     as links_table, -- expect public.task_work_item_links
  (select count(*) from pg_trigger
     where tgrelid='public.tasks'::regclass and tgname='catalyst_notify_tasks') as notif_trigger, -- expect 1
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='tasks'
       and column_name in ('description_adf','labels'))               as new_cols,     -- expect 2
  (select substring(pg_get_functiondef('public.generate_task_key()'::regprocedure)
     from 'TSK-') is not null)                                        as key_is_tsk;   -- expect true
```

## Still open (not migration-related)
- **Live UI signoff** of the Task create modal (assignee dropdown, work-type default, create → `TSK-` → detail) and a Create-Story no-regression check.
- This branch predated main's `useApprovedProfiles` cleanup (commit `9287e2df1`) — confirm the merge didn't reintroduce direct `profiles` queries in the task module.

_Ref: PR #298 (merge `b00c82ab0`)._
