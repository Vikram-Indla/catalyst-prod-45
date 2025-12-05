-- ============================================================================
-- CATALYST KNOWLEDGE HUB v2.0 - DATABASE SCHEMA
-- 80%+ Confluence Match | Supabase PostgreSQL
-- ============================================================================

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. CORE TABLES (prefixed with kb_ to avoid conflicts)
-- ============================================================================

-- Knowledge Hub Projects (maps to Catalyst work item hierarchy)
CREATE TABLE IF NOT EXISTS kb_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document Spaces (one per project)
CREATE TABLE IF NOT EXISTS kb_doc_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES kb_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Documents (Confluence pages)
CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES kb_doc_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  content_text TEXT,
  parent_id UUID REFERENCES kb_documents(id) ON DELETE SET NULL,
  linked_work_item_id TEXT,
  linked_work_item_type TEXT CHECK (linked_work_item_type IN ('epic', 'feature', 'story', 'subtask', 'bug', 'business_request')),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
  ) STORED
);

-- Document Versions
CREATE TABLE IF NOT EXISTS kb_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  content_text TEXT,
  change_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Document Labels
CREATE TABLE IF NOT EXISTS kb_document_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, label)
);

-- Document Attachments
CREATE TABLE IF NOT EXISTS kb_document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CONFLUENCE MACROS
-- ============================================================================

-- Page Properties
CREATE TABLE IF NOT EXISTS kb_document_page_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  property_key TEXT NOT NULL,
  property_value TEXT NOT NULL,
  property_type TEXT CHECK (property_type IN ('text', 'user', 'date', 'status', 'dropdown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, property_key)
);

-- Jira Issues Macro (cached work item data)
CREATE TABLE IF NOT EXISTS kb_document_jira_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  work_item_id TEXT NOT NULL,
  work_item_type TEXT NOT NULL,
  work_item_title TEXT NOT NULL,
  work_item_status TEXT NOT NULL,
  work_item_assignee TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, work_item_id)
);

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES kb_document_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- 4. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS kb_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX idx_kb_documents_space_id ON kb_documents(space_id);
CREATE INDEX idx_kb_documents_parent_id ON kb_documents(parent_id);
CREATE INDEX idx_kb_documents_linked_work_item ON kb_documents(linked_work_item_id, linked_work_item_type);
CREATE INDEX idx_kb_documents_created_by ON kb_documents(created_by);
CREATE INDEX idx_kb_documents_search_vector ON kb_documents USING GIN(search_vector);

CREATE INDEX idx_kb_document_versions_document_id ON kb_document_versions(document_id);
CREATE INDEX idx_kb_document_versions_created_at ON kb_document_versions(created_at DESC);

CREATE INDEX idx_kb_document_labels_document_id ON kb_document_labels(document_id);
CREATE INDEX idx_kb_document_labels_label ON kb_document_labels(label);
CREATE INDEX idx_kb_document_labels_gin ON kb_document_labels USING GIN(label gin_trgm_ops);

CREATE INDEX idx_kb_document_attachments_document_id ON kb_document_attachments(document_id);
CREATE INDEX idx_kb_document_page_properties_document_id ON kb_document_page_properties(document_id);
CREATE INDEX idx_kb_document_page_properties_key_value ON kb_document_page_properties(property_key, property_value);

CREATE INDEX idx_kb_document_comments_document_id ON kb_document_comments(document_id);
CREATE INDEX idx_kb_document_comments_parent_id ON kb_document_comments(parent_comment_id);

CREATE INDEX idx_kb_audit_log_user_id ON kb_audit_log(user_id);
CREATE INDEX idx_kb_audit_log_resource ON kb_audit_log(resource_type, resource_id);
CREATE INDEX idx_kb_audit_log_created_at ON kb_audit_log(created_at DESC);

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at for KB tables
CREATE OR REPLACE FUNCTION update_kb_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_projects_updated_at BEFORE UPDATE ON kb_projects
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at_column();

CREATE TRIGGER update_kb_doc_spaces_updated_at BEFORE UPDATE ON kb_doc_spaces
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at_column();

CREATE TRIGGER update_kb_documents_updated_at BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at_column();

-- Auto-create document version on update
CREATE OR REPLACE FUNCTION create_kb_document_version()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM kb_document_versions
  WHERE document_id = NEW.id;
  
  INSERT INTO kb_document_versions (
    document_id, version_number, title, content, content_text, change_summary, created_by
  ) VALUES (
    NEW.id, latest_version + 1, NEW.title, NEW.content, NEW.content_text, 'Auto-saved', NEW.updated_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_kb_document_version_trigger
  AFTER UPDATE ON kb_documents
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION create_kb_document_version();

-- Extract plain text from TipTap JSONB content
CREATE OR REPLACE FUNCTION extract_kb_tiptap_text(content JSONB)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  node JSONB;
BEGIN
  FOR node IN SELECT jsonb_array_elements(content->'content')
  LOOP
    IF node->>'type' = 'text' THEN
      result := result || ' ' || (node->>'text');
    ELSIF node->'content' IS NOT NULL THEN
      result := result || ' ' || extract_kb_tiptap_text(node);
    END IF;
  END LOOP;
  RETURN trim(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-generate content_text from JSONB content
CREATE OR REPLACE FUNCTION update_kb_content_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_text := extract_kb_tiptap_text(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_document_content_text
  BEFORE INSERT OR UPDATE OF content ON kb_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_content_text();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE kb_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_doc_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_page_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_audit_log ENABLE ROW LEVEL SECURITY;

-- Projects - all authenticated users can view
CREATE POLICY "Users can view kb projects" ON kb_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create kb projects" ON kb_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update kb projects" ON kb_projects FOR UPDATE TO authenticated USING (true);

-- Doc Spaces
CREATE POLICY "Users can view kb doc spaces" ON kb_doc_spaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create kb doc spaces" ON kb_doc_spaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update kb doc spaces" ON kb_doc_spaces FOR UPDATE TO authenticated USING (true);

-- Documents
CREATE POLICY "Users can view kb documents" ON kb_documents FOR SELECT TO authenticated
  USING (published_at IS NOT NULL OR created_by = auth.uid());
CREATE POLICY "Users can create kb documents" ON kb_documents FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own kb documents" ON kb_documents FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Users can delete own kb documents" ON kb_documents FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Document Versions
CREATE POLICY "Users can view kb document versions" ON kb_document_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM kb_documents WHERE kb_documents.id = kb_document_versions.document_id
    AND (kb_documents.published_at IS NOT NULL OR kb_documents.created_by = auth.uid())));

-- Document Labels
CREATE POLICY "Users can view kb labels" ON kb_document_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage kb labels" ON kb_document_labels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kb_documents WHERE kb_documents.id = kb_document_labels.document_id
    AND kb_documents.created_by = auth.uid()));

-- Document Attachments
CREATE POLICY "Users can view kb attachments" ON kb_document_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM kb_documents WHERE kb_documents.id = kb_document_attachments.document_id
    AND (kb_documents.published_at IS NOT NULL OR kb_documents.created_by = auth.uid())));
CREATE POLICY "Users can upload kb attachments" ON kb_document_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM kb_documents WHERE kb_documents.id = kb_document_attachments.document_id
    AND kb_documents.created_by = auth.uid()));

-- Page Properties
CREATE POLICY "Users can view kb page properties" ON kb_document_page_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage kb page properties" ON kb_document_page_properties FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kb_documents WHERE kb_documents.id = kb_document_page_properties.document_id
    AND kb_documents.created_by = auth.uid()));

-- Comments
CREATE POLICY "Users can view kb comments" ON kb_document_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create kb comments" ON kb_document_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can update own kb comments" ON kb_document_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "Users can delete own kb comments" ON kb_document_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Audit Log
CREATE POLICY "Users can view kb audit log" ON kb_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create kb audit log" ON kb_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. SAMPLE DATA
-- ============================================================================

INSERT INTO kb_projects (id, name, key, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Platform Modernization', 'PLAT', 'Modernize the platform architecture'),
  ('22222222-2222-2222-2222-222222222222', 'Customer Portal', 'CUST', 'Customer-facing portal development');

INSERT INTO kb_doc_spaces (id, project_id, name, description) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Platform Docs', 'All documentation for Platform Modernization'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Customer Portal Docs', 'Documentation for Customer Portal');