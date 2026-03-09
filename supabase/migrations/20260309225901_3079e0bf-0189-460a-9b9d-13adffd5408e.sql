-- Extend ph_ideas with roadmap columns
ALTER TABLE ph_ideas
  ADD COLUMN IF NOT EXISTS is_committed      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roadmap_quarter   TEXT        CHECK (roadmap_quarter IN ('Q1','Q2','Q3','Q4')),
  ADD COLUMN IF NOT EXISTS milestone_req     DATE,
  ADD COLUMN IF NOT EXISTS milestone_des     DATE,
  ADD COLUMN IF NOT EXISTS milestone_dev     DATE,
  ADD COLUMN IF NOT EXISTS milestone_uat     DATE,
  ADD COLUMN IF NOT EXISTS milestone_beta    DATE,
  ADD COLUMN IF NOT EXISTS milestone_prod    DATE;

-- Index for roadmap queries
CREATE INDEX IF NOT EXISTS idx_ph_ideas_roadmap ON ph_ideas(is_committed, roadmap_quarter);