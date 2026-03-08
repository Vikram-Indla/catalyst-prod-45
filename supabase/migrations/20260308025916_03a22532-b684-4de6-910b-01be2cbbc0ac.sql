ALTER TABLE brd_documents
  ADD COLUMN IF NOT EXISTS parent_jira_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'story',
  ADD COLUMN IF NOT EXISTS raw_text_source TEXT DEFAULT 'description';