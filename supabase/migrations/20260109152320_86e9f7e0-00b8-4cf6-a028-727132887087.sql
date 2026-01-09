-- Add icon and color columns to tm_folders if they don't exist
ALTER TABLE tm_folders ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'folder';
ALTER TABLE tm_folders ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT 'default';
ALTER TABLE tm_folders ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for faster tree queries if not exists
CREATE INDEX IF NOT EXISTS idx_tm_folders_parent_project ON tm_folders(project_id, parent_id);

-- Create or replace view for folders with counts
CREATE OR REPLACE VIEW tm_folders_with_counts AS
SELECT 
  f.*,
  COALESCE(tc.test_case_count, 0) as test_case_count,
  COALESCE(sf.subfolder_count, 0) as subfolder_count
FROM tm_folders f
LEFT JOIN (
  SELECT folder_id, COUNT(*) as test_case_count
  FROM tm_test_cases
  GROUP BY folder_id
) tc ON f.id = tc.folder_id
LEFT JOIN (
  SELECT parent_id, COUNT(*) as subfolder_count
  FROM tm_folders
  GROUP BY parent_id
) sf ON f.id = sf.parent_id;