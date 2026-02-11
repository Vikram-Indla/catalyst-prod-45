
-- G22: Test Sets Complete Database Schema
-- Drop old table and rebuild with proper schema

-- Drop existing table (no data)
DROP TABLE IF EXISTS tm_test_set_cases CASCADE;
DROP TABLE IF EXISTS tm_test_sets CASCADE;
DROP TABLE IF EXISTS tm_set_key_sequence CASCADE;

-- Create enums (if not exist)
DO $$ BEGIN
  CREATE TYPE test_set_type_enum AS ENUM (
    'smoke', 'regression', 'sanity', 'integration', 'e2e',
    'performance', 'security', 'accessibility', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE test_set_membership_enum AS ENUM ('static', 'dynamic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Key sequence table
CREATE TABLE tm_set_key_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_number INTEGER DEFAULT 0
);
INSERT INTO tm_set_key_sequence (id, last_number) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- Main test sets table
CREATE TABLE tm_test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_key VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  set_type test_set_type_enum NOT NULL DEFAULT 'custom',
  membership_type test_set_membership_enum NOT NULL DEFAULT 'static',
  dynamic_criteria JSONB DEFAULT NULL,
  test_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT tm_test_sets_key_project_unique UNIQUE (set_key, project_id)
);

CREATE INDEX idx_tm_test_sets_project ON tm_test_sets(project_id);
CREATE INDEX idx_tm_test_sets_type ON tm_test_sets(set_type);
CREATE INDEX idx_tm_test_sets_active ON tm_test_sets(is_active) WHERE is_active = true;

-- Junction table
CREATE TABLE tm_test_set_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_set_id UUID NOT NULL REFERENCES tm_test_sets(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT tm_test_set_cases_unique UNIQUE (test_set_id, test_case_id)
);

CREATE INDEX idx_tm_test_set_cases_set ON tm_test_set_cases(test_set_id);
CREATE INDEX idx_tm_test_set_cases_case ON tm_test_set_cases(test_case_id);
CREATE INDEX idx_tm_test_set_cases_order ON tm_test_set_cases(test_set_id, sort_order);

-- Key generation trigger
CREATE OR REPLACE FUNCTION generate_test_set_key()
RETURNS TRIGGER AS $$
DECLARE v_next_number INTEGER;
BEGIN
  UPDATE tm_set_key_sequence SET last_number = last_number + 1 WHERE id = 1 RETURNING last_number INTO v_next_number;
  NEW.set_key := 'SET-' || LPAD(v_next_number::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_test_set_key
  BEFORE INSERT ON tm_test_sets
  FOR EACH ROW WHEN (NEW.set_key IS NULL OR NEW.set_key = '')
  EXECUTE FUNCTION generate_test_set_key();

-- Test count trigger
CREATE OR REPLACE FUNCTION update_test_set_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tm_test_sets SET test_count = test_count + 1, updated_at = NOW() WHERE id = NEW.test_set_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tm_test_sets SET test_count = GREATEST(test_count - 1, 0), updated_at = NOW() WHERE id = OLD.test_set_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_test_set_count
  AFTER INSERT OR DELETE ON tm_test_set_cases
  FOR EACH ROW EXECUTE FUNCTION update_test_set_count();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_test_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_test_set_timestamp
  BEFORE UPDATE ON tm_test_sets
  FOR EACH ROW EXECUTE FUNCTION update_test_set_timestamp();

-- Dynamic refresh RPC
CREATE OR REPLACE FUNCTION refresh_dynamic_test_set(p_set_id UUID)
RETURNS JSON AS $$
DECLARE
  v_set tm_test_sets%ROWTYPE;
  v_criteria JSONB;
  v_added_count INTEGER;
  v_removed_count INTEGER;
BEGIN
  SELECT * INTO v_set FROM tm_test_sets WHERE id = p_set_id;
  IF v_set.id IS NULL THEN RAISE EXCEPTION 'Test set not found'; END IF;
  IF v_set.membership_type != 'dynamic' THEN RAISE EXCEPTION 'Not a dynamic set'; END IF;
  v_criteria := v_set.dynamic_criteria;
  IF v_criteria IS NULL THEN RAISE EXCEPTION 'No criteria defined'; END IF;

  SELECT COUNT(*) INTO v_removed_count FROM tm_test_set_cases WHERE test_set_id = p_set_id;
  DELETE FROM tm_test_set_cases WHERE test_set_id = p_set_id;

  INSERT INTO tm_test_set_cases (test_set_id, test_case_id, sort_order, added_by)
  SELECT p_set_id, tc.id, ROW_NUMBER() OVER (ORDER BY tc.case_key)::integer, v_set.owner_id
  FROM tm_test_cases tc
  WHERE tc.project_id = v_set.project_id AND tc.is_active = true
  AND (v_criteria->'priority' IS NULL OR jsonb_array_length(v_criteria->'priority') = 0
       OR tc.priority = ANY(SELECT jsonb_array_elements_text(v_criteria->'priority')))
  AND (v_criteria->>'folder_id' IS NULL OR v_criteria->>'folder_id' = ''
       OR tc.folder_id = (v_criteria->>'folder_id')::uuid);

  GET DIAGNOSTICS v_added_count = ROW_COUNT;
  RETURN json_build_object('set_id', p_set_id, 'added', v_added_count, 'removed', v_removed_count, 'refreshed_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE tm_test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_test_set_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test sets in their projects" ON tm_test_sets FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create test sets" ON tm_test_sets FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update test sets" ON tm_test_sets FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete test sets" ON tm_test_sets FOR DELETE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view test set cases" ON tm_test_set_cases FOR SELECT
  USING (test_set_id IN (SELECT id FROM tm_test_sets WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage test set cases" ON tm_test_set_cases FOR INSERT
  WITH CHECK (test_set_id IN (SELECT id FROM tm_test_sets WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can update test set cases" ON tm_test_set_cases FOR UPDATE
  USING (test_set_id IN (SELECT id FROM tm_test_sets WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete test set cases" ON tm_test_set_cases FOR DELETE
  USING (test_set_id IN (SELECT id FROM tm_test_sets WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));
