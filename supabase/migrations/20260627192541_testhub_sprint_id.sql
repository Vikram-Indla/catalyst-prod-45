-- CAT-TESTHUB-SPRINT-20260627-001 Slice 1
-- Add sprint_id FK to TM test artifacts

ALTER TABLE tm_test_cycles
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES ph_jira_sprints(id) ON DELETE SET NULL;

ALTER TABLE tm_test_plans
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES ph_jira_sprints(id) ON DELETE SET NULL;

ALTER TABLE tm_test_cases
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES ph_jira_sprints(id) ON DELETE SET NULL;

ALTER TABLE tm_defects
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES ph_jira_sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tm_test_cycles_sprint_id ON tm_test_cycles(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_plans_sprint_id  ON tm_test_plans(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tm_test_cases_sprint_id  ON tm_test_cases(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tm_defects_sprint_id     ON tm_defects(sprint_id);
