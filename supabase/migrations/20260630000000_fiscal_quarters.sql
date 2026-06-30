-- fiscal_quarters: admin-managed quarterly periods shared by milestones and business requests
CREATE TABLE IF NOT EXISTS fiscal_quarters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT NOT NULL UNIQUE,                          -- "Q1 2026", "Q2 2026", etc.
  year         INTEGER NOT NULL,
  quarter_num  INTEGER NOT NULL CHECK (quarter_num BETWEEN 1 AND 4),
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_quarters_active ON fiscal_quarters (is_active, sort_order, year, quarter_num);

ALTER TABLE fiscal_quarters ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active quarters
CREATE POLICY "fiscal_quarters_select" ON fiscal_quarters
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "fiscal_quarters_admin_write" ON fiscal_quarters
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Seed Q1 2026 → Q4 2027
INSERT INTO fiscal_quarters (label, year, quarter_num, start_date, end_date, sort_order) VALUES
  ('Q1 2026', 2026, 1, '2026-01-01', '2026-03-31', 10),
  ('Q2 2026', 2026, 2, '2026-04-01', '2026-06-30', 20),
  ('Q3 2026', 2026, 3, '2026-07-01', '2026-09-30', 30),
  ('Q4 2026', 2026, 4, '2026-10-01', '2026-12-31', 40),
  ('Q1 2027', 2027, 1, '2027-01-01', '2027-03-31', 50),
  ('Q2 2027', 2027, 2, '2027-04-01', '2027-06-30', 60),
  ('Q3 2027', 2027, 3, '2027-07-01', '2027-09-30', 70),
  ('Q4 2027', 2027, 4, '2027-10-01', '2027-12-31', 80)
ON CONFLICT (label) DO NOTHING;

-- Add singular quarter column to business_requests (replaces deprecated planned_quarter text[])
ALTER TABLE business_requests ADD COLUMN IF NOT EXISTS quarter TEXT REFERENCES fiscal_quarters(label) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_br_quarter ON business_requests (quarter);
