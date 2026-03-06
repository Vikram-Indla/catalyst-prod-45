
-- Drop old RA tables to replace with V2 schema
DROP TABLE IF EXISTS public.ra_categories CASCADE;
DROP TABLE IF EXISTS public.ra_documents CASCADE;
DROP TABLE IF EXISTS public.ra_artifacts CASCADE;
DROP TABLE IF EXISTS public.ra_processing_jobs CASCADE;
DROP TABLE IF EXISTS public.ra_jira_sync_log CASCADE;

-- TABLE 1: Document Library
CREATE TABLE public.ra_documents (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_ticket_key     TEXT NOT NULL,
  jira_project        TEXT NOT NULL,
  jira_ticket_url     TEXT,
  jira_created_at     TIMESTAMPTZ,
  pulled_at           TIMESTAMPTZ DEFAULT now(),
  title               TEXT NOT NULL,
  source_type         TEXT NOT NULL CHECK (source_type IN ('jira_pdf','manual_upload','text_generated')),
  language            TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar')),
  is_brd              BOOLEAN,
  page_count          INTEGER,
  word_count          INTEGER,
  content_raw         TEXT,
  content_processed   TEXT,
  domain              TEXT,
  wikihub_synced      BOOLEAN NOT NULL DEFAULT false,
  wikihub_synced_at   TIMESTAMPTZ,
  wikihub_chunk_count INTEGER,
  pdf_url             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('processing','ready','failed','pending')),
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- TABLE 2: Generated Artifacts
CREATE TABLE public.ra_artifacts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ra_document_id   UUID NOT NULL REFERENCES public.ra_documents(id) ON DELETE CASCADE,
  artifact_type    TEXT NOT NULL CHECK (artifact_type IN ('brd','epics','uat','initiative')),
  title            TEXT NOT NULL,
  content_json     JSONB DEFAULT '{}',
  content_raw      TEXT,
  status           TEXT NOT NULL DEFAULT 'generating'
                   CHECK (status IN ('generating','ready','failed')),
  catalyst_ref_id  UUID,
  generated_by     UUID REFERENCES auth.users(id),
  generated_at     TIMESTAMPTZ DEFAULT now(),
  model_used       TEXT
);

-- TABLE 3: Processing Jobs
CREATE TABLE public.ra_processing_jobs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ra_document_id   UUID NOT NULL REFERENCES public.ra_documents(id) ON DELETE CASCADE,
  job_type         TEXT NOT NULL CHECK (job_type IN (
                     'import','generate_brd','generate_epics',
                     'generate_uat','generate_initiative','wikihub_sync')),
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','processing','done','failed')),
  progress_pct     INTEGER DEFAULT 0,
  current_step     TEXT,
  eta_seconds      INTEGER,
  error_message    TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- TABLE 4: Jira Sync Audit Log
CREATE TABLE public.ra_jira_sync_log (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at           TIMESTAMPTZ DEFAULT now(),
  project_key         TEXT NOT NULL,
  tickets_found       INTEGER DEFAULT 0,
  pdfs_found          INTEGER DEFAULT 0,
  new_documents       INTEGER DEFAULT 0,
  duplicates_skipped  INTEGER DEFAULT 0,
  errors              JSONB,
  duration_ms         INTEGER
);

-- INDEXES
CREATE INDEX idx_ra_documents_jira ON public.ra_documents (jira_ticket_key);
CREATE INDEX idx_ra_documents_status ON public.ra_documents (status);
CREATE INDEX idx_ra_documents_project ON public.ra_documents (jira_project);
CREATE INDEX idx_ra_artifacts_doc ON public.ra_artifacts (ra_document_id);
CREATE INDEX idx_ra_jobs_doc ON public.ra_processing_jobs (ra_document_id);
CREATE INDEX idx_ra_jobs_status ON public.ra_processing_jobs (status);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_ra_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ra_documents_updated_at
  BEFORE UPDATE ON public.ra_documents
  FOR EACH ROW EXECUTE FUNCTION update_ra_documents_updated_at();

-- RLS
ALTER TABLE public.ra_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ra_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ra_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ra_jira_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ra_documents"
  ON public.ra_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ra_artifacts"
  ON public.ra_artifacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ra_processing_jobs"
  ON public.ra_processing_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read ra_jira_sync_log"
  ON public.ra_jira_sync_log FOR SELECT TO authenticated USING (true);
