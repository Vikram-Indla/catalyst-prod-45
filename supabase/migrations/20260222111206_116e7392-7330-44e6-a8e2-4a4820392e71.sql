
-- Create missing enums
DO $$ BEGIN
  CREATE TYPE drive_status AS ENUM ('active','completed','upcoming','draft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_type AS ENUM ('document','data','benchmark','url','image');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE triage_action AS ENUM ('fast_track','merge','investigate','defer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- === INNOVATION DRIVES ===
CREATE TABLE IF NOT EXISTS ph_innovation_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status drive_status NOT NULL DEFAULT 'draft',
  deadline DATE,
  target_count INTEGER DEFAULT 10,
  created_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === EXPERT REVIEWS ===
CREATE TABLE IF NOT EXISTS ph_idea_expert_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve','reject','defer','needs_info')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- === ADD innovation_drive_id column to ph_ideas ===
DO $$ BEGIN
  ALTER TABLE ph_ideas ADD COLUMN innovation_drive_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- === ADD FK constraint ===
DO $$ BEGIN
  ALTER TABLE ph_ideas ADD CONSTRAINT fk_ideas_drive
    FOREIGN KEY (innovation_drive_id) REFERENCES ph_innovation_drives(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ideas_drive ON ph_ideas(innovation_drive_id);

-- ==================== RLS ====================
ALTER TABLE ph_innovation_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_idea_expert_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drives_select" ON ph_innovation_drives FOR SELECT TO authenticated USING (true);
CREATE POLICY "drives_insert" ON ph_innovation_drives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "drives_update" ON ph_innovation_drives FOR UPDATE TO authenticated USING (true);

CREATE POLICY "reviews_select" ON ph_idea_expert_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_insert" ON ph_idea_expert_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION update_drive_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drive_updated ON ph_innovation_drives;
CREATE TRIGGER trg_drive_updated
  BEFORE UPDATE ON ph_innovation_drives
  FOR EACH ROW
  EXECUTE FUNCTION update_drive_timestamp();
