
-- Learning paths
CREATE TABLE IF NOT EXISTS wiki_learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text DEFAULT 'Award',
  article_count int DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Learning path progress (per user)
CREATE TABLE IF NOT EXISTS wiki_learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path_id uuid REFERENCES wiki_learning_paths(id),
  page_id uuid REFERENCES wiki_pages(id),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE(user_id, path_id, page_id)
);

-- Knowledge requests
CREATE TABLE IF NOT EXISTS wiki_knowledge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  domain_code text,
  requested_by uuid,
  assigned_to uuid,
  status text DEFAULT 'open',
  resolution_page_id uuid REFERENCES wiki_pages(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quick reference cards
CREATE TABLE IF NOT EXISTS wiki_quick_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  steps int DEFAULT 0,
  views int DEFAULT 0,
  domain_code text,
  linked_page_id uuid REFERENCES wiki_pages(id),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Article feedback
CREATE TABLE IF NOT EXISTS wiki_article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES wiki_pages(id) NOT NULL,
  user_id uuid,
  helpful boolean NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS wiki_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Add missing columns to wiki_pages
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS read_time_minutes int;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS format text DEFAULT 'article';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS helpfulness_score numeric DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS helpfulness_votes int DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS tldr text;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS author_name text;

-- Enable RLS
ALTER TABLE wiki_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_knowledge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_quick_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "read_all" ON wiki_learning_paths FOR SELECT USING (true);
CREATE POLICY "read_all" ON wiki_quick_refs FOR SELECT USING (true);
CREATE POLICY "read_all" ON wiki_knowledge_requests FOR SELECT USING (true);
CREATE POLICY "read_own" ON wiki_learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON wiki_learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read_all" ON wiki_article_feedback FOR SELECT USING (true);
CREATE POLICY "insert_own" ON wiki_article_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read_all" ON wiki_subscriptions FOR SELECT USING (true);
CREATE POLICY "insert_own" ON wiki_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON wiki_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- RPC: Home stats
CREATE OR REPLACE FUNCTION get_wiki_home_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_articles', (SELECT count(*) FROM wiki_pages WHERE status = 'published'),
    'verified_articles', (SELECT count(*) FROM wiki_pages WHERE verification_status = 'verified'),
    'needs_review', (SELECT count(*) FROM wiki_pages WHERE verification_status = 'needs_review'),
    'stale_articles', (SELECT count(*) FROM wiki_pages WHERE updated_at < now() - interval '90 days' AND status = 'published'),
    'total_documents', (SELECT count(*) FROM wiki_documents),
    'open_requests', (SELECT count(*) FROM wiki_knowledge_requests WHERE status IN ('open', 'in_progress')),
    'avg_confidence', (SELECT COALESCE(round(avg(ai_confidence)::numeric * 100), 0) FROM wiki_pages WHERE status = 'published'),
    'avg_helpfulness', (SELECT COALESCE(round(avg(helpfulness_score)::numeric), 0) FROM wiki_pages WHERE helpfulness_votes > 0),
    'total_domains', (SELECT count(*) FROM wiki_domains),
    'verified_percent', (
      SELECT CASE WHEN count(*) > 0
        THEN round(count(*) FILTER (WHERE verification_status = 'verified')::numeric / count(*)::numeric * 100)
        ELSE 0
      END FROM wiki_pages WHERE status = 'published'
    )
  );
$$;

-- RPC: Domain cards
CREATE OR REPLACE FUNCTION get_wiki_domain_cards()
RETURNS TABLE(
  domain_code text, name text, description text, icon text,
  article_count bigint, document_count bigint, view_count bigint,
  knowledge_gaps bigint, freshness_percent numeric, coverage_percent numeric,
  last_updated timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.domain_code, d.name, d.description, d.icon,
    COALESCE(counts.articles, 0),
    COALESCE(docs.documents, 0),
    COALESCE(counts.views, 0),
    COALESCE(gaps.cnt, 0),
    COALESCE(fresh.pct, 0),
    COALESCE(cov.pct, 0),
    counts.last_updated
  FROM wiki_domains d
  LEFT JOIN LATERAL (
    SELECT count(*) as articles,
           COALESCE(sum(view_count), 0) as views,
           max(updated_at) as last_updated
    FROM wiki_pages WHERE domain_code = d.domain_code AND status = 'published'
  ) counts ON true
  LEFT JOIN LATERAL (
    SELECT count(*) as documents
    FROM wiki_documents WHERE domain_code = d.domain_code
  ) docs ON true
  LEFT JOIN LATERAL (
    SELECT count(*) as cnt FROM wiki_knowledge_requests
    WHERE domain_code = d.domain_code AND status IN ('open', 'in_progress')
  ) gaps ON true
  LEFT JOIN LATERAL (
    SELECT CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE updated_at > now() - interval '90 days')::numeric / count(*)::numeric * 100)
      ELSE 0 END as pct
    FROM wiki_pages WHERE domain_code = d.domain_code AND status = 'published'
  ) fresh ON true
  LEFT JOIN LATERAL (
    SELECT CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE verification_status = 'verified')::numeric / count(*)::numeric * 100)
      ELSE 0 END as pct
    FROM wiki_pages WHERE domain_code = d.domain_code AND status = 'published'
  ) cov ON true
  ORDER BY d.sort_order;
$$;

-- RPC: Update helpfulness
CREATE OR REPLACE FUNCTION update_article_helpfulness(p_page_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wiki_pages SET
    helpfulness_score = (
      SELECT CASE WHEN count(*) > 0
        THEN round(count(*) FILTER (WHERE helpful)::numeric / count(*)::numeric * 100)
        ELSE 0 END
      FROM wiki_article_feedback WHERE page_id = p_page_id
    ),
    helpfulness_votes = (SELECT count(*) FROM wiki_article_feedback WHERE page_id = p_page_id)
  WHERE id = p_page_id;
END;
$$;
