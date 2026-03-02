
-- Wiki Diagnostic Helper Functions

CREATE OR REPLACE FUNCTION get_kb_chunks_summary()
RETURNS TABLE(
  source_table text,
  chunk_type_val text,
  chunk_count bigint,
  unique_urls bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(metadata->>'table', source_type) as source_table,
    COALESCE(chunk_type, '(null)') as chunk_type_val,
    count(*) as chunk_count,
    count(DISTINCT source_url) as unique_urls
  FROM kb_embeddings
  GROUP BY metadata->>'table', source_type, chunk_type
  ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION get_kb_sample_keys()
RETURNS TABLE(
  source_table text,
  source_key text,
  chunks bigint,
  preview text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(metadata->>'table', source_type) as source_table,
    COALESCE(source_url, '(none)') as source_key,
    count(*) as chunks,
    COALESCE(
      (metadata->>'title')::text,
      left(content, 100)
    ) as preview
  FROM kb_embeddings
  GROUP BY metadata->>'table', source_type, source_url, metadata->>'title', content
  ORDER BY count(*) DESC
  LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION get_wiki_diagnostic_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_chunks', (SELECT count(*) FROM kb_embeddings),
    'source_types', (SELECT count(DISTINCT source_type) FROM kb_embeddings),
    'source_tables', (SELECT count(DISTINCT metadata->>'table') FROM kb_embeddings),
    'domains', (SELECT count(*) FROM wiki_domains),
    'categories', (SELECT count(*) FROM wiki_categories),
    'pages', (SELECT count(*) FROM wiki_pages),
    'published_pages', (SELECT count(*) FROM wiki_pages WHERE status = 'published'),
    'sections', (SELECT count(*) FROM wiki_sections),
    'references', (SELECT count(*) FROM wiki_references),
    'documents', (SELECT count(*) FROM wiki_documents),
    'bookmarks', (SELECT count(*) FROM wiki_bookmarks),
    'read_log', (SELECT count(*) FROM wiki_read_log),
    'sync_runs', (SELECT count(*) FROM wiki_sync_runs),
    'last_sync', (SELECT max(started_at) FROM wiki_sync_runs),
    'last_sync_status', (SELECT status FROM wiki_sync_runs ORDER BY started_at DESC LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION get_schema_check()
RETURNS TABLE(
  table_name text,
  status text,
  row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  cnt bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'planner_tasks', 'tm_test_cases', 'planner_workstreams', 'profiles', 
    'ph_issues', 'epics', 'stories', 'business_requests', 'incidents',
    'wiki_domains', 'wiki_categories', 'wiki_pages', 'wiki_sections',
    'wiki_references', 'wiki_documents', 'wiki_bookmarks', 'wiki_read_log',
    'wiki_sync_runs', 'kb_embeddings', 'kb_sources', 'kb_training_questions', 'kb_cache'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('SELECT count(*) FROM %I', t) INTO cnt;
      table_name := t;
      status := 'exists';
      row_count := cnt;
      RETURN NEXT;
    ELSE
      table_name := t;
      status := 'missing';
      row_count := 0;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_column_check()
RETURNS TABLE(
  tbl text,
  col text,
  status text,
  data_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expected AS (
    VALUES 
      ('kb_embeddings', 'source_type'),
      ('kb_embeddings', 'source_url'),
      ('kb_embeddings', 'metadata'),
      ('kb_embeddings', 'chunk_type'),
      ('kb_embeddings', 'content_hash'),
      ('kb_embeddings', 'embedding'),
      ('kb_embeddings', 'tags'),
      ('planner_tasks', 'title'),
      ('planner_tasks', 'description'),
      ('tm_test_cases', 'case_key'),
      ('tm_test_cases', 'title'),
      ('tm_test_cases', 'status'),
      ('planner_workstreams', 'name'),
      ('planner_workstreams', 'description'),
      ('planner_workstreams', 'is_active'),
      ('profiles', 'full_name'),
      ('profiles', 'role'),
      ('ph_issues', 'issue_key'),
      ('ph_issues', 'summary'),
      ('ph_issues', 'description_text'),
      ('incidents', 'incident_key'),
      ('incidents', 'title'),
      ('incidents', 'resolution_summary')
  )
  SELECT 
    e.column1 as tbl,
    e.column2 as col,
    CASE 
      WHEN c.column_name IS NOT NULL THEN 'exists'
      ELSE 'missing'
    END as status,
    COALESCE(c.data_type, '-') as data_type
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
    AND c.table_name = e.column1
    AND c.column_name = e.column2
  ORDER BY e.column1, e.column2;
$$;

CREATE OR REPLACE FUNCTION get_kb_source_type_check()
RETURNS TABLE(
  constraint_name text,
  allowed_values text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as allowed_values
  FROM pg_constraint 
  WHERE conrelid = 'public.kb_embeddings'::regclass 
  AND contype = 'c';
$$;
