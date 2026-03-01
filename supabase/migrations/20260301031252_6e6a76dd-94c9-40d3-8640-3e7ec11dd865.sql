
-- CATALYST WIKI — NEW TABLES

-- 1. Wiki Domains
CREATE TABLE IF NOT EXISTS public.wiki_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  description_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_domains_read" ON wiki_domains FOR SELECT USING (true);

-- 2. Wiki Categories
CREATE TABLE IF NOT EXISTS public.wiki_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID REFERENCES wiki_domains(id),
  category_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  parent_id UUID REFERENCES wiki_categories(id),
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_categories_read" ON wiki_categories FOR SELECT USING (true);
CREATE INDEX idx_wiki_categories_domain ON wiki_categories(domain_id);
CREATE INDEX idx_wiki_categories_parent ON wiki_categories(parent_id);

-- 3. Wiki Pages
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  domain_code TEXT NOT NULL,
  category_id UUID REFERENCES wiki_categories(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('published','draft','review','archived')),
  lead_content TEXT,
  lead_content_ar TEXT,
  infobox JSONB DEFAULT '{}',
  ai_confidence NUMERIC(3,2) DEFAULT 0,
  source_coverage NUMERIC(3,2) DEFAULT 0,
  version INTEGER DEFAULT 1,
  last_generated TIMESTAMPTZ,
  last_jira_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_pages_read" ON wiki_pages FOR SELECT USING (true);
CREATE INDEX idx_wiki_pages_slug ON wiki_pages(slug);
CREATE INDEX idx_wiki_pages_domain ON wiki_pages(domain_code);
CREATE INDEX idx_wiki_pages_category ON wiki_pages(category_id);
CREATE INDEX idx_wiki_pages_status ON wiki_pages(status);

-- 4. Wiki Sections
CREATE TABLE IF NOT EXISTS public.wiki_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  content TEXT,
  content_ar TEXT,
  section_type TEXT DEFAULT 'overview' CHECK (section_type IN ('overview','functionality','delivery_status','technical','related','references')),
  is_live_data BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_sections_read" ON wiki_sections FOR SELECT USING (true);
CREATE INDEX idx_wiki_sections_page ON wiki_sections(page_id);

-- 5. Wiki References
CREATE TABLE IF NOT EXISTS public.wiki_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  ref_number INTEGER NOT NULL,
  source_type TEXT CHECK (source_type IN ('jira','brd','document','url')),
  source_key TEXT,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_references_read" ON wiki_references FOR SELECT USING (true);

-- 6. Wiki Cross-References
CREATE TABLE IF NOT EXISTS public.wiki_cross_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  target_page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'related',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_page_id, target_page_id)
);
ALTER TABLE wiki_cross_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_crossrefs_read" ON wiki_cross_references FOR SELECT USING (true);

-- 7. Wiki Documents
CREATE TABLE IF NOT EXISTS public.wiki_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  domain_code TEXT NOT NULL,
  category_id UUID REFERENCES wiki_categories(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('brd','architecture','design','api_doc','user_guide','meeting','policy','other')),
  purpose TEXT,
  version TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en','ar','mixed')),
  linked_epic TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','parsing','chunking','embedding','complete','failed')),
  pages_extracted INTEGER DEFAULT 0,
  words_extracted INTEGER DEFAULT 0,
  chunks_generated INTEGER DEFAULT 0,
  content_hash TEXT,
  error_message TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_documents_read" ON wiki_documents FOR SELECT USING (true);
CREATE POLICY "wiki_documents_insert" ON wiki_documents FOR INSERT WITH CHECK (true);
CREATE INDEX idx_wiki_documents_domain ON wiki_documents(domain_code);
CREATE INDEX idx_wiki_documents_status ON wiki_documents(status);

-- 8. Wiki Bookmarks
CREATE TABLE IF NOT EXISTS public.wiki_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_id)
);
ALTER TABLE wiki_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_bookmarks_own" ON wiki_bookmarks FOR ALL USING (auth.uid() = user_id);

-- 9. Wiki Read Log
CREATE TABLE IF NOT EXISTS public.wiki_read_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE wiki_read_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_readlog_own" ON wiki_read_log FOR ALL USING (auth.uid() = user_id);

-- 10. Aggregation View
CREATE OR REPLACE VIEW wiki_domain_stats AS
SELECT 
  d.id, d.domain_code, d.name, d.name_ar, d.icon, d.description, d.description_ar, d.sort_order,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'published') AS article_count,
  COUNT(DISTINCT doc.id) FILTER (WHERE doc.status = 'complete') AS document_count,
  MAX(p.updated_at) AS last_updated
FROM wiki_domains d
LEFT JOIN wiki_pages p ON p.domain_code = d.domain_code
LEFT JOIN wiki_documents doc ON doc.domain_code = d.domain_code
GROUP BY d.id, d.domain_code, d.name, d.name_ar, d.icon, d.description, d.description_ar, d.sort_order
ORDER BY d.sort_order;
