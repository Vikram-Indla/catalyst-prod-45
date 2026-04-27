-- Q11. Which migrations have actually been applied to PROD?
-- We suspect PROD is behind the local migrations folder.
-- Looking for: gaps after 2026-04-01.
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
WHERE version >= '20260301'
ORDER BY version DESC
LIMIT 50;
