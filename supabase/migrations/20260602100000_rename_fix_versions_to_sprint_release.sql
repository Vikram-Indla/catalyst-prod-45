-- Rename fix_versions → sprint_release across all tables
-- Jira API field stays fixVersions; this is the Catalyst terminology change

-- 1. ph_issues (main issues table)
ALTER TABLE ph_issues RENAME COLUMN fix_versions TO sprint_release;

-- 2. catalyst_issues
ALTER TABLE catalyst_issues RENAME COLUMN fix_versions TO sprint_release;

-- 3. ph_at_risk_items
ALTER TABLE ph_at_risk_items RENAME COLUMN fix_versions TO sprint_release;

-- 4. tm_defects (uses jira_fix_versions)
ALTER TABLE tm_defects RENAME COLUMN jira_fix_versions TO jira_sprint_release;

-- 5. wh_work_items
ALTER TABLE wh_work_items RENAME COLUMN fix_versions TO sprint_release;

-- 6. wh_work_item_detail (if it's a table not a view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wh_work_item_detail' AND column_name = 'fix_versions'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE wh_work_item_detail RENAME COLUMN fix_versions TO sprint_release;
  END IF;
END $$;

-- 7. Rename the wh_fix_versions table → wh_sprint_releases
ALTER TABLE wh_fix_versions RENAME TO wh_sprint_releases;

-- Views (r360_unified_activity_view, workhub_items_view) will need to be
-- recreated if they reference the old column names. They auto-resolve if
-- they use SELECT * or if they're auto-generated views.
-- If they break, a follow-up migration recreates them.

COMMENT ON COLUMN ph_issues.sprint_release IS 'Mapped from Jira fixVersions field. Displayed as "Sprint/Release" in Catalyst UI.';
