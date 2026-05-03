/**
 * Supabase Migration: Create descriptions and description_versions tables
 * Date: 2026-05-03
 * Purpose: ADF-based rich text storage for Catalyst work items
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- TABLE: descriptions
-- Stores ADF content for work item descriptions (ph_issues)
-- ====================================================================

CREATE TABLE descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id TEXT NOT NULL, -- Foreign key to ph_issues(id)
  adf_content JSONB NOT NULL DEFAULT '{"version":1,"type":"doc","content":[]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft-delete marker
  created_by TEXT NOT NULL, -- User email or account ID
  parent_version_id UUID, -- Reference to prior version (for history chain)

  CONSTRAINT fk_issue FOREIGN KEY (issue_id) REFERENCES ph_issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_version FOREIGN KEY (parent_version_id) REFERENCES description_versions(id)
);

CREATE INDEX idx_descriptions_issue_id ON descriptions(issue_id);
CREATE INDEX idx_descriptions_created_at ON descriptions(created_at);
CREATE INDEX idx_descriptions_deleted_at ON descriptions(deleted_at); -- For soft-delete queries

-- ====================================================================
-- TABLE: description_versions
-- Audit trail of all description edits
-- ====================================================================

CREATE TABLE description_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description_id UUID NOT NULL, -- Foreign key to descriptions(id)
  adf_content JSONB NOT NULL, -- Snapshot of ADF at this version
  changes_summary TEXT, -- User-provided edit note (e.g., "Fixed formatting")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL, -- User who made the edit

  CONSTRAINT fk_description FOREIGN KEY (description_id) REFERENCES descriptions(id) ON DELETE CASCADE
);

CREATE INDEX idx_description_versions_description_id ON description_versions(description_id);
CREATE INDEX idx_description_versions_created_at ON description_versions(created_at);

-- ====================================================================
-- FUNCTION: update_descriptions_updated_at
-- Trigger to auto-update the updated_at column
-- ====================================================================

CREATE OR REPLACE FUNCTION update_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_descriptions_updated_at
BEFORE UPDATE ON descriptions
FOR EACH ROW
EXECUTE FUNCTION update_descriptions_updated_at();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) — descriptions
-- ====================================================================

ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT descriptions on issues they can view
-- TODO: Adjust this policy based on Catalyst's ph_issues visibility rules.
-- For now, we assume all authenticated users can view all descriptions.
CREATE POLICY "descriptions_select_all" ON descriptions
  FOR SELECT
  USING (deleted_at IS NULL);

-- Policy: Users can INSERT descriptions only for issues they own or collaborate on
-- TODO: Restrict INSERT to authenticated users who are project members (join with project_members).
CREATE POLICY "descriptions_insert_own" ON descriptions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can UPDATE descriptions only for issues they own or collaborate on
-- TODO: Restrict UPDATE to the same conditions as INSERT.
CREATE POLICY "descriptions_update_own" ON descriptions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Soft-delete only; actual DELETE is disabled
CREATE POLICY "descriptions_no_delete" ON descriptions
  FOR DELETE
  USING (FALSE);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) — description_versions
-- ====================================================================

ALTER TABLE description_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT versions for descriptions they can view
CREATE POLICY "description_versions_select_all" ON description_versions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM descriptions d
    WHERE d.id = description_id AND d.deleted_at IS NULL
  ));

-- Policy: Users can INSERT versions only if they can INSERT descriptions
CREATE POLICY "description_versions_insert_own" ON description_versions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: No UPDATE or DELETE on versions (immutable audit trail)
CREATE POLICY "description_versions_no_update" ON description_versions
  FOR UPDATE
  USING (FALSE);

CREATE POLICY "description_versions_no_delete" ON description_versions
  FOR DELETE
  USING (FALSE);

-- ====================================================================
-- COMMENTS (for documentation in Supabase SQL Editor)
-- ====================================================================

COMMENT ON TABLE descriptions IS 'Rich-text descriptions for work items, stored as ADF (Atlassian Document Format) JSON';
COMMENT ON COLUMN descriptions.adf_content IS 'ADF document: { version: 1, type: "doc", content: [...] }';
COMMENT ON COLUMN descriptions.deleted_at IS 'Soft-delete timestamp; NULL = active, NOT NULL = deleted';
COMMENT ON COLUMN descriptions.parent_version_id IS 'References the prior version for edit history chain';

COMMENT ON TABLE description_versions IS 'Immutable audit log of all description edits';
COMMENT ON COLUMN description_versions.changes_summary IS 'Optional user note about what changed in this edit';
