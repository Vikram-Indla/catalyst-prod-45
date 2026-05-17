# Data Migration Guide

This guide covers migrating user, admin, capacity, and budget data from a source Supabase project to a target project.

## Overview

The migration consists of three steps:

1. **Schema Export** (`full_schema.sql`) — Apply schema on target project
2. **Data Dump & Load** (`migrate-data-to-external.sh`) — Populate tables with data
3. **Auth UUID Remapping** (`remap-auth-uuids.sql`) — Update foreign keys if auth UUIDs differ

## Prerequisites

- **PostgreSQL client tools** installed (`psql`, `pg_dump`)
- **Target schema ready** — Run `full_schema.sql` on target project first
- **Source and target URLs** — Full Postgres connection strings with credentials
- **Auth.users invited** (optional) — If remapping auth UUIDs, re-invite users first

### Connection Strings Format

```
postgres://postgres:PASSWORD@db.SUPABASE_ID.supabase.co:5432/postgres
```

Find these in:
- Supabase Dashboard → Project Settings → Database → Connection string

## Step 1: Schema Export

Export the complete schema from source:

```sql
-- Run on source project to dump full schema
pg_dump SOURCE_DB_URL --schema-only > full_schema.sql

-- Then apply on target project
psql TARGET_DB_URL < full_schema.sql
```

Or use the pre-generated `LOVABLE_SCHEMA_EXPORT_HANDOFF.md` baseline.

## Step 2: Data Migration

Dump data-only from all tables and load into target:

```bash
chmod +x scripts/migrate-data-to-external.sh

SOURCE_DB_URL="postgres://postgres:SOURCE_PASS@db.SOURCE_ID.supabase.co:5432/postgres" \
TARGET_DB_URL="postgres://postgres:TARGET_PASS@db.TARGET_ID.supabase.co:5432/postgres" \
./scripts/migrate-data-to-external.sh
```

**What the script does:**

- ✅ Auto-skips tables that don't exist on source
- ✅ Dumps **data-only** (schema must already exist on target)
- ✅ Uses `--disable-triggers --column-inserts` to avoid FK ordering issues
- ✅ Excludes views (they regenerate)
- ✅ Logs results to `/tmp/data_migration_TIMESTAMP.log`

**Tables covered:**

- **Profiles & Auth:** `profiles`, `user_roles`, `user_product_roles`, `role_permissions`, `user_permissions`
- **Admin:** `admin_settings`, `admin_audit_logs`, `admin_feature_flags`
- **Capacity:** `resource_inventory`, `capacity_allocations`, `r360_profiles`, `capacity_departments`, etc.
- **Budget:** `budget_scenarios`, `epic_spend`, `spend_forecasts`, etc.

## Step 3: Auth UUID Remapping (Optional)

If the target project has different auth.users UUIDs (likely), remap foreign keys:

### 3a. Invite Users on Target

After data migration, users exist in `profiles` but have old auth.users UUIDs. Re-invite them:

```bash
# Via Supabase dashboard:
# Auth → Users → "Invite" → email@example.com
# Or via admin API:
supabase auth admin create-user --email user@example.com --password temporary --project-ref TARGET_ID
```

Users will get new UUIDs in auth.users.

### 3b. Remap UUIDs

```bash
psql TARGET_DB_URL < scripts/remap-auth-uuids.sql
```

This script:
- ✅ Matches users by email between `profiles` and `auth.users`
- ✅ Creates temporary mapping table
- ✅ Updates `profiles.user_id` and `user_roles.user_id` to target UUIDs
- ✅ Reports any orphaned accounts
- ✅ Cleans up automatically

## Important Notes

### Auth.users is NOT migrated

Supabase manages `auth.users` separately. The migration does NOT include auth credentials.

**Implications:**
- Users cannot log in with old passwords until they reset
- If emails match between source and target, remapping helps
- If emails differ, you'll need manual mapping

### Build Errors

The migration scripts are shell/SQL-only and do not affect TypeScript builds. Pre-existing build errors are unrelated.

### Triggers and Constraints

Migration uses `--disable-triggers` to avoid constraint violations during insert. Triggers re-enable after load completes.

### Large Tables

For tables with millions of rows, consider:
- Running migration during off-peak hours
- Increasing Postgres max_locks_per_transaction
- Running in batches if timeout occurs

## Troubleshooting

### "Connection refused"

Check connection string and network access:

```bash
psql SOURCE_DB_URL -c "SELECT 1"  # Test source
psql TARGET_DB_URL -c "SELECT 1"  # Test target
```

### "Table does not exist"

Schema must be applied first:

```bash
psql TARGET_DB_URL < full_schema.sql
```

### "Foreign key violation"

Triggers are disabled, but if it still fails, check row order:
- Some tables may have circular FKs (rare)
- Disable all constraints, load data, then enable:

```sql
ALTER TABLE table_name DISABLE TRIGGER ALL;
-- load data
ALTER TABLE table_name ENABLE TRIGGER ALL;
```

### "UUID mismatch in profiles"

Run the remapping script and confirm all users were re-invited first.

## Rollback

If migration fails mid-way:

```sql
-- Truncate tables in reverse dependency order
TRUNCATE TABLE budget_scenario_details CASCADE;
TRUNCATE TABLE profiles CASCADE;
-- ... etc for other tables
```

Then fix the issue and re-run the migration.

## Example: Full Migration Workflow

```bash
# 1. Export schema from source
pg_dump $SOURCE_DB_URL --schema-only > /tmp/schema.sql

# 2. Apply on target
psql $TARGET_DB_URL < /tmp/schema.sql

# 3. Migrate data
SOURCE_DB_URL=$SOURCE_DB_URL TARGET_DB_URL=$TARGET_DB_URL ./scripts/migrate-data-to-external.sh

# 4. Check log
tail -50 /tmp/data_migration_*.log

# 5. Invite users on target project (via dashboard or CLI)

# 6. Remap auth UUIDs
psql $TARGET_DB_URL < scripts/remap-auth-uuids.sql

# 7. Verify
psql $TARGET_DB_URL -c "SELECT COUNT(*) FROM profiles;"
```

## Next Steps

- Test application login with target project credentials
- Verify data integrity (compare row counts, spot-check values)
- Update environment variables to point to target project
- Monitor logs for any constraint or trigger warnings
