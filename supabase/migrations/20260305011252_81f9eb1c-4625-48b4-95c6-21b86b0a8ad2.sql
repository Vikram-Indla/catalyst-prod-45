
-- Add display_label and unit columns to r360_role_benchmarks
ALTER TABLE r360_role_benchmarks
  ADD COLUMN IF NOT EXISTS display_label TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add missing columns to r360_ai_profiles
ALTER TABLE r360_ai_profiles
  ADD COLUMN IF NOT EXISTS is_single_point_of_failure BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS primary_artifact_labels JSONB;

COMMENT ON COLUMN r360_ai_profiles.primary_artifact_labels IS
  'Ordered list of is_primary=TRUE artifacts for this resource''s role. Drives dynamic peer comparison column headers.';

-- Update existing seed data with display_label and unit values
-- R01 - Technical Product Owner
UPDATE r360_role_benchmarks SET display_label = 'Initiatives Owned', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'initiative';
UPDATE r360_role_benchmarks SET display_label = 'Epics Authored', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'epic';
UPDATE r360_role_benchmarks SET display_label = 'Stories Written', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'story';
UPDATE r360_role_benchmarks SET display_label = 'Stories Closed', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'story_closed';
UPDATE r360_role_benchmarks SET display_label = 'Subtasks', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'subtask';
UPDATE r360_role_benchmarks SET display_label = 'Tasks', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'task';
UPDATE r360_role_benchmarks SET display_label = 'Incidents Closed', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'incident';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Raised', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'qa_bug_raised';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Closed', unit = 'count' WHERE role_code = 'R01' AND artifact_type = 'qa_bug_closed';

-- R02 - React Developer
UPDATE r360_role_benchmarks SET display_label = 'Initiatives', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'initiative';
UPDATE r360_role_benchmarks SET display_label = 'Epics', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'epic';
UPDATE r360_role_benchmarks SET display_label = 'Stories Closed', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'story_closed';
UPDATE r360_role_benchmarks SET display_label = 'Subtasks Closed', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'subtask';
UPDATE r360_role_benchmarks SET display_label = 'Tasks', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'task';
UPDATE r360_role_benchmarks SET display_label = 'Incident Close %', unit = 'pct' WHERE role_code = 'R02' AND artifact_type = 'incident';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Raised', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'qa_bug_raised';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Closed', unit = 'count' WHERE role_code = 'R02' AND artifact_type = 'qa_bug_closed';

-- R02 - Add incident_pickup row
INSERT INTO r360_role_benchmarks (role_code, role_name, artifact_type, affinity_weight, is_primary, display_label, unit)
VALUES ('R02', 'React Developer', 'incident_pickup', 5, TRUE, 'Bug Pickup', 'hours')
ON CONFLICT (role_code, artifact_type) DO NOTHING;

-- R03 - Backend Developer
UPDATE r360_role_benchmarks SET display_label = 'Stories Closed', unit = 'count' WHERE role_code = 'R03' AND artifact_type = 'story_closed';
UPDATE r360_role_benchmarks SET display_label = 'Subtasks Closed', unit = 'count' WHERE role_code = 'R03' AND artifact_type = 'subtask';
UPDATE r360_role_benchmarks SET display_label = 'Incident Close %', unit = 'pct' WHERE role_code = 'R03' AND artifact_type = 'incident';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Closed', unit = 'count' WHERE role_code = 'R03' AND artifact_type = 'qa_bug_closed';
UPDATE r360_role_benchmarks SET display_label = 'Tasks', unit = 'count' WHERE role_code = 'R03' AND artifact_type = 'task';

-- R04 - QA Engineer
UPDATE r360_role_benchmarks SET display_label = 'Bugs Raised', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'qa_bug_raised';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Closed', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'qa_bug_closed';
UPDATE r360_role_benchmarks SET display_label = 'Subtasks', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'subtask';
UPDATE r360_role_benchmarks SET display_label = 'Tasks', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'task';
UPDATE r360_role_benchmarks SET display_label = 'Incidents', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'incident';
UPDATE r360_role_benchmarks SET display_label = 'Stories Closed', unit = 'count' WHERE role_code = 'R04' AND artifact_type = 'story_closed';

-- R04 - Add qa_coverage row
INSERT INTO r360_role_benchmarks (role_code, role_name, artifact_type, affinity_weight, is_primary, display_label, unit)
VALUES ('R04', 'QA Engineer', 'qa_coverage', 5, TRUE, 'QA Coverage %', 'pct')
ON CONFLICT (role_code, artifact_type) DO NOTHING;

-- R05 - Delivery Manager
UPDATE r360_role_benchmarks SET display_label = 'Tasks Managed', unit = 'count' WHERE role_code = 'R05' AND artifact_type = 'task';
UPDATE r360_role_benchmarks SET display_label = 'Initiatives', unit = 'count' WHERE role_code = 'R05' AND artifact_type = 'initiative';
UPDATE r360_role_benchmarks SET display_label = 'Epics', unit = 'count' WHERE role_code = 'R05' AND artifact_type = 'epic';
UPDATE r360_role_benchmarks SET display_label = 'Incidents', unit = 'count' WHERE role_code = 'R05' AND artifact_type = 'incident';

-- R05 - Add risk_raised and release_part rows
INSERT INTO r360_role_benchmarks (role_code, role_name, artifact_type, affinity_weight, is_primary, display_label, unit)
VALUES
  ('R05', 'Delivery Manager', 'risk_raised', 5, TRUE, 'Risks Raised', 'count'),
  ('R05', 'Delivery Manager', 'release_part', 5, TRUE, 'Release Span', 'count')
ON CONFLICT (role_code, artifact_type) DO NOTHING;

-- R06 - Business Analyst
UPDATE r360_role_benchmarks SET display_label = 'Epics Authored', unit = 'count' WHERE role_code = 'R06' AND artifact_type = 'epic';
UPDATE r360_role_benchmarks SET display_label = 'Stories Written', unit = 'count' WHERE role_code = 'R06' AND artifact_type = 'story';
UPDATE r360_role_benchmarks SET display_label = 'Initiatives', unit = 'count' WHERE role_code = 'R06' AND artifact_type = 'initiative';
UPDATE r360_role_benchmarks SET display_label = 'Tasks', unit = 'count' WHERE role_code = 'R06' AND artifact_type = 'task';
UPDATE r360_role_benchmarks SET display_label = 'Bugs Raised', unit = 'count' WHERE role_code = 'R06' AND artifact_type = 'qa_bug_raised';

-- Update remaining roles (R07-R10) with display_label and unit
UPDATE r360_role_benchmarks SET display_label = CASE artifact_type
  WHEN 'incident' THEN 'Incident SLA'
  WHEN 'subtask' THEN 'Subtasks Closed'
  WHEN 'story_closed' THEN 'Stories Closed'
  WHEN 'task' THEN 'Tasks'
  WHEN 'initiative' THEN 'Initiatives'
  WHEN 'epic' THEN 'Epics'
  WHEN 'story' THEN 'Stories'
  WHEN 'qa_bug_raised' THEN 'Bugs Raised'
  WHEN 'qa_bug_closed' THEN 'Bugs Closed'
  ELSE artifact_type
END,
unit = 'count'
WHERE role_code IN ('R07','R08','R09','R10') AND display_label IS NULL;
