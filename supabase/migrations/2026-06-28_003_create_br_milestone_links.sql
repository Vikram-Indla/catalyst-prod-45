-- Migration: Create business_request_milestone_links junction table
-- Purpose: Link BRs to milestones (1:many relationship, supports phases)

BEGIN;

CREATE TABLE IF NOT EXISTS business_request_milestone_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  business_request_id UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES product_milestones(id) ON DELETE CASCADE,

  sequence_in_milestone INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(business_request_id, milestone_id),
  CHECK (sequence_in_milestone IS NULL OR sequence_in_milestone > 0)
);

COMMENT ON TABLE business_request_milestone_links IS
  'Junction table linking Business Requests to Product Milestones. ' ||
  'Supports 1:many relationship: one BR can belong to multiple milestones (e.g., Phase 1 in Q3, Phase 2 in Q4). ' ||
  'sequence_in_milestone denotes the phase number within that milestone.';

COMMENT ON COLUMN business_request_milestone_links.sequence_in_milestone IS
  'Phase number within the milestone. E.g., sequence 1 = Phase 1, sequence 2 = Phase 2.';

COMMENT ON COLUMN business_request_milestone_links.is_primary IS
  'TRUE if this is the primary milestone for the BR. Used for default display and target date.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_br_id ON business_request_milestone_links(business_request_id);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_milestone_id ON business_request_milestone_links(milestone_id);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_is_primary ON business_request_milestone_links(is_primary);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_sequence ON business_request_milestone_links(sequence_in_milestone);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_br_milestone_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_br_milestone_links_timestamp ON business_request_milestone_links;
CREATE TRIGGER trg_br_milestone_links_timestamp
BEFORE UPDATE ON business_request_milestone_links
FOR EACH ROW
EXECUTE FUNCTION update_br_milestone_links_timestamp();

COMMIT;
