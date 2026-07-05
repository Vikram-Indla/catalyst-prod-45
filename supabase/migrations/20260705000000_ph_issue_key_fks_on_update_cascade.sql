-- Enable ON UPDATE CASCADE on FKs that reference ph_issues.issue_key so
-- the Move-to-project wizard can re-key an item to the destination
-- project (e.g. BAU-4771 → IRP-1234) with a single UPDATE — dependents
-- follow automatically.
--
-- Applied via MCP on 2026-07-05 (Vikram directive).

ALTER TABLE ph_issue_dependencies
  DROP CONSTRAINT IF EXISTS ph_issue_dependencies_source_issue_key_fkey;
ALTER TABLE ph_issue_dependencies
  ADD CONSTRAINT ph_issue_dependencies_source_issue_key_fkey
  FOREIGN KEY (source_issue_key) REFERENCES ph_issues(issue_key) ON UPDATE CASCADE;

ALTER TABLE ph_issue_dependencies
  DROP CONSTRAINT IF EXISTS ph_issue_dependencies_target_issue_key_fkey;
ALTER TABLE ph_issue_dependencies
  ADD CONSTRAINT ph_issue_dependencies_target_issue_key_fkey
  FOREIGN KEY (target_issue_key) REFERENCES ph_issues(issue_key) ON UPDATE CASCADE;

ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_ticket_key_fkey;
ALTER TABLE chat_conversations
  ADD CONSTRAINT chat_conversations_ticket_key_fkey
  FOREIGN KEY (ticket_key) REFERENCES ph_issues(issue_key) ON UPDATE CASCADE;
