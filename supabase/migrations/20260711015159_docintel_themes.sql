-- CAT-DOCINTEL-V2-20260709-001 Slice 5 — knowledge themes (browsable groupings).
--
-- User-created themes (e.g. "Industrial Scanning") that group documents, plus a theme filter on
-- the hybrid-search RPC so retrieval / Ask can be scoped to a theme. Additive: the new RPC param
-- defaults NULL (no theme filter) so existing callers are byte-behaviour-unchanged. Slug contract
-- honoured (slug column + generate trigger, frozen on create). Staging cyij.

-- 1) Themes -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.docintel_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);
COMMENT ON TABLE public.docintel_themes IS
  'User-created knowledge themes per project (browsable groupings of documents). Slug frozen on create.';
CREATE INDEX IF NOT EXISTS idx_docintel_themes_project ON public.docintel_themes (project_id);

-- Slug trigger: derive from NEW.name, dedupe with -2/-3… within the project. Frozen on create.
CREATE OR REPLACE FUNCTION public.docintel_theme_generate_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base_slug := public.docintel_slugify(NEW.name);
  IF base_slug = '' THEN base_slug := 'theme'; END IF;
  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.docintel_themes t
    WHERE t.project_id = NEW.project_id AND t.slug = candidate
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
  ) LOOP
    n := n + 1;
    candidate := base_slug || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_docintel_theme_slug ON public.docintel_themes;
CREATE TRIGGER trg_docintel_theme_slug
  BEFORE INSERT ON public.docintel_themes
  FOR EACH ROW EXECUTE FUNCTION public.docintel_theme_generate_slug();

-- 2) Document ↔ theme tags --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_document_themes (
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.docintel_themes(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, theme_id)
);
COMMENT ON TABLE public.ai_document_themes IS 'Tags linking documents to themes (many-to-many).';
CREATE INDEX IF NOT EXISTS idx_ai_document_themes_theme ON public.ai_document_themes (theme_id);

-- 3) RLS — project members only --------------------------------------------
ALTER TABLE public.docintel_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docintel_themes_member ON public.docintel_themes;
CREATE POLICY docintel_themes_member ON public.docintel_themes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ph_project_members pm
                 WHERE pm.project_id = docintel_themes.project_id AND pm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ph_project_members pm
                      WHERE pm.project_id = docintel_themes.project_id AND pm.user_id = auth.uid()));

DROP POLICY IF EXISTS ai_document_themes_member ON public.ai_document_themes;
CREATE POLICY ai_document_themes_member ON public.ai_document_themes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.docintel_themes t
                 JOIN public.ph_project_members pm ON pm.project_id = t.project_id
                 WHERE t.id = ai_document_themes.theme_id AND pm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.docintel_themes t
                      JOIN public.ph_project_members pm ON pm.project_id = t.project_id
                      WHERE t.id = ai_document_themes.theme_id AND pm.user_id = auth.uid()));

-- 4) Hybrid search gains an optional theme filter --------------------------
-- Atomic drop+recreate (same txn → no gap for live Ask). New p_theme_id defaults NULL: when set,
-- candidate embeddings are restricted to documents tagged with that theme.
DROP FUNCTION IF EXISTS public.docintel_hybrid_search(
  text, extensions.vector, uuid, uuid[], text[], text[], int, int, numeric, int, float, float, int);

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
  id uuid,
  document_id uuid,
  content text,
  lang text,
  page_numbers int[],
  block_ids uuid[],
  rrf_score float,
  vector_sim float,
  keyword_rank int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ph_project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'docintel_hybrid_search: not a member of project %', p_project_id;
  END IF;

  RETURN QUERY
  WITH
  candidate_embeddings AS (
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
      AND (p_theme_id IS NULL OR EXISTS (
             SELECT 1 FROM public.ai_document_themes dt
             WHERE dt.document_id = e.document_id AND dt.theme_id = p_theme_id))
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
    SELECT
      ce.chunk_id, ce.document_id, ce.content, ce.lang,
      ce.page_numbers, ce.block_ids,
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
    f.rrf_score::float, f.vector_similarity::float, f.keyword_rank::int
  FROM fused f
  ORDER BY f.rrf_score DESC
  LIMIT match_count;
END;
$$;
