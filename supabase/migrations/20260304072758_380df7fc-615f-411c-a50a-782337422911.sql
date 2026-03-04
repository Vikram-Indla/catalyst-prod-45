
-- ═══════════════════════════════════════════════════════
-- REQ ASSIST™: brd_documents + brd_epics + brd_processing_queue
-- ═══════════════════════════════════════════════════════

-- Enums
CREATE TYPE source_type_enum AS ENUM (
  'jira_webhook', 'jira_bulk', 'manual_upload', 'ai_generated'
);

CREATE TYPE pipeline_stage_enum AS ENUM (
  'intake', 'extract', 'process', 'validate', 'distribute', 'complete', 'failed'
);

CREATE TYPE complexity_enum AS ENUM ('XS', 'S', 'M', 'L', 'XL');

CREATE TYPE queue_status_enum AS ENUM (
  'pending', 'extracting', 'extracted', 'processing', 'processed', 'distributing', 'complete', 'failed'
);

-- ═══ brd_documents ═══
CREATE TABLE brd_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_key         text,
  title            text NOT NULL,
  source_type      source_type_enum NOT NULL DEFAULT 'manual_upload',
  original_url     text,
  content_hash     text,
  raw_text         text,
  json_data        jsonb,
  extraction_tier  int,
  language         text NOT NULL DEFAULT 'en',
  quality_score    int,
  pipeline_stage   pipeline_stage_enum NOT NULL DEFAULT 'intake',
  methodology      text,
  domain_tag       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz
);

CREATE OR REPLACE FUNCTION update_brd_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brd_documents_updated_at
  BEFORE UPDATE ON brd_documents
  FOR EACH ROW EXECUTE FUNCTION update_brd_documents_updated_at();

CREATE INDEX idx_brd_documents_stage ON brd_documents(pipeline_stage);
CREATE INDEX idx_brd_documents_created ON brd_documents(created_at DESC);
CREATE INDEX idx_brd_documents_domain ON brd_documents(domain_tag);

ALTER TABLE brd_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON brd_documents
  FOR ALL USING (auth.role() = 'authenticated');

-- ═══ brd_epics ═══
CREATE TABLE brd_epics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brd_id              uuid NOT NULL REFERENCES brd_documents(id) ON DELETE CASCADE,
  epic_key            text NOT NULL,
  title               text NOT NULL,
  description         text,
  brd_sections        jsonb DEFAULT '[]'::jsonb,
  complexity          complexity_enum NOT NULL DEFAULT 'M',
  invest_score        jsonb,
  stories             jsonb DEFAULT '[]'::jsonb,
  acceptance_criteria jsonb DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_brd_epics_brd_id ON brd_epics(brd_id);

ALTER TABLE brd_epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON brd_epics
  FOR ALL USING (auth.role() = 'authenticated');

-- ═══ brd_processing_queue ═══
CREATE TABLE brd_processing_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brd_id        uuid NOT NULL REFERENCES brd_documents(id) ON DELETE CASCADE,
  status        queue_status_enum NOT NULL DEFAULT 'pending',
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 3,
  error_message text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_brd_id ON brd_processing_queue(brd_id);
CREATE INDEX idx_queue_status ON brd_processing_queue(status);

ALTER TABLE brd_processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON brd_processing_queue
  FOR ALL USING (auth.role() = 'authenticated');
