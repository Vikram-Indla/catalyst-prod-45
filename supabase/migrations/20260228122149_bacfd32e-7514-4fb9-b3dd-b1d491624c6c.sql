
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- kb_sources
CREATE TABLE IF NOT EXISTS public.kb_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'ministry'
    CHECK (source_type IN ('ministry', 'jira', 'catalyst', 'brd', 'internal')),
  priority INTEGER NOT NULL DEFAULT 1
    CHECK (priority BETWEEN 1 AND 10),
  is_active BOOLEAN NOT NULL DEFAULT true,
  scrape_depth INTEGER DEFAULT 3,
  scrape_frequency TEXT DEFAULT 'daily',
  last_scraped_at TIMESTAMPTZ,
  pages_indexed INTEGER DEFAULT 0,
  content_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kb_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kb_sources" ON public.kb_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kb_sources" ON public.kb_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.kb_sources (label, url, description, source_type, priority, is_active, pages_indexed) VALUES
  ('Industrial Services', 'https://industry.sa/en/services', '13 license types, import services, incentives, financial solutions, customs exemptions, chemical permits', 'ministry', 1, true, 42),
  ('Programs', 'https://industry.sa/en/programs', 'Future Factories, SME, Industrial Competitiveness, Standard Incentives', 'ministry', 1, true, 12),
  ('Homepage & About', 'https://industry.sa', 'Ministry overview, Vision 2030 context, Senaei platform info', 'ministry', 1, true, 8),
  ('Help & Support', 'https://industry.sa/en/support', 'FAQs, contact info, SLA, working hours (Sun-Thu 8AM-4PM)', 'ministry', 1, true, 6),
  ('Jira Cloud API', 'https://jira.atlassian.net', 'Epics, stories, sub-tasks, comments, attachments, changelogs', 'jira', 2, true, 0),
  ('BRD Attachments', 'internal://brd-attachments', 'Business requirement docs extracted from Jira epic attachments', 'brd', 2, true, 0),
  ('Catalyst Database', 'internal://catalyst-db', 'Routes, modules, schemas via preflight discovery', 'catalyst', 3, true, 0),
  ('User Roles & Assignments', 'internal://admin-users', 'User roles, assignments, team structure for contributor mapping', 'internal', 3, true, 0)
ON CONFLICT (url) DO NOTHING;

-- kb_training_questions
CREATE TABLE IF NOT EXISTS public.kb_training_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_number INTEGER NOT NULL UNIQUE,
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'ar')),
  expected_answer TEXT,
  embedding extensions.vector(1536),
  is_embedded BOOLEAN DEFAULT false,
  cache_hits INTEGER DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kb_training_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kb_training_questions" ON public.kb_training_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kb_training_questions" ON public.kb_training_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_kb_training_category ON public.kb_training_questions (category);
CREATE INDEX IF NOT EXISTS idx_kb_training_language ON public.kb_training_questions (language);

-- kb_embeddings
CREATE TABLE IF NOT EXISTS public.kb_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('ministry', 'jira', 'catalyst', 'brd', 'internal')),
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  embedding extensions.vector(1536),
  chunk_index INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_hash)
);

ALTER TABLE public.kb_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kb_embeddings" ON public.kb_embeddings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kb_embeddings" ON public.kb_embeddings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_source ON public.kb_embeddings (source_type);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_metadata ON public.kb_embeddings USING gin (metadata);

-- kb_cache
CREATE TABLE IF NOT EXISTS public.kb_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_json JSONB NOT NULL,
  language TEXT DEFAULT 'en',
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  ttl_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kb_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kb_cache" ON public.kb_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kb_cache" ON public.kb_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_kb_cache_hash ON public.kb_cache (query_hash);

-- kb_query_log
CREATE TABLE IF NOT EXISTS public.kb_query_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_role TEXT,
  query_text TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  input_method TEXT DEFAULT 'keyboard'
    CHECK (input_method IN ('keyboard', 'voice')),
  was_answered BOOLEAN DEFAULT true,
  was_helpful BOOLEAN,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  matched_category TEXT,
  confidence_score NUMERIC(4,3),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kb_query_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own query logs" ON public.kb_query_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own query logs" ON public.kb_query_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own query logs" ON public.kb_query_log FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_kb_query_log_user ON public.kb_query_log (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_query_log_created ON public.kb_query_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_query_log_category ON public.kb_query_log (matched_category);
CREATE INDEX IF NOT EXISTS idx_kb_query_log_helpful ON public.kb_query_log (was_helpful);

-- kb_access_matrix
CREATE TABLE IF NOT EXISTS public.kb_access_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  module_name TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_name, module_name)
);

ALTER TABLE public.kb_access_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kb_access_matrix" ON public.kb_access_matrix FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kb_access_matrix" ON public.kb_access_matrix FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.kb_access_matrix (role_name, module_name, has_access) VALUES
  ('Administrator', 'Stories & Epics', true),('Administrator', 'Production Incidents', true),('Administrator', 'Defects & QA', true),('Administrator', 'People & Assignments', true),('Administrator', 'Sprints & Velocity', true),('Administrator', 'Budget & Capacity', true),('Administrator', 'Attachments & Docs', true),('Administrator', 'Comments & History', true),('Administrator', 'Timelines & Dates', true),('Administrator', 'Catalyst Navigation', true),('Administrator', 'Analytics & Reports', true),('Administrator', 'Linked Items', true),
  ('Project Manager', 'Stories & Epics', true),('Project Manager', 'Production Incidents', true),('Project Manager', 'Defects & QA', true),('Project Manager', 'People & Assignments', true),('Project Manager', 'Sprints & Velocity', true),('Project Manager', 'Budget & Capacity', true),('Project Manager', 'Attachments & Docs', true),('Project Manager', 'Comments & History', true),('Project Manager', 'Timelines & Dates', true),('Project Manager', 'Catalyst Navigation', true),('Project Manager', 'Analytics & Reports', true),('Project Manager', 'Linked Items', true),
  ('Product Owner', 'Stories & Epics', true),('Product Owner', 'Production Incidents', true),('Product Owner', 'Defects & QA', true),('Product Owner', 'People & Assignments', true),('Product Owner', 'Sprints & Velocity', true),('Product Owner', 'Budget & Capacity', false),('Product Owner', 'Attachments & Docs', true),('Product Owner', 'Comments & History', true),('Product Owner', 'Timelines & Dates', true),('Product Owner', 'Catalyst Navigation', true),('Product Owner', 'Analytics & Reports', true),('Product Owner', 'Linked Items', true),
  ('Developer', 'Stories & Epics', true),('Developer', 'Production Incidents', true),('Developer', 'Defects & QA', true),('Developer', 'People & Assignments', true),('Developer', 'Sprints & Velocity', true),('Developer', 'Budget & Capacity', false),('Developer', 'Attachments & Docs', true),('Developer', 'Comments & History', true),('Developer', 'Timelines & Dates', true),('Developer', 'Catalyst Navigation', true),('Developer', 'Analytics & Reports', false),('Developer', 'Linked Items', true),
  ('QA Engineer', 'Stories & Epics', true),('QA Engineer', 'Production Incidents', true),('QA Engineer', 'Defects & QA', true),('QA Engineer', 'People & Assignments', true),('QA Engineer', 'Sprints & Velocity', true),('QA Engineer', 'Budget & Capacity', false),('QA Engineer', 'Attachments & Docs', true),('QA Engineer', 'Comments & History', true),('QA Engineer', 'Timelines & Dates', true),('QA Engineer', 'Catalyst Navigation', true),('QA Engineer', 'Analytics & Reports', false),('QA Engineer', 'Linked Items', true),
  ('UX Designer', 'Stories & Epics', true),('UX Designer', 'Production Incidents', false),('UX Designer', 'Defects & QA', true),('UX Designer', 'People & Assignments', true),('UX Designer', 'Sprints & Velocity', true),('UX Designer', 'Budget & Capacity', false),('UX Designer', 'Attachments & Docs', true),('UX Designer', 'Comments & History', true),('UX Designer', 'Timelines & Dates', true),('UX Designer', 'Catalyst Navigation', true),('UX Designer', 'Analytics & Reports', false),('UX Designer', 'Linked Items', false),
  ('Stakeholder', 'Stories & Epics', true),('Stakeholder', 'Production Incidents', false),('Stakeholder', 'Defects & QA', false),('Stakeholder', 'People & Assignments', false),('Stakeholder', 'Sprints & Velocity', true),('Stakeholder', 'Budget & Capacity', false),('Stakeholder', 'Attachments & Docs', false),('Stakeholder', 'Comments & History', false),('Stakeholder', 'Timelines & Dates', true),('Stakeholder', 'Catalyst Navigation', true),('Stakeholder', 'Analytics & Reports', true),('Stakeholder', 'Linked Items', false)
ON CONFLICT (role_name, module_name) DO NOTHING;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.kb_match_embeddings(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 10,
  filter_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.content, e.source_type, e.source_url, e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.kb_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_source IS NULL OR e.source_type = filter_source)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match training questions function
CREATE OR REPLACE FUNCTION public.kb_match_training(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.85,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question_number INTEGER,
  question TEXT,
  category TEXT,
  expected_answer TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.question_number, t.question, t.category, t.expected_answer,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.kb_training_questions t
  WHERE t.is_embedded = true
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION public.kb_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER kb_sources_updated BEFORE UPDATE ON public.kb_sources FOR EACH ROW EXECUTE FUNCTION public.kb_update_timestamp();
CREATE TRIGGER kb_cache_updated BEFORE UPDATE ON public.kb_cache FOR EACH ROW EXECUTE FUNCTION public.kb_update_timestamp();
CREATE TRIGGER kb_embeddings_updated BEFORE UPDATE ON public.kb_embeddings FOR EACH ROW EXECUTE FUNCTION public.kb_update_timestamp();

-- Cache hit counter function
CREATE OR REPLACE FUNCTION public.kb_cache_hit(p_query_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cached_response JSONB;
BEGIN
  UPDATE public.kb_cache
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE query_hash = p_query_hash
    AND created_at > now() - (ttl_hours || ' hours')::INTERVAL
  RETURNING response_json INTO cached_response;
  RETURN cached_response;
END;
$$;

-- Query log helper function
CREATE OR REPLACE FUNCTION public.kb_log_query(
  p_user_id UUID, p_user_name TEXT, p_user_role TEXT, p_query_text TEXT,
  p_language TEXT DEFAULT 'en', p_input_method TEXT DEFAULT 'keyboard',
  p_was_answered BOOLEAN DEFAULT true, p_response_time_ms INTEGER DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT false, p_matched_category TEXT DEFAULT NULL,
  p_confidence_score NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.kb_query_log (
    user_id, user_name, user_role, query_text, language,
    input_method, was_answered, response_time_ms, cache_hit,
    matched_category, confidence_score
  ) VALUES (
    p_user_id, p_user_name, p_user_role, p_query_text, p_language,
    p_input_method, p_was_answered, p_response_time_ms, p_cache_hit,
    p_matched_category, p_confidence_score
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Update helpful feedback function
CREATE OR REPLACE FUNCTION public.kb_update_helpful(p_log_id UUID, p_was_helpful BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.kb_query_log SET was_helpful = p_was_helpful WHERE id = p_log_id;
END;
$$;
