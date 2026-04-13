-- Drop the self-referencing FK on catalyst_issues.parent_id
-- Parent epics live in ph_issues (Jira-synced), so parent_id must be
-- allowed to reference IDs from either table.
ALTER TABLE catalyst_issues DROP CONSTRAINT IF EXISTS catalyst_issues_parent_id_fkey;
