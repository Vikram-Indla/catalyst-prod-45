CREATE OR REPLACE FUNCTION public.kb_hybrid_search(
  query_embedding extensions.vector,
  query_text text,
  match_count integer DEFAULT 30,
  vector_weight double precision DEFAULT 0.6,
  keyword_weight double precision DEFAULT 0.4,
  filter_source text DEFAULT NULL::text,
  filter_tags text[] DEFAULT NULL::text[],
  rrf_k integer DEFAULT 60,
  use_simple_fts boolean DEFAULT false
)
RETURNS TABLE(id uuid, content text, source_type text, source_url text, metadata jsonb, section_title text, tags text[], vector_rank integer, keyword_rank integer, rrf_score double precision, vector_similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT e.id, e.content, e.source_type, e.source_url, e.metadata,
      e.section_title, e.tags,
      (1 - (e.embedding::vector(1536) <=> query_embedding::vector(1536)))::float AS similarity,
      ROW_NUMBER() OVER (ORDER BY e.embedding::vector(1536) <=> query_embedding::vector(1536)) AS rank
    FROM public.kb_embeddings e
    WHERE (filter_source IS NULL OR e.source_type = filter_source)
      AND (filter_tags IS NULL OR e.tags && filter_tags)
    ORDER BY e.embedding::vector(1536) <=> query_embedding::vector(1536)
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT e.id, e.content, e.source_type, e.source_url, e.metadata,
      e.section_title, e.tags,
      CASE WHEN use_simple_fts THEN
        ts_rank_cd(e.fts_ar, websearch_to_tsquery('simple', query_text))
      ELSE
        ts_rank_cd(to_tsvector('english', e.content), websearch_to_tsquery('english', query_text))
      END AS kw_score,
      ROW_NUMBER() OVER (
        ORDER BY CASE WHEN use_simple_fts THEN
          ts_rank_cd(e.fts_ar, websearch_to_tsquery('simple', query_text))
        ELSE
          ts_rank_cd(to_tsvector('english', e.content), websearch_to_tsquery('english', query_text))
        END DESC
      ) AS rank
    FROM public.kb_embeddings e
    WHERE
      CASE WHEN use_simple_fts THEN
        e.fts_ar @@ websearch_to_tsquery('simple', query_text)
      ELSE
        to_tsvector('english', e.content) @@ websearch_to_tsquery('english', query_text)
      END
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
$function$;