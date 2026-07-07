-- ============================================================================
-- DOCINTEL — retrieval freshness + fact-matching repair.
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001 · Slice S2
--
-- 1) docintel_hybrid_search gains document_updated_at (ai_documents.updated_at)
--    in its RETURNS TABLE so callers can weigh/display evidence freshness.
--    A return-type change cannot go through CREATE OR REPLACE, so the function
--    is dropped and recreated; body/semantics are otherwise IDENTICAL to
--    20260707038000 (membership guard, regconfig FTS, RRF fusion).
-- 2) ai_document_chunks.scope gains 'fact' — requirement-fact statements are
--    embedded as scope='fact' chunk rows (ai_document_embeddings.chunk_id is
--    NOT NULL, so fact embeddings need a real chunk to hang off).
-- 3) docintel_match_facts joined embeddings on document_id alone, so EVERY
--    fact of a document "matched" whenever ANY requirement_fact embedding of
--    that document was similar (a cross join) — and nothing ever wrote
--    requirement_fact embeddings anyway. Rejoin through the fact's own
--    scope='fact' chunk (statement_en / statement_ar content), best
--    similarity per fact.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) docintel_hybrid_search — add document_updated_at to the return row.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.docintel_hybrid_search(
  text, extensions.vector, uuid, uuid[], text[], text[], int, int, numeric, int, float, float, int);

CREATE FUNCTION public.docintel_hybrid_search(
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
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  lang text,
  page_numbers int[],
  block_ids uuid[],
  rrf_score float,
  vector_sim float,
  keyword_rank int,
  document_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Project scoping: caller must be a member of p_project_id.
  -- Enforce membership only for authenticated USER callers. Service-role
  -- server callers (edge functions) have auth.uid() = NULL, already did their
  -- own auth (requireMember), and bypass RLS anyway — so skip the guard for them.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ph_project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'docintel_hybrid_search: not a member of project %', p_project_id;
  END IF;

  RETURN QUERY
  WITH
  candidate_embeddings AS (
    -- Embeddings within the project (+ optional filters), joined to their chunk.
    SELECT
      c.id            AS chunk_id,
      c.document_id   AS document_id,
      c.content       AS content,
      c.lang          AS lang,
      c.page_numbers  AS page_numbers,
      c.block_ids     AS block_ids,
      e.embedding     AS embedding
    FROM public.ai_document_embeddings e
    JOIN public.ai_document_chunks c ON c.id = e.chunk_id
    WHERE e.project_id = p_project_id
      AND (p_document_ids IS NULL OR e.document_id = ANY (p_document_ids))
      AND (p_content_kinds IS NULL OR e.content_kind = ANY (p_content_kinds))
      AND (p_langs IS NULL OR c.lang = ANY (p_langs))
      AND (p_page_from IS NULL OR EXISTS (
             SELECT 1 FROM unnest(c.page_numbers) pn WHERE pn >= p_page_from))
      AND (p_page_to IS NULL OR EXISTS (
             SELECT 1 FROM unnest(c.page_numbers) pn WHERE pn <= p_page_to))
  ),
  vector_results AS (
    SELECT
      ce.chunk_id, ce.document_id, ce.content, ce.lang,
      ce.page_numbers, ce.block_ids,
      1 - (ce.embedding <=> query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY ce.embedding <=> query_embedding) AS rank
    FROM candidate_embeddings ce
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    -- Runtime FTS: Arabic chunks use the 'simple' config, English uses 'english'.
    SELECT
      ce.chunk_id, ce.document_id, ce.content, ce.lang,
      ce.page_numbers, ce.block_ids,
      ts_rank_cd(
        to_tsvector((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, ce.content),
        websearch_to_tsquery((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, query_text)
      ) AS kw_score,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, ce.content),
          websearch_to_tsquery((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, query_text)
        ) DESC
      ) AS rank
    FROM candidate_embeddings ce
    WHERE to_tsvector((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, ce.content)
          @@ websearch_to_tsquery((CASE WHEN ce.lang = 'ar' THEN 'arabic' ELSE 'english' END)::regconfig, query_text)
    LIMIT match_count * 2
  ),
  fused AS (
    SELECT
      COALESCE(v.chunk_id, k.chunk_id)         AS chunk_id,
      COALESCE(v.document_id, k.document_id)   AS document_id,
      COALESCE(v.content, k.content)           AS content,
      COALESCE(v.lang, k.lang)                 AS lang,
      COALESCE(v.page_numbers, k.page_numbers) AS page_numbers,
      COALESCE(v.block_ids, k.block_ids)       AS block_ids,
      COALESCE(vector_weight / (rrf_k + v.rank), 0) +
      COALESCE(keyword_weight / (rrf_k + k.rank), 0) AS rrf_score,
      COALESCE(v.similarity, 0)                AS vector_similarity,
      k.rank                                   AS keyword_rank
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.chunk_id = k.chunk_id
  )
  SELECT
    f.chunk_id, f.document_id, f.content, f.lang,
    f.page_numbers, f.block_ids,
    f.rrf_score::float, f.vector_similarity::float, f.keyword_rank::int,
    d.updated_at
  FROM fused f
  JOIN public.ai_documents d ON d.id = f.document_id
  ORDER BY f.rrf_score DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.docintel_hybrid_search(
  text, extensions.vector, uuid, uuid[], text[], text[], int, int, numeric, int, float, float, int)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) ai_document_chunks.scope — allow 'fact' (requirement-fact statement
--    chunks carrying the requirement_fact embeddings).
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_document_chunks DROP CONSTRAINT IF EXISTS ai_document_chunks_scope_check;
ALTER TABLE public.ai_document_chunks ADD CONSTRAINT ai_document_chunks_scope_check
  CHECK (scope IN ('heading_section','paragraph','table','image_caption','page','fact'));

-- ---------------------------------------------------------------------------
-- 3) docintel_match_facts — join each fact to ITS OWN embedding (via the
--    scope='fact' chunk holding statement_en / statement_ar), best similarity
--    per fact. Same signature ⇒ CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.docintel_match_facts(
  query_embedding extensions.vector(1536),
  p_project_id uuid,
  p_kinds text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  kind text,
  statement_en text,
  statement_ar text,
  review_status text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Enforce membership only for authenticated USER callers. Service-role
  -- server callers (edge functions) have auth.uid() = NULL, already did their
  -- own auth (requireMember), and bypass RLS anyway — so skip the guard for them.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ph_project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'docintel_match_facts: not a member of project %', p_project_id;
  END IF;

  RETURN QUERY
  SELECT
    b.fact_id, b.fact_document_id, b.fact_kind,
    b.fact_statement_en, b.fact_statement_ar, b.fact_review_status,
    b.sim
  FROM (
    -- Best (smallest-distance) embedding per fact: a fact may carry two
    -- statement embeddings (en + ar); DISTINCT ON keeps the closer one.
    SELECT DISTINCT ON (rf.id)
      rf.id            AS fact_id,
      rf.document_id   AS fact_document_id,
      rf.kind          AS fact_kind,
      rf.statement_en  AS fact_statement_en,
      rf.statement_ar  AS fact_statement_ar,
      rf.review_status AS fact_review_status,
      (1 - (e.embedding <=> query_embedding))::float AS sim
    FROM public.ai_requirement_facts rf
    JOIN public.ai_document_chunks c
      ON c.document_id = rf.document_id
     AND c.scope = 'fact'
     AND (c.content = rf.statement_en OR c.content = rf.statement_ar)
    JOIN public.ai_document_embeddings e
      ON e.chunk_id = c.id
     AND e.content_kind = 'requirement_fact'
    WHERE rf.project_id = p_project_id
      AND (p_kinds IS NULL OR rf.kind = ANY (p_kinds))
    ORDER BY rf.id, e.embedding <=> query_embedding
  ) b
  WHERE b.sim > match_threshold
  ORDER BY b.sim DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.docintel_match_facts(
  extensions.vector, uuid, text[], float, int)
  TO authenticated, service_role;
