
-- Add snapshot_id to strategic_themes table
ALTER TABLE strategic_themes 
ADD COLUMN snapshot_id uuid REFERENCES strategy_snapshots(id);

-- Update existing themes to link to Corporate Strategy 2025 snapshot
UPDATE strategic_themes 
SET snapshot_id = 'f8c7e7b3-6b23-4261-a4ca-c011c1dc8836'
WHERE snapshot_id IS NULL;

-- Make snapshot_id NOT NULL after data migration
ALTER TABLE strategic_themes 
ALTER COLUMN snapshot_id SET NOT NULL;

-- Create index for performance
CREATE INDEX idx_strategic_themes_snapshot_id ON strategic_themes(snapshot_id);
