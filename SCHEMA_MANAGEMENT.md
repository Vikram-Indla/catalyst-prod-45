# Schema Management — Post-Lovable (2026-05-16+)

As of 2026-05-16, schema management transitioned from Lovable to git-tracked migrations + Supabase MCP.

## Lovable Deprecation Status

| Area | Status | Replacement |
|---|---|---|
| **Schema DDL** | ✅ Deprecated | `supabase/migrations/*.sql` + `apply_migration` MCP |
| **Edge functions** | ✅ Deprecated | `supabase/functions/*` + `supabase functions deploy` |
| **Database management** | ✅ Deprecated | Supabase MCP (list_tables, execute_sql, list_extensions, list_migrations) |
| **SQL editing** | ✅ Deprecated | Migrations in git + `apply_migration` (safer, auditable) |

## Making Schema Changes

### Workflow

1. **Create migration file:**
   ```bash
   supabase migration new <description>
   ```

2. **Write DDL in the migration:**
   ```sql
   -- supabase/migrations/20260516HHMMSS_<description>.sql
   CREATE TABLE example (id UUID PRIMARY KEY);
   -- Include RLS policies immediately
   ALTER TABLE example ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "..." ON example ...;
   ```

3. **Test locally** (if you have local Postgres running):
   ```bash
   supabase migration list
   ```

4. **Apply to Supabase:**
   ```bash
   supabase db push
   ```
   OR use MCP:
   ```
   apply_migration(project_id="lmqwtldpfacrrlvdnmld", name="20260516HHMMSS_...", query="...")
   ```

5. **Commit to git:**
   ```bash
   git add supabase/migrations/ && git commit -m "..."
   ```

6. **Push to main** (GitHub Actions auto-deploys on next `supabase/functions/**` change):
   ```bash
   git push origin main
   ```

### RLS Policies (Critical)

Every DDL migration that creates/modifies a table MUST include RLS policies in the same migration. Never leave a table without RLS — CLAUDE.md enforces this.

Pattern:
```sql
CREATE TABLE <table> (...);
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON <table>
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Complex Schema Changes

For complex changes (multi-table refactors, foreign key changes, large data migrations):

1. **Create a plan migration first** (documentation-only)
2. **Break into 2–3 smaller atomic migrations** (easier to debug if one fails)
3. **Test each migration individually** before committing to git
4. **Document rollback steps** in the migration file comments

Example multi-part refactor:
```
20260517000000_rename_initiatives_phase1_backup.sql      -- CREATE TABLE initiatives_backup AS SELECT...
20260517000001_rename_initiatives_phase2_constraints.sql  -- Add FKs to backup
20260517000002_rename_initiatives_phase3_rename.sql       -- DROP old, RENAME new
```

## Schema Consistency Audit

Run this quarterly to verify git matches running Supabase:

```bash
# Export remote schema
pg_dump --schema-only \
  postgres://postgres:PASSWORD@db.lmqwtldpfacrrlvdnmld.supabase.co:5432/postgres \
  > /tmp/remote_schema.sql

# List all migrations applied remotely
supabase migration list --linked

# Compare to local migrations
ls supabase/migrations/
```

If mismatch detected:
1. Identify which migrations are missing on remote or extra locally
2. Create a "reconciliation" migration to sync state
3. Test in a branch
4. Document the reconciliation in a commit message

## Emergency Procedures

### If Schema Breaks in Production

**DO NOT use Lovable.** Instead:

1. **Diagnose** via Supabase dashboard or MCP:
   ```
   execute_sql(project_id="...", query="SELECT * FROM information_schema.tables WHERE table_schema='public'")
   ```

2. **Create rollback migration:**
   ```bash
   supabase migration new rollback_<issue>
   # Write SQL to undo the broken change
   ```

3. **Apply rollback:**
   ```bash
   supabase db push
   ```

4. **Commit + push to main:**
   ```bash
   git add supabase/migrations/20260516HHMMSS_rollback_*.sql
   git commit -m "fix(schema): rollback broken migration [issue]"
   git push origin main
   ```

5. **Post-mortem:** Add lesson to CLAUDE.md if pattern is reusable

## Tools Reference

| Tool | Use | Command |
|---|---|---|
| **Supabase CLI** | Local schema mgmt, push/pull | `supabase db push`, `supabase migration new` |
| **Supabase MCP** | Remote queries + introspection | `execute_sql`, `list_tables`, `apply_migration` |
| **pg_dump** | Schema export/audit | `pg_dump --schema-only <connection>` |
| **psql** | Direct DB access | `psql -d postgres://...` |
| **Git** | Version control | `git add/commit/push` |

## Lovable Access Revocation Timeline

- **2026-05-16:** Baseline snapshot created ✅
- **2026-05-23:** Verify all schema changes work via git+Supabase MCP (no Lovable fallback)
- **2026-05-30:** Revoke Lovable access if no emergencies
- **After 2026-05-30:** Pure git-managed schema. No Lovable.

## Questions?

Refer to:
- CLAUDE.md (`# jira-compare — compounding lessons`) for schema patterns
- `./.claude/skills/preflight/SKILL.md` Phase 1 Lane C for RLS policy validation
- This file for git-based workflow details
