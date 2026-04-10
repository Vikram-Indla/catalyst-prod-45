ALTER TABLE ph_issues ADD COLUMN IF NOT EXISTS position BIGINT DEFAULT 0;
ALTER TABLE ph_issues ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;

UPDATE ph_issues SET position = (EXTRACT(EPOCH FROM jira_created_at))::BIGINT
  WHERE position = 0 AND jira_created_at IS NOT NULL;