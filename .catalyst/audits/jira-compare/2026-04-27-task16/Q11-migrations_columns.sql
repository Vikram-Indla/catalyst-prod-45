-- Q11a. First, find the real shape of supabase_migrations.schema_migrations.
-- We don't know if it has a timestamp column or just version/name/statements/hash.
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name   = 'schema_migrations'
ORDER BY ordinal_position;
