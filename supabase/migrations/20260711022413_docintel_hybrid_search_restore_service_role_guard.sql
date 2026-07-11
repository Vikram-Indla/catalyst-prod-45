-- CAT-DOCINTEL-V2-20260709-001 — intermediate hotfix, SUPERSEDED in the same session by
-- 20260711022609_docintel_hybrid_search_full_restore_with_theme.sql.
--
-- Context: the Slice-5 themes migration recreated docintel_hybrid_search from the ORIGINAL rpcs
-- body, which had reverted several later patches. This step restored only the service-role guard
-- (auth.uid() IS NOT NULL) so service-role Ask callers stop failing "not a member". It still lacked
-- the `extensions` search_path (<=> operator), the regconfig FTS cast, and the document_updated_at
-- freshness column — all restored by the superseding migration below. Kept as a committed no-op-ish
-- record for ledger 1:1 with schema_migrations; the final migration is authoritative.
CREATE OR REPLACE FUNCTION public.docintel_hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  p_project_id uuid,
  p_document_ids uuid[] DEFAULT NULL,
  p_langs text[] DEFAULT NULL,
  p_content_kinds text[] DEFAULT NULL,
  p_page_from int DEFAULT NULL,
  p_page_to int DEFAULT NULL,
  p_min_confidence numeric DEFAULT NULL,
  match_count int DEFAULT 12,
  vector_weight float DEFAULT 0.6,
  keyword_weight float DEFAULT 0.4,
  rrf_k int DEFAULT 60,
  p_theme_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid, document_id uuid, content text, lang text,
  page_numbers int[], block_ids uuid[],
  rrf_score float, vector_sim float, keyword_rank int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ph_project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'docintel_hybrid_search: not a member of project %', p_project_id;
  END IF;

  RETURN QUERY
  WITH
  candidate_embeddings AS (
    SELECT
      c.id AS chunk_id, c.document_id AS document_id, c.content AS content, c.lang AS lang,
      c.page_numbers AS page_numbers, c.block_ids AS block_ids, e.embedding AS embedding
    FROM public.ai_document_embeddings e
    JOIN public.ai_document_chunks c ON c.id = e.chunk_id
    WHERE e.project_id = p_project_id
      AND (p_document_ids IS NULL OR e.document_id = ANY (p_document_ids))
      AND (p_content_kinds IS NULL OR e.content_kind = ANY (p_content_kinds))
      AND (p_langs IS NULL OR c.lang = ANY (p_langs))
      AND (p_page_from IS NULL OR EXISTS (SELECT 1 FROM unnest(c.page_numbers) pn WHERE pn >= p_page_from))
      AND (p_page_to IS NULL OR EXISTS (SELECT 1 FROM unnest(c.page_numbers) pn WHERE pn <= p_page_to))
      AND (p_theme_id IS NULL OR EXISTS (
             SELECT 1 FROM public.ai_document_themes dt
             WHERE dt.document_id = e.document_id AND dt.theme_id = p_theme_id))
  ),
  vector_results AS (
    SELECT ce.chunk_id, ce.document_id, ce.content, ce.lang, ce.page_numbers, ce.block_ids,
      1 - (ce.embedding <=> query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY ce.embedding <=> query_embedding) AS rank
    FROM candidate_embeddings ce
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT ce.chunk_id, ce.document_id, ce.content, ce.lang, ce.page_numbers, ce.block_ids,
      ts_rank_cd(
        to_tsvector(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, ce.content),
        websearch_to_tsquery(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, query_text)
      ) AS kw_score,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, ce.content),
          websearch_to_tsquery(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, query_text)
        ) DESC
      ) AS rank
    FROM candidate_embeddings ce
    WHERE to_tsvector(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, ce.content)
          @@ websearch_to_tsquery(CASE WHEN ce.lang = 'ar' THEN 'simple' ELSE 'english' END, query_text)
    LIMIT match_count * 2
  ),
  fused AS (
    SELECT
      COALESCE(v.chunk_id, k.chunk_id) AS chunk_id,
      COALESCE(v.document_id, k.document_id) AS document_id,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.lang, k.lang) AS lang,
      COALESCE(v.page_numbers, k.page_numbers) AS page_numbers,
      COALESCE(v.block_ids, k.block_ids) AS block_ids,
      COALESCE(vector_weight / (rrf_k + v.rank), 0) + COALESCE(keyword_weight / (rrf_k + k.rank), 0) AS rrf_score,
      COALESCE(v.similarity, 0) AS vector_similarity,
      k.rank AS keyword_rank
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.chunk_id = k.chunk_id
  )
  SELECT f.chunk_id, f.document_id, f.content, f.lang, f.page_numbers, f.block_ids,
    f.rrf_score::float, f.vector_similarity::float, f.keyword_rank::int
  FROM fused f
  ORDER BY f.rrf_score DESC
  LIMIT match_count;
END;
$$;
