-- ============================================================
-- PLANNER COLUMN MANAGEMENT — Add is_system flag for default columns
-- ============================================================

-- Add is_system column to track which statuses are system defaults (cannot be deleted)
ALTER TABLE planner_statuses 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Add created_by column to track who created custom columns
ALTER TABLE planner_statuses 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Mark the 5 default statuses as system columns
UPDATE planner_statuses
SET is_system = TRUE
WHERE slug IN ('backlog', 'planned', 'progress', 'review', 'done');

-- Create index for position ordering
CREATE INDEX IF NOT EXISTS idx_planner_statuses_position ON planner_statuses(position);

-- ============================================================
-- RLS POLICIES for planner_statuses
-- ============================================================

-- Enable RLS if not already enabled
ALTER TABLE planner_statuses ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read statuses
DROP POLICY IF EXISTS "Statuses are viewable by everyone" ON planner_statuses;
CREATE POLICY "Statuses are viewable by everyone" 
ON planner_statuses 
FOR SELECT 
USING (TRUE);

-- Policy: Authenticated users can create custom statuses
DROP POLICY IF EXISTS "Authenticated users can create statuses" ON planner_statuses;
CREATE POLICY "Authenticated users can create statuses" 
ON planner_statuses 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update any status (for position reordering)
DROP POLICY IF EXISTS "Authenticated users can update statuses" ON planner_statuses;
CREATE POLICY "Authenticated users can update statuses" 
ON planner_statuses 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy: Only non-system statuses can be deleted by authenticated users
DROP POLICY IF EXISTS "Custom statuses can be deleted" ON planner_statuses;
CREATE POLICY "Custom statuses can be deleted" 
ON planner_statuses 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND is_system = FALSE);