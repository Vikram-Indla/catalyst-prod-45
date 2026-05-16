# Auth UUID Remapping Guide

When migrating data from one Supabase project to another, `auth.users` will have different UUIDs in the target. This script remaps all user-related foreign keys.

## 3-Step Process

### Step 1: Export Source Users

Export the mapping of emails → old UUIDs from the source project:

```bash
psql "$SOURCE_DB_URL" \
  -c "\COPY (SELECT email, id FROM auth.users WHERE email IS NOT NULL) TO '/tmp/source_users.csv' WITH CSV HEADER"
```

This creates `/tmp/source_users.csv` with:
```
email,id
user1@example.com,123e4567-e89b-12d3-a456-426614174000
user2@example.com,223e4567-e89b-12d3-a456-426614174001
...
```

### Step 2: Re-invite Users on Target Project

Users must exist in `auth.users` on the target project (they'll get new UUIDs). Either:

**Option A: Via Supabase Dashboard**
- Auth → Users → "Invite"
- Enter each user's email from the CSV
- They'll receive invite emails

**Option B: Via Supabase CLI**
```bash
supabase auth admin create-user \
  --email user1@example.com \
  --password temporary \
  --project-ref TARGET_PROJECT_ID
```

**Option C: Bulk via script**
```bash
while IFS=',' read -r email id; do
  [[ "$email" == "email" ]] && continue  # skip header
  psql "$TARGET_DB_URL" -c "
    INSERT INTO auth.users (email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('$email', NOW(), '{}', '{}', NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
  "
done < /tmp/source_users.csv
```

### Step 3: Run Remapping Script

```bash
psql "$TARGET_DB_URL" \
  -v source_csv=/tmp/source_users.csv \
  -f scripts/remap-auth-uuids.sql
```

**Output example:**
```
[remap-auth-uuids] Loaded 42 users from source CSV
[remap-auth-uuids] Source users: 42
[remap-auth-uuids] Mapped: 42
[remap-auth-uuids] 89 rows updated in profiles.user_id
[remap-auth-uuids] 156 rows updated in user_roles.user_id
[remap-auth-uuids] 34 rows updated in capacity_allocations.owner_id
[remap-auth-uuids] 12 rows updated in audit_logs.created_by
[remap-auth-uuids] ✅ Remapping complete: 42 user UUIDs remapped across all tables
```

## What the Script Does

1. **Loads source CSV** into temp table `source_users(email, old_id)`
2. **Joins on email** against target `auth.users` to build mapping
3. **Discovers columns dynamically** in all `public.*` tables with these names:
   - `user_id`, `created_by`, `updated_by`, `owner_id`, `assignee_id`, `reporter_id`
   - `reviewer_id`, `approver_id`, `assigned_to`, `assigned_by`, `invited_by`
   - `modified_by`, `deleted_by`, `profile_id`, `auth_user_id`, `catalyst_user_id`
4. **Updates each column** from `old_id` → `new_id` via single transaction
5. **Skips primary keys** (e.g., `profiles.id`)
6. **Checks for orphans** (users with no matching auth.users after remap)
7. **Reports per-table counts** so you can verify coverage

## Handling Non-Standard Column Names

If your schema uses custom FK column names not in the default list (e.g., `requested_by_user`, `manager_uuid`), edit the script:

```sql
-- Line 66: add your columns to _user_cols array
_user_cols TEXT[] := ARRAY[
  'user_id', 'created_by', ... , 
  'requested_by_user',  -- ← add custom names here
  'manager_uuid'        -- ← add custom names here
];
```

Then re-run:
```bash
psql "$TARGET_DB_URL" -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql
```

## Transaction Safety

The entire remap runs in a **single transaction**:
- ✅ All-or-nothing: either all columns remap or none do
- ✅ If any UPDATE fails, the whole script aborts and target is untouched
- ✅ No orphaned partial remaps

## Troubleshooting

### "Unmapped users (not re-invited on target)"

```
WARNING: [remap-auth-uuids] Unmapped users (not re-invited on target): 3
```

**Cause:** Some users from source CSV don't exist in target `auth.users`

**Fix:** Re-invite those users on the target project, then re-run the script:
```bash
# Find unmapped emails
comm -23 <(cut -d, -f1 /tmp/source_users.csv | tail -n +2 | sort) \
         <(psql "$TARGET_DB_URL" -t -c "SELECT LOWER(email) FROM auth.users" | sort)

# Re-invite them, then re-run:
psql "$TARGET_DB_URL" -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql
```

### "Found X orphaned user_roles"

```
WARNING: [remap-auth-uuids] Found 5 orphaned user_roles (user_id not in auth.users)
```

**Cause:** Some user_roles have `user_id` values that don't exist in target `auth.users`

**Check them:**
```sql
SELECT * FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);
```

**Options:**
1. Delete them: `DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);`
2. Re-invite the missing users and re-run the remap
3. Manually update them to the correct UUID

### CSV file not found

```
ERROR: source_csv: false: No such file or directory
```

**Fix:** Ensure the CSV path is correct:
```bash
ls -lh /tmp/source_users.csv
# Check that it's not empty:
wc -l /tmp/source_users.csv
```

## Email Matching Logic

The script matches source emails to target `auth.users` **case-insensitively**:

```sql
LOWER(su.email) = LOWER(COALESCE(au.email, ''))
```

So `User@Example.com` in source will match `user@example.com` in target.

## Example: Full Migration Flow

```bash
# 1. Export source
psql "$SOURCE_DB_URL" \
  -c "\COPY (SELECT email, id FROM auth.users WHERE email IS NOT NULL) TO '/tmp/source_users.csv' WITH CSV HEADER"

# 2. Migrate schema and data
psql "$TARGET_DB_URL" < full_schema.sql
SOURCE_DB_URL=$SOURCE TARGET_DB_URL=$TARGET ./scripts/migrate-data-to-external.sh

# 3. Re-invite users (via dashboard or bulk script)
# ... (skip if users already exist)

# 4. Remap UUIDs
psql "$TARGET_DB_URL" -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql

# 5. Verify
psql "$TARGET_DB_URL" -c "SELECT COUNT(*) FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);"
# Should return 0
```

## Related

- `migrate-data-to-external.sh` — Full data migration (calls this script if needed)
- `MIGRATION_SCRIPTS_GUIDE.md` — Comparison of all migration scripts
- `DATA_MIGRATION_README.md` — Full migration workflow guide
