-- Auth UUID Remapping Helper
--
-- After migrating data to a new Supabase project, auth.users will have different UUIDs
-- than the source project. This script remaps profile.user_id and user_roles.user_id
-- from source UUIDs to target UUIDs based on email matching.
--
-- Usage:
--   1. Apply full_schema.sql and migrate-data-to-external.sh on target project
--   2. Re-invite users on target project (they'll get new auth.users UUIDs)
--   3. Run this script on target project to remap all user_id foreign keys
--
-- Requirements:
--   - Source and target projects must have the same user emails
--   - All target users must be invited and confirmed in auth.users
--   - profiles and user_roles tables must exist with email-indexed lookup

-- Create temporary mapping table: email → source_uuid → target_uuid
CREATE TEMP TABLE auth_uuid_map AS
SELECT
  p.user_id AS source_uuid,
  au.id AS target_uuid,
  p.email
FROM profiles p
LEFT JOIN auth.users au ON p.email = au.email
WHERE au.id IS NOT NULL
  AND p.user_id != au.id;  -- Only include rows that actually need remapping

-- Verify mapping completeness
DO $$
  DECLARE
    unmapped_count INT;
    total_profiles INT;
    remapped_count INT;
  BEGIN
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    SELECT COUNT(*) INTO remapped_count FROM auth_uuid_map;
    SELECT COUNT(*) INTO unmapped_count FROM profiles
      WHERE user_id NOT IN (
        SELECT source_uuid FROM auth_uuid_map
        UNION ALL
        SELECT id FROM auth.users
      );

    RAISE NOTICE 'Auth UUID Remapping Check:';
    RAISE NOTICE '  Total profiles: %', total_profiles;
    RAISE NOTICE '  Remapped: %', remapped_count;
    RAISE NOTICE '  Unmapped/orphaned: %', unmapped_count;

    IF unmapped_count > 0 THEN
      RAISE WARNING 'Found % profiles with no matching auth.users. Remap will create orphaned records.', unmapped_count;
      RAISE WARNING 'Re-invite missing users on target project before proceeding.';
    END IF;
  END;
$$;

-- Remap profiles.user_id
UPDATE profiles
SET user_id = (
  SELECT target_uuid
  FROM auth_uuid_map
  WHERE auth_uuid_map.source_uuid = profiles.user_id
)
WHERE user_id IN (SELECT source_uuid FROM auth_uuid_map);

-- Remap user_roles.user_id
UPDATE user_roles
SET user_id = (
  SELECT target_uuid
  FROM auth_uuid_map
  WHERE auth_uuid_map.source_uuid = user_roles.user_id
)
WHERE user_id IN (SELECT source_uuid FROM auth_uuid_map);

-- Remap user_product_roles.user_id (if it exists)
UPDATE user_product_roles
SET user_id = (
  SELECT target_uuid
  FROM auth_uuid_map
  WHERE auth_uuid_map.source_uuid = user_product_roles.user_id
)
WHERE user_id IN (SELECT source_uuid FROM auth_uuid_map)
  AND EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_product_roles' AND table_schema = 'public');

-- Remap user_permissions.user_id (if it exists)
UPDATE user_permissions
SET user_id = (
  SELECT target_uuid
  FROM auth_uuid_map
  WHERE auth_uuid_map.source_uuid = user_permissions.user_id
)
WHERE user_id IN (SELECT source_uuid FROM auth_uuid_map)
  AND EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_permissions' AND table_schema = 'public');

-- Remap r360_profiles.profile_id (if it's a user FK)
UPDATE r360_profiles
SET profile_id = (
  SELECT target_uuid
  FROM auth_uuid_map
  WHERE auth_uuid_map.source_uuid = r360_profiles.profile_id
)
WHERE profile_id IN (SELECT source_uuid FROM auth_uuid_map)
  AND EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name = 'r360_profiles' AND table_schema = 'public');

-- Report results
DO $$
  DECLARE
    remapped_count INT;
  BEGIN
    SELECT COUNT(*) INTO remapped_count FROM auth_uuid_map;
    RAISE NOTICE 'Remapping complete: % user IDs remapped across profiles, user_roles, and related tables', remapped_count;
  END;
$$;

-- Clean up
DROP TABLE auth_uuid_map;
