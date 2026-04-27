-- Q11b. Just versions + name. No timestamp guess. Run AFTER Q11a confirms shape.
-- Looking for: highest version applied vs local repo's most recent
-- (20260427090000 = today's audit-B fixup; if PROD is missing migrations
--  >= 20260403, that's why guard_2026 trigger isn't in pg_trigger).
SELECT
  version,
  COALESCE(name, '') AS name
FROM supabase_migrations.schema_migrations
WHERE version >= '20260301'
ORDER BY version DESC
LIMIT 80;
