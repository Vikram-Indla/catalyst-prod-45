
-- ══════════════════════════════════════════════════════════════
-- CATALYST KB — ADVANCED RAG SCHEMA UPGRADES
-- No generated FTS column (exceeds 32MB maintenance_work_mem)
-- FTS computed at query time in the hybrid search function
-- ══════════════════════════════════════════════════════════════

-- 1. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Semantic chunk metadata columns on kb_embeddings
ALTER TABLE public.kb_embeddings
  ADD COLUMN IF NOT EXISTS chunk_type TEXT DEFAULT 'paragraph',
  ADD COLUMN IF NOT EXISTS parent_chunk_id UUID,
  ADD COLUMN IF NOT EXISTS section_title TEXT,
  ADD COLUMN IF NOT EXISTS token_count INTEGER,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Tags index (lightweight)
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_tags
  ON public.kb_embeddings USING gin (tags);

-- 4. Extend kb_query_log with RAG trace columns
ALTER TABLE public.kb_query_log
  ADD COLUMN IF NOT EXISTS query_rewrites TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retrieved_chunk_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retrieved_scores NUMERIC[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reranked_chunk_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reranked_scores NUMERIC[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_pack TEXT,
  ADD COLUMN IF NOT EXISTS generation_model TEXT DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS hallucination_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS retrieval_method TEXT DEFAULT 'vector';

-- 5. Eval dataset table
CREATE TABLE IF NOT EXISTS public.kb_eval_set (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  expected_key_points TEXT[] NOT NULL,
  expected_sources TEXT[],
  category TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Eval results table
CREATE TABLE IF NOT EXISTS public.kb_eval_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  eval_id UUID REFERENCES public.kb_eval_set(id),
  run_date TIMESTAMPTZ DEFAULT now(),
  actual_answer TEXT,
  key_points_hit INTEGER DEFAULT 0,
  key_points_total INTEGER DEFAULT 0,
  hit_rate NUMERIC(4,3),
  retrieval_method TEXT,
  chunks_retrieved INTEGER,
  response_time_ms INTEGER,
  confidence NUMERIC(4,3),
  hallucination_detected BOOLEAN DEFAULT false,
  notes TEXT
);

-- 7. Hybrid search function (vector + runtime FTS keyword fusion via RRF)
-- FTS is computed at query time via to_tsvector() instead of a stored column
CREATE OR REPLACE FUNCTION public.kb_hybrid_search(
  query_embedding extensions.vector(1536),
  query_text TEXT,
  match_count INT DEFAULT 30,
  vector_weight FLOAT DEFAULT 0.6,
  keyword_weight FLOAT DEFAULT 0.4,
  filter_source TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_url TEXT,
  metadata JSONB,
  section_title TEXT,
  tags TEXT[],
  vector_rank INT,
  keyword_rank INT,
  rrf_score FLOAT,
  vector_similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  vector_results AS (
    SELECT e.id, e.content, e.source_type, e.source_url, e.metadata,
      e.section_title, e.tags,
      1 - (e.embedding <=> query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_embedding) AS rank
    FROM public.kb_embeddings e
    WHERE (filter_source IS NULL OR e.source_type = filter_source)
      AND (filter_tags IS NULL OR e.tags && filter_tags)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT e.id, e.content, e.source_type, e.source_url, e.metadata,
      e.section_title, e.tags,
      ts_rank_cd(to_tsvector('english', e.content), websearch_to_tsquery('english', query_text)) AS kw_score,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(to_tsvector('english', e.content), websearch_to_tsquery('english', query_text)) DESC
      ) AS rank
    FROM public.kb_embeddings e
    WHERE to_tsvector('english', e.content) @@ websearch_to_tsquery('english', query_text)
      AND (filter_source IS NULL OR e.source_type = filter_source)
      AND (filter_tags IS NULL OR e.tags && filter_tags)
    LIMIT match_count * 2
  ),
  fused AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.source_type, k.source_type) AS source_type,
      COALESCE(v.source_url, k.source_url) AS source_url,
      COALESCE(v.metadata, k.metadata) AS metadata,
      COALESCE(v.section_title, k.section_title) AS section_title,
      COALESCE(v.tags, k.tags) AS tags,
      v.rank AS vector_rank, k.rank AS keyword_rank,
      COALESCE(vector_weight / (rrf_k + v.rank), 0) +
      COALESCE(keyword_weight / (rrf_k + k.rank), 0) AS rrf_score,
      COALESCE(v.similarity, 0) AS vector_similarity
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
  )
  SELECT f.id, f.content, f.source_type, f.source_url, f.metadata,
    f.section_title, f.tags,
    f.vector_rank::INT, f.keyword_rank::INT,
    f.rrf_score::FLOAT, f.vector_similarity::FLOAT
  FROM fused f
  ORDER BY f.rrf_score DESC
  LIMIT match_count;
END;
$$;

-- 8. RLS for new tables
ALTER TABLE public.kb_eval_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_eval_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_eval_set_read" ON public.kb_eval_set
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_eval_set_admin" ON public.kb_eval_set
  FOR ALL TO authenticated USING (public.kb_is_admin());
CREATE POLICY "kb_eval_results_read" ON public.kb_eval_results
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_eval_results_admin" ON public.kb_eval_results
  FOR ALL TO authenticated USING (public.kb_is_admin());
