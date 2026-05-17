/**
 * Supabase Migration: Create descriptions and description_versions tables
 * Date: 2026-05-03
 * Purpose: ADF-based rich text storage for Catalyst work items
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- TABLE: description_versions (created first so descriptions can FK to it)
-- Audit trail of all description edits
-- ====================================================================

CREATE TABLE IF NOT EXISTS description_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description_id UUID NOT NULL,
  adf_content JSONB NOT NULL,
  changes_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_description_versions_description_id ON description_versions(description_id);
CREATE INDEX IF NOT EXISTS idx_description_versions_created_at ON description_versions(created_at);

-- ====================================================================
-- TABLE: descriptions
-- Stores ADF content for work item descriptions (ph_issues)
-- ph_issues PK is issue_key (TEXT), not id (UUID)
-- ====================================================================

CREATE TABLE IF NOT EXISTS descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT NOT NULL, -- FK to ph_issues(issue_key)
  adf_content JSONB NOT NULL DEFAULT '{"version":1,"type":"doc","content":[]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  parent_version_id UUID,

  CONSTRAINT fk_issue FOREIGN KEY (issue_id) REFERENCES ph_issues(issue_key) ON DELETE CASCADE,
  CONSTRAINT fk_parent_version FOREIGN KEY (parent_version_id) REFERENCES description_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_descriptions_issue_id ON descriptions(issue_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_created_at ON descriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_descriptions_deleted_at ON descriptions(deleted_at);

-- Add FK from description_versions back to descriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'description_versions'
      AND constraint_name = 'fk_description'
  ) THEN
    ALTER TABLE description_versions
      ADD CONSTRAINT fk_description FOREIGN KEY (description_id) REFERENCES descriptions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ====================================================================
-- FUNCTION + TRIGGER: auto-update updated_at
-- ====================================================================

CREATE OR REPLACE FUNCTION update_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descriptions_updated_at ON descriptions;
CREATE TRIGGER trigger_descriptions_updated_at
BEFORE UPDATE ON descriptions
FOR EACH ROW
EXECUTE FUNCTION update_descriptions_updated_at();

-- ====================================================================
-- ROW LEVEL SECURITY — descriptions
-- ====================================================================

ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "descriptions_select_all" ON descriptions;
CREATE POLICY "descriptions_select_all" ON descriptions
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "descriptions_insert_own" ON descriptions;
CREATE POLICY "descriptions_insert_own" ON descriptions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "descriptions_update_own" ON descriptions;
CREATE POLICY "descriptions_update_own" ON descriptions
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "descriptions_no_delete" ON descriptions;
CREATE POLICY "descriptions_no_delete" ON descriptions
  FOR DELETE USING (FALSE);

-- ====================================================================
-- ROW LEVEL SECURITY — description_versions
-- ====================================================================

ALTER TABLE description_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "description_versions_select_all" ON description_versions;
CREATE POLICY "description_versions_select_all" ON description_versions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM descriptions d
    WHERE d.id = description_id AND d.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "description_versions_insert_own" ON description_versions;
CREATE POLICY "description_versions_insert_own" ON description_versions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "description_versions_no_update" ON description_versions;
CREATE POLICY "description_versions_no_update" ON description_versions
  FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "description_versions_no_delete" ON description_versions;
CREATE POLICY "description_versions_no_delete" ON description_versions
  FOR DELETE USING (FALSE);

COMMENT ON TABLE descriptions IS 'Rich-text descriptions for work items, stored as ADF (Atlassian Document Format) JSON';
COMMENT ON TABLE description_versions IS 'Immutable audit log of all description edits';
