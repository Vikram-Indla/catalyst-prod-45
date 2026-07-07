-- ============================================================================
-- DOCINTEL — Arabic Document Intelligence RAG · Schema (tables, indexes, slug)
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
-- Conventions: UUID PKs, timestamptz, pgvector(1536) in extensions schema,
-- slug FROZEN on creation, updated_at touch triggers, sensible FK indexes.
-- project_id references public.ph_projects(id) — DocIntel binds to the ph_*
-- id-space (artifact promotion writes ph_work_items, whose project_id targets
-- ph_projects). RLS scopes by ph_project_members, mirroring the current
-- catalyst_issues policies (supabase/migrations/20260425185223_*).
-- ============================================================================

-- pgvector (idempotent per exemplar house style)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Helpers (docintel_* — never reuse strata_* functions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.docintel_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.docintel_slugify(input_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Slug trigger: derives slug from NEW.title when absent, dedupes with -2, -3…
-- Slug is FROZEN on creation (never recomputed on rename) per the slug contract.
CREATE OR REPLACE FUNCTION public.docintel_generate_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  clash int;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := public.docintel_slugify(NEW.title);
  IF base = '' THEN base := 'document'; END IF;
  candidate := base;
  LOOP
    EXECUTE format('SELECT 1 FROM %I.%I WHERE slug = $1 LIMIT 1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      INTO clash USING candidate;
    EXIT WHEN clash IS NULL;
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Core documents
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  original_file_name text,
  mime_type text,
  storage_path text,
  file_size bigint,
  page_count int,
  source_language text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','ingesting','extracting','describing','translating',
    'chunking','embedding','structuring','ready','failed','needs_review')),
  status_detail text,
  latency_ms jsonb NOT NULL DEFAULT '{}'::jsonb,   -- per-stage durations
  content_hash text,
  error_message text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_documents IS 'Uploaded documents processed by the Arabic DocIntel RAG pipeline; one row per document, slug FROZEN on creation.';
CREATE INDEX idx_ai_documents_project ON public.ai_documents (project_id);
CREATE INDEX idx_ai_documents_status ON public.ai_documents (status);
CREATE INDEX idx_ai_documents_content_hash ON public.ai_documents (content_hash);

CREATE TABLE public.ai_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  version_no int NOT NULL,
  storage_path text,
  content_hash text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_versions IS 'Immutable version history of a document''s underlying file (re-uploads / re-ingests).';
CREATE INDEX idx_ai_document_versions_document ON public.ai_document_versions (document_id);

CREATE TABLE public.ai_document_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_number int NOT NULL,
  is_scanned boolean,
  render_path text,
  ocr_confidence numeric,
  status text CHECK (status IN ('pending','extracting','extracted','described','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, page_number)
);
COMMENT ON TABLE public.ai_document_pages IS 'One row per document page; tracks per-page extraction/description status and OCR confidence.';
CREATE INDEX idx_ai_document_pages_document ON public.ai_document_pages (document_id);

CREATE TABLE public.ai_document_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.ai_document_pages(id) ON DELETE CASCADE,
  block_index int,
  kind text CHECK (kind IN ('heading','paragraph','list','table','image','caption','footer','header','other')),
  bbox jsonb,
  lang text,
  confidence numeric,
  extraction_source text CHECK (extraction_source IN ('native_pdf','docx','llm_ocr','llm_semantic')),
  provider text,
  model text,
  text_ar text,
  text_en text,
  char_start int,
  char_end int,
  table_id uuid,
  image_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_blocks IS 'Layout blocks extracted from a page (headings, paragraphs, tables, images…) with bilingual text.';
CREATE INDEX idx_ai_document_blocks_document ON public.ai_document_blocks (document_id);
CREATE INDEX idx_ai_document_blocks_page ON public.ai_document_blocks (page_id);

CREATE TABLE public.ai_document_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.ai_document_pages(id) ON DELETE CASCADE,
  block_id uuid,
  header_rows jsonb,
  rows jsonb,
  summary_ar text,
  summary_en text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_tables IS 'Structured table data extracted from a document block, with bilingual summaries.';
CREATE INDEX idx_ai_document_tables_document ON public.ai_document_tables (document_id);
CREATE INDEX idx_ai_document_tables_page ON public.ai_document_tables (page_id);

CREATE TABLE public.ai_document_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.ai_document_pages(id) ON DELETE CASCADE,
  block_id uuid,
  region_path text,
  kind text CHECK (kind IN ('diagram','chart','screenshot','photo','logo','other')),
  caption_ar text,
  caption_en text,
  description_en text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_images IS 'Image regions extracted from a document, with bilingual captions and an English description.';
CREATE INDEX idx_ai_document_images_document ON public.ai_document_images (document_id);
CREATE INDEX idx_ai_document_images_page ON public.ai_document_images (page_id);

CREATE TABLE public.ai_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  scope text CHECK (scope IN ('heading_section','paragraph','table','image_caption','page')),
  lang text CHECK (lang IN ('ar','en')),
  content text NOT NULL,
  block_ids uuid[],
  page_numbers int[],
  section_path text,
  char_count int,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_chunks IS 'Retrieval chunks derived from blocks/tables/images; the unit that gets embedded and searched.';
CREATE INDEX idx_ai_document_chunks_document ON public.ai_document_chunks (document_id);
CREATE INDEX idx_ai_document_chunks_content_hash ON public.ai_document_chunks (content_hash);

CREATE TABLE public.ai_document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES public.ai_document_chunks(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  content_kind text CHECK (content_kind IN ('ar_text','en_text','table_summary','image_caption','requirement_fact')),
  embedding extensions.vector(1536) NOT NULL,
  embedding_model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_embeddings IS 'Vector embeddings of chunks (one per content_kind); HNSW cosine index powers semantic retrieval.';
CREATE INDEX idx_ai_document_embeddings_hnsw ON public.ai_document_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX idx_ai_document_embeddings_document ON public.ai_document_embeddings (document_id);
CREATE INDEX idx_ai_document_embeddings_project ON public.ai_document_embeddings (project_id);
CREATE INDEX idx_ai_document_embeddings_chunk ON public.ai_document_embeddings (chunk_id);

CREATE TABLE public.ai_requirement_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  project_id uuid,
  kind text CHECK (kind IN ('capability','actor','workflow','requirement','constraint','risk','assumption','open_question')),
  statement_ar text,
  statement_en text NOT NULL,
  confidence numeric,
  source_block_ids uuid[],
  source_page_numbers int[],
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','confirmed','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_requirement_facts IS 'Structured requirement/capability facts distilled from a document, with review workflow.';
CREATE INDEX idx_ai_requirement_facts_document ON public.ai_requirement_facts (document_id);
CREATE INDEX idx_ai_requirement_facts_project ON public.ai_requirement_facts (project_id);

-- ---------------------------------------------------------------------------
-- Agent prompt registry + run ledger
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_agent_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  version int NOT NULL,
  prompt text NOT NULL,
  model_hint text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent, version)
);
COMMENT ON TABLE public.ai_agent_prompts IS 'Versioned system prompts per pipeline agent; service-role writable, authenticated-readable.';
CREATE INDEX idx_ai_agent_prompts_agent_active ON public.ai_agent_prompts (agent, is_active);

CREATE TABLE public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  document_id uuid REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  agent text NOT NULL,
  intent text,
  prompt_id uuid REFERENCES public.ai_agent_prompts(id) ON DELETE SET NULL,
  provider text,
  model text,
  input_hash text,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  status text CHECK (status IN ('running','ok','error')),
  error_message text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_agent_runs IS 'Ledger of every LLM agent invocation (tokens, latency, provider/model) for cost + observability.';
CREATE INDEX idx_ai_agent_runs_document ON public.ai_agent_runs (document_id);
CREATE INDEX idx_ai_agent_runs_project ON public.ai_agent_runs (project_id);
CREATE INDEX idx_ai_agent_runs_prompt ON public.ai_agent_runs (prompt_id);

-- ---------------------------------------------------------------------------
-- Generated artifacts + citations
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_generated_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  document_ids uuid[],
  artifact_type text CHECK (artifact_type IN ('summary_ar','summary_en','epic','story','brd','gap_analysis','open_questions','traceability')),
  title text,
  content jsonb NOT NULL,
  content_md text,
  grounding_score numeric,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','rejected','promoted')),
  promoted_work_item_id uuid,
  agent_run_id uuid REFERENCES public.ai_agent_runs(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_generated_artifacts IS 'AI-generated deliverables (summaries, epics, BRDs…) grounded in documents; carries verification status.';
CREATE INDEX idx_ai_generated_artifacts_project ON public.ai_generated_artifacts (project_id);
CREATE INDEX idx_ai_generated_artifacts_agent_run ON public.ai_generated_artifacts (agent_run_id);

CREATE TABLE public.ai_artifact_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.ai_generated_artifacts(id) ON DELETE CASCADE,
  claim_path text,           -- json-pointer-ish locator within artifact content
  claim_text text,
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_number int,
  block_id uuid,
  quoted_text text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_artifact_citations IS 'Grounding citations linking each artifact claim back to a source document block/page.';
CREATE INDEX idx_ai_artifact_citations_artifact ON public.ai_artifact_citations (artifact_id);
CREATE INDEX idx_ai_artifact_citations_document ON public.ai_artifact_citations (document_id);

-- ---------------------------------------------------------------------------
-- Extraction issues + job queue
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_extraction_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.ai_document_pages(id) ON DELETE CASCADE,
  block_id uuid,
  kind text CHECK (kind IN ('low_ocr_confidence','broken_table','unclear_image','missing_page','parse_error','other')),
  severity text CHECK (severity IN ('info','warning','blocker')),
  detail text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_extraction_issues IS 'Quality issues flagged during extraction (low OCR confidence, broken tables…) with resolution state.';
CREATE INDEX idx_ai_extraction_issues_document ON public.ai_extraction_issues (document_id);
CREATE INDEX idx_ai_extraction_issues_page ON public.ai_extraction_issues (page_id);

CREATE TABLE public.ai_document_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  page_number int,
  stage text CHECK (stage IN ('ingest','extract','describe','translate','chunk','embed','structure')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed','dead')),
  attempts int NOT NULL DEFAULT 0,
  priority int NOT NULL DEFAULT 5,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_document_jobs IS 'Per-stage work queue driving the ingestion pipeline; partial index serves the queued poller.';
CREATE INDEX idx_ai_document_jobs_queue ON public.ai_document_jobs (status, priority, created_at) WHERE status = 'queued';
CREATE INDEX idx_ai_document_jobs_document_stage ON public.ai_document_jobs (document_id, stage);

-- ---------------------------------------------------------------------------
-- Slug + updated_at touch triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_ai_documents_slug
  BEFORE INSERT ON public.ai_documents
  FOR EACH ROW EXECUTE FUNCTION public.docintel_generate_slug();

CREATE TRIGGER trg_ai_documents_touch
  BEFORE UPDATE ON public.ai_documents
  FOR EACH ROW EXECUTE FUNCTION public.docintel_touch_updated_at();

CREATE TRIGGER trg_ai_generated_artifacts_touch
  BEFORE UPDATE ON public.ai_generated_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.docintel_touch_updated_at();
