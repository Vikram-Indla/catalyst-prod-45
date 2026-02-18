
-- ============================================================
-- REQUIREMENT ASSIST — DATABASE MIGRATION
-- Tables: ra_categories, ra_documents, ra_agent_runs
-- ============================================================

-- 1. ra_categories
CREATE TABLE IF NOT EXISTS ra_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES ra_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ra_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
  ON ra_categories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON ra_categories FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their categories"
  ON ra_categories FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their categories"
  ON ra_categories FOR DELETE USING (auth.uid() = created_by);

-- 2. ra_documents
CREATE TABLE IF NOT EXISTS ra_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('brd', 'translation', 'epic', 'uat')),
  title TEXT NOT NULL,
  brd_number TEXT,
  methodology TEXT CHECK (methodology IN ('kpmg', 'mckinsey', 'deloitte') OR methodology IS NULL),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar', 'mixed')),
  content JSONB,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_breakdown JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
  verdict TEXT CHECK (verdict IN ('pass', 'review') OR verdict IS NULL),
  source_doc_id UUID REFERENCES ra_documents(id) ON DELETE SET NULL,
  project_id UUID,
  category_id UUID REFERENCES ra_categories(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES ra_documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ra_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all documents"
  ON ra_documents FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON ra_documents FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their documents"
  ON ra_documents FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their documents"
  ON ra_documents FOR DELETE USING (auth.uid() = created_by);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ra_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ra_documents_updated_at
  BEFORE UPDATE ON ra_documents
  FOR EACH ROW EXECUTE FUNCTION update_ra_documents_updated_at();

-- BRD Number auto-generation trigger
CREATE OR REPLACE FUNCTION generate_brd_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
BEGIN
  IF NEW.type = 'brd' AND NEW.brd_number IS NULL THEN
    current_year := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(brd_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM ra_documents
    WHERE brd_number LIKE 'BRD-' || current_year || '-%';

    NEW.brd_number := 'BRD-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_brd_number
  BEFORE INSERT ON ra_documents
  FOR EACH ROW EXECUTE FUNCTION generate_brd_number();

-- Indexes
CREATE INDEX idx_ra_documents_type ON ra_documents(type);
CREATE INDEX idx_ra_documents_status ON ra_documents(status);
CREATE INDEX idx_ra_documents_created_by ON ra_documents(created_by);
CREATE INDEX idx_ra_documents_source_doc_id ON ra_documents(source_doc_id);
CREATE INDEX idx_ra_documents_category_id ON ra_documents(category_id);
CREATE INDEX idx_ra_documents_brd_number ON ra_documents(brd_number);

-- 3. ra_agent_runs
CREATE TABLE IF NOT EXISTS ra_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ra_documents(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

ALTER TABLE ra_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all agent runs"
  ON ra_agent_runs FOR SELECT USING (true);

CREATE POLICY "System can insert agent runs"
  ON ra_agent_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update agent runs"
  ON ra_agent_runs FOR UPDATE USING (true);

CREATE INDEX idx_ra_agent_runs_document_id ON ra_agent_runs(document_id);

-- 4. Additive FK columns on existing tables
ALTER TABLE epics ADD COLUMN IF NOT EXISTS source_ra_doc_id UUID REFERENCES ra_documents(id) ON DELETE SET NULL;
ALTER TABLE tm_test_cases ADD COLUMN IF NOT EXISTS source_ra_doc_id UUID REFERENCES ra_documents(id) ON DELETE SET NULL;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS source_ra_doc_id UUID REFERENCES ra_documents(id) ON DELETE SET NULL;
