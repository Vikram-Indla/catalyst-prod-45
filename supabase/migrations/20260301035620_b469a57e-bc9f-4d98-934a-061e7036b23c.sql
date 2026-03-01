
-- Wiki Sync Runs (nightly execution log)
CREATE TABLE IF NOT EXISTS public.wiki_sync_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  steps JSONB DEFAULT '[]',
  total_items_processed INTEGER DEFAULT 0,
  new_pages INTEGER DEFAULT 0,
  updated_pages INTEGER DEFAULT 0,
  new_chunks INTEGER DEFAULT 0,
  total_duration_ms INTEGER,
  error_message TEXT,
  triggered_by TEXT DEFAULT 'scheduled',
  created_by UUID
);

-- Validation trigger instead of CHECK for status
CREATE OR REPLACE FUNCTION public.validate_wiki_sync_run_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('running','complete','failed','partial') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.triggered_by NOT IN ('scheduled','manual') THEN
    RAISE EXCEPTION 'Invalid triggered_by: %', NEW.triggered_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_wiki_sync_run
  BEFORE INSERT OR UPDATE ON public.wiki_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.validate_wiki_sync_run_status();

ALTER TABLE public.wiki_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_sync_read" ON public.wiki_sync_runs FOR SELECT USING (true);
CREATE POLICY "wiki_sync_insert" ON public.wiki_sync_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "wiki_sync_update" ON public.wiki_sync_runs FOR UPDATE USING (true);

-- Wiki Health Checks
CREATE TABLE IF NOT EXISTS public.wiki_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC,
  threshold NUMERIC,
  status TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_wiki_health_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('healthy','warning','critical') THEN
    RAISE EXCEPTION 'Invalid health status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_wiki_health
  BEFORE INSERT OR UPDATE ON public.wiki_health_checks
  FOR EACH ROW EXECUTE FUNCTION public.validate_wiki_health_status();

ALTER TABLE public.wiki_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_health_read" ON public.wiki_health_checks FOR SELECT USING (true);
CREATE POLICY "wiki_health_insert" ON public.wiki_health_checks FOR INSERT WITH CHECK (true);

-- Admin aggregation view
CREATE OR REPLACE VIEW public.wiki_admin_stats AS
SELECT
  (SELECT COUNT(*) FROM wiki_pages WHERE status = 'published') AS total_pages,
  (SELECT COUNT(*) FROM wiki_pages WHERE status = 'draft') AS draft_pages,
  (SELECT COUNT(*) FROM wiki_pages WHERE status = 'review') AS review_pages,
  (SELECT COUNT(*) FROM kb_embeddings) AS total_chunks,
  (SELECT COUNT(*) FROM wiki_documents WHERE status = 'complete') AS total_documents,
  (SELECT COUNT(*) FROM wiki_documents WHERE status = 'failed') AS failed_documents,
  (SELECT AVG(ai_confidence) FROM wiki_pages WHERE status = 'published') AS avg_confidence,
  (SELECT COUNT(*) FROM kb_query_log WHERE created_at > now() - interval '24 hours') AS queries_today,
  (SELECT COUNT(*) FROM kb_cache) AS cache_entries,
  (SELECT MAX(started_at) FROM wiki_sync_runs WHERE status = 'complete') AS last_sync;

-- Page admin list view
CREATE OR REPLACE VIEW public.wiki_page_admin_list AS
SELECT 
  p.id, p.slug, p.title, p.domain_code, p.status, p.ai_confidence, p.source_coverage,
  p.version, p.last_generated, p.updated_at,
  EXTRACT(DAY FROM now() - p.updated_at)::INTEGER AS days_since_update,
  COUNT(DISTINCT r.id) AS reference_count,
  COUNT(DISTINCT rl.id) AS read_count
FROM wiki_pages p
LEFT JOIN wiki_references r ON r.page_id = p.id
LEFT JOIN wiki_read_log rl ON rl.page_id = p.id
GROUP BY p.id;
