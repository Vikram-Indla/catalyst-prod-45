-- Q7. pg_trigger on ph_issues — every BEFORE/AFTER trigger
-- Per L27, never DROP TRIGGER without checking here first.
SELECT
  t.tgname             AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'replica-only'
    WHEN 'A' THEN 'always'
  END                  AS state,
  CASE WHEN t.tgtype & 2  = 2  THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE WHEN t.tgtype & 1  = 1  THEN 'ROW'    ELSE 'STATEMENT' END AS scope,
  CASE WHEN t.tgtype & 4  = 4  THEN 'INSERT' ELSE '' END
   || CASE WHEN t.tgtype & 16 = 16 THEN ' UPDATE' ELSE '' END
   || CASE WHEN t.tgtype & 8  = 8  THEN ' DELETE' ELSE '' END  AS events,
  p.proname            AS function_name,
  LEFT(pg_get_functiondef(p.oid)::text, 2000) AS function_def_preview
FROM pg_trigger t
JOIN pg_class    c ON c.oid = t.tgrelid
JOIN pg_proc     p ON p.oid = t.tgfoid
WHERE c.relname = 'ph_issues'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
