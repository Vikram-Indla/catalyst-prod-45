-- ============================================================
-- TEST FOLDERS TABLE (without organization_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS test_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  parent_id UUID REFERENCES test_folders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT folder_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_folders_project_id ON test_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_test_folders_parent_id ON test_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_test_folders_sort ON test_folders(project_id, parent_id, sort_order);

-- ============================================================
-- ADD folder_id TO test_cases
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'test_cases' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE test_cases 
    ADD COLUMN folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_cases_folder_id ON test_cases(folder_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE test_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view folders in their projects" ON test_folders;
DROP POLICY IF EXISTS "Users can create folders in their projects" ON test_folders;
DROP POLICY IF EXISTS "Users can update folders in their projects" ON test_folders;
DROP POLICY IF EXISTS "Users can delete folders in their projects" ON test_folders;

CREATE POLICY "Users can view folders in their projects" ON test_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = test_folders.project_id 
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folders in their projects" ON test_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = test_folders.project_id 
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders in their projects" ON test_folders
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = test_folders.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can delete folders in their projects" ON test_folders
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = test_folders.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- GET FOLDER TREE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_folder_tree(p_project_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE folder_tree AS (
    SELECT 
      f.id,
      f.name,
      f.description,
      f.parent_id,
      f.sort_order,
      f.created_by,
      f.created_at,
      0 as depth,
      ARRAY[f.sort_order, f.id] as sort_path
    FROM test_folders f
    WHERE f.project_id = p_project_id
    AND f.parent_id IS NULL
    
    UNION ALL
    
    SELECT 
      f.id,
      f.name,
      f.description,
      f.parent_id,
      f.sort_order,
      f.created_by,
      f.created_at,
      ft.depth + 1,
      ft.sort_path || ARRAY[f.sort_order, f.id]
    FROM test_folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
    WHERE ft.depth < 10
  ),
  folder_counts AS (
    SELECT 
      folder_id,
      COUNT(*)::INTEGER as test_case_count
    FROM test_cases
    WHERE project_id = p_project_id
    AND folder_id IS NOT NULL
    GROUP BY folder_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ft.id,
        'name', ft.name,
        'description', ft.description,
        'parentId', ft.parent_id,
        'sortOrder', ft.sort_order,
        'depth', ft.depth,
        'count', COALESCE(fc.test_case_count, 0),
        'createdBy', ft.created_by,
        'createdAt', ft.created_at
      ) ORDER BY ft.sort_path
    ),
    '[]'::jsonb
  )
  INTO result
  FROM folder_tree ft
  LEFT JOIN folder_counts fc ON fc.folder_id = ft.id;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_folder_tree(UUID) TO authenticated;

-- ============================================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_test_folder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS test_folders_updated_at ON test_folders;
CREATE TRIGGER test_folders_updated_at
  BEFORE UPDATE ON test_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_test_folder_timestamp();

-- ============================================================
-- GET FOLDER DESCENDANTS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_folder_descendants(p_folder_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result UUID[];
BEGIN
  WITH RECURSIVE descendants AS (
    SELECT id FROM test_folders WHERE id = p_folder_id
    UNION ALL
    SELECT f.id FROM test_folders f
    INNER JOIN descendants d ON f.parent_id = d.id
  )
  SELECT ARRAY_AGG(id) INTO result FROM descendants;
  
  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION get_folder_descendants(UUID) TO authenticated;