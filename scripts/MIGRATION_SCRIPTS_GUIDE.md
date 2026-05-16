# Migration Scripts Guide

Two complementary data migration scripts for different scopes:

## migrate-data-to-external.sh

**Scope:** All user, admin, capacity, and budget-related tables  
**Use when:** Migrating complete Catalyst application state to a new Supabase project

### What it includes:
- ✅ Profiles, user_roles, user_product_roles, role_permissions, user_permissions
- ✅ Admin settings, audit logs, feature flags
- ✅ Capacity: resource_inventory, allocations, r360_profiles, departments
- ✅ Budget: scenarios, epic_spend, forecasts, spend aggregates
- ✅ ~125 tables total

### What it excludes:
- ❌ Jira-related tables (ph_issues, ph_jira_*, etc.)
- ❌ auth.users (Supabase-managed)
- ❌ Views (auto-regenerate)

### Usage:

```bash
SOURCE_DB_URL="postgres://..." \
TARGET_DB_URL="postgres://..." \
./scripts/migrate-data-to-external.sh
```

---

## migrate-nonjira-data.sh

**Scope:** Catalyst-specific tables ONLY (excludes all Jira integrations)  
**Use when:** Syncing non-Jira application data while Jira sync is running separately

### What it includes:
- ✅ Profiles, user roles, permissions
- ✅ Admin tables, organization settings, workspace settings
- ✅ Capacity/resource management (r360, allocations, departments)
- ✅ Budget planning (scenarios, forecasts, approvals)
- ✅ Project management (projects, roadmaps, milestones, releases)
- ✅ Documents, notifications, audit logs, integrations
- ✅ ~50 non-Jira tables

### What it excludes:
- ❌ All Jira-related tables (ph_issues, ph_jira_*, jira_*)
- ❌ Jira webhook infrastructure (jira_webhook_events, jira_sync_*, jira_identity_*)
- ❌ auth.users (Supabase-managed)

### Special Features:

**Dry-run mode** — Preview what will be migrated without making changes:

```bash
# Preview: shows list of found tables and row counts
DRY_RUN=1 SOURCE_DB_URL="postgres://..." \
TARGET_DB_URL="postgres://..." \
./scripts/migrate-nonjira-data.sh

# Output:
# Tables found on source: 42
# Tables not found:       8 (will be skipped)
# ✓ profiles (125 rows)
# ✓ user_roles (89 rows)
# ...
# Ready to migrate: 42 tables
```

**Execute:** Run actual migration

```bash
SOURCE_DB_URL="postgres://..." \
TARGET_DB_URL="postgres://..." \
./scripts/migrate-nonjira-data.sh
```

---

## Comparison

| Feature | `migrate-data-to-external.sh` | `migrate-nonjira-data.sh` |
|---------|-------------------------------|--------------------------|
| **Scope** | All (Jira + non-Jira) | Non-Jira only |
| **Table count** | ~125 | ~50 |
| **Jira tables** | ✅ Includes | ❌ Excludes |
| **Dry-run mode** | ❌ No | ✅ Yes |
| **Use case** | Full project migration | Selective data sync |

---

## Which One to Use?

### Use `migrate-data-to-external.sh` when:
- ✅ Migrating to a completely new Supabase project
- ✅ Setting up a fresh Catalyst instance with all historical data
- ✅ Full backup/restore scenario
- ✅ Post-Jira deprecation (after sync is complete)

### Use `migrate-nonjira-data.sh` when:
- ✅ Syncing Catalyst-only changes while Jira sync runs in parallel
- ✅ Testing data migration without affecting Jira integration
- ✅ Selective migration of user/admin/capacity/budget data
- ✅ Want to preview what will be migrated first (dry-run)

---

## Migration Workflow Examples

### Scenario 1: New Project Setup (Full Migration)

```bash
# 1. Apply schema on target
psql $TARGET_DB_URL < full_schema.sql

# 2. Migrate ALL data (Jira + non-Jira)
SOURCE_DB_URL=$SOURCE TARGET_DB_URL=$TARGET \
  ./scripts/migrate-data-to-external.sh

# 3. Re-invite users on target
# (via Supabase dashboard)

# 4. Remap auth UUIDs if needed
psql $TARGET_DB_URL < scripts/remap-auth-uuids.sql
```

### Scenario 2: Selective Non-Jira Sync (Parallel with Jira)

```bash
# 1. Preview what will be migrated
DRY_RUN=1 SOURCE_DB_URL=$SOURCE TARGET_DB_URL=$TARGET \
  ./scripts/migrate-nonjira-data.sh

# 2. Review the list, confirm safe to migrate

# 3. Execute migration
SOURCE_DB_URL=$SOURCE TARGET_DB_URL=$TARGET \
  ./scripts/migrate-nonjira-data.sh

# 4. Jira sync continues independently via webhook + verification
```

### Scenario 3: Post-Migration Verification

After either script completes:

```bash
# Check row counts
psql $TARGET_DB_URL -c "SELECT COUNT(*) FROM profiles;"
psql $TARGET_DB_URL -c "SELECT COUNT(*) FROM user_roles;"

# Verify no orphaned records
psql $TARGET_DB_URL -c "SELECT COUNT(*) FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);"
```

---

## Common Issues

### "Table does not exist"

Both scripts auto-skip missing tables. This is expected and safe.

```bash
# Check what was actually migrated:
tail -50 /tmp/nonjira_migration_*.log
```

### "Foreign key violation"

Tables are loaded with `--disable-triggers`. If FK violations still occur:

```sql
-- Temporarily disable constraints
ALTER TABLE table_name DISABLE TRIGGER ALL;
-- Load data
ALTER TABLE table_name ENABLE TRIGGER ALL;
```

### Dry-run shows fewer tables than expected

Tables that don't exist on source are skipped. Run actual migration to see final results.

```bash
# Find what's missing on source
psql $SOURCE_DB_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;"
```

---

## Related Documentation

- **Full data migration guide:** `DATA_MIGRATION_README.md`
- **Deployment status:** `PHASE_1_2_DEPLOYMENT_STATUS.md`
- **Auth UUID remapping:** `scripts/remap-auth-uuids.sql`
