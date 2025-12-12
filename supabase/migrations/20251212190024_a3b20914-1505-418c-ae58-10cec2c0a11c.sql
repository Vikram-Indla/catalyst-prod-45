-- Add RLS policy for epic_key_sequences table
ALTER TABLE epic_key_sequences ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read sequences
CREATE POLICY "Allow authenticated read" ON epic_key_sequences
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update (for key generation)
CREATE POLICY "Allow authenticated insert" ON epic_key_sequences
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON epic_key_sequences
  FOR UPDATE TO authenticated USING (true);