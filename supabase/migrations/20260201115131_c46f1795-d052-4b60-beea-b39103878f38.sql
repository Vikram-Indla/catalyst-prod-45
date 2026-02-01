-- Migration: Add is_lead column to workstream_members

-- Step 1: Add is_lead column if not exists
ALTER TABLE workstream_members 
ADD COLUMN IF NOT EXISTS is_lead boolean DEFAULT false;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_workstream_members_is_lead 
ON workstream_members(workstream_id, is_lead) 
WHERE is_lead = true;

-- Step 3: Migrate existing lead data from role column
UPDATE workstream_members SET is_lead = true WHERE role = 'lead';