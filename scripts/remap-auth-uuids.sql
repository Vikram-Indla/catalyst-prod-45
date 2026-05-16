-- Auth UUID Remapping Helper (Advanced)
--
-- After migrating data to a new Supabase project, auth.users will have different UUIDs.
-- This script remaps ALL uuid columns from source IDs to target IDs based on email matching.
--
-- Usage (3 steps):
--   1. Export source auth.users emails and IDs:
--      psql "$SOURCE_DB_URL" -c "\COPY (SELECT email, id FROM auth.users WHERE email IS NOT NULL) TO '/tmp/source_users.csv' WITH CSV HEADER"
--
--   2. Re-invite all those users on TARGET project with the same emails
--
--   3. Run this script on TARGET:
--      psql "$TARGET_DB_URL" -v source_csv=/tmp/source_users.csv -f scripts/remap-auth-uuids.sql
--
-- What it does:
--   - Loads source (email, old_id) from CSV into temp table
--   - Joins against target auth.users on lowercased email
--   - Discovers every uuid column in public.* with user-related names:
--     user_id, created_by, updated_by, owner_id, assignee_id, reporter_id, reviewer_id,
--     approver_id, assigned_to, assigned_by, invited_by, modified_by, deleted_by,
--     profile_id, auth_user_id, catalyst_user_id
--   - Dynamically UPDATEs each column with old_id → new_id
--   - Skips profiles.id = user_id (PK conflict)
--   - Runs in single transaction: abort on failure leaves target untouched
--   - Reports per-table remap counts and orphan checks

-- Verify source CSV exists
\set ON_ERROR_STOP on

-- Load source users from CSV
CREATE TEMP TABLE source_users (
  email TEXT NOT NULL,
  old_id UUID NOT NULL,
  PRIMARY KEY (email)
);

COPY source_users(email, old_id) FROM :'source_csv' WITH (FORMAT csv, HEADER true);

-- Verify source CSV loaded
DO $$
  DECLARE
    source_count INT;
  BEGIN
    SELECT COUNT(*) INTO source_count FROM source_users;
    IF source_count = 0 THEN
      RAISE EXCEPTION 'ERROR: source_users CSV is empty. Check source_csv path.';
    END IF;
    RAISE NOTICE '[remap-auth-uuids] Loaded % users from source CSV', source_count;
  END;
$$;

-- Build mapping: email → (old_id, new_id)
CREATE TEMP TABLE auth_uuid_map (
  email TEXT NOT NULL,
  old_id UUID NOT NULL,
  new_id UUID NOT NULL,
  PRIMARY KEY (old_id)
);

INSERT INTO auth_uuid_map (email, old_id, new_id)
SELECT
  su.email,
  su.old_id,
  au.id
FROM source_users su
LEFT JOIN auth.users au ON LOWER(su.email) = LOWER(COALESCE(au.email, ''))
WHERE au.id IS NOT NULL;

-- Verify mapping
DO $$
  DECLARE
    mapped_count INT;
    source_count INT;
    unmapped_count INT;
  BEGIN
    SELECT COUNT(*) INTO source_count FROM source_users;
    SELECT COUNT(*) INTO mapped_count FROM auth_uuid_map;
    SELECT COUNT(*) INTO unmapped_count FROM source_users WHERE email NOT IN (SELECT email FROM auth_uuid_map);

    RAISE NOTICE '[remap-auth-uuids] Source users: %', source_count;
    RAISE NOTICE '[remap-auth-uuids] Mapped: %', mapped_count;
    IF unmapped_count > 0 THEN
      RAISE WARNING '[remap-auth-uuids] Unmapped users (not re-invited on target): %', unmapped_count;
      RAISE WARNING '[remap-auth-uuids] Remap will skip these, leaving orphans in FK columns.';
    END IF;
  END;
$$;

-- Discover all uuid columns with user-related names
DO $$
  DECLARE
    _user_cols TEXT[] := ARRAY[
      'user_id', 'created_by', 'updated_by', 'owner_id', 'assignee_id', 'reporter_id',
      'reviewer_id', 'approver_id', 'assigned_to', 'assigned_by', 'invited_by',
      'modified_by', 'deleted_by', 'profile_id', 'auth_user_id', 'catalyst_user_id'
    ];
    _col_name TEXT;
    _table_name TEXT;
    _sql TEXT;
    _count INT;
  BEGIN
    FOR _table_name IN
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    LOOP
      FOREACH _col_name IN ARRAY _user_cols LOOP
        -- Check if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = _table_name
            AND column_name = _col_name
            AND udt_name = 'uuid'
        ) THEN
          -- Skip profiles.id = user_id (PK, don't remap)
          IF _table_name = 'profiles' AND _col_name = 'user_id' THEN
            -- Map profiles.user_id only if not the PK (id column)
            _sql := FORMAT('
              UPDATE %I
              SET %I = am.new_id
              FROM auth_uuid_map am
              WHERE %I = am.old_id
                AND %I != id
              ',
              _table_name, _col_name, _col_name, _col_name
            );
          ELSE
            -- Standard update
            _sql := FORMAT('
              UPDATE %I
              SET %I = am.new_id
              FROM auth_uuid_map am
              WHERE %I = am.old_id
              ',
              _table_name, _col_name, _col_name
            );
          END IF;

          EXECUTE _sql;
          GET DIAGNOSTICS _count = ROW_COUNT;

          IF _count > 0 THEN
            RAISE NOTICE '[remap-auth-uuids] % rows updated in %.%', _count, _table_name, _col_name;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END;
$$;

-- Orphan check: user_roles with non-existent user_id
DO $$
  DECLARE
    orphan_count INT;
  BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM user_roles ur
    WHERE ur.user_id NOT IN (SELECT id FROM auth.users);

    IF orphan_count > 0 THEN
      RAISE WARNING '[remap-auth-uuids] Found % orphaned user_roles (user_id not in auth.users)', orphan_count;
    END IF;
  END;
$$;

-- Orphan check: profiles with non-existent user_id
DO $$
  DECLARE
    orphan_count INT;
  BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM profiles p
    WHERE p.user_id NOT IN (SELECT id FROM auth.users);

    IF orphan_count > 0 THEN
      RAISE WARNING '[remap-auth-uuids] Found % orphaned profiles (user_id not in auth.users)', orphan_count;
    END IF;
  END;
$$;

-- Summary
DO $$
  DECLARE
    mapped_count INT;
  BEGIN
    SELECT COUNT(*) INTO mapped_count FROM auth_uuid_map;
    RAISE NOTICE '[remap-auth-uuids] ✅ Remapping complete: % user UUIDs remapped across all tables', mapped_count;
    RAISE NOTICE '[remap-auth-uuids] Check warnings above for orphaned records (if any)';
  END;
$$;

-- Clean up
DROP TABLE auth_uuid_map;
DROP TABLE source_users;
