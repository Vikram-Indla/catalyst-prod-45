-- Add missing columns to tm_defects table for enterprise defect tracking

-- Defect classification
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS defect_type VARCHAR(50) DEFAULT 'bug';
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS component VARCHAR(255);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS module VARCHAR(255);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Environment fields
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS operating_system VARCHAR(100);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS environment VARCHAR(50);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS affects_version VARCHAR(100);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS fix_version VARCHAR(100);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS found_in_build VARCHAR(100);

-- Reproduction fields
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS expected_result TEXT;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS actual_result TEXT;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS found_during VARCHAR(50);

-- Flags
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS is_regression BOOLEAN DEFAULT false;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS is_blocker BOOLEAN DEFAULT false;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS is_security_issue BOOLEAN DEFAULT false;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS customer_reported BOOLEAN DEFAULT false;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Tracking
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS sprint VARCHAR(100);
ALTER TABLE tm_defects ADD COLUMN IF NOT EXISTS epic_link VARCHAR(255);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tm_defects_priority ON tm_defects(priority);
CREATE INDEX IF NOT EXISTS idx_tm_defects_component ON tm_defects(component);
CREATE INDEX IF NOT EXISTS idx_tm_defects_due_date ON tm_defects(due_date);
CREATE INDEX IF NOT EXISTS idx_tm_defects_defect_type ON tm_defects(defect_type);
CREATE INDEX IF NOT EXISTS idx_tm_defects_is_blocker ON tm_defects(is_blocker) WHERE is_blocker = true;
CREATE INDEX IF NOT EXISTS idx_tm_defects_is_security ON tm_defects(is_security_issue) WHERE is_security_issue = true;