
-- Drop constraints blocking type change
ALTER TABLE ph_issue_links DROP CONSTRAINT IF EXISTS no_self_link;
ALTER TABLE ph_issue_links DROP CONSTRAINT IF EXISTS unique_link;
ALTER TABLE ph_issue_links DROP CONSTRAINT IF EXISTS ph_issue_links_source_id_fkey;
ALTER TABLE ph_issue_links DROP CONSTRAINT IF EXISTS ph_issue_links_target_id_fkey;
ALTER TABLE ph_issue_links DROP CONSTRAINT IF EXISTS ph_issue_links_link_type_check;

-- Change columns to TEXT for issue_key storage
ALTER TABLE ph_issue_links ALTER COLUMN source_id TYPE text USING source_id::text;
ALTER TABLE ph_issue_links ALTER COLUMN target_id TYPE text USING target_id::text;

-- Re-add constraints
ALTER TABLE ph_issue_links ADD CONSTRAINT no_self_link CHECK (source_id <> target_id);
ALTER TABLE ph_issue_links ADD CONSTRAINT unique_link UNIQUE (source_id, target_id, link_type);
ALTER TABLE ph_issue_links ADD CONSTRAINT ph_issue_links_link_type_check CHECK (link_type = ANY (ARRAY[
  'blocks', 'is blocked by', 'is BRD of', 'BRD',
  'is cloned by', 'clones', 'is duplicated by', 'duplicates',
  'is implemented by', 'implements', 'relates to'
]));

-- Recreate RLS policy for authenticated users
CREATE POLICY "Authenticated users can manage links"
ON ph_issue_links
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
