
-- wiki_pages: add missing columns
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS freshness_score NUMERIC(5,2) DEFAULT 100;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS fts_vector TSVECTOR;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS archive_at TIMESTAMPTZ;

-- wiki_domains: add tag
ALTER TABLE wiki_domains ADD COLUMN IF NOT EXISTS tag TEXT;

-- wiki_quick_refs: add missing columns
ALTER TABLE wiki_quick_refs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE wiki_quick_refs ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'FileText';
ALTER TABLE wiki_quick_refs ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE wiki_quick_refs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE wiki_quick_refs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- wiki_knowledge_requests: add missing columns
ALTER TABLE wiki_knowledge_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE wiki_knowledge_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE wiki_knowledge_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- wiki_learning_paths: add missing columns
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS domain_code TEXT;
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner';
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS article_ids UUID[] DEFAULT '{}';
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(4,1) DEFAULT 1;
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE wiki_learning_paths ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- wiki_read_log: add missing column
ALTER TABLE wiki_read_log ADD COLUMN IF NOT EXISTS read_duration_seconds INTEGER DEFAULT 0;

-- Indexes on wiki_pages
CREATE INDEX IF NOT EXISTS idx_wiki_pages_domain ON wiki_pages(domain_code);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status ON wiki_pages(status);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_verification ON wiki_pages(verification_status);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_format ON wiki_pages(format);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_tags ON wiki_pages USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated ON wiki_pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_deleted ON wiki_pages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wiki_pages_fts ON wiki_pages USING GIN(fts_vector);

-- FTS Trigger
CREATE OR REPLACE FUNCTION wiki_pages_fts_trigger() RETURNS trigger AS $$
BEGIN
  NEW.fts_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.lead_content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.tldr, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wiki_pages_fts_update ON wiki_pages;
CREATE TRIGGER wiki_pages_fts_update
  BEFORE INSERT OR UPDATE OF title, lead_content, tldr, tags
  ON wiki_pages FOR EACH ROW
  EXECUTE FUNCTION wiki_pages_fts_trigger();

UPDATE wiki_pages SET fts_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(lead_content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(tldr, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C');

-- NEW TABLES
CREATE TABLE IF NOT EXISTS wiki_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT, lead_content TEXT, content_snapshot JSONB, change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_versions_read" ON wiki_page_versions FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_wiki_versions_page ON wiki_page_versions(page_id, version_number DESC);

CREATE TABLE IF NOT EXISTS wiki_read_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_id)
);
ALTER TABLE wiki_read_acknowledgments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_ack_own" ON wiki_read_acknowledgments FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_ack_page ON wiki_read_acknowledgments(page_id);

CREATE TABLE IF NOT EXISTS wiki_page_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'related',
  weight NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_page_id, target_page_id, relation_type)
);
ALTER TABLE wiki_page_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_relations_read" ON wiki_page_relations FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_wiki_rel_source ON wiki_page_relations(source_page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_rel_target ON wiki_page_relations(target_page_id);

CREATE TABLE IF NOT EXISTS wiki_cross_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  target_module TEXT NOT NULL, target_type TEXT NOT NULL, target_id UUID NOT NULL, target_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, target_module, target_id)
);
ALTER TABLE wiki_cross_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_xlinks_read" ON wiki_cross_links FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_wiki_xlinks_page ON wiki_cross_links(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_xlinks_target ON wiki_cross_links(target_module, target_id);

CREATE TABLE IF NOT EXISTS wiki_article_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, icon TEXT DEFAULT 'FileText',
  template_sections JSONB NOT NULL DEFAULT '[]', domain_code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_article_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_templates_read" ON wiki_article_templates FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS wiki_user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'en',
  onboarding_completed BOOLEAN DEFAULT false,
  preferred_domains TEXT[] DEFAULT '{}',
  notification_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_prefs_own" ON wiki_user_prefs FOR ALL USING (auth.uid() = user_id);

-- DROP and recreate RPCs with changed return types
DROP FUNCTION IF EXISTS get_wiki_home_stats();
DROP FUNCTION IF EXISTS get_wiki_domain_cards();

CREATE FUNCTION get_wiki_home_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_articles', (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND status = 'published'),
    'total_documents', (SELECT COUNT(*) FROM wiki_documents),
    'verified_articles', (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND verification_status = 'verified'),
    'needs_review', (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND verification_status = 'needs_review'),
    'unverified', (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND verification_status = 'unverified'),
    'stale_articles', (SELECT COUNT(*) FROM wiki_pages WHERE deleted_at IS NULL AND updated_at < now() - interval '90 days'),
    'open_requests', (SELECT COUNT(*) FROM wiki_knowledge_requests WHERE status IN ('open', 'in_progress') AND deleted_at IS NULL),
    'avg_helpfulness', (SELECT COALESCE(ROUND(AVG(helpfulness_score), 1), 0) FROM wiki_pages WHERE deleted_at IS NULL AND helpfulness_votes > 0),
    'avg_confidence', (SELECT COALESCE(ROUND(AVG(ai_confidence), 1), 0) FROM wiki_pages WHERE deleted_at IS NULL AND ai_confidence > 0),
    'verified_percent', (
      SELECT CASE WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE verification_status = 'verified') / COUNT(*), 1)
      END FROM wiki_pages WHERE deleted_at IS NULL
    )
  ) INTO result;
  RETURN result;
END; $$;

CREATE FUNCTION get_wiki_domain_cards()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSON;
BEGIN
  SELECT json_agg(row_data ORDER BY d.sort_order) INTO result
  FROM wiki_domains d
  CROSS JOIN LATERAL (
    SELECT json_build_object(
      'code', d.domain_code, 'name', d.name, 'name_ar', d.name_ar,
      'description', d.description, 'icon', d.icon, 'tag', d.tag,
      'article_count', (SELECT COUNT(*) FROM wiki_pages WHERE domain_code = d.domain_code AND deleted_at IS NULL),
      'document_count', (SELECT COUNT(*) FROM wiki_documents WHERE domain_code = d.domain_code),
      'view_count', (SELECT COALESCE(SUM(view_count), 0) FROM wiki_pages WHERE domain_code = d.domain_code AND deleted_at IS NULL),
      'knowledge_gaps', (SELECT COUNT(*) FROM wiki_knowledge_requests WHERE domain_code = d.domain_code AND status IN ('open', 'in_progress') AND deleted_at IS NULL),
      'freshness_percent', (
        SELECT CASE WHEN COUNT(*) = 0 THEN 100
          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE updated_at > now() - interval '90 days') / COUNT(*), 0)
        END FROM wiki_pages WHERE domain_code = d.domain_code AND deleted_at IS NULL
      ),
      'coverage_percent', (
        SELECT CASE WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE verification_status = 'verified') / COUNT(*), 0)
        END FROM wiki_pages WHERE domain_code = d.domain_code AND deleted_at IS NULL
      )
    ) AS row_data
  ) sub;
  RETURN COALESCE(result, '[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION update_article_helpfulness(p_page_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wiki_pages SET
    helpfulness_score = (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE helpful = true) / COUNT(*), 1) END FROM wiki_article_feedback WHERE page_id = p_page_id),
    helpfulness_votes = (SELECT COUNT(*) FROM wiki_article_feedback WHERE page_id = p_page_id),
    updated_at = now()
  WHERE id = p_page_id;
END; $$;

CREATE OR REPLACE FUNCTION compute_freshness_scores()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wiki_pages SET
    freshness_score = GREATEST(0, LEAST(100, 100 - (EXTRACT(EPOCH FROM (now() - updated_at)) / 86400 / 90 * 100))),
    verification_status = CASE WHEN verification_status = 'verified' AND updated_at < now() - interval '90 days' THEN 'needs_review' ELSE verification_status END
  WHERE deleted_at IS NULL;
END; $$;

CREATE OR REPLACE FUNCTION find_similar_articles(p_title TEXT, p_content TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS TABLE(page_id UUID, title TEXT, similarity NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT wp.id, wp.title,
    ROUND(ts_rank(wp.fts_vector, plainto_tsquery('english', p_title || ' ' || LEFT(p_content, 200)))::numeric, 3) AS similarity
  FROM wiki_pages wp
  WHERE wp.deleted_at IS NULL AND (p_exclude_id IS NULL OR wp.id != p_exclude_id)
    AND wp.fts_vector @@ plainto_tsquery('english', p_title)
  ORDER BY similarity DESC LIMIT 5;
END; $$;

CREATE OR REPLACE FUNCTION increment_view_count(p_page_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wiki_pages SET view_count = view_count + 1 WHERE id = p_page_id;
END; $$;

-- Seed domain tags
UPDATE wiki_domains SET tag = CASE domain_code
  WHEN 'D1' THEN 'CORE' WHEN 'D2' THEN 'CORE' WHEN 'D3' THEN 'REGULATORY'
  WHEN 'D4' THEN 'REGULATORY' WHEN 'D5' THEN 'CORE' WHEN 'D6' THEN 'SUPPORT'
  WHEN 'D7' THEN 'REGULATORY' WHEN 'D8' THEN 'CORE' WHEN 'D9' THEN 'SUPPORT'
END WHERE tag IS NULL;

-- Seed quick refs (using existing column names)
INSERT INTO wiki_quick_refs (title, description, steps, domain_code, icon, view_count, sort_order) VALUES
  ('Industrial License Application', 'Step-by-step guide to applying for a new industrial license with MIM', 7, 'D1', 'FileCheck', 1247, 1),
  ('Customs Exemption Process', 'How to apply for customs duty exemption on imported raw materials', 5, 'D2', 'ShieldCheck', 892, 2),
  ('Environmental Permit Checklist', 'Required documents and steps for environmental compliance permit', 9, 'D4', 'ClipboardCheck', 634, 3),
  ('SIDF Loan Application', 'Saudi Industrial Development Fund loan process and requirements', 6, 'D5', 'Landmark', 1058, 4),
  ('4IR Technology Grant', 'Applying for Industry 4.0 digital transformation grants', 4, 'D6', 'Bot', 423, 5),
  ('Chemical Handling Permit', 'Regulated chemicals handling and storage permit requirements', 8, 'D3', 'FlaskConical', 567, 6)
ON CONFLICT DO NOTHING;

-- Seed learning paths
INSERT INTO wiki_learning_paths (title, description, domain_code, icon, difficulty, estimated_hours, sort_order) VALUES
  ('New Employee Onboarding', 'Essential knowledge for new MIM staff', NULL, 'GraduationCap', 'beginner', 6.0, 1),
  ('Industrial License Mastery', 'Complete guide to industrial licensing', 'D1', 'Award', 'intermediate', 12.0, 2),
  ('4IR Digital Transformation', 'Understanding Industry 4.0 technologies', 'D6', 'Cpu', 'advanced', 8.0, 3)
ON CONFLICT DO NOTHING;

-- Seed knowledge requests
INSERT INTO wiki_knowledge_requests (title, description, domain_code, status, priority) VALUES
  ('Chemical permit renewal process after regulation update', 'The 2025 regulation changed renewal requirements.', 'D3', 'open', 'high'),
  ('MODON land allocation criteria for new industrial cities', 'Multiple inquiries about land allocation.', 'D2', 'open', 'medium'),
  ('Mining license timeline and approval stages', 'New mining investors asking about expected timeline.', 'D9', 'in_progress', 'medium'),
  ('Customs exemption for spare parts vs raw materials', 'Confusion between exemption categories.', 'D2', 'open', 'low')
ON CONFLICT DO NOTHING;

-- Seed article templates
INSERT INTO wiki_article_templates (name, description, icon, template_sections, sort_order) VALUES
  ('Regulation Guide', 'Template for government regulations', 'Scale', '[{"title":"Overview","section_type":"content"},{"title":"Requirements","section_type":"content"},{"title":"Process Steps","section_type":"content"},{"title":"References","section_type":"references"}]', 1),
  ('Process SOP', 'Standard operating procedure template', 'ClipboardList', '[{"title":"Purpose","section_type":"content"},{"title":"Procedure","section_type":"content"},{"title":"Troubleshooting","section_type":"content"}]', 2),
  ('Technical Specification', 'Technical documentation template', 'Code', '[{"title":"Summary","section_type":"content"},{"title":"Architecture","section_type":"content"},{"title":"API Reference","section_type":"content"}]', 3),
  ('FAQ Document', 'Frequently asked questions format', 'HelpCircle', '[{"title":"General Questions","section_type":"content"},{"title":"Troubleshooting","section_type":"content"}]', 4),
  ('Policy Document', 'Official policy template', 'Landmark', '[{"title":"Policy Statement","section_type":"content"},{"title":"Applicability","section_type":"content"},{"title":"Enforcement","section_type":"content"}]', 5)
ON CONFLICT DO NOTHING;
