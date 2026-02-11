-- ============================================
-- G11-01: TEST TAGS & LABELS - DATABASE SETUP
-- ============================================

-- 1. Create tags table
CREATE TABLE IF NOT EXISTS th_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6366F1',
  description TEXT,
  category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create test case tags junction table
CREATE TABLE IF NOT EXISTS th_test_case_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES th_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(test_case_id, tag_id)
);

-- 3. Create defect tags junction table
CREATE TABLE IF NOT EXISTS th_defect_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES th_defects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES th_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(defect_id, tag_id)
);

-- 4. Create requirement tags junction table
CREATE TABLE IF NOT EXISTS th_requirement_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES th_requirements(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES th_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(requirement_id, tag_id)
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON th_tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON th_tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON th_tags(slug);
CREATE INDEX IF NOT EXISTS idx_test_case_tags_test ON th_test_case_tags(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_tags_tag ON th_test_case_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_defect_tags_defect ON th_defect_tags(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_tags_tag ON th_defect_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_req ON th_requirement_tags(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tags_tag ON th_requirement_tags(tag_id);

-- 6. Create function to generate slug
CREATE OR REPLACE FUNCTION generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    WHILE EXISTS (SELECT 1 FROM th_tags WHERE slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
      NEW.slug := NEW.slug || '-' || FLOOR(RANDOM() * 1000)::TEXT;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS trg_generate_tag_slug ON th_tags;
CREATE TRIGGER trg_generate_tag_slug
BEFORE INSERT OR UPDATE ON th_tags
FOR EACH ROW EXECUTE FUNCTION generate_tag_slug();

-- 8. Create function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  v_tag_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tag_id := OLD.tag_id;
  ELSE
    v_tag_id := NEW.tag_id;
  END IF;

  UPDATE th_tags SET usage_count = (
    SELECT COUNT(*) FROM th_test_case_tags WHERE tag_id = v_tag_id
  ) + (
    SELECT COUNT(*) FROM th_defect_tags WHERE tag_id = v_tag_id
  ) + (
    SELECT COUNT(*) FROM th_requirement_tags WHERE tag_id = v_tag_id
  )
  WHERE id = v_tag_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for usage count
DROP TRIGGER IF EXISTS trg_test_case_tags_usage ON th_test_case_tags;
CREATE TRIGGER trg_test_case_tags_usage
AFTER INSERT OR DELETE ON th_test_case_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

DROP TRIGGER IF EXISTS trg_defect_tags_usage ON th_defect_tags;
CREATE TRIGGER trg_defect_tags_usage
AFTER INSERT OR DELETE ON th_defect_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

DROP TRIGGER IF EXISTS trg_requirement_tags_usage ON th_requirement_tags;
CREATE TRIGGER trg_requirement_tags_usage
AFTER INSERT OR DELETE ON th_requirement_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- 10. Create function to get tags for a test case
CREATE OR REPLACE FUNCTION get_test_case_tags(p_test_case_id UUID)
RETURNS TABLE (
  tag_id UUID,
  name TEXT,
  slug TEXT,
  color TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name::TEXT, t.slug::TEXT, t.color::TEXT, t.category::TEXT
  FROM th_tags t
  JOIN th_test_case_tags tct ON tct.tag_id = t.id
  WHERE tct.test_case_id = p_test_case_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to get tag statistics
CREATE OR REPLACE FUNCTION get_tag_stats()
RETURNS TABLE (
  total_tags BIGINT,
  used_tags BIGINT,
  categories BIGINT,
  most_used_tag TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE usage_count > 0)::BIGINT,
    COUNT(DISTINCT category) FILTER (WHERE category IS NOT NULL)::BIGINT,
    (SELECT t2.name FROM th_tags t2 ORDER BY t2.usage_count DESC LIMIT 1)::TEXT
  FROM th_tags;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to search test cases by tags
CREATE OR REPLACE FUNCTION search_test_cases_by_tags(p_tag_ids UUID[])
RETURNS TABLE (
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  matching_tags BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.case_key,
    tc.title,
    tc.priority,
    COUNT(tct.tag_id)::BIGINT as matching_tags
  FROM th_test_cases tc
  JOIN th_test_case_tags tct ON tct.test_case_id = tc.id
  WHERE tct.tag_id = ANY(p_tag_ids)
  GROUP BY tc.id, tc.case_key, tc.title, tc.priority
  ORDER BY matching_tags DESC, tc.case_key;
END;
$$ LANGUAGE plpgsql;

-- 13. Enable RLS
ALTER TABLE th_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_test_case_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_defect_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_requirement_tags ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_tags;
CREATE POLICY "Allow all for authenticated users" ON th_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_test_case_tags;
CREATE POLICY "Allow all for authenticated users" ON th_test_case_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_defect_tags;
CREATE POLICY "Allow all for authenticated users" ON th_defect_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON th_requirement_tags;
CREATE POLICY "Allow all for authenticated users" ON th_requirement_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. Insert default tags
INSERT INTO th_tags (name, color, category, description) VALUES
  ('Smoke', '#10B981', 'Test Type', 'Quick sanity check tests'),
  ('Regression', '#3B82F6', 'Test Type', 'Full regression test suite'),
  ('Integration', '#8B5CF6', 'Test Type', 'Integration tests'),
  ('E2E', '#EC4899', 'Test Type', 'End-to-end tests'),
  ('API', '#F59E0B', 'Test Type', 'API/Backend tests'),
  ('UI', '#06B6D4', 'Test Type', 'User interface tests'),
  ('Performance', '#EF4444', 'Test Type', 'Performance/load tests'),
  ('Security', '#DC2626', 'Test Type', 'Security tests'),
  ('P0-Critical', '#DC2626', 'Priority', 'Must pass for release'),
  ('P1-High', '#F97316', 'Priority', 'High priority'),
  ('P2-Medium', '#EAB308', 'Priority', 'Medium priority'),
  ('P3-Low', '#22C55E', 'Priority', 'Low priority'),
  ('Automated', '#6366F1', 'Automation', 'Automated test'),
  ('Manual', '#78716C', 'Automation', 'Manual test only'),
  ('Flaky', '#F59E0B', 'Status', 'Known flaky test'),
  ('Deprecated', '#94A3B8', 'Status', 'Deprecated/obsolete test')
ON CONFLICT (slug) DO NOTHING;