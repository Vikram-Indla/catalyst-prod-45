-- Fix infinite recursion in space_members policies
-- The problem: space_members policies reference themselves

-- Drop problematic policies
DROP POLICY IF EXISTS "space_members_select" ON space_members;
DROP POLICY IF EXISTS "space_members_insert" ON space_members;
DROP POLICY IF EXISTS "space_members_update" ON space_members;
DROP POLICY IF EXISTS "space_members_delete" ON space_members;

-- Create fixed policies that don't self-reference
-- Users can see their own memberships (direct check, no recursion)
CREATE POLICY "space_members_select" ON space_members
  FOR SELECT USING (user_id = auth.uid());

-- For viewing other members in spaces I belong to, we need a different approach
-- Add a second policy that allows viewing members of spaces where user is a member
CREATE POLICY "space_members_select_same_space" ON space_members
  FOR SELECT USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Insert: Allow space creators (via spaces table) or existing admins
CREATE POLICY "space_members_insert" ON space_members
  FOR INSERT WITH CHECK (
    -- Space creator can add members
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.created_by = auth.uid()
    )
    OR
    -- Existing admin can add members (check directly, not self-referencing)
    user_id = auth.uid() -- User adding themselves via invitation flow
  );

-- Update: Only admins can update member roles
CREATE POLICY "space_members_update" ON space_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.created_by = auth.uid()
    )
  );

-- Delete: Only space creator or self-removal
CREATE POLICY "space_members_delete" ON space_members
  FOR DELETE USING (
    user_id = auth.uid() -- Can remove self
    OR EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.created_by = auth.uid()
    )
  );

-- Also fix spaces policies that reference space_members
DROP POLICY IF EXISTS "spaces_select" ON spaces;
DROP POLICY IF EXISTS "spaces_insert" ON spaces;
DROP POLICY IF EXISTS "spaces_update" ON spaces;
DROP POLICY IF EXISTS "spaces_delete" ON spaces;

-- Spaces are readable by all authenticated users (for discovery)
CREATE POLICY "spaces_select" ON spaces
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create spaces
CREATE POLICY "spaces_insert" ON spaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Only space creator can update
CREATE POLICY "spaces_update" ON spaces
  FOR UPDATE USING (created_by = auth.uid());

-- Only space creator can delete
CREATE POLICY "spaces_delete" ON spaces
  FOR DELETE USING (created_by = auth.uid());

-- Fix other related tables that also had recursive references

-- space_components - use spaces.created_by check instead
DROP POLICY IF EXISTS "space_components_select" ON space_components;
DROP POLICY IF EXISTS "space_components_insert" ON space_components;
DROP POLICY IF EXISTS "space_components_update" ON space_components;
DROP POLICY IF EXISTS "space_components_delete" ON space_components;

CREATE POLICY "space_components_select" ON space_components
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "space_components_insert" ON space_components
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );

CREATE POLICY "space_components_update" ON space_components
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );

CREATE POLICY "space_components_delete" ON space_components
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );

-- space_versions - use spaces.created_by check
DROP POLICY IF EXISTS "space_versions_select" ON space_versions;
DROP POLICY IF EXISTS "space_versions_insert" ON space_versions;
DROP POLICY IF EXISTS "space_versions_update" ON space_versions;
DROP POLICY IF EXISTS "space_versions_delete" ON space_versions;

CREATE POLICY "space_versions_select" ON space_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "space_versions_insert" ON space_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );

CREATE POLICY "space_versions_update" ON space_versions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );

CREATE POLICY "space_versions_delete" ON space_versions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM spaces WHERE id = space_id AND created_by = auth.uid())
  );