-- CLEANUP: Drop orphaned work_items table and recreate schema properly
DROP TABLE IF EXISTS work_items CASCADE;
DROP TYPE IF EXISTS generation_status CASCADE;

-- STEP 1: CREATE ENUMS
CREATE TYPE generation_status AS ENUM (
  'draft', 'analyzing', 'generating', 'validating', 'completed', 'failed', 'cancelled'
);

-- STEP 2: CREATE GENERATIONS TABLE
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_number SERIAL,
  display_id VARCHAR(20) GENERATED ALWAYS AS ('GEN-' || LPAD(generation_number::text, 4, '0')) STORED,
  title VARCHAR(255),
  input_text TEXT NOT NULL,
  input_word_count INTEGER DEFAULT 0,
  input_source VARCHAR(50) DEFAULT 'manual',
  analysis JSONB DEFAULT '{"title": null, "actors": [], "functions": [], "nfrs": [], "integrations": [], "complexity": "medium", "complexityReason": null, "warnings": [], "suggestions": []}'::jsonb,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  output_config JSONB DEFAULT '{"prd": true, "epics": true, "features": true, "stories": true, "tasks": false, "testCases": false}'::jsonb,
  compliance_standards TEXT[] DEFAULT ARRAY['dga', 'nca_ecc'],
  status generation_status DEFAULT 'draft',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step VARCHAR(200),
  error_message TEXT,
  error_code VARCHAR(50),
  ai_model VARCHAR(100) DEFAULT 'claude-3-sonnet-20240229',
  ai_tokens_input INTEGER DEFAULT 0,
  ai_tokens_output INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  epic_count INTEGER DEFAULT 0,
  feature_count INTEGER DEFAULT 0,
  story_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  published_to VARCHAR(50),
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE generations IS 'Main entity for AI requirement generation sessions';

CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created_by ON generations(created_by);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX idx_generations_program ON generations(program_id);
CREATE INDEX idx_generations_project ON generations(project_id);
CREATE INDEX idx_generations_active ON generations(deleted_at) WHERE deleted_at IS NULL;

-- STEP 3: CREATE WORK ITEMS TABLE
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  item_type work_item_type NOT NULL,
  level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  display_id VARCHAR(30) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  acceptance_criteria JSONB DEFAULT '[]'::jsonb,
  benefit_hypothesis TEXT,
  success_metrics JSONB DEFAULT '[]'::jsonb,
  technical_notes TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.85 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_reason TEXT,
  ai_reasoning TEXT,
  source_text TEXT,
  is_selected BOOLEAN DEFAULT true,
  is_edited BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  external_system VARCHAR(50),
  external_id VARCHAR(100),
  external_url VARCHAR(500),
  external_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_display_id_per_generation UNIQUE (generation_id, display_id)
);

COMMENT ON TABLE work_items IS 'Generated work items (epics, features, stories, etc.)';

CREATE INDEX idx_work_items_generation ON work_items(generation_id);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);
CREATE INDEX idx_work_items_type ON work_items(item_type);
CREATE INDEX idx_work_items_sort ON work_items(generation_id, sort_order);
CREATE INDEX idx_work_items_display_id ON work_items(display_id);

-- STEP 4: CREATE PRD DOCUMENTS TABLE
CREATE TABLE prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  table_of_contents JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prd_documents IS 'Generated PRD documents';
CREATE INDEX idx_prd_generation ON prd_documents(generation_id);

-- STEP 5: CREATE GENERATION EVENTS TABLE
CREATE TABLE generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

COMMENT ON TABLE generation_events IS 'Audit trail of generation lifecycle events';
CREATE INDEX idx_events_generation ON generation_events(generation_id);
CREATE INDEX idx_events_type ON generation_events(event_type);
CREATE INDEX idx_events_created ON generation_events(created_at DESC);

-- STEP 6: CREATE FUNCTIONS
CREATE OR REPLACE FUNCTION update_generation_counts()
RETURNS TRIGGER AS $$
DECLARE
  gen_id UUID;
BEGIN
  gen_id := COALESCE(NEW.generation_id, OLD.generation_id);
  
  UPDATE generations SET
    epic_count = (SELECT COUNT(*) FROM work_items WHERE generation_id = gen_id AND item_type = 'epic'),
    feature_count = (SELECT COUNT(*) FROM work_items WHERE generation_id = gen_id AND item_type = 'feature'),
    story_count = (SELECT COUNT(*) FROM work_items WHERE generation_id = gen_id AND item_type = 'story'),
    task_count = (SELECT COUNT(*) FROM work_items WHERE generation_id = gen_id AND item_type = 'task'),
    total_count = (SELECT COUNT(*) FROM work_items WHERE generation_id = gen_id),
    updated_at = NOW()
  WHERE id = gen_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_work_item_display_id(p_generation_id UUID, p_item_type work_item_type)
RETURNS VARCHAR(30) AS $$
DECLARE
  prefix VARCHAR(10);
  next_num INTEGER;
BEGIN
  prefix := CASE p_item_type
    WHEN 'epic' THEN 'EPIC'
    WHEN 'feature' THEN 'FEAT'
    WHEN 'story' THEN 'US'
    WHEN 'task' THEN 'TASK'
    WHEN 'test_case' THEN 'TC'
    WHEN 'prd' THEN 'PRD'
    ELSE 'ITEM'
  END;
  
  SELECT COALESCE(MAX(CAST(NULLIF(SUBSTRING(display_id FROM LENGTH(prefix) + 2), '') AS INTEGER)), 0) + 1
  INTO next_num
  FROM work_items
  WHERE generation_id = p_generation_id AND item_type = p_item_type;
  
  RETURN prefix || '-' || LPAD(next_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- STEP 7: CREATE TRIGGERS
CREATE TRIGGER trg_generations_updated_at BEFORE UPDATE ON generations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_items_updated_at BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_prd_documents_updated_at BEFORE UPDATE ON prd_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_items_count_insert AFTER INSERT ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_generation_counts();

CREATE TRIGGER trg_work_items_count_delete AFTER DELETE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_generation_counts();

CREATE TRIGGER trg_work_items_count_update AFTER UPDATE OF item_type ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_generation_counts();

-- STEP 8: ENABLE RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_events ENABLE ROW LEVEL SECURITY;

-- STEP 9: RLS POLICIES FOR GENERATIONS
CREATE POLICY "Users can view own generations" ON generations FOR SELECT
  USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can insert own generations" ON generations FOR INSERT
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can update own generations" ON generations FOR UPDATE
  USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own generations" ON generations FOR DELETE
  USING (auth.uid() = created_by OR created_by IS NULL);

-- STEP 10: RLS POLICIES FOR WORK ITEMS
CREATE POLICY "Users can view work items" ON work_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = work_items.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can insert work items" ON work_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM generations g WHERE g.id = work_items.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can update work items" ON work_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = work_items.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can delete work items" ON work_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = work_items.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

-- STEP 11: RLS POLICIES FOR PRD DOCUMENTS
CREATE POLICY "Users can view prd documents" ON prd_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = prd_documents.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can insert prd documents" ON prd_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM generations g WHERE g.id = prd_documents.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can update prd documents" ON prd_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = prd_documents.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Users can delete prd documents" ON prd_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = prd_documents.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

-- STEP 12: RLS POLICIES FOR GENERATION EVENTS
CREATE POLICY "Users can view events" ON generation_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM generations g WHERE g.id = generation_events.generation_id 
    AND (g.created_by = auth.uid() OR g.created_by IS NULL)));

CREATE POLICY "Anyone can insert events" ON generation_events FOR INSERT WITH CHECK (true);

-- STEP 13: ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE generations;
ALTER PUBLICATION supabase_realtime ADD TABLE work_items;