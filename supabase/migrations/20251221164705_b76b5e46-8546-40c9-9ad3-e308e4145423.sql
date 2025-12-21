-- Change Numbers table (from Release Calendar)
CREATE TABLE IF NOT EXISTS change_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'cancelled')),
  release_id UUID REFERENCES releases(id),
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add change_number_id to features
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS change_number_id UUID REFERENCES change_numbers(id);

-- Add change_number_id to stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS change_number_id UUID REFERENCES change_numbers(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_numbers_status ON change_numbers(status);
CREATE INDEX IF NOT EXISTS idx_change_numbers_release ON change_numbers(release_id);
CREATE INDEX IF NOT EXISTS idx_features_change_number ON features(change_number_id);
CREATE INDEX IF NOT EXISTS idx_stories_change_number ON stories(change_number_id);

-- RLS
ALTER TABLE change_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view change numbers"
  ON change_numbers FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage change numbers"
  ON change_numbers FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to generate next change number
CREATE OR REPLACE FUNCTION generate_change_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(20);
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(number FROM 'CHG-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM change_numbers
  WHERE number LIKE 'CHG-' || year_part || '-%';
  
  new_number := 'CHG-' || year_part || '-' || LPAD(seq_num::VARCHAR, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO change_numbers (number, description, status, scheduled_date)
VALUES 
  ('CHG-2025-0001', 'Q4 Security Patches', 'closed', '2025-10-15'),
  ('CHG-2025-0042', 'Infrastructure Hardening', 'open', '2025-12-20'),
  ('CHG-2025-0043', 'API Gateway Upgrade', 'open', '2025-12-22'),
  ('CHG-2025-0044', 'Database Migration', 'open', '2026-01-05'),
  ('CHG-2025-0045', 'UI Component Library Update', 'open', '2026-01-10')
ON CONFLICT (number) DO NOTHING;