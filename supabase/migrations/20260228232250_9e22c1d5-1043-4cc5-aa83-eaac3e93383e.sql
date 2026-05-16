-- Drop and recreate kb_hybrid_search with vector casts
DO $outer$ BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.kb_hybrid_search(extensions.vector, text, integer, double precision, double precision, text, text[], integer)';
EXCEPTION WHEN OTHERS THEN NULL; END $outer$;

DO $outer$ BEGIN
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.kb_hybrid_search(
      query_embedding extensions.vector(1536),
      query_text text,
      match_count int DEFAULT 30,
      vector_weight float DEFAULT 0.6,
      keyword_weight float DEFAULT 0.4,
      filter_source text DEFAULT NULL,
      filter_tags text[] DEFAULT NULL,
      rrf_k int DEFAULT 60
    )
    RETURNS TABLE (
      id uuid,
      content text,
      source_type text,
      source_url text,
      metadata jsonb,
      section_title text,
      tags text[],
      vector_rank int,
      keyword_rank int,
      rrf_score float,
      vector_similarity float
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $body$
    BEGIN
      RETURN QUERY
      WITH vector_results AS (
        SELECT e.id, e.content, e.source_type, e.source_url, e.metadata,
          e.section_title, e.tags,
          (1 - (e.embedding <=> query_embedding))::float AS similarity,
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
    $body$
  $func$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping kb_hybrid_search: %', SQLERRM;
END $outer$;

-- Drop and recreate kb_match_embeddings with vector casts
DO $outer$ BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.kb_match_embeddings(extensions.vector, double precision, integer, text)';
EXCEPTION WHEN OTHERS THEN NULL; END $outer$;

DO $outer$ BEGIN
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.kb_match_embeddings(
      query_embedding extensions.vector(1536),
      match_threshold float DEFAULT 0.5,
      match_count int DEFAULT 10,
      filter_source text DEFAULT NULL
    )
    RETURNS TABLE (
      id uuid,
      content text,
      source_type text,
      source_url text,
      metadata jsonb,
      similarity float
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $body$
    BEGIN
      RETURN QUERY
      SELECT
        e.id,
        e.content,
        e.source_type,
        e.source_url,
        e.metadata,
        (1 - (e.embedding <=> query_embedding))::float AS similarity
      FROM public.kb_embeddings e
      WHERE (filter_source IS NULL OR e.source_type = filter_source)
        AND (1 - (e.embedding <=> query_embedding)) > match_threshold
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $body$
  $func$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping kb_match_embeddings: %', SQLERRM;
END $outer$;
